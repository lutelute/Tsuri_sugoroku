// 駒の絵（地図の駒と同じ「地図ピン」の形）。設定画面の席・結果発表の札で、誰の色かを絵で見せる。
// 地図の駒（map/PlayerToken.tsx）と形をそろえてある。こちらは HTML の中に置く用の小さな SVG。

interface PawnProps {
  color: string;
  /** 白丸の中の文字（席の番号や CPU の印の一文字） */
  label?: string | number;
  /** 高さ(px)。幅は高さの 0.72 倍 */
  size?: number;
  /** 金の縁取り（勝者・手番） */
  gold?: boolean;
  className?: string;
}

export default function Pawn({ color, label, size = 40, gold = false, className = '' }: PawnProps) {
  const text = label === undefined ? '' : String(label);
  return (
    <svg
      viewBox="0 0 26 36"
      width={size * 0.72}
      height={size}
      className={`shrink-0 ${className}`}
      aria-hidden="true"
      focusable="false"
    >
      {/* 接地影 */}
      <ellipse cx="13" cy="33.4" rx="7" ry="2.2" fill="rgba(6,18,31,0.4)" />
      {/* ピン本体（先端が下） */}
      <path
        d="M13 33 5.4 15.4A9.6 9.6 0 1 1 20.6 15.4Z"
        fill={color}
        stroke={gold ? '#fbf0c8' : '#f1d893'}
        strokeWidth={gold ? 2 : 1.5}
        strokeLinejoin="round"
      />
      {/* 下半分の陰（立体感） */}
      <path d="M13 33 5.4 15.4c2 2.6 4.6 3.9 7.6 3.9Z" fill="#0a1a2c" opacity="0.18" />
      {/* つや */}
      <ellipse cx="9.4" cy="6.6" rx="3.4" ry="2.3" fill="#fff" opacity="0.38" />
      {/* 番号の白丸 */}
      <circle cx="13" cy="10.6" r="5.9" fill="#fbf6e8" />
      {text && (
        <text
          x="13"
          y="10.9"
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={[...text].length > 1 ? 6 : 8}
          fontWeight="bold"
          fill={color}
          fontFamily='"Shippori Mincho", serif'
        >
          {text}
        </text>
      )}
    </svg>
  );
}
