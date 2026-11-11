// まちづくり: 街並みの絵。町の格・特色・季節・建物・町の状態を1枚の絵（SVG）にして、町が育つ手応えを見せる。
//
// - 絵の設計図は townArt/sceneModel.ts（純粋関数）、建物の絵は townArt/buildings.tsx、背景は townArt/backdrop.tsx。
// - 建物と空き地は押せる（onSelect を渡したとき）。当たり判定は区画の幅いっぱい・高さ 44px 以上。
// - 性能: 大きな SVG は止まった絵。動くもの（煙・湯けむり・波）は上に重ねた別の要素で、transform と opacity だけを動かす。
//   建った・育った瞬間のせり上がりと紙吹雪は、区画の中身が変わったときに1回だけ。動きを減らす設定ではすべて止める。
// - ルールや数値は変えない（game/city.ts を読むだけ）。
import { useId, useMemo, useState } from 'react';
import type { CSSProperties, KeyboardEvent, ReactNode } from 'react';
import { computeAllStats, BUILDING_INFO, isUpgradable } from '../../game/city';
import type { CityState, Plot, TownStats } from '../../game/city';
import { useReducedMotion } from '../fx/useReducedMotion';
import { hash01 } from '../fx/prng';
import { MayorCrestShape } from './MayorCrest';
import { HammerShapes } from './RecoveryMark';
import {
  INK, WASHI, WASHI2, WASHI3, KIN, KIN_L, KIN_D, SHU, SHU_L, AI9, AI5, AI3, WOOD_L, WOOD_D, STONE_D, SNOW, SNOW_SHADE, WIN_LIT,
  moodOf, seedOf, mix,
} from './townArt/palette';
import type { Mood } from './townArt/palette';
import { BuildingArt, EmptyLotArt, VacantMarks, WarnSign, Nobori, Chochin, PineTree, RoundTree } from './townArt/buildings';
import { artBox, smokeVents } from './townArt/art';
import type { ArtCtx } from './townArt/art';
import { Backdrop, Foreground, Weather, TownHall, BackHouses, Birds } from './townArt/backdrop';
import type { SceneIds } from './townArt/backdrop';
import { buildSceneModel } from './townArt/sceneModel';
import type { SceneModel, SlotModel } from './townArt/sceneModel';

export interface TownScenePlayer {
  name: string;
  color: string;
}

export interface TownSceneProps {
  city: CityState;
  /** 町のマスの id */
  nodeId: string;
  /** 持ち主の色と名前（players の並びはプレイヤー番号どおり） */
  players: TownScenePlayer[];
  /** 今の巡（月と季節を決める） */
  turn: number;
  /** 選んでいる区画（town.plots の添字。無ければ null） */
  selected?: number | null;
  /** 区画を押したとき。渡さなければ絵だけ（押せない） */
  onSelect?: (plotIndex: number) => void;
  /** 町の状態。呼び出し側が computeAllStats 済みなら渡す（無ければここで計算する） */
  stats?: TownStats;
  /** 案内の指す先（data-guide="plots" と、空き地の data-guide="plot-empty"）を付ける */
  guide?: boolean;
  className?: string;
}

const KIND_TOUR = '#d0628a';
const STREET_FRONT = 18;
const STREET_BACK = 8;
/** 動く煙の数の上限（1枚の絵で） */
const MAX_VENTS = 4;

function sigOf(p: Plot | null): string {
  return p ? `${p.kind}${p.level}${p.vacant ? 'v' : ''}@${p.owner}` : '-';
}

// ===== 通り =====

function Street({ m, y, h, mood, seed }: { m: SceneModel; y: number; h: number; mood: Mood; seed: number }) {
  const snow = m.snowy;
  const paved = m.tier >= 1;
  const fill = snow ? '#f6f9fb' : paved ? '#cfc7b4' : mix(mood.soil, WASHI, 0.15);
  const marks: string[] = [];
  if (paved && !snow) {
    // 石畳の目地
    const rows = h > 12 ? 3 : 1;
    for (let r = 1; r <= rows; r++) marks.push(`M0 ${y + (h * r) / (rows + 1)}H${m.W}`);
    for (let r = 0; r <= rows; r++) {
      for (let x = (r % 2) * 9; x < m.W; x += 18) marks.push(`M${x} ${y + (h * r) / (rows + 1)}v${h / (rows + 1)}`);
    }
  } else {
    for (let i = 0; i < 16; i++) {
      const x = hash01(seed, i, 31 + y) * m.W;
      marks.push(`M${x} ${y + 2 + hash01(seed, i, 32 + y) * (h - 4)}h${2 + hash01(seed, i, 33) * 4}`);
    }
  }
  return (
    <g>
      <rect x={0} y={y - 1.4} width={m.W} height={h + 1.4} fill={fill} />
      <path d={marks.join('')} stroke={snow ? SNOW_SHADE : paved ? STONE_D : mix(mood.soil, WOOD_D, 0.35)} strokeWidth={paved && !snow ? 0.45 : 0.9} strokeLinecap="round" opacity={paved && !snow ? 0.5 : 0.6} fill="none" />
      <path d={`M0 ${y - 1.4}H${m.W}`} stroke={INK} strokeWidth={0.6} opacity={0.55} />
      {m.tier >= 3 && !snow && <path d={`M0 ${y + h - 0.8}H${m.W}`} stroke={KIN_D} strokeWidth={1.2} opacity={0.7} />}
    </g>
  );
}

/** 街灯（発展度 弐 から）。電気が来ていれば灯る */
function StreetLamp({ x, y, lit }: { x: number; y: number; lit: boolean }) {
  return (
    <g>
      {lit && <circle cx={x} cy={y - 19} r={6.4} fill={WIN_LIT} opacity={0.28} />}
      <path d={`M${x} ${y}V${y - 16}`} stroke={INK} strokeWidth={1.8} strokeLinecap="round" />
      <path d={`M${x} ${y}V${y - 16}`} stroke="#4f5b66" strokeWidth={0.9} strokeLinecap="round" />
      <path d={`M${x - 2} ${y}h4`} stroke={INK} strokeWidth={1.4} strokeLinecap="round" />
      <path d={`M${x - 1.8} ${y - 16.4}L${x - 2.4} ${y - 21}H${x + 2.4}L${x + 1.8} ${y - 16.4}Z`} fill={lit ? WIN_LIT : '#59646f'} stroke={INK} strokeWidth={0.6} strokeLinejoin="round" />
      <path d={`M${x - 3.2} ${y - 21}L${x} ${y - 23.6}L${x + 3.2} ${y - 21}Z`} fill="#3d4652" stroke={INK} strokeWidth={0.5} strokeLinejoin="round" />
    </g>
  );
}

/** 通りを歩く人（人口に応じて増える） */
function Walker({ x, y, s, tone, obi, kasa, umbrella, flip }: { x: number; y: number; s: number; tone: string; obi: string; kasa: boolean; umbrella: string | null; flip: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -s : s} ${s})`}>
      <path d="M-2.3 0L-1.5 -6.2Q0 -7.6 1.5 -6.2L2.3 0Z" fill={tone} stroke={INK} strokeWidth={0.5} strokeLinejoin="round" />
      <path d="M-1.8 -3.8h3.6" stroke={obi} strokeWidth={1.1} />
      <circle cx={0} cy={-8.5} r={1.7} fill="#f0d8b8" stroke={INK} strokeWidth={0.45} />
      {kasa ? (
        <path d="M-3.6 -8.9L0 -11.6L3.6 -8.9Z" fill={WASHI3} stroke={INK} strokeWidth={0.45} strokeLinejoin="round" />
      ) : (
        <path d="M-1.7 -8.9a1.7 1.7 0 0 1 3.4 0Z" fill={INK} />
      )}
      {umbrella && (
        <g>
          <path d="M1.6 -5V-13" stroke={INK} strokeWidth={0.5} />
          <path d="M-4.4 -12.4Q1.6 -18 7.6 -12.4Z" fill={umbrella} stroke={INK} strokeWidth={0.5} strokeLinejoin="round" />
        </g>
      )}
    </g>
  );
}

/** 足場（復興特需）。建物の前に組む竹の足場 */
function Scaffold({ w, h }: { w: number; h: number }) {
  const l = -w / 2;
  const r = w / 2;
  const d = `M${l} 0V${-h}M0 0V${-h}M${r} 0V${-h}M${l - 1.5} ${-h * 0.34}H${r + 1.5}M${l - 1.5} ${-h * 0.67}H${r + 1.5}M${l - 1.5} ${-h + 0.6}H${r + 1.5}M${l} 0L0 ${-h * 0.34}M${r} ${-h * 0.34}L0 ${-h * 0.67}`;
  return (
    <g>
      <path d={d} fill="none" stroke={INK} strokeWidth={1.9} strokeLinecap="round" />
      <path d={d} fill="none" stroke="#d2b866" strokeWidth={1} strokeLinecap="round" />
      <rect x={l + 1} y={-h * 0.67 - 1.6} width={w * 0.5} height={1.6} fill={WASHI3} stroke={INK} strokeWidth={0.4} />
    </g>
  );
}

/** 木槌の丸印 */
function MalletBadge({ x, y, r = 6.4 }: { x: number; y: number; r?: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle r={r} fill={WASHI} stroke={KIN_D} strokeWidth={1.2} />
      <g transform={`translate(${-r * 0.92} ${-r * 0.92}) scale(${(r * 1.84) / 24})`}>
        <HammerShapes />
      </g>
    </g>
  );
}

/** 門松（1月） */
function Kadomatsu({ x, y, ctx }: { x: number; y: number; ctx: ArtCtx }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <PineTree ctx={ctx} x={-2.4} y={-3} h={9} />
      <path d="M-1.6 -3V-12.4L0.4 -14.4V-3ZM0.6 -3V-15.6L2.6 -17.6V-3ZM2.8 -3V-10.6L4.8 -12.6V-3Z" fill="#7fb56a" stroke={INK} strokeWidth={0.5} strokeLinejoin="round" />
      <rect x={-3.4} y={-4.4} width={9.4} height={4.4} rx={0.8} fill="#d9b86a" stroke={INK} strokeWidth={0.6} />
      <path d="M-3.4 -2.4h9.4" stroke={SHU} strokeWidth={0.9} />
    </g>
  );
}

/** 雪だるま（雪国の2月） */
function Yukidaruma({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle cx={0} cy={-3.6} r={4} fill={SNOW} stroke={INK} strokeWidth={0.6} />
      <circle cx={0} cy={-9.6} r={2.9} fill={SNOW} stroke={INK} strokeWidth={0.6} />
      <path d="M-2.6 -12L-1.8 -15H1.8L2.6 -12Z" fill={SHU} stroke={INK} strokeWidth={0.5} strokeLinejoin="round" />
      <path d="M-1 -10h0.2M1 -10h0.2" stroke={INK} strokeWidth={0.9} strokeLinecap="round" />
    </g>
  );
}

/** あじさい（6月） */
function Ajisai({ x, y, tone }: { x: number; y: number; tone: string }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <ellipse cx={0} cy={-2.6} rx={5} ry={3.4} fill="#4f8a5a" stroke={INK} strokeWidth={0.5} />
      <circle cx={-2.2} cy={-3.6} r={1.9} fill={tone} stroke={INK} strokeWidth={0.35} />
      <circle cx={1.6} cy={-4.4} r={1.9} fill={mix(tone, WASHI, 0.35)} stroke={INK} strokeWidth={0.35} />
      <circle cx={2.4} cy={-1.8} r={1.6} fill={tone} stroke={INK} strokeWidth={0.35} />
    </g>
  );
}

// ===== 本体 =====

export default function TownScene({ city, nodeId, players, turn, selected = null, onSelect, stats, guide = false, className = '' }: TownSceneProps) {
  const reduced = useReducedMotion();
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const ids = useMemo<SceneIds>(() => ({ sky: `tw${uid}s`, cap: `tw${uid}c`, gray: `tw${uid}g`, frame: `tw${uid}f` }), [uid]);
  const st = useMemo(() => stats ?? computeAllStats(city).get(nodeId), [stats, city, nodeId]);
  const m = useMemo(() => buildSceneModel(city, nodeId, turn, st), [city, nodeId, turn, st]);

  // 背景・手前・天気は、選ぶ区画が変わっても描き直さない（memo）。そのために季節と絵の調子は作り直さない
  const month = m?.month ?? 4;
  const powered = m?.powered ?? false;
  const snowy = m?.snowy ?? false;
  const south = m?.south ?? false;
  const tourism = m?.tourism ?? 'pagoda';
  const mood = useMemo(() => moodOf(month), [month]);
  const baseCtx = useMemo<ArtCtx>(
    () => ({
      lit: powered,
      snow: snowy,
      // 南の町は冬も緑
      leaf: south && mood.leaf.bare ? { main: '#4f9d5d', light: '#7cc36b', dark: '#3a7d4c', bare: false } : mood.leaf,
      pine: mood.pine,
      grass: mood.grass,
      icon: false,
      sw: 0.9,
      tourism,
    }),
    [powered, snowy, south, tourism, mood],
  );

  // 区画の中身が変わった（建った・育った・持ち主が替わった）区画だけ、1回せり上げる。開いた直後は動かさない
  const sigs = (city.towns[nodeId]?.plots ?? []).map(sigOf);
  const sig = sigs.join(',');
  const [snap, setSnap] = useState<{ nodeId: string; sig: string; sigs: string[]; fresh: Record<number, number>; seq: number }>({ nodeId, sig, sigs, fresh: {}, seq: 0 });
  if (snap.nodeId !== nodeId) {
    setSnap({ nodeId, sig, sigs, fresh: {}, seq: 0 });
  } else if (snap.sig !== sig) {
    const fresh: Record<number, number> = {};
    sigs.forEach((s, i) => {
      if (s !== '-' && s !== snap.sigs[i]) fresh[i] = snap.seq + 1;
    });
    setSnap({ nodeId, sig, sigs, fresh, seq: snap.seq + 1 });
  }

  if (!m) return null;

  const seed = seedOf(nodeId);
  const colorOf = (owner: number) => players[owner]?.color ?? WASHI;
  const frontY = m.rows[m.rows.length - 1];
  const fgY = frontY + STREET_FRONT;
  const interactive = !!onSelect;
  const frontSlots = m.slots.filter(s => s.row === m.rows.length - 1);
  const rowL = frontSlots.length ? frontSlots[0].x - m.slotW / 2 : 8;
  const rowR = frontSlots.length ? frontSlots[frontSlots.length - 1].x + m.slotW / 2 : m.W - 8;

  // 復興特需の足場をかける建物（等級の低い順に2つまで）
  const scaffolded = new Set<number>();
  if (m.recovery > 0) {
    [...m.slots]
      .filter(s => s.plot)
      .sort((a, b) => (a.plot!.level - b.plot!.level) || a.index - b.index)
      .slice(0, 2)
      .forEach(s => scaffolded.add(s.index));
  }

  // 動く煙・湯けむりの出る所（数を絞る）
  const vents: { x: number; y: number; steam: boolean }[] = [];
  if (!reduced) {
    for (const s of m.slots) {
      if (!s.plot || s.plot.vacant) continue;
      for (const v of smokeVents(s.plot.kind, s.plot.level, m.tourism)) {
        if (vents.length < MAX_VENTS) vents.push({ x: s.x + v.x * m.scale, y: s.baseY + v.y * m.scale, steam: !!v.steam });
      }
    }
    if (vents.length < MAX_VENTS && (m.cls === 'onsen' || m.traits.includes('yunomachi'))) vents.push({ x: 92, y: m.horizon - 22, steam: true });
    if (vents.length < MAX_VENTS && m.landmark === 'volcano') vents.push({ x: 262, y: m.horizon - 46, steam: false });
  }
  const movingWater = !reduced && m.cls !== 'village';

  // 通りの人
  const walkers: ReactNode[] = [];
  const TONES = [AI5, '#7a4a3a', '#4f6f5a', '#8a5a7a', '#b08a4a', AI3, '#5a5a6a'];
  const UMB = [SHU, AI5, '#b0417a', KIN];
  const people = Array.from({ length: m.walkers }, (_, i) => ({
    x: 12 + hash01(seed, i, 11) * (m.W - 24),
    y: frontY + 9 + hash01(seed, i, 12) * 7.5,
    s: hash01(seed, i, 13) > 0.78 ? 1.05 : 1.45,
    i,
  })).sort((a, b) => a.y - b.y);
  for (const p of people) {
    walkers.push(
      <Walker
        key={p.i}
        x={p.x}
        y={p.y}
        s={p.s}
        tone={TONES[p.i % TONES.length]}
        obi={p.i % 2 ? KIN_L : SHU_L}
        kasa={hash01(seed, p.i, 14) > 0.7 && mood.extra !== 'ajisai'}
        umbrella={mood.extra === 'ajisai' ? UMB[p.i % UMB.length] : null}
        flip={hash01(seed, p.i, 15) > 0.5}
      />,
    );
  }

  // 1つの区画（建物か空き地）。区画の幅に合わせて m.scale 倍で描く（中の寸法は倍率を掛ける前の単位）
  const lw = m.slotW / m.scale;
  const renderSlot = (s: SlotModel) => {
    const p = s.plot;
    const isSel = selected === s.index;
    const box = p ? artBox(p.kind, p.level, m.tourism) : { w: 38, h: 16 };
    const selH = Math.max(box.h, 20) + 8;
    const freshSeq = snap.fresh[s.index];
    const fresh = freshSeq !== undefined && !reduced;
    const warn = !!p && !p.vacant && (p.lowMonths ?? 0) > 0;
    return (
      <g key={s.index} transform={`translate(${s.x} ${s.baseY}) scale(${m.scale})`}>
        {isSel && <rect x={-lw / 2 + 1.2} y={-selH} width={lw - 2.4} height={selH + 4.6} rx={3.4} fill={KIN_L} opacity={0.34} />}
        {p ? (
          <>
            {/* 持ち主の色の縁石 */}
            <rect x={-lw / 2 + 2.6} y={0.4} width={lw - 5.2} height={2.6} rx={1.3} fill={colorOf(p.owner)} stroke={INK} strokeWidth={0.5} />
            <g key={`b${freshSeq ?? 0}`} className={fresh ? 'tw-rise' : undefined}>
              <g filter={p.vacant ? `url(#${ids.gray})` : undefined}>
                <BuildingArt kind={p.kind} level={p.level} ctx={{ ...baseCtx, owner: colorOf(p.owner), lit: m.powered && !p.vacant }} />
              </g>
              {p.vacant && <VacantMarks ctx={baseCtx} w={box.w} />}
              {warn && <WarnSign ctx={baseCtx} x={Math.min(lw / 2 - 5, box.w / 2 - 1)} />}
              {scaffolded.has(s.index) && <Scaffold w={box.w + 3} h={Math.max(20, Math.min(box.h, 40))} />}
            </g>
            <Nobori ctx={baseCtx} x={-lw / 2 + 1.8} h={Math.max(15, Math.min(25, box.h * 0.72))} color={colorOf(p.owner)} />
            {fresh && (
              <g key={`c${freshSeq}`}>
                {Array.from({ length: 9 }, (_, i) => {
                  const style = {
                    '--tw-dx': `${(hash01(freshSeq, i, 1) - 0.5) * 46}px`,
                    '--tw-dy': `${-10 - hash01(freshSeq, i, 2) * 22}px`,
                    '--tw-r': `${(hash01(freshSeq, i, 3) - 0.5) * 520}deg`,
                    animationDelay: `${0.18 + hash01(freshSeq, i, 4) * 0.22}s`,
                  } as CSSProperties;
                  return <rect key={i} className="tw-conf" x={-1.2} y={-box.h * 0.7} width={2.4} height={3.2} fill={[KIN_L, SHU_L, WASHI, colorOf(p.owner)][i % 4]} style={style} />;
                })}
              </g>
            )}
          </>
        ) : (
          <EmptyLotArt ctx={baseCtx} />
        )}
        {isSel && (
          <g>
            <rect x={-lw / 2 + 1.2} y={-selH} width={lw - 2.4} height={selH + 4.6} rx={3.4} fill="none" stroke={INK} strokeWidth={3} opacity={0.55} />
            <rect x={-lw / 2 + 1.2} y={-selH} width={lw - 2.4} height={selH + 4.6} rx={3.4} fill="none" stroke={KIN_L} strokeWidth={1.8} />
            <path d={`M-5.6 ${-selH - 9}H5.6L0 ${-selH - 1.6}Z`} fill={KIN_L} stroke={INK} strokeWidth={0.8} strokeLinejoin="round" />
          </g>
        )}
      </g>
    );
  };

  // 通りの両脇の並木（区画の列の外側。幸福度が高いほど多い）
  const rowTrees = (r: number, by: number): ReactNode => {
    if (m.joy === 0) return null;
    const row = m.slots.filter(s => s.row === r);
    if (!row.length) return null;
    const l = row[0].x - m.slotW / 2;
    const rr = row[row.length - 1].x + m.slotW / 2;
    const xs: number[] = [];
    for (let k = 0; k < m.joy; k++) {
      if (l - 13 - k * 19 > 6) xs.push(l - 13 - k * 19);
      if (rr + 13 + k * 19 < m.W - 6) xs.push(rr + 13 + k * 19);
    }
    return xs.map((x, i) =>
      hash01(seed, i + r * 7, 41) > 0.72 ? <PineTree key={i} ctx={baseCtx} x={x} y={by} h={21} /> : <RoundTree key={i} ctx={baseCtx} x={x} y={by} h={22 + hash01(seed, i, 42) * 5} r={8.4} />,
    );
  };

  const labelOf = (s: SlotModel): string => {
    const p = s.plot;
    if (!p) return `区画${s.index + 1}: 空き地`;
    const lv = isUpgradable(p.kind) ? ` 等級${p.level}` : '';
    return `区画${s.index + 1}: ${BUILDING_INFO[p.kind].name}${lv}（${players[p.owner]?.name ?? ''}）${p.vacant ? ' 空き家' : ''}`;
  };
  const onKey = (e: KeyboardEvent<SVGRectElement>, index: number) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect?.(index);
    }
  };
  const firstEmpty = m.slots.find(s => !s.plot)?.index;

  // 季節の飾り（通りの端や区画の境）
  const lanterns = (mood.extra === 'yearend' || mood.extra === 'matsuri') && m.built > 0 && m.monopoly === null;
  const bounds = frontSlots.map(s => s.x - m.slotW / 2).concat(rowR);
  const mayorColor = m.mayor !== null ? colorOf(m.mayor) : null;
  const monoColor = m.monopoly !== null ? colorOf(m.monopoly) : null;
  const dimTown = m.built > 0 && !m.powered;

  return (
    <div className={`tw-scene ${className}`} data-guide={guide ? 'plots' : undefined}>
      <svg viewBox={`0 0 ${m.W} ${m.H}`} className="tw-svg" role={interactive ? 'group' : 'img'} aria-label={`${m.name}の街並み`}>
        <defs>
          <filter id={ids.gray} x="-5%" y="-5%" width="110%" height="110%" colorInterpolationFilters="sRGB">
            <feColorMatrix type="matrix" values="0.36 0.36 0.14 0 0.02  0.3 0.42 0.14 0 0.02  0.3 0.36 0.2 0 0.03  0 0 0 1 0" />
          </filter>
          <clipPath id={ids.frame}>
            <rect width={m.W} height={m.H} />
          </clipPath>
          <radialGradient id={`${ids.frame}v`} cx="50%" cy="46%" r="75%">
            <stop offset="0.62" stopColor={AI9} stopOpacity={0} />
            <stop offset="1" stopColor={AI9} stopOpacity={0.3} />
          </radialGradient>
        </defs>
        <g clipPath={`url(#${ids.frame})`}>
          <Backdrop m={m} mood={mood} ctx={baseCtx} seed={seed} ids={ids} />

          {/* 公害で空がくすむ */}
          {m.smog > 0.05 && (
            <g>
              <rect width={m.W} height={m.horizon + 16} fill="#5c4a38" opacity={m.smog * 0.5} />
              {m.smog > 0.3 && (
                <g fill="#6b5a4a" opacity={0.3 + m.smog * 0.3}>
                  <ellipse cx={86} cy={34} rx={54} ry={5} />
                  <ellipse cx={236} cy={22} rx={66} ry={5.6} />
                  <ellipse cx={300} cy={46} rx={44} ry={4.4} />
                </g>
              )}
            </g>
          )}

          {/* 役場と町長の旗 */}
          {mayorColor && <TownHall x={26} base={m.groundY + 8} color={mayorColor} ctx={baseCtx} crest={<MayorCrestShape r={4.3} color={mayorColor} />} />}

          {/* 表通りの裏の家並み（人口が増えるほど広がる） */}
          <BackHouses m={m} mood={mood} ctx={baseCtx} seed={seed} top={m.groundY + 7} bottom={m.rows[0] - 19} count={m.houses} />
          {m.joy === 2 && <Birds x={m.mayor !== null ? 62 : 26} y={30} />}

          {/* 奥の段から順に、通りと建物 */}
          {m.rows.map((by, r) => {
            const front = r === m.rows.length - 1;
            return (
              <g key={r}>
                {r > 0 && (
                  <g fill={WASHI} opacity={0.78}>
                    <rect x={-12} y={m.rows[r - 1] + STREET_BACK + 1} width={150} height={5.4} rx={2.7} />
                    <rect x={104} y={m.rows[r - 1] + STREET_BACK + 5.4} width={186} height={5.4} rx={2.7} />
                    <rect x={250} y={m.rows[r - 1] + STREET_BACK + 0.2} width={130} height={4.6} rx={2.3} />
                  </g>
                )}
                {r > 0 && <BackHouses m={m} mood={mood} ctx={baseCtx} seed={seed} top={m.rows[r - 1] + STREET_BACK + 16} bottom={by - 20} count={Math.ceil(m.houses / 2)} salt={r * 10} />}
                <Street m={m} y={by} h={front ? STREET_FRONT : STREET_BACK} mood={mood} seed={seed + r} />
                {rowTrees(r, by)}
                {m.slots.filter(s => s.row === r).map(renderSlot)}
              </g>
            );
          })}

          {/* 季節の飾り */}
          {lanterns && bounds.map((x, i) => (
            <g key={`l${i}`}>
              <path d={`M${x} ${frontY}V${frontY - 13}`} stroke={WOOD_D} strokeWidth={0.9} strokeLinecap="round" />
              <Chochin ctx={baseCtx} x={x} y={frontY - 15.4} r={2.2} color={mood.extra === 'matsuri' && i % 2 ? WASHI : SHU} />
            </g>
          ))}
          {mood.extra === 'newyear' && (
            <>
              <Kadomatsu x={Math.max(8, rowL - 3)} y={frontY + 15} ctx={baseCtx} />
              <Kadomatsu x={Math.min(m.W - 12, rowR - 3)} y={frontY + 15} ctx={baseCtx} />
            </>
          )}
          {mood.extra === 'yuki' && m.snowy && <Yukidaruma x={Math.min(m.W - 12, rowR - 5)} y={frontY + 15} />}
          {mood.extra === 'ajisai' && bounds.filter((_, i) => i % 2 === 1).map((x, i) => <Ajisai key={`a${i}`} x={x} y={frontY + 16.5} tone={i % 2 ? '#8f7fd0' : '#6f9fdc'} />)}

          {/* 幸福度: 高ければ通りに花、低ければ草が伸びる */}
          {m.joy === 2 && Array.from({ length: 7 }, (_, i) => {
            const x = 16 + ((i + 0.5) / 7) * (m.W - 32) + (hash01(seed, i, 44) - 0.5) * 14;
            const c = [KIND_TOUR, KIN_L, WASHI, SHU_L][i % 4];
            return (
              <g key={`f${i}`} transform={`translate(${x} ${frontY + 17.4})`}>
                <path d="M-3 0q3 -3.4 6 0" fill="#5f9a5a" stroke={INK} strokeWidth={0.4} />
                <circle cx={-1.8} cy={-2.4} r={1.3} fill={c} stroke={INK} strokeWidth={0.3} />
                <circle cx={1.4} cy={-2.8} r={1.3} fill={c} stroke={INK} strokeWidth={0.3} />
                <circle cx={0} cy={-4} r={1.3} fill={mix(c, WASHI, 0.4)} stroke={INK} strokeWidth={0.3} />
              </g>
            );
          })}
          {m.joy === 0 && m.built > 0 && Array.from({ length: 6 }, (_, i) => {
            const x = 14 + hash01(seed, i, 45) * (m.W - 28);
            return <path key={`w${i}`} d={`M${x - 2.4} ${frontY + 5 + (i % 3) * 4}l-0.6 -3.4 1.6 2 0.9 -4.2 0.9 4.2 1.6 -2 -0.6 3.4Z`} fill="#8f9a66" stroke={INK} strokeWidth={0.35} strokeLinejoin="round" />;
          })}

          {/* 街灯（発展度 弐 から） */}
          {m.tier >= 2 && bounds.filter((_, i) => i % 2 === 0).map((x, i) => (
            <g key={`s${i}`} transform={`translate(${Math.max(6, Math.min(m.W - 6, x))} ${frontY + 16.6}) scale(1.25)`}>
              <StreetLamp x={0} y={0} lit={m.powered} />
            </g>
          ))}

          {/* 発展度 参: 通りの両端に朱の門（表通りの格が上がる） */}
          {m.tier >= 3 && [Math.max(9, rowL - 5), Math.min(m.W - 9, rowR + 5)].map((x, i) => (
            <g key={`g${i}`} transform={`translate(${x} ${frontY + 3})`}>
              <rect x={-6.4} y={-27} width={2} height={27} fill={SHU} stroke={INK} strokeWidth={0.6} />
              <rect x={4.4} y={-27} width={2} height={27} fill={SHU} stroke={INK} strokeWidth={0.6} />
              <rect x={-7.6} y={-24} width={15.2} height={2} fill={SHU} stroke={INK} strokeWidth={0.6} />
              <path d="M-10.4 -27.6Q0 -29.6 10.4 -27.6L11.4 -31Q0 -33.6 -11.4 -31Z" fill={m.snowy ? SNOW : '#3d4652'} stroke={INK} strokeWidth={0.6} strokeLinejoin="round" />
              <rect x={-2.6} y={-29.4} width={5.2} height={5} rx={0.6} fill={KIN} stroke={INK} strokeWidth={0.5} />
              <circle cx={-5.4} cy={-28} r={0.9} fill={KIN_L} />
              <circle cx={5.4} cy={-28} r={0.9} fill={KIN_L} />
            </g>
          ))}

          {/* 独占: 通りいっぱいにその人の色の提灯と幟 */}
          {monoColor && (() => {
            const x0 = Math.max(6, rowL + 1);
            const x1 = Math.min(m.W - 6, rowR - 1);
            const y0 = frontY - 34;
            const sag = 9;
            const n = Math.max(7, Math.round((x1 - x0) / 24));
            const beads: ReactNode[] = [];
            for (let i = 1; i <= n; i++) {
              const t = i / (n + 1);
              const x = x0 + (x1 - x0) * t;
              const y = y0 + sag * 4 * t * (1 - t);
              beads.push(<Chochin key={i} ctx={baseCtx} x={x} y={y + 3.2} r={2.4} color={monoColor} />);
            }
            return (
              <g>
                <path d={`M${x0} ${frontY + 2}V${y0 - 3}M${x1} ${frontY + 2}V${y0 - 3}`} stroke={INK} strokeWidth={1.7} strokeLinecap="round" />
                <path d={`M${x0} ${frontY + 2}V${y0 - 3}M${x1} ${frontY + 2}V${y0 - 3}`} stroke={WOOD_L} strokeWidth={0.9} strokeLinecap="round" />
                <path d={`M${x0} ${y0}Q${(x0 + x1) / 2} ${y0 + sag * 2} ${x1} ${y0}`} fill="none" stroke={INK} strokeWidth={0.6} />
                {beads}
                <circle cx={x0} cy={y0 - 4} r={1.6} fill={KIN} stroke={INK} strokeWidth={0.4} />
                <circle cx={x1} cy={y0 - 4} r={1.6} fill={KIN} stroke={INK} strokeWidth={0.4} />
              </g>
            );
          })()}

          {/* 復興特需: 材木と木槌 */}
          {m.recovery > 0 && (
            <g transform={`translate(${Math.max(20, rowL + 8)} ${frontY + 16})`}>
              <rect x={-13} y={-2.6} width={20} height={2.6} fill={WOOD_L} stroke={INK} strokeWidth={0.5} />
              <rect x={-11} y={-5.2} width={20} height={2.6} fill="#b98f5a" stroke={INK} strokeWidth={0.5} />
              <rect x={-12.4} y={-7.8} width={18} height={2.6} fill={WOOD_L} stroke={INK} strokeWidth={0.5} />
              <MalletBadge x={14} y={-8} />
            </g>
          )}

          {walkers}

          <Foreground m={m} mood={mood} ctx={baseCtx} seed={seed} y={fgY} movingWater={movingWater} />

          {/* 夕暮れと、電気の来ていない町の暗さ */}
          {mood.dusk && <rect x={0} y={m.horizon + 5} width={m.W} height={m.H} fill={AI9} opacity={0.17} />}
          {dimTown && <rect x={0} y={m.horizon - 4} width={m.W} height={m.H} fill={AI9} opacity={0.2} />}

          <Weather m={m} mood={mood} seed={seed} />

          {/* 和紙の色味と、四隅のぼかし（絵を1枚の刷り物にまとめる） */}
          <rect width={m.W} height={m.H} fill="#f1e2bd" opacity={0.1} />
          <rect width={m.W} height={m.H} fill={`url(#${ids.frame}v)`} />

          {/* 当たり判定（奥の段 → 手前の段の順に置き、重なる所は手前を優先する） */}
          {interactive && m.slots.map(s => {
            const p = s.plot;
            const box = p ? artBox(p.kind, p.level, m.tourism) : { w: 38, h: 16 };
            const front = s.row === m.rows.length - 1;
            const top = Math.max(50, box.h * m.scale + 6);
            return (
              <rect
                key={`h${s.index}`}
                className="tw-hit"
                x={s.x - m.slotW / 2}
                y={s.baseY - top}
                width={m.slotW}
                height={top + (front ? STREET_FRONT - 2 : STREET_BACK + 2)}
                rx={4}
                fill="transparent"
                role="button"
                tabIndex={0}
                aria-label={labelOf(s)}
                aria-pressed={selected === s.index}
                data-guide={guide && !p && s.index === firstEmpty ? 'plot-empty' : undefined}
                data-plot={s.index}
                onClick={() => onSelect?.(s.index)}
                onKeyDown={e => onKey(e, s.index)}
              />
            );
          })}
        </g>
        <rect x={0.75} y={0.75} width={m.W - 1.5} height={m.H - 1.5} fill="none" stroke={WASHI2} strokeWidth={1.5} opacity={0.5} />
      </svg>

      {/* 動くもの（煙・湯けむり・波）。大きな絵を描き直さないよう、別の要素にして transform と opacity だけを動かす */}
      {(vents.length > 0 || movingWater) && (
        <div className="tw-anim" aria-hidden="true">
          {vents.flatMap((v, i) =>
            [0, 1].map(k => (
              <span
                key={`${i}_${k}`}
                className={`tw-puff${v.steam ? ' is-steam' : mood.dusk ? ' is-dusk' : ''}`}
                style={{ left: `${(v.x / m.W) * 100}%`, top: `${(v.y / m.H) * 100}%`, animationDelay: `${-k * 2.4 - i * 0.9}s` }}
              />
            )),
          )}
          {movingWater && (
            <div className="tw-water" style={{ top: `${((fgY + 5.5) / m.H) * 100}%`, height: `${((m.H - fgY - 6.5) / m.H) * 100}%` }}>
              <svg className="tw-water-svg" viewBox={`0 0 ${m.W + 42} ${m.H - fgY - 6.5}`} preserveAspectRatio="none">
                <path
                  d={[0, 1, 2].map(r => Array.from({ length: 11 }, (_, i) => `M${i * 42 + (r % 2) * 21 - 4} ${3.4 + r * 5.6}q4 -2.6 8 0q4 -2.6 8 0`).join('')).join('')}
                  fill="none"
                  stroke={WASHI}
                  strokeWidth={0.7}
                  strokeLinecap="round"
                  opacity={0.62}
                />
              </svg>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
