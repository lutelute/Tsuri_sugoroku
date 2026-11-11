// 復興特需の印（木槌）。地図の SVG の中（HammerShapes）と、町の画面の小さな印（RecoveryIcon）で同じ形を使う。

/** 24×24 の座標で描いた木槌。SVG の中に置く */
export function HammerShapes() {
  return (
    <>
      {/* 柄 */}
      <path d="M15 9 L5.5 18.5" stroke="#7a4a1c" strokeWidth={2.8} strokeLinecap="round" />
      {/* 頭（金の帯つき） */}
      <rect x={9} y={6} width={12} height={6} rx={1.5} transform="rotate(45 15 9)" fill="#d99a45" stroke="#5a3410" strokeWidth={1.1} />
      <path d="M12.9 6.9 L17.1 11.1" stroke="#f1d893" strokeWidth={1.2} />
    </>
  );
}

export default function RecoveryIcon({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden="true">
      <HammerShapes />
    </svg>
  );
}
