interface QuestSealProps {
  /** 判子の一文字（建・旗・魚 など。cityQuests.ts の QuestDef.glyph） */
  glyph: string;
  /** 達成した（朱で塗る） */
  done?: boolean;
  /** 一辺(px) */
  size?: number;
  /** 和紙の面の上に置く（一覧のシート・大決算）。省くと藍の帯の上の色 */
  onWashi?: boolean;
}

/** お題の印（動かない小さな判子）。達成すると朱で塗られる。飾りなので読み上げない。 */
export default function QuestSeal({ glyph, done = false, size = 18, onWashi = false }: QuestSealProps) {
  return (
    <span
      aria-hidden="true"
      className={`qs-seal${done ? ' is-done' : ''}${onWashi ? ' on-washi' : ''}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.62) }}
    >
      {glyph}
    </span>
  );
}
