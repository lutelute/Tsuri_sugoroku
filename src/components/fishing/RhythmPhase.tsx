import { useState, useEffect, useRef, useCallback } from 'react';
import type { Fish, PlayerEquipment } from '../../game/types';
import { getEffectiveLevel } from '../../game/fishing';
import ProgressBar from '../shared/ProgressBar';

const MARKER_COUNT: Record<string, number> = {
  common: 7,
  uncommon: 8,
  rare: 9,
  legendary: 11,
  mythical: 13,
};

const LANE_HEIGHT = 400;
const JUDGMENT_Y = 350; // 判定ラインのY座標
const BASE_SPEED = 105; // px/sec
const MARKER_INTERVAL = 950; // ms between markers

interface Marker {
  id: number;
  spawnTime: number;
  judged: boolean;
  result?: 'perfect' | 'good' | 'miss';
}

interface RhythmPhaseProps {
  fish: Fish;
  equipment: PlayerEquipment;
  onSuccess: () => void;
  onFail: () => void;
}

export default function RhythmPhase({ fish, equipment, onSuccess, onFail }: RhythmPhaseProps) {
  const totalMarkers = MARKER_COUNT[fish.rarity] ?? 8;

  // 装備効果
  const rodLevel = getEffectiveLevel(equipment, 'strike');
  const reelLevel = getEffectiveLevel(equipment, 'reeling');
  const lureLevel = getEffectiveLevel(equipment, 'biteSpeed');

  const perfectWindow = 65 + (rodLevel - 1) * 15; // ms 竿: 判定緩和
  const goodWindow = 180 + (rodLevel - 1) * 20;
  const speed = Math.max(60, BASE_SPEED - (reelLevel - 1) * 10); // リール: 速度低下
  const perfectBonus = 1 + (lureLevel - 1) * 0.15; // ルアー: Perfectボーナス

  const [markers, setMarkers] = useState<Marker[]>([]);
  const [progress, setProgress] = useState(0);
  const [feedback, setFeedback] = useState<{ text: string; color: string; id: number } | null>(null);
  const [started, setStarted] = useState(false);

  const progressRef = useRef(0);
  const markersRef = useRef<Marker[]>([]);
  const animRef = useRef(0);
  const startTimeRef = useRef(0);
  const doneRef = useRef(false);
  const feedbackIdRef = useRef(0);
  const nextMarkerIdRef = useRef(0);
  const spawnedCountRef = useRef(0);

  // 1マーカーあたりの目標進捗（Perfect全取りで約130%になるように余裕を持たせる）
  const progressPerPerfect = Math.round((130 / totalMarkers) * perfectBonus);
  const progressPerGood = Math.round(progressPerPerfect * 0.6);
  const progressPerMiss = -2;

  // ゲーム開始
  useEffect(() => {
    const delay = setTimeout(() => {
      startTimeRef.current = Date.now();
      setStarted(true);
    }, 800);
    return () => clearTimeout(delay);
  }, []);

  // マーカー生成 + アニメーション
  useEffect(() => {
    if (!started) return;

    const loop = () => {
      if (doneRef.current) return;

      const now = Date.now();
      const elapsed = now - startTimeRef.current;

      // マーカー生成
      while (
        spawnedCountRef.current < totalMarkers &&
        elapsed >= spawnedCountRef.current * MARKER_INTERVAL
      ) {
        const marker: Marker = {
          id: nextMarkerIdRef.current++,
          spawnTime: startTimeRef.current + spawnedCountRef.current * MARKER_INTERVAL,
          judged: false,
        };
        markersRef.current = [...markersRef.current, marker];
        spawnedCountRef.current++;
      }

      // 画面外に出たマーカーをMiss判定
      const updated = markersRef.current.map(m => {
        if (m.judged) return m;
        const age = now - m.spawnTime;
        const y = (age / 1000) * speed;
        if (y > JUDGMENT_Y + 60) {
          progressRef.current = Math.max(0, progressRef.current + progressPerMiss);
          setProgress(progressRef.current);
          return { ...m, judged: true, result: 'miss' as const };
        }
        return m;
      });
      markersRef.current = updated;
      setMarkers([...updated]);

      // 全マーカー判定済みチェック
      if (
        spawnedCountRef.current >= totalMarkers &&
        updated.every(m => m.judged)
      ) {
        doneRef.current = true;
        if (progressRef.current >= 100) {
          onSuccess();
        } else {
          onFail();
        }
        return;
      }

      animRef.current = requestAnimationFrame(loop);
    };

    animRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animRef.current);
  }, [started, totalMarkers, speed, progressPerMiss, onSuccess, onFail]);

  const handleTap = useCallback(() => {
    if (doneRef.current || !started) return;

    const now = Date.now();

    // 最も近い未判定マーカーを探す
    let closest: Marker | null = null;
    let closestDist = Infinity;

    for (const m of markersRef.current) {
      if (m.judged) continue;
      const age = now - m.spawnTime;
      const y = (age / 1000) * speed;
      const dist = Math.abs(y - JUDGMENT_Y);
      if (dist < closestDist) {
        closestDist = dist;
        closest = m;
      }
    }

    if (!closest) return;

    const age = now - closest.spawnTime;
    const y = (age / 1000) * speed;
    const timeDiff = Math.abs(y - JUDGMENT_Y) / speed * 1000;

    let result: 'perfect' | 'good' | 'miss';
    let gained: number;

    if (timeDiff <= perfectWindow) {
      result = 'perfect';
      gained = progressPerPerfect;
    } else if (timeDiff <= goodWindow) {
      result = 'good';
      gained = progressPerGood;
    } else {
      result = 'miss';
      gained = progressPerMiss;
    }

    // マーカー更新
    markersRef.current = markersRef.current.map(m =>
      m.id === closest!.id ? { ...m, judged: true, result } : m
    );
    setMarkers([...markersRef.current]);

    progressRef.current = Math.max(0, Math.min(100, progressRef.current + gained));
    setProgress(progressRef.current);

    // フィードバック
    feedbackIdRef.current++;
    const fbId = feedbackIdRef.current;
    const fbText = result === 'perfect' ? `PERFECT! +${gained}%` : result === 'good' ? `GOOD +${gained}%` : `MISS ${gained}%`;
    const fbColor = result === 'perfect' ? 'text-amber-400' : result === 'good' ? 'text-cyan-300' : 'text-red-400';
    setFeedback({ text: fbText, color: fbColor, id: fbId });
    setTimeout(() => setFeedback(prev => prev?.id === fbId ? null : prev), 500);
  }, [started, speed, perfectWindow, goodWindow, progressPerPerfect, progressPerGood, progressPerMiss]);

  return (
    <div
      className="flex flex-col items-center justify-center h-full select-none cursor-pointer"
      onClick={handleTap}
    >
      <p className="text-lg font-bold mb-2 text-white/80">リズムタップ！</p>

      {/* 進捗バー */}
      <div className="w-64 mb-3">
        <ProgressBar
          value={progress}
          max={100}
          color="bg-emerald-500"
          height="h-4"
          showLabel
          label={`進捗 ${Math.round(progress)}%`}
        />
      </div>

      {/* レーン */}
      <div className="relative w-20 bg-blue-950/60 rounded-xl border border-white/10 overflow-hidden"
           style={{ height: LANE_HEIGHT }}>
        {/* 判定ライン */}
        <div
          className="absolute left-0 right-0 h-1 bg-amber-400/80 z-10"
          style={{ top: JUDGMENT_Y }}
        />
        <div
          className="absolute left-0 right-0 h-8 bg-amber-400/10 z-0 rounded"
          style={{ top: JUDGMENT_Y - 16 }}
        />

        {/* マーカー */}
        {markers.map(m => {
          if (m.judged) return null;
          const now = Date.now();
          const age = now - m.spawnTime;
          const y = (age / 1000) * speed;
          if (y < -30 || y > LANE_HEIGHT + 30) return null;

          return (
            <div
              key={m.id}
              className="absolute left-1/2 -translate-x-1/2 text-2xl pointer-events-none"
              style={{ top: y - 14 }}
            >
              🐟
            </div>
          );
        })}
      </div>

      {/* フィードバック */}
      {feedback && (
        <p key={feedback.id} className={`text-lg font-bold mt-3 animate-bounce ${feedback.color}`}>
          {feedback.text}
        </p>
      )}

      {!started && (
        <p className="text-white/50 mt-4">準備中...</p>
      )}

      <p className="text-xs text-white/30 mt-3">🐟が線に来たらタップ！</p>
    </div>
  );
}
