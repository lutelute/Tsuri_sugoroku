// まちづくり: 町の画面の「線路を敷く」。この町に隣り合う中継マスごとに、向こう側の町・地形・値段と、敷けるかどうかを並べる。
// 敷く処理（工事1回・支払い）はストアが行う（onLay）。自分の建物がない町では理由を出して押せないようにする。
import { useState } from 'react';
import type { CityState } from '../../game/city';
import { getTownInfo } from '../../game/city';
import { NODE_MAP } from '../../data/boardNodes';
import { RAIL_ECONOMY, railOptions, railCount, railThemeLabel } from '../../game/railways';
import type { RailOption } from '../../game/railways';
import Button from '../shared/Button';
import Ruby from '../shared/Ruby';

interface RailSectionProps {
  city: CityState;
  townId: string;
  playerIndex: number;
  money: number;
  actionsLeft: number;
  players: { name: string; color: string }[];
  onLay: (routeId: string) => void;
}

/** 小さな鉄道記号（白黒の線。海路は藍と白の点線）。laid=false は薄い破線 */
export function RailGlyph({ sea = false, laid = true, width = 30 }: { sea?: boolean; laid?: boolean; width?: number }) {
  const h = 10;
  const y = h / 2;
  return (
    <svg width={width} height={h} viewBox={`0 0 ${width} ${h}`} aria-hidden="true" className="shrink-0">
      {laid ? (
        <>
          <line x1={1} y1={y} x2={width - 1} y2={y} stroke={sea ? '#0c1f33' : '#14100c'} strokeWidth={5} />
          <line x1={1} y1={y} x2={width - 1} y2={y} stroke={sea ? '#cfe6ff' : '#fbf6e8'} strokeWidth={sea ? 1.8 : 2.8} strokeDasharray={sea ? '2 3' : '5 5'} />
        </>
      ) : (
        <line x1={1} y1={y} x2={width - 1} y2={y} stroke="rgba(244,236,216,0.35)" strokeWidth={2} strokeDasharray="3 3" />
      )}
    </svg>
  );
}

function endName(id: string | null): string {
  if (!id) return '';
  return getTownInfo(id)?.name ?? NODE_MAP.get(id)?.name ?? id;
}

export default function RailSection({ city, townId, playerIndex, money, actionsLeft, players, onLay }: RailSectionProps) {
  const opts = railOptions(city, townId, playerIndex, money);
  const ownsHere = !!city.towns[townId]?.plots.some(p => p && p.owner === playerIndex);
  const layable = opts.filter(o => !o.reason).length;
  // 敷ける線路があれば開いておく（無ければ見出しだけ）
  const [open, setOpen] = useState(ownsHere && layable > 0 && actionsLeft > 0);
  if (opts.length === 0) return null;
  const mine = railCount(city.rails, playerIndex);

  const row = (o: RailOption) => {
    const sea = o.theme === 'sea';
    const owner = o.owner !== null ? players[o.owner] : null;
    const disabled = !!o.reason || actionsLeft <= 0;
    return (
      <li key={o.routeId} className="flex items-center gap-2 rounded-lg bg-ai-900/50 border border-kin-500/15 px-2 py-1.5">
        <RailGlyph sea={sea} laid={o.owner !== null} />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-mincho text-washi truncate">
            <Ruby>{endName(o.otherEnd)}</Ruby><span className="text-[10px] text-washi/50">へ</span>
          </div>
          <div className="text-[10px] text-washi/55 truncate">
            <Ruby>{railThemeLabel(o.routeId)}</Ruby>
            {o.owner === null && o.reason && actionsLeft > 0 && <span className="text-shu-200">・<Ruby>{o.reason}</Ruby></span>}
          </div>
        </div>
        {owner ? (
          <span className="shrink-0 text-[11px] font-bold font-mincho" style={{ color: owner.color }}>
            {o.owner === playerIndex ? <Ruby>自分の線路</Ruby> : <>{owner.name}<Ruby>の線路</Ruby></>}
          </span>
        ) : (
          <Button onClick={() => onLay(o.routeId)} variant="gold" size="sm" disabled={disabled} className="shrink-0 min-h-10">
            <Ruby>{sea ? '航路を開く' : '敷く'}</Ruby> <span className="tabular-nums">¥{o.price.toLocaleString()}</span>
          </Button>
        )}
      </li>
    );
  };

  return (
    <section data-guide="rail-build" className="rounded-xl border border-kin-500/20 bg-ai-950/35">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        className="w-full min-h-11 flex items-center justify-between gap-2 px-3 py-2 text-left cursor-pointer"
      >
        <span className="flex items-center gap-2 min-w-0">
          <RailGlyph width={22} />
          <span className="font-mincho font-bold text-kin-300"><Ruby>線路を敷く</Ruby></span>
          <span className="text-[10px] text-washi/55 truncate">
            （<Ruby>隣の中継マス</Ruby> {opts.length}）
          </span>
        </span>
        <span className="text-washi/50 text-xs" aria-hidden="true">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="px-3 pb-3 space-y-1.5">
          {!ownsHere && (
            <p className="text-[11px] text-shu-200"><Ruby>自分の建物がある町でだけ敷ける</Ruby></p>
          )}
          <ul className="space-y-1.5">{opts.map(row)}</ul>
          <p className="text-[10px] text-washi/55 leading-relaxed">
            <Ruby>{`線路のある中継マスは歩数を使わずに通り抜ける（止まれない）。つながった町は${RAIL_ECONOMY.linkSegments}区間先まで人口と働き口を分け合う。`}</Ruby>
            <Ruby>{`他の人が通るたびに運賃¥${RAIL_ECONOMY.fare}。維持費は1区間につき毎月¥${RAIL_ECONOMY.upkeep}。`}</Ruby>
          </p>
          {mine > 0 && (
            <p className="text-[10px] text-kin-200/80">
              <Ruby>{`自分の線路 ${mine}区間（維持費 毎月¥${(mine * RAIL_ECONOMY.upkeep).toLocaleString()}）`}</Ruby>
            </p>
          )}
        </div>
      )}
    </section>
  );
}
