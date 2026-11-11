// まちづくり: 町の特色の札（町パネルの見出しと、マス情報の町の状況に置く）。
// 特色の名前の札と、効果の短い説明、その町に付いた理由（格を直した町はその理由）を出す。特色のない町では何も出さない。
import { traitEntryOf, traitsOf } from '../../game/cityTraits';
import { traitEffectText } from './traitText';
import Ruby from '../shared/Ruby';

function tint(color: string, pct: number): string {
  return `color-mix(in srgb, ${color} ${pct}%, transparent)`;
}

/** 暗い藍の面でも読めるよう、和紙色に寄せた明るい色 */
function light(color: string): string {
  return `color-mix(in srgb, ${color} 45%, #f4ecd8)`;
}

export default function TownTraitBadges({ nodeId, compact = false }: { nodeId: string; compact?: boolean }) {
  const entry = traitEntryOf(nodeId);
  if (!entry) return null;
  const defs = traitsOf(nodeId);

  return (
    <div className={compact ? 'mb-2 space-y-1' : 'mt-1.5 space-y-1'} data-guide="town-traits">
      {defs.length > 0 && (
        <ul className="flex flex-wrap gap-1" aria-label="町の特色">
          {defs.map(d => (
            <li
              key={d.id}
              className="inline-flex items-center gap-1 text-[11px] pl-0.5 pr-2 py-0.5 rounded-full border"
              style={{ borderColor: tint(d.color, 75), backgroundColor: tint(d.color, 24) }}
              title={d.flavor}
            >
              <span
                aria-hidden="true"
                className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] leading-none font-bold text-white font-mincho shrink-0"
                style={{ backgroundColor: d.color }}
              >
                {d.mark}
              </span>
              <span className="font-mincho font-bold text-washi whitespace-nowrap"><Ruby>{d.name}</Ruby></span>
            </li>
          ))}
        </ul>
      )}
      <ul className="text-[10.5px] leading-snug text-washi/75 space-y-0.5">
        {defs.map(d => {
          const text = traitEffectText(d, nodeId);
          if (!text) return null;
          return (
            <li key={d.id}>
              <span className="font-bold" style={{ color: light(d.color) }}>
                <Ruby>{d.name}</Ruby>
              </span>
              <span className="text-washi/45">：</span>
              <Ruby>{text}</Ruby>
            </li>
          );
        })}
      </ul>
      <p className="text-[10px] text-washi/50"><Ruby>{entry.note}</Ruby></p>
    </div>
  );
}
