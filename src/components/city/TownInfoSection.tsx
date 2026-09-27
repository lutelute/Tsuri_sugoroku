// マス情報パネル用: まちづくりモードでの町の状況（区画・持ち主・人口など）
import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useGameStore } from '../../store/useGameStore';
import { getTownInfo, computeAllStats, TOWN_CLASS_INFO, BUILDING_INFO, buildCost, monopolyOwner, effectiveLandValue, CITY_ECONOMY, TIER_LABEL } from '../../game/city';
import BuildingGlyph from './BuildingGlyph';
import Ruby from '../shared/Ruby';

export default function TownInfoSection({ nodeId }: { nodeId: string }) {
  const { city, players } = useGameStore(useShallow(s => ({ city: s.city, players: s.players })));
  const stats = useMemo(() => (city ? computeAllStats(city) : null), [city]);
  const info = getTownInfo(nodeId);
  if (!city || !info || !stats) return null;
  const town = city.towns[nodeId];
  const st = stats.get(nodeId);
  if (!town || !st) return null;
  const mono = monopolyOwner(town);
  const isDest = city.destination === nodeId;

  return (
    <div className="mt-3 p-3 rounded-lg bg-emerald-900/20 border border-emerald-500/25">
      <div className="flex items-center gap-2 text-[11px] mb-2 flex-wrap">
        <span className="px-2 py-0.5 rounded-full bg-kin-500/20 border border-kin-500/35 text-kin-200"><Ruby>{TOWN_CLASS_INFO[info.cls].name}</Ruby></span>
        {(town.tier ?? 0) > 0 && <span className="px-2 py-0.5 rounded-full bg-shu-600/30 border border-shu-400/50 text-shu-100"><Ruby>発展度</Ruby> {TIER_LABEL[town.tier ?? 0]}</span>}
        <span className="text-washi/60"><Ruby>地価</Ruby> ×{effectiveLandValue(nodeId, town).toFixed(2)}（<Ruby>住宅</Ruby> ¥{buildCost('res', nodeId, town).toLocaleString()}〜）</span>
        {isDest && <span className="px-2 py-0.5 rounded-full bg-shu-600/40 border border-shu-400/50 text-shu-100"><Ruby>目的地</Ruby> ¥{city.destinationReward.toLocaleString()}</span>}
      </div>
      <div className="grid grid-cols-4 gap-1 text-center text-[11px] mb-2">
        <div><div className="text-washi/45"><Ruby>人口</Ruby></div><div className="font-bold tabular-nums">{st.population.toLocaleString()}</div></div>
        <div><div className="text-washi/45"><Ruby>幸福度</Ruby></div><div className="font-bold tabular-nums">{st.happiness.toFixed(1)}</div></div>
        <div><div className="text-washi/45"><Ruby>公害</Ruby></div><div className="font-bold tabular-nums">{st.pollution.toFixed(1)}</div></div>
        <div><div className="text-washi/45"><Ruby>電力</Ruby></div><div className={`font-bold ${st.powered ? 'text-kin-300' : 'text-shu-400'}`}>{st.powered ? '有' : '無'}</div></div>
      </div>
      <div className="flex gap-1 flex-wrap">
        {town.plots.map((p, i) => (
          <div
            key={i}
            className="w-10 h-10 rounded-md border flex items-center justify-center bg-ai-950/40"
            style={{ borderColor: p ? players[p.owner]?.color : 'rgba(255,255,255,0.12)' }}
            title={p ? `${BUILDING_INFO[p.kind].name}（${players[p.owner]?.name}）` : '空き地'}
          >
            {p ? <BuildingGlyph kind={p.kind} level={p.level} size={26} className={p.vacant ? 'grayscale opacity-50' : ''} /> : <span className="text-washi/20 text-xs">空</span>}
          </div>
        ))}
      </div>
      {mono !== null && (
        <p className="text-[11px] mt-1.5" style={{ color: players[mono]?.color }}>{players[mono]?.name}<Ruby>が独占中（収入</Ruby>{CITY_ECONOMY.monopolyMul}<Ruby>倍）</Ruby></p>
      )}
    </div>
  );
}
