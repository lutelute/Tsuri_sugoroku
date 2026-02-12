import { useState, useEffect, useCallback, useRef } from 'react';

const STRIKE_TIMEOUT_MS = 2800;

interface WaitingPhaseProps {
  hasBite: boolean;
  onStrike: (normalizedAngle: number) => void;
  onMiss: () => void;
  strikeLevel: number;
}

export default function WaitingPhase({ hasBite, onStrike, onMiss, strikeLevel }: WaitingPhaseProps) {
  const [angle, setAngle] = useState(0);
  const [timeLeft, setTimeLeft] = useState(1);
  const angleRef = useRef(0);
  const missTimeoutRef = useRef<number | null>(null);
  const startTimeRef = useRef(0);

  // 円形ゲージ回転 + 制限時間カウントダウン
  useEffect(() => {
    if (!hasBite) return;

    startTimeRef.current = Date.now();

    const interval = window.setInterval(() => {
      angleRef.current = (angleRef.current + 2.7) % 360;
      setAngle(angleRef.current);

      const elapsed = Date.now() - startTimeRef.current;
      setTimeLeft(Math.max(0, 1 - elapsed / STRIKE_TIMEOUT_MS));
    }, 16);

    missTimeoutRef.current = window.setTimeout(() => {
      onMiss();
    }, STRIKE_TIMEOUT_MS);

    return () => {
      clearInterval(interval);
      if (missTimeoutRef.current) clearTimeout(missTimeoutRef.current);
    };
  }, [hasBite, onMiss]);

  const handleClick = useCallback(() => {
    if (!hasBite) return;
    if (missTimeoutRef.current) clearTimeout(missTimeoutRef.current);
    const normalizedAngle = angleRef.current / 360;
    onStrike(normalizedAngle);
  }, [hasBite, onStrike]);

  // 緑ゾーン: strikeLevel 1=27%, 5=47%
  const greenZoneSize = 0.27 + 0.05 * (strikeLevel - 1);
  const greenStartDeg = (0.5 - greenZoneSize / 2) * 360;

  // SVG円周
  const circumference = 2 * Math.PI * 40; // ~251.2

  // タイムバーの色（残り少なくなると赤に）
  const timerColor = timeLeft > 0.4 ? '#22c55e' : timeLeft > 0.2 ? '#f59e0b' : '#ef4444';

  return (
    <div className="flex flex-col items-center justify-center h-full" onClick={handleClick}>
      {!hasBite ? (
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">🎣</div>
          <p className="text-xl text-white/60 animate-pulse">当たりを待っています...</p>
          <div className="mt-4 flex justify-center gap-1">
            {[0, 1, 2].map(i => (
              <div
                key={i}
                className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
                style={{ animationDelay: `${i * 0.2}s` }}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center cursor-pointer select-none">
          <p className="text-2xl font-bold text-amber-400 mb-4 animate-pulse">
            当たり！タップ！
          </p>

          {/* 円形ゲージ */}
          <div className="relative w-56 h-56 mx-auto">
            <svg viewBox="0 0 100 100" className="w-full h-full">
              {/* 背景円 */}
              <circle
                cx="50" cy="50" r="40"
                fill="none"
                stroke="rgba(255,255,255,0.1)"
                strokeWidth="8"
              />

              {/* 緑ゾーン */}
              <circle
                cx="50" cy="50" r="40"
                fill="none"
                stroke="#22c55e"
                strokeWidth="8"
                strokeDasharray={`${greenZoneSize * circumference} ${(1 - greenZoneSize) * circumference}`}
                transform={`rotate(${greenStartDeg - 90} 50 50)`}
                opacity="0.7"
              />

              {/* インジケーター（白い玉） */}
              <circle
                cx={50 + 40 * Math.cos((angle - 90) * Math.PI / 180)}
                cy={50 + 40 * Math.sin((angle - 90) * Math.PI / 180)}
                r="5"
                fill="white"
                stroke="rgba(0,0,0,0.3)"
                strokeWidth="1"
              />
            </svg>
          </div>

          {/* 制限時間バー */}
          <div className="w-48 mx-auto mt-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs text-white/50">⏱️</span>
              <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-colors duration-200"
                  style={{
                    width: `${timeLeft * 100}%`,
                    backgroundColor: timerColor,
                  }}
                />
              </div>
            </div>
          </div>

          <p className="text-sm text-white/40 mt-2">緑のゾーンでタップ！</p>
        </div>
      )}
    </div>
  );
}
