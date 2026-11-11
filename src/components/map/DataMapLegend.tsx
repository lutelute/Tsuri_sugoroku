// データマップの名前の札と、色の物差し（凡例）。JapanMap の右上、「図」のボタンの左に置く。
// 札は「図」のボタンと同じ高さの行に収め、凡例はその下へ重ねて出す（下のボタンを押し下げない）。
// 色と形は CityLayer.tsx の CityDataLayer・RailLayer.tsx の RailNetworkMap の描き方と揃えること。
import type { ReactNode } from 'react';
import { DATA_MAP_LABEL } from './cityMapModes';
import type { DataMapMode } from './cityMapModes';
import Ruby from '../shared/Ruby';

interface DataMapLegendProps {
  mode: DataMapMode;
  /** 鉄道網の凡例に出す、持ち主の名前と色（プレイヤー番号の順） */
  players: { name: string; color: string }[];
}

function Row({ mark, children }: { mark: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="shrink-0 w-10 flex justify-center">{mark}</span>
      <span className="min-w-0">{children}</span>
    </div>
  );
}

/** 赤 → 黄 → 緑 の物差し（幸福度・地価）。目盛りの字は左・中・右 */
function Ramp({ ticks, low, high }: { ticks: [string, string, string]; low: string; high: string }) {
  return (
    <div>
      <div className="h-2.5 w-36 rounded-full border border-washi/40" style={{ background: 'linear-gradient(90deg, hsl(0 70% 50%), hsl(60 70% 50%), hsl(120 70% 50%))' }} />
      <div className="w-36 flex justify-between tabular-nums text-washi/85 mt-0.5">
        <span>{ticks[0]}</span>
        <span>{ticks[1]}</span>
        <span>{ticks[2]}</span>
      </div>
      <div className="w-36 flex justify-between text-washi/60">
        <span>{low}</span>
        <span>{high}</span>
      </div>
    </div>
  );
}

const sizes = (fill: string, stroke: string) => (
  <svg width={44} height={18} viewBox="0 0 44 18" aria-hidden="true">
    <circle cx={5} cy={12} r={3} fill={fill} stroke={stroke} strokeWidth={1} />
    <circle cx={16} cy={10.5} r={5} fill={fill} stroke={stroke} strokeWidth={1} />
    <circle cx={33} cy={9} r={8} fill={fill} stroke={stroke} strokeWidth={1} />
  </svg>
);

function body(mode: DataMapMode, players: DataMapLegendProps['players']): ReactNode {
  switch (mode) {
    case 'pop':
      return (
        <>
          <Row mark={sizes('rgba(90,210,130,0.45)', 'rgba(110,225,150,0.95)')}><Ruby>大きいほど人口が多い</Ruby></Row>
          <Row mark={<svg width={16} height={16} viewBox="0 0 16 16" aria-hidden="true"><circle cx={8} cy={8} r={6} fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth={1} strokeDasharray="2 2" /></svg>}>だれも いない</Row>
        </>
      );
    case 'power':
      return (
        <>
          <Row mark={<svg width={16} height={16} viewBox="0 0 16 16" aria-hidden="true"><circle cx={8} cy={8} r={6} fill="rgba(255,216,74,0.55)" stroke="#ffd84a" strokeWidth={1.2} /></svg>}><Ruby>電気が届く</Ruby></Row>
          <Row mark={<svg width={16} height={16} viewBox="0 0 16 16" aria-hidden="true"><circle cx={8} cy={8} r={6} fill="rgba(20,24,40,0.7)" stroke="rgba(255,255,255,0.5)" strokeWidth={1} strokeDasharray="2 2" /></svg>}><Ruby>電気</Ruby>が ない</Row>
          <Row
            mark={
              <svg width={18} height={18} viewBox="-9 -9 18 18" aria-hidden="true">
                <circle r={7.4} fill="#15314f" stroke="#ffd84a" strokeWidth={1.4} />
                <path d="M1.2 -5L-3 0.8H-0.4L-1.6 5L3 -1H0.4Z" fill="#ffd84a" />
              </svg>
            }
          >
            <Ruby>発電所</Ruby>
          </Row>
          <Row mark={<svg width={40} height={8} viewBox="0 0 40 8" aria-hidden="true"><path d="M2 4H38" stroke="#ffd84a" strokeWidth={1.8} strokeLinecap="round" /></svg>}><Ruby>送電</Ruby></Row>
        </>
      );
    case 'pollution':
      return <Row mark={sizes('rgba(150,90,45,0.5)', 'rgba(200,125,65,0.95)')}><Ruby>大きいほど公害</Ruby>が ひどい</Row>;
    case 'happy':
      return <Ramp ticks={['0', '5', '10']} low="ひくい" high="たかい" />;
    case 'land':
      return (
        <>
          <Ramp ticks={['×0.6', '×1.0', '×1.4']} low="やすい" high="たかい" />
          <div className="text-washi/60">もとの <Ruby>地価</Ruby>と くらべた ばいりつ</div>
        </>
      );
    case 'rail':
      return (
        <>
          {players.map((p, i) => (
            <Row key={i} mark={<svg width={40} height={8} viewBox="0 0 40 8" aria-hidden="true"><path d="M3 4H37" stroke="#fbf6e8" strokeWidth={6} strokeLinecap="round" opacity={0.85} /><path d="M3 4H37" stroke={p.color} strokeWidth={4} strokeLinecap="round" /></svg>}>
              <span style={{ color: `color-mix(in srgb, ${p.color} 55%, #f4ecd8)` }}>{p.name}</span>の<Ruby>線路</Ruby>
            </Row>
          ))}
          <Row mark={<span className="inline-block rounded-full bg-washi text-sumi font-bold px-1.5 leading-4 tabular-nums">+2</span>}>つながった <Ruby>町の</Ruby> かず</Row>
        </>
      );
    default:
      return null;
  }
}

export default function DataMapLegend({ mode, players }: DataMapLegendProps) {
  if (mode === 'none') return null;
  return (
    <div className="relative h-8 flex items-center" data-map-legend={mode}>
      <span className="text-[10px] bg-ai-900/85 border border-kin-500/30 rounded-full px-2 py-0.5 text-kin-200 font-mincho whitespace-nowrap">
        <Ruby>{DATA_MAP_LABEL[mode]}</Ruby>
      </span>
      <div className="absolute right-0 top-full mt-1 w-max max-w-[13rem] pointer-events-none bg-ai-950/90 border border-kin-500/35 rounded-lg shadow-lg px-2 py-1.5 text-[10px] leading-tight text-washi/90 space-y-0.5">
        {body(mode, players)}
      </div>
    </div>
  );
}
