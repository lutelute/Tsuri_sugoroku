import { useState, useCallback, useRef, useEffect } from 'react';
import { useGameStore } from '../store/useGameStore';
import { getBiteDelay, createCaughtFish, generateFishSize, getEffectiveLevel } from '../game/fishing';
import {
  FISHING_REELING_TAP_BASE,
  FISHING_REELING_TAP_PER_REEL_LEVEL,
  FISHING_TENSION_RISE_PER_TAP,
  FISHING_TENSION_DECAY_RATE,
  FISHING_TENSION_BREAK_THRESHOLD,
  FISHING_REELING_TARGET,
} from '../game/constants';

export function useFishing() {
  const {
    fishingState, players, currentPlayerIndex, turn,
    startFishing, updateFishingState, catchFish, failFishing,
  } = useGameStore();

  const player = players[currentPlayerIndex];
  const [biteTimer, setBiteTimer] = useState<number | null>(null);
  const reelingRef = useRef<number | null>(null);
  const tensionRef = useRef(0);
  const progressRef = useRef(0);

  // 釣り開始
  const begin = useCallback(() => {
    startFishing();
    // cast → waiting 自動遷移
    setTimeout(() => {
      updateFishingState({ phase: 'waiting' });
    }, 1500);
  }, [startFishing, updateFishingState]);

  // waiting フェーズ: バイト待ち
  useEffect(() => {
    if (fishingState?.phase !== 'waiting') return;

    const delay = getBiteDelay(player.equipment);
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

  // リーリング: テンション自然減衰
  useEffect(() => {
    if (fishingState?.phase !== 'reeling') return;

    const interval = window.setInterval(() => {
      tensionRef.current = Math.max(0, tensionRef.current - FISHING_TENSION_DECAY_RATE * 3);
      // 自然後退（魚の抵抗）
      progressRef.current = Math.max(0, progressRef.current - 0.35);

      updateFishingState({
        tension: tensionRef.current,
        reelingProgress: progressRef.current,
      });
    }, 50);

    reelingRef.current = interval;
    return () => clearInterval(interval);
  }, [fishingState?.phase, updateFishingState]);

  // リーリング: タップ
  const handleReelTap = useCallback(() => {
    if (!fishingState || fishingState.phase !== 'reeling') return;

    const reelingLevel = getEffectiveLevel(player.equipment, 'reeling');
    const tapPower = FISHING_REELING_TAP_BASE +
      FISHING_REELING_TAP_PER_REEL_LEVEL * (reelingLevel - 1);

    tensionRef.current += FISHING_TENSION_RISE_PER_TAP;
    progressRef.current += tapPower;

    // テンション破断チェック
    if (tensionRef.current >= FISHING_TENSION_BREAK_THRESHOLD) {
      if (reelingRef.current) clearInterval(reelingRef.current);
      updateFishingState({ tension: FISHING_TENSION_BREAK_THRESHOLD, reelingProgress: progressRef.current });
      failFishing();
      return;
    }

    // 釣り上げ成功チェック
    if (progressRef.current >= FISHING_REELING_TARGET) {
      if (reelingRef.current) clearInterval(reelingRef.current);
      const size = generateFishSize();
      const caught = createCaughtFish(fishingState.targetFish!.id, player.currentNode, turn);
      caught.size = size;
      updateFishingState({
        tension: tensionRef.current,
        reelingProgress: FISHING_REELING_TARGET,
        caughtSize: size,
      });
      catchFish(caught);
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
  };
}
