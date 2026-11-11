// 魚影（影絵）: FishIllustration の silhouette を藍に染め、画面とめずらしさに合わせて大きくする。
import type { CSSProperties, ReactNode } from 'react';

interface FishShadowProps {
  /** めずらしさ・大きさの倍率（画面幅の倍率 --um-fish-k に掛かる） */
  k?: number;
  /** 画面幅の倍率を使わず、この倍率だけで描く（札の中の小さな絵） */
  fixed?: boolean;
  /** 尾のうしろに泡の航跡を出す */
  wake?: boolean;
  opacity?: number;
  /** 影絵の中身（左向きの FishIllustration silhouette） */
  children: ReactNode;
}

export default function FishShadow({ k = 1, fixed = false, wake = false, opacity, children }: FishShadowProps) {
  const style = { '--um-k': k, ...(fixed ? { '--um-fish-k': 1 } : {}), ...(opacity !== undefined ? { opacity } : {}) } as CSSProperties;
  return (
    <div className="um-shadow" style={style}>
      <div className="um-shadow-ink">{children}</div>
      {wake && (
        <span className="um-wake" aria-hidden>
          <i /><i /><i />
        </span>
      )}
    </div>
  );
}
