import { useState, useEffect } from 'react';
import { FISHING_REELING_TIME_LIMIT_MS } from '../../game/constants';
import ProgressBar from '../shared/ProgressBar';

interface ReelingPhaseProps {
  progress: number;
  tension: number;
  onTap: () => void;
  startTime: number;
}

export default function ReelingPhase({ progress, tension, onTap, startTime }: ReelingPhaseProps) {
  const tensionColor = tension > 80 ? 'bg-red-500' : tension > 50 ? 'bg-amber-500' : 'bg-green-500';
  const [timeLeft, setTimeLeft] = useState(FISHING_REELING_TIME_LIMIT_MS);

  useEffect(() => {
    const interval = window.setInterval(() => {
      const elapsed = Date.now() - startTime;
      setTimeLeft(Math.max(0, FISHING_REELING_TIME_LIMIT_MS - elapsed));
    }, 100);
    return () => clearInterval(interval);
  }, [startTime]);

  const timeRatio = timeLeft / FISHING_REELING_TIME_LIMIT_MS;
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
          max={100}
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
          max={FISHING_REELING_TIME_LIMIT_MS}
          color={timeColor}
          height="h-2"
          showLabel
          label={`残り ${Math.ceil(timeLeft / 1000)}秒`}
        />
      </div>

      {tension > 70 && (
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
