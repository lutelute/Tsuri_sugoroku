import type { CSSProperties } from 'react';

interface ScreenFlashProps {
  /** フラッシュの色（吉=金、凶=朱 など） */
  color?: string;
  opacity?: number;
}

/** 画面全体が一瞬光る（一過性・操作を妨げない）。 */
export default function ScreenFlash({ color = '#fff7dc', opacity = 0.5 }: ScreenFlashProps) {
  return <div className="fx-flash" aria-hidden="true" style={{ '--flash': color, '--flash-o': opacity } as CSSProperties} />;
}
