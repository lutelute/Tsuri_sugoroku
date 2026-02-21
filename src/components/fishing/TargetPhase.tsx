import { useState, useEffect, useRef, useCallback } from 'react';
import type { Fish, PlayerEquipment } from '../../game/types';
import { getEffectiveLevel, interpolateBonus } from '../../game/fishing';
import { REEL_TIME_EXTENSION } from '../../game/constants';
import FishIllustration from '../shared/FishIllustration';
import ProgressBar from '../shared/ProgressBar';

const HITS_REQUIRED: Record<string, number> = {
  common: 3,
  uncommon: 3,
  rare: 4,
  legendary: 5,
  mythical: 6,
};

const BASE_TIME = 25000;
const BASE_SPEED = 1.8; // px per frame at 60fps

interface TargetPhaseProps {
  fish: Fish;
  equipment: PlayerEquipment;
  onSuccess: () => void;
  onFail: () => void;
}

export default function TargetPhase({ fish, equipment, onSuccess, onFail }: TargetPhaseProps) {
  const required = HITS_REQUIRED[fish.rarity] ?? 5;
  const [hits, setHits] = useState(0);
  const [timeLeft, setTimeLeft] = useState(BASE_TIME);
  const [feedback, setFeedback] = useState<{ x: number; y: number; id: number } | null>(null);
  const feedbackId = useRef(0);

  // 装備効果
  const rodLevel = getEffectiveLevel(equipment, 'strike');
  const reelLevel = getEffectiveLevel(equipment, 'tensionTolerance');
  const lureLevel = getEffectiveLevel(equipment, 'biteSpeed');
  const hitRadius = 44 + (rodLevel - 1) * 5; // 竿: ヒット判定範囲拡大
  const timeBonus = interpolateBonus(REEL_TIME_EXTENSION, reelLevel);
  const totalTime = BASE_TIME + timeBonus;
  const speedMul = Math.max(0.4, 1 - (lureLevel - 1) * 0.1); // ルアー: 速度低下

  const posRef = useRef({ x: 150, y: 200 });
  const velRef = useRef({ x: BASE_SPEED * speedMul, y: BASE_SPEED * 0.7 * speedMul });
  const animRef = useRef(0);
  const startRef = useRef(Date.now());
  const doneRef = useRef(false);
  const hitsRef = useRef(0);

  // 初期化
  useEffect(() => {
    startRef.current = Date.now();
    setTimeLeft(totalTime);
    doneRef.current = false;
    hitsRef.current = 0;
  }, [totalTime]);

  // アニメーションループ
  useEffect(() => {
    const areaW = 300;
    const areaH = 350;

    const loop = () => {
      if (doneRef.current) return;
      const pos = posRef.current;
      const vel = velRef.current;

      pos.x += vel.x;
      pos.y += vel.y;

      if (pos.x < 30 || pos.x > areaW - 30) vel.x *= -1;
      if (pos.y < 30 || pos.y > areaH - 30) vel.y *= -1;

      pos.x = Math.max(30, Math.min(areaW - 30, pos.x));
      pos.y = Math.max(30, Math.min(areaH - 30, pos.y));

      const elapsed = Date.now() - startRef.current;
      const left = Math.max(0, totalTime - elapsed);
      setTimeLeft(left);

      if (left <= 0 && !doneRef.current) {
        doneRef.current = true;
        onFail();
        return;
      }

      animRef.current = requestAnimationFrame(loop);
    };

    animRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animRef.current);
  }, [totalTime, onFail]);

  const handleTap = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (doneRef.current) return;

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    let clientX: number, clientY: number;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const tapX = clientX - rect.left;
    const tapY = clientY - rect.top;
    const pos = posRef.current;
    const dist = Math.sqrt((tapX - pos.x) ** 2 + (tapY - pos.y) ** 2);

    if (dist <= hitRadius) {
      const newHits = hitsRef.current + 1;
      hitsRef.current = newHits;
      setHits(newHits);

      // ヒットフィードバック
      feedbackId.current++;
      setFeedback({ x: pos.x, y: pos.y, id: feedbackId.current });
      setTimeout(() => setFeedback(prev => prev?.id === feedbackId.current ? null : prev), 400);

      // 方向をランダムに変更
      const speed = BASE_SPEED * speedMul;
      const angle = Math.random() * Math.PI * 2;
      velRef.current = { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed };

      if (newHits >= required) {
        doneRef.current = true;
        onSuccess();
      }
    }
  }, [hitRadius, required, speedMul, onSuccess]);

  const timeRatio = timeLeft / totalTime;
  const timeColor = timeRatio > 0.4 ? 'bg-cyan-500' : timeRatio > 0.2 ? 'bg-amber-500' : 'bg-red-500';

  return (
    <div className="flex flex-col items-center justify-center h-full select-none">
      <p className="text-lg font-bold mb-3 text-white/80">魚をタップして捕まえろ！</p>

      <div className="mb-3 text-center">
        <span className="text-sm text-amber-400 font-bold">
          {hits}/{required} ヒット
        </span>
      </div>

      {/* ゲームエリア */}
      <div
        className="relative w-[300px] h-[350px] bg-blue-950/50 rounded-2xl border border-white/10 overflow-hidden cursor-pointer"
        onClick={handleTap}
        onTouchStart={handleTap}
      >
        {/* 魚 */}
        <div
          className="absolute transition-none"
          style={{
            left: posRef.current.x - 30,
            top: posRef.current.y - 20,
            width: 60,
            height: 40,
          }}
        >
          <FishIllustration fishId={fish.id} width={60} height={40} />
        </div>

        {/* ヒットフィードバック */}
        {feedback && (
          <div
            key={feedback.id}
            className="absolute text-amber-400 text-2xl font-bold animate-ping pointer-events-none"
            style={{ left: feedback.x - 15, top: feedback.y - 15 }}
          >
            HIT!
          </div>
        )}
      </div>

      {/* 制限時間 */}
      <div className="w-64 mt-4">
        <ProgressBar
          value={timeLeft}
          max={totalTime}
          color={timeColor}
          height="h-2"
          showLabel
          label={`残り ${Math.ceil(timeLeft / 1000)}秒`}
        />
      </div>

      <p className="text-xs text-white/30 mt-3">魚をタップして{required}回当てよう</p>
    </div>
  );
}
