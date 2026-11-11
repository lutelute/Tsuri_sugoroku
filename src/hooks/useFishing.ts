import { useState, useCallback, useRef, useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useGameStore } from '../store/useGameStore';
import { useSettingsStore } from '../store/useSettingsStore';
import {
  getBiteDelay, createCaughtFish, getEffectiveLevel, checkTairyou, selectFish, getStrikeGreenZone,
  RIGS, mergeSelectOpts, canQuickCatch, QUICK_CATCH_PERFECT_SIZE,
} from '../game/fishing';
import { fisheryOf } from '../game/fishMarket';
import { NODE_MAP } from '../data/boardNodes';
import { NO_LURE_BITE_DELAY_MULTIPLIER } from '../game/constants';
import { getEquippedItem } from '../game/equipment';
import { judgeStrike, drawMiniGame } from '../components/fishing/strike';
import type { StrikeJudge } from '../components/fishing/strike';
import type { FailReason } from '../components/fishing/miniGameMeta';
import { buzz, HAPTIC } from '../components/fishing/haptics';
import { playHook, playMiss, playCatch } from '../utils/sound';

// ミニゲーム共通の難易度・手触りの数値は src/components/fishing/ 配下に集約:
//   - やり取り（リーリング）のレア度別の手応え: reelSim.ts の RARITY_DIFFICULTY
//   - 合わせの輪の速さ・会心幅: strike.ts
//   - 的当て / 早合わせ / リズム: 各 Phase コンポーネント先頭の定数

/** キャスト演出の長さ（ms） */
const CAST_MS = 1500;
/** 合わせ成功の演出を見せる時間（ms） */
const STRIKE_SUCCESS_MS = 1000;
/** 雑魚は手早く: 合わせに成功してから釣果が出るまでの短い演出（ms） */
export const QUICK_CATCH_MS = 1200;
/** 合わせ失敗の理由（早すぎ/遅すぎ/見逃し）を読ませる時間（ms） */
const STRIKE_FAIL_MS = 1600;
/** 当たり前に押した（早合わせ）ときに当たりが遅れる時間（ms） */
const EARLY_TAP_PENALTY_MS = 700;
/** 早合わせのペナルティは1回の釣りで最大この回数まで（子供が延々待たされないように） */
const EARLY_TAP_MAX_PENALTIES = 3;

/** 合わせの結果（判定 + 当たりを見逃した） */
export type StrikeOutcome = StrikeJudge | 'missed';

export function useFishing() {
  const { fishingState, player, updateFishingState, catchFish, failFishing } = useGameStore(
    useShallow(s => ({
      fishingState: s.fishingState,
      player: s.players[s.currentPlayerIndex],
      updateFishingState: s.updateFishingState,
      catchFish: s.catchFish,
      failFishing: s.failFishing,
    })),
  );
  const quickCatch = useSettingsStore(s => s.quickCatch);

  const [strikeOutcome, setStrikeOutcome] = useState<StrikeOutcome | null>(null);
  const [failReason, setFailReason] = useState<FailReason | null>(null);
  const biteTimerRef = useRef<number | null>(null);
  const biteDueRef = useRef(0);
  const penaltiesRef = useRef(0);
  const timersRef = useRef<number[]>([]);

  // アンマウント時に演出用タイマーをまとめて解除
  useEffect(() => {
    const timers = timersRef.current;
    return () => timers.forEach(id => clearTimeout(id));
  }, []);

  const later = useCallback((fn: () => void, ms: number) => {
    timersRef.current.push(window.setTimeout(fn, ms));
  }, []);

  // 釣り開始（fishingState は startFishing/startBoatFishing でセット済み）
  // クリーンアップ関数を返し、アンマウント時に cast→waiting タイマーを解除する
  const begin = useCallback(() => {
    const t = window.setTimeout(() => {
      updateFishingState({ phase: 'waiting' });
    }, CAST_MS);
    return () => clearTimeout(t);
  }, [updateFishingState]);

  const scheduleBite = useCallback((delay: number) => {
    if (biteTimerRef.current !== null) clearTimeout(biteTimerRef.current);
    biteDueRef.current = Date.now() + delay;
    biteTimerRef.current = window.setTimeout(() => {
      biteTimerRef.current = null;
      updateFishingState({ hasBite: true });
    }, delay);
  }, [updateFishingState]);

  // waiting フェーズ: バイト待ち
  const phase = fishingState?.phase;
  const rig = fishingState?.rig ?? 'futsu';
  useEffect(() => {
    if (phase !== 'waiting') return;

    // 仕掛けでアタリ待ちが変わる（数ねらいは早く、大物ねらいは遅い）
    let delay = getBiteDelay(player.equipment) * RIGS[rig].biteMul;
    // ルアーなしペナルティ: バイト待ちが大幅に遅くなる
    if (!getEquippedItem(player.equipment, 'lure')) {
      delay *= NO_LURE_BITE_DELAY_MULTIPLIER;
    }
    penaltiesRef.current = 0;
    scheduleBite(delay);

    return () => {
      if (biteTimerRef.current !== null) clearTimeout(biteTimerRef.current);
      biteTimerRef.current = null;
    };
  }, [phase, rig, player.equipment, scheduleBite]);

  /**
   * 当たり前に押した（早合わせ）。魚が警戒して当たりが少し遅れる。
   * @returns ペナルティが入ったか（UI の文言切り替え用）
   */
  const handleEarlyTap = useCallback((): boolean => {
    if (!fishingState || fishingState.phase !== 'waiting' || fishingState.hasBite) return false;
    if (biteTimerRef.current === null || penaltiesRef.current >= EARLY_TAP_MAX_PENALTIES) return false;
    penaltiesRef.current++;
    const remaining = Math.max(0, biteDueRef.current - Date.now());
    scheduleBite(remaining + EARLY_TAP_PENALTY_MS);
    return true;
  }, [fishingState, scheduleBite]);

  // 釣り上げる（釣果＋大漁判定）。遅れて呼ばれても古い値を掴まないよう、ストアの今の値を読む。
  // sizeBonus は「手早く」で会心の合わせだったときの大きさの上乗せ
  const land = useCallback((sizeBonus = 0) => {
    const st = useGameStore.getState();
    const fs = st.fishingState;
    const me = st.players[st.currentPlayerIndex];
    if (!fs || !fs.targetFish || !me) return;
    const made = createCaughtFish(fs.targetFish.id, me.currentNode, st.turn, me.equipment);
    const caught = sizeBonus > 0 ? { ...made, size: made.size + sizeBonus } : made;

    const node = NODE_MAP.get(me.currentNode);
    const isSpecial = node?.type === 'fishing_special';
    // 大漁: 仕掛け（数ねらいは確率が上がる）と、まちづくりの漁場の状態は、一緒に揚がる魚にも効く
    const rigInfo = RIGS[fs.rig ?? 'futsu'];
    const bonusCount = checkTairyou(me.equipment, isSpecial, rigInfo.tairyouAdd);
    const bonusFish: typeof caught[] = [];
    if (bonusCount > 0 && node) {
      const opts = mergeSelectOpts(rigInfo.select, st.city ? fisheryOf(st.city, node.id).select : undefined);
      for (let i = 0; i < bonusCount; i++) {
        const extraFish = selectFish(node.id, node.region, me.equipment, isSpecial, fs.boatFishing, opts);
        bonusFish.push({ ...createCaughtFish(extraFish.id, me.currentNode, st.turn, me.equipment), via: 'tairyou' });
      }
    }

    updateFishingState({ caughtSize: caught.size, reelingProgress: 100 });
    catchFish(caught, bonusFish);
  }, [updateFishingState, catchFish]);

  // ストライク（合わせ）: t = 当たりからの正規化時間（0.5 が金の帯の中心）
  const handleStrike = useCallback((t: number) => {
    if (!fishingState || fishingState.phase !== 'waiting' || !fishingState.hasBite) return;

    // 装備の重み付きストライクレベルで帯幅を計算（WaitingPhase の描画と同一の式）
    const greenZone = getStrikeGreenZone(getEffectiveLevel(player.equipment, 'strike'));
    const judge = judgeStrike(t, greenZone);
    setStrikeOutcome(judge);

    if (judge === 'perfect' || judge === 'good') {
      buzz(judge === 'perfect' ? HAPTIC.perfect : HAPTIC.hook);
      playHook(judge === 'perfect');
      const rarity = fishingState.targetFish?.rarity ?? 'common';
      if (quickCatch && canQuickCatch(rarity, player.equipment)) {
        // 雑魚は手早く: 道具が育っていれば、小物はやり取りを省いて釣り上げる
        updateFishingState({ phase: 'strike', strikeSuccess: true, quick: true });
        later(() => {
          playCatch();
          land(judge === 'perfect' ? QUICK_CATCH_PERFECT_SIZE : 0);
        }, QUICK_CATCH_MS);
        return;
      }
      const game = drawMiniGame(rarity);
      updateFishingState({ phase: 'strike', strikeSuccess: true });
      later(() => updateFishingState({ phase: 'reeling', miniGame: game }), STRIKE_SUCCESS_MS);
    } else {
      buzz(HAPTIC.miss);
      playMiss();
      setFailReason(judge);
      updateFishingState({ phase: 'strike', strikeSuccess: false });
      later(() => failFishing(), STRIKE_FAIL_MS);
    }
  }, [fishingState, player.equipment, quickCatch, land, updateFishingState, failFishing, later]);

  // 当たりを見逃した（輪が消えるまで押さなかった）
  const handleMiss = useCallback(() => {
    if (!fishingState || fishingState.phase !== 'waiting') return;
    buzz(HAPTIC.miss);
    playMiss();
    setStrikeOutcome('missed');
    setFailReason('missed');
    updateFishingState({ phase: 'strike', strikeSuccess: false });
    later(() => failFishing(), STRIKE_FAIL_MS);
  }, [fishingState, updateFishingState, failFishing, later]);

  // ミニゲーム共通: 成功（釣果＋大漁判定）
  const handleMiniGameSuccess = useCallback(() => land(), [land]);

  // ミニゲーム共通: 失敗（理由は結果画面のヒントに使う）
  const handleMiniGameFail = useCallback((reason: FailReason = 'short') => {
    setFailReason(reason);
    failFishing();
  }, [failFishing]);

  return {
    fishingState,
    begin,
    handleStrike,
    handleEarlyTap,
    handleMiss,
    handleMiniGameSuccess,
    handleMiniGameFail,
    strikeOutcome,
    failReason,
    /** 会心の合わせ → ミニゲームに先行ボーナス */
    headStart: strikeOutcome === 'perfect',
  };
}
