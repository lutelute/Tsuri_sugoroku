import { PIPS } from './diceFaces';

/** 小さな出目表示（平面）。バナーやチップに添える。 */
export default function MiniDie({ value, size = 22 }: { value: number; size?: number }) {
  const pips = PIPS[value] ?? [];
  return (
    <span
      role="img"
      aria-label={`出目 ${value}`}
      className="inline-grid shrink-0 rounded-[22%] shadow"
      style={{
        width: size,
        height: size,
        padding: size * 0.12,
        gridTemplateColumns: 'repeat(3, 1fr)',
        gridTemplateRows: 'repeat(3, 1fr)',
        background: 'radial-gradient(circle at 30% 25%, #fffdf6, #f1e7cf 60%, #dccb9f)',
        border: '1px solid rgba(154,111,36,0.5)',
      }}
    >
      {Array.from({ length: 9 }, (_, cell) => (
        <span key={cell} className="flex items-center justify-center">
          {pips.includes(cell) && (
            <span
              className="rounded-full"
              style={{
                width: value === 1 ? '120%' : '72%',
                height: value === 1 ? '120%' : '72%',
                background: value === 1 ? '#c63a26' : '#1a1510',
              }}
            />
          )}
        </span>
      ))}
    </span>
  );
}
