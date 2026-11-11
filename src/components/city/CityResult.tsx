// まちづくり: 最終結果（順に明かす長者番付 + この局の名場面 + 年度ごとの称号 + 月ごとの推移グラフ）
import { useCallback, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import type { Player } from '../../game/types';
import type { CityState } from '../../game/city';
import { cityScore, calendarLabel } from '../../game/city';
import { personaOf } from '../../data/cpuPersonas';
import Ruby from '../shared/Ruby';
import type { CityTitle } from '../../game/cityAwards';
import ResultBoard from '../result/ResultBoard';
import type { ResultEntry } from '../result/ResultBoard';
import { CityHighlights } from '../result/HighlightCards';
import { RESULT_TEXT } from '../title/stageText';

/** 線の見分け（色だけに頼らない）: 席ごとに線の種類を変える */
const DASHES = ['', '7 4', '2 4', '10 4 2 4'];

/** 称号の判子の一文字（年度末の大決算と同じ） */
const TITLE_GLYPH: Record<CityTitle['id'], string> = {
  choja: '長', jinko: '人', denryoku: '電', kanko: '観', dokusen: '独', kogai: '公', kaoyaku: '顔',
};

function AssetChart({ city, players }: { city: CityState; players: Player[] }) {
  const hist = city.history;
  if (hist.length < 2) return null;
  const W = 340;
  const H = 176;
  const pad = { l: 46, r: 16, t: 12, b: 22 };
  const max = Math.max(1, ...hist.flatMap(h => h.assets));
  const x = (i: number) => pad.l + (i / (hist.length - 1)) * (W - pad.l - pad.r);
  const y = (v: number) => pad.t + (1 - Math.max(0, v) / max) * (H - pad.t - pad.b);
  const ticks = [0, 0.5, 1].map(k => Math.round((max * k) / 1000) * 1000);
  const first = calendarLabel(hist[0].turn);
  const last = calendarLabel(hist[hist.length - 1].turn);
  // 年度の変わり目（4月）に縦の線
  const yearLines = hist.map((h, i) => ({ i, c: calendarLabel(h.turn) })).filter(v => v.i > 0 && v.c.month === 4);
  const lastIdx = hist.length - 1;
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="総資産の推移">
        {ticks.map(t => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="rgba(244,236,216,0.14)" />
            <text x={pad.l - 5} y={y(t) + 3} textAnchor="end" fontSize="9" fill="rgba(244,236,216,0.6)">
              ¥{t >= 10000 ? `${Math.round(t / 1000)}k` : t.toLocaleString()}
            </text>
          </g>
        ))}
        {yearLines.map(v => (
          <g key={v.i}>
            <line x1={x(v.i)} x2={x(v.i)} y1={pad.t} y2={H - pad.b} stroke="rgba(212,168,67,0.3)" strokeDasharray="2 3" />
            <text x={x(v.i)} y={H - pad.b + 10} textAnchor="middle" fontSize="8" fill="rgba(241,216,147,0.7)">{v.c.year}年目</text>
          </g>
        ))}
        {players.map((p, pi) => (
          <g key={p.id}>
            <polyline
              points={hist.map((h, i) => `${x(i).toFixed(1)},${y(h.assets[pi] ?? 0).toFixed(1)}`).join(' ')}
              fill="none"
              stroke="#0a1a2c"
              strokeWidth="4.6"
              strokeLinejoin="round"
              strokeLinecap="round"
              opacity="0.55"
            />
            <polyline
              points={hist.map((h, i) => `${x(i).toFixed(1)},${y(h.assets[pi] ?? 0).toFixed(1)}`).join(' ')}
              fill="none"
              stroke={p.color}
              strokeWidth="2.6"
              strokeLinejoin="round"
              strokeLinecap="round"
              strokeDasharray={DASHES[pi % DASHES.length] || undefined}
            />
          </g>
        ))}
        {/* 終わりの点に席の番号 */}
        {players.map((p, pi) => (
          <g key={`e${p.id}`}>
            <circle cx={x(lastIdx)} cy={y(hist[lastIdx].assets[pi] ?? 0)} r="6" fill={p.color} stroke="#fbf6e8" strokeWidth="1.4" />
            <text x={x(lastIdx)} y={y(hist[lastIdx].assets[pi] ?? 0) + 2.8} textAnchor="middle" fontSize="7.5" fontWeight="bold" fill="#fff">{pi + 1}</text>
          </g>
        ))}
        <text x={pad.l} y={H - 4} fontSize="8.5" fill="rgba(244,236,216,0.6)">{first.year}年目{first.month}月</text>
        <text x={W - pad.r} y={H - 4} textAnchor="end" fontSize="8.5" fill="rgba(244,236,216,0.6)">{last.year}年目{last.month}月</text>
      </svg>
      {/* 凡例: 線の見本・席の番号・名前・最後の総資産 */}
      <ul className="hr-legend">
        {players.map((p, pi) => (
          <li key={p.id}>
            <svg width="34" height="12" viewBox="0 0 34 12" aria-hidden="true" className="shrink-0">
              <line x1="1" y1="6" x2="24" y2="6" stroke={p.color} strokeWidth="2.6" strokeLinecap="round" strokeDasharray={DASHES[pi % DASHES.length] || undefined} />
              <circle cx="28" cy="6" r="5" fill={p.color} stroke="#fbf6e8" strokeWidth="1.2" />
              <text x="28" y="8.6" textAnchor="middle" fontSize="7" fontWeight="bold" fill="#fff">{pi + 1}</text>
            </svg>
            <span className="truncate font-bold text-washi">{p.name}</span>
            <span className="ml-auto tabular-nums text-kin-300">¥{(hist[lastIdx].assets[pi] ?? 0).toLocaleString()}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

interface CityResultProps {
  city: CityState;
  players: Player[];
  titleHistory?: { year: number; titles: CityTitle[] }[];
  /** いまの巡（名場面の町の絵の季節に使う） */
  turn?: number;
  /** 最終決算で順位を見てから来た（明かし方を手早くする） */
  fromFinal?: boolean;
}

export default function CityResult({ city, players, titleHistory = [], turn = 1, fromFinal = false }: CityResultProps) {
  const results = useMemo(
    () => players.map((p, i) => ({ player: p, score: cityScore(city, i, p.money) })).sort((a, b) => b.score.assets - a.score.assets),
    [city, players],
  );
  const [revealed, setRevealed] = useState(false);
  const onRevealed = useCallback(() => setRevealed(true), []);

  const entries: ResultEntry[] = useMemo(() => results.map(({ player, score }) => ({
    playerIndex: player.id,
    name: player.name,
    color: player.color,
    pawnLabel: personaOf(player)?.mark ?? player.id + 1,
    total: score.assets,
    parts: [
      { key: 'cash', label: RESULT_TEXT.cash, icon: 'coin', value: score.money, color: '#2f9e6e' },
      { key: 'property', label: RESULT_TEXT.property, icon: 'building', value: score.property, color: '#2e5e8c' },
    ],
    stats: [
      { key: 'pop', label: RESULT_TEXT.population, icon: 'users', text: `${score.population.toLocaleString()}人` },
      { key: 'bld', label: RESULT_TEXT.buildings, icon: 'home', text: String(score.buildings) },
      { key: 'mono', label: RESULT_TEXT.monopolies, icon: 'crown', text: String(score.monopolies) },
      { key: 'fish', label: RESULT_TEXT.caught, icon: 'fish', text: `${player.caughtFish.length}匹` },
    ],
  })), [results]);

  return (
    <div className="w-full">
      <ResultBoard entries={entries} unit="yen" winnerStamp={RESULT_TEXT.winnerCity} interval={fromFinal ? 450 : undefined} onDone={onRevealed} />

      {revealed && <CityHighlights city={city} players={players} titleHistory={titleHistory} turn={turn} />}

      {revealed && (titleHistory.length > 0 || city.history.length >= 2) && (
        <div className="hr-result-extra">
          {titleHistory.length > 0 && (
            <div className="panel-ai rounded-2xl p-4 fx-rise" style={{ '--d': '500ms' } as CSSProperties}>
              <p className="text-sm font-mincho text-kin-300 mb-2"><Ruby>{RESULT_TEXT.titlesByYear}</Ruby></p>
              <div className="space-y-2">
                {titleHistory.map(h => (
                  <div key={h.year} className="flex items-start gap-2 text-xs">
                    <span className="shrink-0 text-washi/70 font-mincho w-12 pt-1">{h.year}<Ruby>年度</Ruby></span>
                    <span className="flex flex-wrap gap-1.5">
                      {h.titles.map(t => (
                        <span key={`${t.id}-${t.name}`} className="hr-title-chip" style={{ '--pc': players[t.playerIndex]?.color } as CSSProperties} title={players[t.playerIndex]?.name}>
                          <span className={`hr-mini-seal ${t.prize < 0 ? 'is-sumi' : t.prize === 0 ? 'is-kin' : ''}`}>{TITLE_GLYPH[t.id] ?? t.name.slice(0, 1)}</span>
                          <span><Ruby>{t.name}</Ruby></span>
                        </span>
                      ))}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {city.history.length >= 2 && (
            <div className="panel-ai rounded-2xl p-4 fx-rise" style={{ '--d': '650ms' } as CSSProperties}>
              <p className="text-sm font-mincho text-kin-300 mb-1"><Ruby>{RESULT_TEXT.assetChart}</Ruby></p>
              <AssetChart city={city} players={players} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
