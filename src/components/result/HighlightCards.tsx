// 結果発表の「この局の名場面」3枚。今ある状態から出せるものだけ（計算は highlights.ts の純粋関数）。
import { useMemo } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import type { Player } from '../../game/types';
import type { CityState } from '../../game/city';
import { computeAllStats, calendarLabel } from '../../game/city';
import type { CityTitle } from '../../game/cityAwards';
import { REGION_COMPLETE_SPECIES } from '../../game/constants';
import { FISH_DATABASE } from '../../data/fishDatabase';
import { NODE_MAP } from '../../data/boardNodes';
import type { IconName } from '../shared/Icon';
import Icon from '../shared/Icon';
import Ruby from '../shared/Ruby';
import FishIllustration from '../shared/FishIllustration';
import Stamp from '../fx/Stamp';
import TownScene from '../city/TownScene';
import { RESULT_TEXT, REGION_NAME } from '../title/stageText';
import {
  findBigCatch, catchWeightKg, newSpeciesCounts, regionCatches, findBestMonth, findBiggestTown, tallyTitles,
} from './highlights';

const FISH_BY_ID = new Map(FISH_DATABASE.map(f => [f.id, f]));

/** 称号の判子の一文字（年度末の大決算と同じ） */
const TITLE_GLYPH: Record<CityTitle['id'], string> = {
  choja: '長', jinko: '人', denryoku: '電', kanko: '観', dokusen: '独', kogai: '公', kaoyaku: '顔',
};

function Who({ player }: { player: Player | undefined }) {
  if (!player) return null;
  return (
    <span className="inline-flex items-center gap-1 min-w-0 align-middle">
      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: player.color, boxShadow: '0 0 0 1px rgba(26,21,16,0.45)' }} />
      <span className="font-bold truncate">{player.name}</span>
    </span>
  );
}

function Card({ icon, label, delay, art, children }: { icon: IconName; label: string; delay: number; art?: ReactNode; children: ReactNode }) {
  return (
    <div className={`hr-hl-card washi-card fx-rise ${art ? '' : 'no-art'}`} style={{ '--d': `${delay}ms` } as CSSProperties}>
      <p className="hr-hl-kicker font-mincho"><Icon name={icon} size={15} className="shrink-0" /><Ruby>{label}</Ruby></p>
      {art && <div className="hr-hl-art">{art}</div>}
      <div className="hr-hl-body">{children}</div>
    </div>
  );
}

function Section({ children }: { children: ReactNode }) {
  return (
    <section className="hr-hl">
      <h2 className="hr-hl-title font-brush fx-rise"><Ruby>{RESULT_TEXT.highlights}</Ruby></h2>
      <div className="hr-hl-grid">{children}</div>
    </section>
  );
}

/** 席ごとの小さな棒（図鑑の新顔・称号の数） */
function Tally({ players, counts, unit }: { players: Player[]; counts: number[]; unit: string }) {
  const max = Math.max(1, ...counts);
  return (
    <div className="hr-tally">
      {players.map((p, i) => (
        <div key={p.id} className="hr-tally-row">
          <span className="hr-tally-name"><Who player={p} /></span>
          <span className="hr-tally-track"><span style={{ width: `${(counts[i] / max) * 100}%`, backgroundColor: p.color }} /></span>
          <span className="hr-tally-num tabular-nums">{counts[i]}<Ruby>{unit}</Ruby></span>
        </div>
      ))}
    </div>
  );
}

// ===== 釣り旅 =====

interface FishingHighlightsProps {
  players: Player[];
  encyclopedias: Record<string, boolean>[];
  initialEncyclopedias: Record<string, boolean>[];
}

export function FishingHighlights({ players, encyclopedias, initialEncyclopedias }: FishingHighlightsProps) {
  const big = useMemo(() => findBigCatch(players, FISH_BY_ID), [players]);
  const fresh = useMemo(() => newSpeciesCounts(encyclopedias, initialEncyclopedias, players.length), [encyclopedias, initialEncyclopedias, players.length]);
  const regions = useMemo(() => regionCatches(players, id => NODE_MAP.get(id)?.region), [players]);
  const conquered = regions.filter(r => r.species >= REGION_COMPLETE_SPECIES);
  const freshTotal = fresh.reduce((a, b) => a + b, 0);
  const bestRegion = regions[0];
  if (!big && freshTotal === 0 && !bestRegion) return null;

  return (
    <Section>
      {big && (
        <Card
          icon="fish" label={RESULT_TEXT.bigCatch} delay={150}
          art={<span className="hr-hl-fish"><FishIllustration fishId={big.fish.id} width={168} height={112} /></span>}
        >
          <p className="hr-hl-main font-brush"><Ruby>{big.fish.name}</Ruby></p>
          <p className="hr-hl-sub tabular-nums">
            {catchWeightKg(big.fish, big.caught.size)}kg・<Ruby>大きさ</Ruby>{Math.round(big.caught.size * 100)}%
          </p>
          <p className="hr-hl-sub">
            <Who player={players[big.playerIndex]} />
            {NODE_MAP.get(big.caught.caughtAt) && <span className="ml-1.5 opacity-80"><Ruby>{`${NODE_MAP.get(big.caught.caughtAt)!.name}で`}</Ruby></span>}
          </p>
        </Card>
      )}
      <Card icon="book" label={RESULT_TEXT.newSpecies} delay={300}>
        <p className="hr-hl-main font-brush"><span className="hr-hl-num tabular-nums">{freshTotal}</span><Ruby>種類</Ruby></p>
        <Tally players={players} counts={fresh} unit="種類" />
      </Card>
      {bestRegion && (
        <Card icon="map" label={conquered.length > 0 ? RESULT_TEXT.conquered : RESULT_TEXT.noConquest} delay={450}>
          {conquered.length > 0 ? (
            <div className="hr-hl-seals">
              {conquered.slice(0, 6).map((r, i) => (
                <span key={`${r.playerIndex}-${r.region}`} className="hr-hl-seal">
                  <Stamp tone="shu" size={40} delay={700 + i * 160} tilt={i % 2 ? 6 : -7} silent={i > 0}>{REGION_NAME[r.region].slice(0, 1)}</Stamp>
                  <span className="min-w-0 leading-tight">
                    <span className="block font-brush text-base"><Ruby>{REGION_NAME[r.region]}</Ruby></span>
                    <span className="block text-[11px]"><Who player={players[r.playerIndex]} /></span>
                  </span>
                </span>
              ))}
            </div>
          ) : (
            <>
              <p className="hr-hl-main font-brush"><Ruby>{REGION_NAME[bestRegion.region]}</Ruby></p>
              <p className="hr-hl-sub"><Who player={players[bestRegion.playerIndex]} /><span className="ml-1.5 tabular-nums">{bestRegion.species}<Ruby>種類</Ruby></span></p>
              <p className="hr-hl-sub opacity-75 tabular-nums"><Ruby>{`あと${Math.max(1, REGION_COMPLETE_SPECIES - bestRegion.species)}種類で制覇`}</Ruby></p>
            </>
          )}
        </Card>
      )}
    </Section>
  );
}

// ===== まちづくり =====

/** いちばん伸びた人の総資産の歩み（伸びた月に印） */
function GrowthSpark({ values, markIndex, color }: { values: number[]; markIndex: number; color: string }) {
  if (values.length < 2) return null;
  const W = 168;
  const H = 70;
  const max = Math.max(1, ...values);
  const x = (i: number) => 6 + (i / (values.length - 1)) * (W - 12);
  const y = (v: number) => H - 8 - (v / max) * (H - 18);
  const pts = values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const mx = x(markIndex);
  const my = y(values[markIndex]);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" aria-hidden="true">
      <polygon points={`${x(0)},${H - 6} ${pts} ${x(values.length - 1)},${H - 6}`} fill={color} opacity="0.16" />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" />
      {markIndex > 0 && <line x1={x(markIndex - 1)} y1={y(values[markIndex - 1])} x2={mx} y2={my} stroke="#c63a26" strokeWidth="4" strokeLinecap="round" />}
      <circle cx={mx} cy={my} r="5.5" fill="#c63a26" stroke="#fbf6e8" strokeWidth="1.6" />
    </svg>
  );
}

interface CityHighlightsProps {
  city: CityState;
  players: Player[];
  titleHistory: { year: number; titles: CityTitle[] }[];
  /** いまの巡（町の絵の季節に使う） */
  turn: number;
}

export function CityHighlights({ city, players, titleHistory, turn }: CityHighlightsProps) {
  const best = useMemo(() => findBestMonth(city.history, players.length), [city.history, players.length]);
  const stats = useMemo(() => computeAllStats(city), [city]);
  const town = useMemo(() => findBiggestTown(stats), [stats]);
  const tally = useMemo(() => tallyTitles(titleHistory, players.length), [titleHistory, players.length]);
  const big = useMemo(() => findBigCatch(players, FISH_BY_ID), [players]);
  const scenePlayers = useMemo(() => players.map(p => ({ name: p.name, color: p.color })), [players]);
  if (!best && !town && tally.top === null && !big) return null;

  const bestLabel = best ? calendarLabel(best.turn) : null;
  const bestIndex = best ? city.history.findIndex(h => h.turn === best.turn) : -1;
  const topPlayer = tally.top !== null ? players[tally.top] : undefined;
  // 同じ称号を何年も取ったら、判子は1つにまとめる
  const glyphs = [...new Set(tally.topTitles.map(t => TITLE_GLYPH[t.id] ?? t.name.slice(0, 1)))].slice(0, 5);

  return (
    <Section>
      {best && bestLabel && (
        <Card
          icon="coin" label={RESULT_TEXT.bestMonth} delay={150}
          art={<GrowthSpark values={city.history.map(h => h.assets[best.playerIndex] ?? 0)} markIndex={bestIndex} color={players[best.playerIndex]?.color ?? '#2e5e8c'} />}
        >
          <p className="hr-hl-main font-mincho font-bold tabular-nums text-[#1f6b3a]">+¥{best.delta.toLocaleString()}</p>
          <p className="hr-hl-sub">
            <Who player={players[best.playerIndex]} />
            <span className="ml-1.5 tabular-nums"><Ruby>{`${bestLabel.year}年目の${bestLabel.month}月`}</Ruby></span>
          </p>
        </Card>
      )}
      {town && (
        <Card
          icon="building" label={RESULT_TEXT.biggestTown} delay={300}
          art={<div className="hr-hl-town"><TownScene city={city} nodeId={town.nodeId} players={scenePlayers} turn={turn} stats={stats.get(town.nodeId)} /></div>}
        >
          <p className="hr-hl-main font-brush"><Ruby>{NODE_MAP.get(town.nodeId)?.name ?? ''}</Ruby></p>
          <p className="hr-hl-sub tabular-nums"><Ruby>人口</Ruby> {town.population.toLocaleString()}<Ruby>人</Ruby></p>
        </Card>
      )}
      {tally.top !== null ? (
        <Card icon="crown" label={RESULT_TEXT.titles} delay={450}>
          <div className="flex flex-wrap gap-1.5 mb-1.5">
            {glyphs.map((g, i) => (
              <Stamp key={g} tone={g === '長' ? 'kin' : 'shu'} size={38} delay={700 + i * 150} tilt={i % 2 ? 7 : -8} silent={i > 0}>{g}</Stamp>
            ))}
          </div>
          <p className="hr-hl-sub"><Who player={topPlayer} /><span className="ml-1.5 font-bold tabular-nums">{tally.counts[tally.top]}つ</span></p>
          <Tally players={players} counts={tally.counts} unit="" />
        </Card>
      ) : big ? (
        <Card
          icon="fish" label={RESULT_TEXT.bigCatch} delay={450}
          art={<span className="hr-hl-fish"><FishIllustration fishId={big.fish.id} width={168} height={112} /></span>}
        >
          <p className="hr-hl-main font-brush"><Ruby>{big.fish.name}</Ruby></p>
          <p className="hr-hl-sub tabular-nums">{catchWeightKg(big.fish, big.caught.size)}kg</p>
          <p className="hr-hl-sub"><Who player={players[big.playerIndex]} /></p>
        </Card>
      ) : null}
    </Section>
  );
}
