import { useState, useEffect } from 'react';
import ProgressBar from '../shared/ProgressBar';

interface ReelingPhaseProps {
  progress: number;
  tension: number;
  tensionMax: number;
  timeLimit: number;
  onTap: () => void;
  startTime: number;
}

export default function ReelingPhase({ progress, tension, tensionMax, timeLimit, onTap, startTime }: ReelingPhaseProps) {
  const tensionRatio = tension / tensionMax;
  const tensionColor = tensionRatio > 0.8 ? 'bg-red-500' : tensionRatio > 0.5 ? 'bg-amber-500' : 'bg-green-500';
  const [timeLeft, setTimeLeft] = useState(timeLimit);

  useEffect(() => {
    const interval = window.setInterval(() => {
      const elapsed = Date.now() - startTime;
      setTimeLeft(Math.max(0, timeLimit - elapsed));
    }, 100);
    return () => clearInterval(interval);
  }, [startTime, timeLimit]);

  const timeRatio = timeLeft / timeLimit;
  const timeColor = timeRatio > 0.4 ? 'bg-cyan-500' : timeRatio > 0.2 ? 'bg-amber-500' : 'bg-red-500';

  return (
    <div
      className="flex flex-col items-center justify-center h-full cursor-pointer select-none"
      onClick={onTap}
    >
      <p className="text-lg font-bold mb-6 text-white/80">リズミカルにタップ！</p>

      {/* 魚のアイコン */}
      <div className="text-5xl mb-6 animate-bounce" style={{ animationDuration: '0.5s' }}>
        🐟
      </div>

      {/* リーリング進捗 */}
      <div className="w-64 mb-4">
        <ProgressBar
          value={progress}
          max={100}
          color="bg-blue-500"
          height="h-5"
          showLabel
          label="リーリング"
        />
      </div>

      {/* テンションゲージ */}
      <div className="w-64 mb-3">
        <ProgressBar
          value={tension}
          max={tensionMax}
          color={tensionColor}
          height="h-3"
          showLabel
          label="テンション"
        />
      </div>

      {/* 制限時間バー */}
      <div className="w-64 mb-4">
        <ProgressBar
          value={timeLeft}
          max={timeLimit}
          color={timeColor}
          height="h-2"
          showLabel
          label={`残り ${Math.ceil(timeLeft / 1000)}秒`}
        />
      </div>

      {tensionRatio > 0.7 && (
        <p className="text-red-400 text-sm animate-pulse font-bold">
          テンション高い！少し待とう！
        </p>
      )}

      {timeRatio <= 0.2 && timeRatio > 0 && (
        <p className="text-amber-400 text-xs animate-pulse mt-1">
          時間がない！急いで！
        </p>
      )}

      <p className="text-xs text-white/30 mt-4">画面をタップして巻き上げ</p>
    </div>
  );
}
