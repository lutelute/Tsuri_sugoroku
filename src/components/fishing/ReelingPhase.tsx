import ProgressBar from '../shared/ProgressBar';

interface ReelingPhaseProps {
  progress: number;
  tension: number;
  onTap: () => void;
}

export default function ReelingPhase({ progress, tension, onTap }: ReelingPhaseProps) {
  const tensionColor = tension > 80 ? 'bg-red-500' : tension > 50 ? 'bg-amber-500' : 'bg-green-500';

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
      <div className="w-64 mb-6">
        <ProgressBar
          value={tension}
          max={100}
          color={tensionColor}
          height="h-3"
          showLabel
          label="テンション"
        />
      </div>

      {tension > 70 && (
        <p className="text-red-400 text-sm animate-pulse font-bold">
          テンション高い！少し待とう！
        </p>
      )}

      <p className="text-xs text-white/30 mt-4">画面をタップして巻き上げ</p>
    </div>
  );
}
