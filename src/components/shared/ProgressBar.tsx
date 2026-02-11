interface ProgressBarProps {
  value: number;
  max: number;
  color?: string;
  height?: string;
  showLabel?: boolean;
  label?: string;
  className?: string;
}

export default function ProgressBar({
  value,
  max,
  color = 'bg-blue-500',
  height = 'h-3',
  showLabel = false,
  label,
  className = '',
}: ProgressBarProps) {
  const percent = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div className={className}>
      {showLabel && (
        <div className="flex justify-between text-xs mb-1 text-white/70">
          <span>{label || ''}</span>
          <span>{Math.round(percent)}%</span>
        </div>
      )}
      <div className={`${height} bg-white/10 rounded-full overflow-hidden`}>
        <div
          className={`h-full ${color} rounded-full transition-all duration-300`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
