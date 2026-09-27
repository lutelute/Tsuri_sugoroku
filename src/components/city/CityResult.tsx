// まちづくり: 最終結果（総資産ランキング + 月ごとの推移グラフ）
import { useMemo } from 'react';
import type { Player } from '../../game/types';
import type { CityState } from '../../game/city';
import { cityScore, calendarLabel } from '../../game/city';
import Ruby from '../shared/Ruby';
import type { CityTitle } from '../../game/cityAwards';

function AssetChart({ city, players }: { city: CityState; players: Player[] }) {
  const hist = city.history;
  if (hist.length < 2) return null;
  const W = 320;
  const H = 140;
  const pad = { l: 44, r: 8, t: 10, b: 20 };
  const max = Math.max(1, ...hist.flatMap(h => h.assets));
  const x = (i: number) => pad.l + (i / (hist.length - 1)) * (W - pad.l - pad.r);
  const y = (v: number) => pad.t + (1 - v / max) * (H - pad.t - pad.b);
  const ticks = [0, 0.5, 1].map(k => Math.round((max * k) / 1000) * 1000);
  const first = calendarLabel(hist[0].turn);
  const last = calendarLabel(hist[hist.length - 1].turn);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="総資産の推移">
      {ticks.map(t => (
        <g key={t}>
          <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="rgba(244,236,216,0.12)" />
          <text x={pad.l - 4} y={y(t) + 3} textAnchor="end" fontSize="8" fill="rgba(244,236,216,0.5)">
            ¥{t >= 10000 ? `${Math.round(t / 1000)}k` : t.toLocaleString()}
          </text>
        </g>
      ))}
      {players.map((p, pi) => (
        <polyline
          key={p.id}
          points={hist.map((h, i) => `${x(i).toFixed(1)},${y(h.assets[pi] ?? 0).toFixed(1)}`).join(' ')}
          fill="none"
          stroke={p.color}
          strokeWidth="2"
          strokeLinejoin="round"
        />
      ))}
      <text x={pad.l} y={H - 5} fontSize="8" fill="rgba(244,236,216,0.5)">{first.year}年目{first.month}月</text>
      <text x={W - pad.r} y={H - 5} textAnchor="end" fontSize="8" fill="rgba(244,236,216,0.5)">{last.year}年目{last.month}月</text>
    </svg>
  );
}

export default function CityResult({ city, players, titleHistory = [] }: { city: CityState; players: Player[]; titleHistory?: { year: number; titles: CityTitle[] }[] }) {
  const results = useMemo(
    () => players.map((p, i) => ({ player: p, score: cityScore(city, i, p.money) })).sort((a, b) => b.score.assets - a.score.assets),
    [city, players],
  );
  const RANK = ['🥇', '🥈', '🥉', '4️⃣'];

  return (
    <div className="w-full max-w-lg space-y-4">
      {results.map((r, index) => (
        <div key={r.player.id} className={`relative rounded-2xl p-5 panel-ai ${index === 0 ? 'border-kin-500/50' : ''}`}>
          {index === 0 && (
            <span className="seal animate-seal-stamp absolute -top-3 -right-2 w-12 h-12 rounded-md font-mincho text-xs font-bold" style={{ animationDelay: '0.3s' }}>
              <Ruby>長者</Ruby>
            </span>
          )}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{RANK[index] || ''}</span>
              <span className="w-4 h-4 rounded-full ring-2 ring-white/20" style={{ backgroundColor: r.player.color }} />
              <span className="font-bold font-mincho text-lg text-washi">{r.player.name}</span>
            </div>
            <span className="text-2xl font-extrabold text-kin-300 tabular-nums">¥{r.score.assets.toLocaleString()}</span>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-white/65">
            <div className="flex justify-between"><span>💰 <Ruby>所持金</Ruby></span><span className="tabular-nums">¥{r.score.money.toLocaleString()}</span></div>
            <div className="flex justify-between"><span>🏢 <Ruby>建物の価値</Ruby></span><span className="tabular-nums">¥{r.score.property.toLocaleString()}</span></div>
            <div className="flex justify-between"><span>👪 <Ruby>人口</Ruby></span><span className="tabular-nums">{r.score.population.toLocaleString()}<Ruby>人</Ruby></span></div>
            <div className="flex justify-between"><span>🏠 <Ruby>建物</Ruby></span><span className="tabular-nums">{r.score.buildings}</span></div>
            <div className="flex justify-between"><span>👑 <Ruby>独占した町</Ruby></span><span className="tabular-nums">{r.score.monopolies}</span></div>
            <div className="flex justify-between"><span>🐟 <Ruby>釣った魚</Ruby></span><span className="tabular-nums">{r.player.caughtFish.length}<Ruby>匹</Ruby></span></div>
          </div>
        </div>
      ))}

      {titleHistory.length > 0 && (
        <div className="panel-ai rounded-2xl p-4">
          <p className="text-sm font-mincho text-kin-300 mb-2"><Ruby>年度ごとの称号</Ruby></p>
          <div className="space-y-1.5">
            {titleHistory.map(h => (
              <div key={h.year} className="flex items-start gap-2 text-xs">
                <span className="shrink-0 text-washi/60 font-mincho w-12">{h.year}<Ruby>年度</Ruby></span>
                <span className="flex flex-wrap gap-1">
                  {h.titles.map(t => (
                    <span key={`${t.id}-${t.name}`} className="px-1.5 py-0.5 rounded border" style={{ borderColor: players[t.playerIndex]?.color, color: players[t.playerIndex]?.color }}>
                      <Ruby>{t.name}</Ruby>
                    </span>
                  ))}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {city.history.length >= 2 && (
        <div className="panel-ai rounded-2xl p-4">
          <p className="text-sm font-mincho text-kin-300 mb-1"><Ruby>総資産の推移</Ruby></p>
          <AssetChart city={city} players={players} />
        </div>
      )}
    </div>
  );
}
