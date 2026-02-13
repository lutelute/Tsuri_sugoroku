import { useState, useCallback, useRef, useEffect } from 'react';
import { useGameStore } from '../store/useGameStore';
import { getBiteDelay, createCaughtFish, generateFishSize, getEffectiveLevel, checkTairyou, selectFish, interpolateBonus } from '../game/fishing';
import { NODE_MAP } from '../data/boardNodes';
import type { FishRarity } from '../game/types';
import {
  FISHING_REELING_TAP_BASE,
  FISHING_REELING_TAP_PER_REEL_LEVEL,
  FISHING_TENSION_RISE_PER_TAP,
  FISHING_TENSION_DECAY_RATE,
  FISHING_TENSION_BREAK_THRESHOLD,
  FISHING_REELING_TARGET,
  FISHING_REELING_TIME_LIMIT_MS,
  REEL_TENSION_TOLERANCE,
  REEL_TIME_EXTENSION,
  NO_REEL_TAP_MULTIPLIER,
  NO_REEL_TENSION_MULTIPLIER,
  NO_LURE_BITE_DELAY_MULTIPLIER,
} from '../game/constants';
import { getEquippedItem } from '../game/equipment';

// レア度による難易度倍率: テンション上昇・魚の抵抗が高くなり、タップ効果が下がる
// バランス: mythicalでも20秒あれば高レベル装備なしで釣り上げ可能
const RARITY_DIFFICULTY: Record<FishRarity, { tensionMul: number; resistMul: number; tapMul: number }> = {
  common:    { tensionMul: 1.0,  resistMul: 1.0,  tapMul: 1.0 },
  uncommon:  { tensionMul: 1.03, resistMul: 1.08, tapMul: 0.97 },
  rare:      { tensionMul: 1.07, resistMul: 1.18, tapMul: 0.92 },
  legendary: { tensionMul: 1.12, resistMul: 1.3,  tapMul: 0.85 },
  mythical:  { tensionMul: 1.18, resistMul: 1.45, tapMul: 0.78 },
};

export function useFishing() {
  const {
    fishingState, players, currentPlayerIndex, turn,
    updateFishingState, catchFish, failFishing,
  } = useGameStore();

  const player = players[currentPlayerIndex];
  const [biteTimer, setBiteTimer] = useState<number | null>(null);
  const reelingRef = useRef<number | null>(null);
  const reelingTimerRef = useRef<number | null>(null);
  const reelingStartRef = useRef(0);
  const tensionRef = useRef(0);
  const progressRef = useRef(0);
  const tensionLimitRef = useRef(FISHING_TENSION_BREAK_THRESHOLD);
  const timeLimitRef = useRef(FISHING_REELING_TIME_LIMIT_MS);

  // 釣り開始（fishingStateは既にstartFishing/startBoatFishingでセット済み）
  const begin = useCallback(() => {
    // cast → waiting 自動遷移
    setTimeout(() => {
      updateFishingState({ phase: 'waiting' });
    }, 1500);
  }, [updateFishingState]);

  // waiting フェーズ: バイト待ち
  useEffect(() => {
    if (fishingState?.phase !== 'waiting') return;

    let delay = getBiteDelay(player.equipment);
    // ルアーなしペナルティ: バイト待ちが大幅に遅くなる
    if (!getEquippedItem(player.equipment, 'lure')) {
      delay *= NO_LURE_BITE_DELAY_MULTIPLIER;
    }
    const timer = window.setTimeout(() => {
      updateFishingState({ hasBite: true });
    }, delay);

    setBiteTimer(timer as unknown as number);
    return () => clearTimeout(timer);
  }, [fishingState?.phase, player.equipment, updateFishingState]);

  // ストライク処理
  const handleStrike = useCallback((normalizedAngle: number) => {
    if (!fishingState || fishingState.phase !== 'waiting' || !fishingState.hasBite) return;

    // 装備の重み付きストライクレベルで緑ゾーンを計算
    const strikeLevel = getEffectiveLevel(player.equipment, 'strike');
    const greenZone = 0.27 + 0.05 * (strikeLevel - 1);

    // 緑ゾーンの中心は0.5に配置
    const greenStart = 0.5 - greenZone / 2;
    const greenEnd = 0.5 + greenZone / 2;

    const success = normalizedAngle >= greenStart && normalizedAngle <= greenEnd;

    if (success) {
      updateFishingState({ phase: 'strike', strikeSuccess: true });
      setTimeout(() => {
        updateFishingState({ phase: 'reeling' });
        tensionRef.current = 0;
        progressRef.current = 0;
      }, 800);
    } else {
      updateFishingState({ phase: 'strike', strikeSuccess: false });
      setTimeout(() => failFishing(), 1000);
    }
  }, [fishingState, player.equipment, updateFishingState, failFishing]);

  // リーリング: テンション自然減衰 + 制限時間
  useEffect(() => {
    if (fishingState?.phase !== 'reeling') return;

    reelingStartRef.current = Date.now();

    const rarity = fishingState.targetFish?.rarity ?? 'common';
    const diff = RARITY_DIFFICULTY[rarity];

    // リールのテンション耐性
    const toleranceLevel = getEffectiveLevel(player.equipment, 'tensionTolerance');
    const toleranceBonus = interpolateBonus(REEL_TENSION_TOLERANCE, toleranceLevel);
    tensionLimitRef.current = FISHING_TENSION_BREAK_THRESHOLD + toleranceBonus;

    // リールの制限時間延長
    const timeExtLevel = getEffectiveLevel(player.equipment, 'tensionTolerance');
    const timeExtBonus = interpolateBonus(REEL_TIME_EXTENSION, timeExtLevel);
    timeLimitRef.current = FISHING_REELING_TIME_LIMIT_MS + timeExtBonus;

    const interval = window.setInterval(() => {
      tensionRef.current = Math.max(0, tensionRef.current - FISHING_TENSION_DECAY_RATE * 3);
      // 自然後退（魚の抵抗）— レア度で増加
      progressRef.current = Math.max(0, progressRef.current - 0.35 * diff.resistMul);

      updateFishingState({
        tension: tensionRef.current,
        reelingProgress: progressRef.current,
      });
    }, 50);

    // 制限時間タイマー
    const timeLimit = window.setTimeout(() => {
      if (reelingRef.current) clearInterval(reelingRef.current);
      failFishing();
    }, timeLimitRef.current);

    reelingRef.current = interval;
    reelingTimerRef.current = timeLimit;
    return () => {
      clearInterval(interval);
      clearTimeout(timeLimit);
    };
  }, [fishingState?.phase, updateFishingState, failFishing]);

  // リーリング: タップ
  const handleReelTap = useCallback(() => {
    if (!fishingState || fishingState.phase !== 'reeling') return;

    const rarity = fishingState.targetFish?.rarity ?? 'common';
    const diff = RARITY_DIFFICULTY[rarity];

    const reelingLevel = getEffectiveLevel(player.equipment, 'reeling');
    const baseTapPower = FISHING_REELING_TAP_BASE +
      FISHING_REELING_TAP_PER_REEL_LEVEL * (reelingLevel - 1);
    let tapPower = baseTapPower * diff.tapMul;
    let tensionRise = FISHING_TENSION_RISE_PER_TAP * diff.tensionMul;

    // リールなしペナルティ
    if (!getEquippedItem(player.equipment, 'reel')) {
      tapPower *= NO_REEL_TAP_MULTIPLIER;
      tensionRise *= NO_REEL_TENSION_MULTIPLIER;
    }

    tensionRef.current += tensionRise;
    progressRef.current += tapPower;

    // テンション破断チェック（リールのテンション耐性を考慮）
    if (tensionRef.current >= tensionLimitRef.current) {
      if (reelingRef.current) clearInterval(reelingRef.current);
      if (reelingTimerRef.current) clearTimeout(reelingTimerRef.current);
      updateFishingState({ tension: tensionLimitRef.current, reelingProgress: progressRef.current });
      failFishing();
      return;
    }

    // 釣り上げ成功チェック
    if (progressRef.current >= FISHING_REELING_TARGET) {
      if (reelingRef.current) clearInterval(reelingRef.current);
      if (reelingTimerRef.current) clearTimeout(reelingTimerRef.current);
      const size = generateFishSize(player.equipment);
      const caught = createCaughtFish(fishingState.targetFish!.id, player.currentNode, turn);
      caught.size = size;

      // 大漁判定
      const node = NODE_MAP.get(player.currentNode);
      const isSpecial = node?.type === 'fishing_special';
      const bonusCount = checkTairyou(player.equipment, isSpecial);
      const bonusFish: typeof caught[] = [];
      if (bonusCount > 0 && node) {
        for (let i = 0; i < bonusCount; i++) {
          const extraFish = selectFish(node.id, node.region, player.equipment, isSpecial, fishingState.boatFishing);
          const extraSize = generateFishSize(player.equipment);
          const extra = createCaughtFish(extraFish.id, player.currentNode, turn);
          extra.size = extraSize;
          bonusFish.push(extra);
        }
      }

      updateFishingState({
        tension: tensionRef.current,
        reelingProgress: FISHING_REELING_TARGET,
        caughtSize: size,
      });
      catchFish(caught, bonusFish);
      return;
    }

    updateFishingState({
      tension: tensionRef.current,
      reelingProgress: progressRef.current,
    });
  }, [fishingState, player.equipment, player.currentNode, turn, updateFishingState, failFishing, catchFish]);

  // タイムアウト（バイトを逃す）
  const handleMiss = useCallback(() => {
    if (biteTimer) clearTimeout(biteTimer);
    failFishing();
  }, [biteTimer, failFishing]);

  return {
    fishingState,
    begin,
    handleStrike,
    handleReelTap,
    handleMiss,
    reelingStartRef,
    tensionLimitRef,
    timeLimitRef,
  };
}
