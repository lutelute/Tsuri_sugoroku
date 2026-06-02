import { Fragment, useMemo } from 'react';
import { useSettingsStore } from '../../store/useSettingsStore';
import { toRubySegments } from '../../data/furigana';

interface RubyProps {
  children: string;
  className?: string;
}

/**
 * 子供向けのふりがな（ルビ）表示。
 * 設定がONのとき、辞書にある語へ <ruby> でふりがなを振る。OFFならそのまま表示。
 * HTML用（SVG <text> 内では使えない点に注意）。
 */
export default function Ruby({ children, className }: RubyProps) {
  const enabled = useSettingsStore(s => s.furiganaEnabled);
  const segs = useMemo(
    () => (enabled && typeof children === 'string' ? toRubySegments(children) : null),
    [enabled, children],
  );

  if (!segs) return <>{children}</>;

  return (
    <>
      {segs.map((s, i) =>
        s.r ? (
          <ruby key={i} className={className}>
            {s.t}
            <rt>{s.r}</rt>
          </ruby>
        ) : (
          <Fragment key={i}>{s.t}</Fragment>
        ),
      )}
    </>
  );
}
