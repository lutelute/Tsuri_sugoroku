// 町の絵: 背景（空・雲・遠くの山と海・その町の目印・町の特色・中景）と、天気・手前の帯。
// 浮世絵の調子: 上が濃い空のぼかし、すやり霞、平たい色面の山。動かすのは煙・湯けむり・水面だけ。
import { memo } from 'react';
import type { ReactNode } from 'react';
import { hash01 } from '../../fx/prng';
import {
  INK, WASHI, WASHI2, WASHI3, KIN, KIN_L, KIN_D, SHU, SHU_L, SHU_D, AI9, AI7, AI5, AI4, AI3, AI2,
  WOOD, WOOD_L, WOOD_D, STONE, STONE_D, SNOW, SNOW_SHADE, WIN_LIT, KIND, mix,
} from './palette';
import type { Mood } from './palette';
import { RoundTree, PineTree, Steam } from './buildings';
import { roofD } from './art';
import type { ArtCtx } from './art';
import type { SceneModel } from './sceneModel';

export interface SceneIds {
  sky: string;
  cap: string;
  gray: string;
  frame: string;
}

interface LayerProps {
  m: SceneModel;
  mood: Mood;
  ctx: ArtCtx;
  seed: number;
}

const thin = { stroke: INK, strokeWidth: 0.6, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };

/** 山の稜線。taper で右端を海へなだらかに落とす */
function ridgeD(seed: number, salt: number, x0: number, x1: number, baseY: number, ampMin: number, ampMax: number, peaks: number, bottom: number, taper = false): string {
  const n = peaks * 2;
  const step = (x1 - x0) / n;
  const pts: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const edge = i === 0 || i === n;
    const jx = edge ? 0 : (hash01(seed, i, salt) - 0.5) * step * 0.7;
    const peak = i % 2 === 1;
    let a = peak ? ampMin + hash01(seed, i, salt + 1) * (ampMax - ampMin) : hash01(seed, i, salt + 2) * ampMin * 0.5;
    if (taper) a *= Math.max(0, 1 - Math.pow(i / n, 1.6));
    pts.push([x0 + i * step + jx, baseY - a]);
  }
  let d = `M${x0} ${bottom}L${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length - 1; i++) {
    d += `Q${pts[i][0]} ${pts[i][1]} ${(pts[i][0] + pts[i + 1][0]) / 2} ${(pts[i][1] + pts[i + 1][1]) / 2}`;
  }
  return `${d}L${pts[n][0]} ${pts[n][1]}L${x1} ${bottom}Z`;
}

/** すやり霞（横に流れる霞の帯） */
function Kasumi({ x, y, w, h = 5, color = WASHI, opacity = 0.62 }: { x: number; y: number; w: number; h?: number; color?: string; opacity?: number }) {
  return (
    <g fill={color} opacity={opacity}>
      <rect x={x} y={y} width={w} height={h} rx={h / 2} />
      <rect x={x + w * 0.28} y={y + h + 1.6} width={w * 0.95} height={h} rx={h / 2} />
      <rect x={x - w * 0.2} y={y + h * 2 + 3.2} width={w * 0.7} height={h * 0.8} rx={h * 0.4} />
    </g>
  );
}

// ===== 空 =====

function Sky({ m, mood, ids }: { m: SceneModel; mood: Mood; ids: SceneIds }) {
  const hz = m.horizon;
  const [top, mid, low] = mood.sky;
  const cloudTone = mood.dusk ? mix(WASHI, mood.sky[1], 0.45) : WASHI;
  const clouds: ReactNode[] = [];
  switch (mood.cloud) {
    case 'haze':
      clouds.push(<Kasumi key="a" x={150} y={hz - 58} w={96} color={cloudTone} />, <Kasumi key="b" x={18} y={hz - 36} w={70} h={4} color={cloudTone} opacity={0.5} />);
      break;
    case 'puffs':
      clouds.push(
        <path key="a" d="M176 30a7 7 0 0 1 11-5a9 9 0 0 1 17-1a7 7 0 0 1 10 6Z" fill={cloudTone} opacity={0.95} />,
        <path key="b" d="M40 22a5 5 0 0 1 8-3.6a6.5 6.5 0 0 1 12-0.8a5 5 0 0 1 7.4 4.4Z" fill={cloudTone} opacity={0.85} />,
        <path key="c" d="M286 44a4.5 4.5 0 0 1 7-3.2a6 6 0 0 1 11-0.8a4.5 4.5 0 0 1 6.6 4Z" fill={cloudTone} opacity={0.8} />,
      );
      break;
    case 'nyudo':
      // 入道雲（左からもくもくと立つ）
      clouds.push(
        <g key="n">
          <g fill="#cfe0ee">
            <circle cx={66} cy={hz - 16} r={20} />
            <circle cx={92} cy={hz - 12} r={15} />
          </g>
          <g fill="#ffffff">
            <circle cx={40} cy={hz - 12} r={16} />
            <circle cx={58} cy={hz - 30} r={17} />
            <circle cx={76} cy={hz - 44} r={13} />
            <circle cx={84} cy={hz - 24} r={15} />
            <circle cx={62} cy={hz - 52} r={10} />
            <circle cx={104} cy={hz - 12} r={11} />
            <rect x={24} y={hz - 14} width={92} height={18} />
          </g>
        </g>,
        <path key="s" d="M246 30a5 5 0 0 1 8-3.6a6.5 6.5 0 0 1 12-0.8a5 5 0 0 1 7.4 4.4Z" fill="#ffffff" opacity={0.85} />,
      );
      break;
    case 'rain':
      clouds.push(
        <path
          key="r"
          d="M0 0H360V15Q340 23 318 16Q300 25 276 17Q258 27 232 18Q212 26 190 17Q170 27 146 18Q124 26 104 17Q84 26 60 17Q40 25 22 17Q10 22 0 17Z"
          fill="#566a7c"
          opacity={0.75}
        />,
        <Kasumi key="k" x={120} y={hz - 34} w={110} h={4} color="#e6ebe8" opacity={0.5} />,
      );
      break;
    case 'wind':
      clouds.push(
        <g key="w" fill="none" stroke={WASHI} strokeLinecap="round" opacity={0.6}>
          <path d="M-10 30Q90 10 200 26T380 14" strokeWidth={2.4} />
          <path d="M-10 46Q120 30 230 42T380 34" strokeWidth={1.8} />
          <path d="M60 16Q150 6 240 14" strokeWidth={1.4} />
        </g>,
      );
      break;
    case 'thin':
      clouds.push(
        <ellipse key="a" cx={210} cy={26} rx={44} ry={2.6} fill={cloudTone} opacity={0.55} />,
        <ellipse key="b" cx={236} cy={32} rx={30} ry={2} fill={cloudTone} opacity={0.5} />,
        <ellipse key="c" cx={52} cy={40} rx={34} ry={2.2} fill={cloudTone} opacity={0.45} />,
      );
      break;
  }
  const ox = m.rows.length > 1 ? 132 : 126;
  return (
    <g>
      <defs>
        <linearGradient id={ids.sky} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={mix(top, AI9, 0.38)} />
          <stop offset="0.16" stopColor={top} />
          <stop offset="0.56" stopColor={mid} />
          <stop offset="1" stopColor={low} />
        </linearGradient>
      </defs>
      <rect width={m.W} height={hz + 16} fill={`url(#${ids.sky})`} />
      {mood.orb === 'sun' && (
        <g>
          <circle cx={ox} cy={24} r={15} fill="#fff6dc" opacity={0.28} />
          <circle cx={ox} cy={24} r={9.5} fill="#fff3d0" />
        </g>
      )}
      {mood.orb === 'red' && (
        <g>
          <circle cx={ox} cy={hz - 20} r={19} fill={SHU_L} opacity={0.2} />
          <circle cx={ox} cy={hz - 20} r={13} fill="#e5553c" />
        </g>
      )}
      {mood.orb === 'moon' && (
        <g>
          <circle cx={ox} cy={22} r={12} fill="#f6ecc6" opacity={0.18} />
          <circle cx={ox} cy={22} r={7.5} fill="#f6ecc6" />
          <circle cx={ox + 2.6} cy={20.6} r={6.2} fill={mix(top, mid, 0.35)} opacity={0.5} />
        </g>
      )}
      {clouds}
    </g>
  );
}

// ===== 遠景の部品 =====

function Fuji({ x, hz, mood }: { x: number; hz: number; mood: Mood }) {
  const c = mix('#5d7fa6', mood.sky[1], mood.dusk ? 0.15 : 0.3);
  return (
    <g>
      <path d={`M${x - 82} ${hz + 6}Q${x - 34} ${hz - 14} ${x - 9} ${hz - 54}L${x + 9} ${hz - 54}Q${x + 34} ${hz - 14} ${x + 82} ${hz + 6}Z`} fill={c} stroke={INK} strokeWidth={0.6} strokeLinejoin="round" />
      <path
        d={`M${x - 9} ${hz - 54}L${x + 9} ${hz - 54}L${x + 19} ${hz - 37}L${x + 12.5} ${hz - 42}L${x + 7} ${hz - 35}L${x} ${hz - 43}L${x - 7} ${hz - 35}L${x - 12.5} ${hz - 42}L${x - 19} ${hz - 37}Z`}
        fill={SNOW}
        stroke={INK}
        strokeWidth={0.4}
        strokeLinejoin="round"
      />
    </g>
  );
}

function Volcano({ x, hz, mood }: { x: number; hz: number; mood: Mood }) {
  const c = mix('#6a6f86', mood.sky[1], 0.2);
  const ash = mood.dusk ? '#8f95a6' : '#e3ded3';
  return (
    <g>
      <circle cx={x + 2} cy={hz - 40} r={6} fill={ash} opacity={0.9} />
      <circle cx={x + 10} cy={hz - 49} r={8} fill={ash} opacity={0.8} />
      <circle cx={x + 22} cy={hz - 56} r={10} fill={ash} opacity={0.66} />
      <circle cx={x + 38} cy={hz - 60} r={11} fill={ash} opacity={0.5} />
      <path d={`M${x - 66} ${hz + 6}Q${x - 30} ${hz - 8} ${x - 13} ${hz - 34}L${x - 4} ${hz - 31}L${x + 6} ${hz - 35}L${x + 13} ${hz - 33}Q${x + 28} ${hz - 10} ${x + 62} ${hz + 6}Z`} fill={c} stroke={INK} strokeWidth={0.6} strokeLinejoin="round" />
      <path d={`M${x - 8} ${hz - 30}L${x - 14} ${hz - 14}M${x + 8} ${hz - 32}L${x + 15} ${hz - 14}M${x} ${hz - 30}L${x - 1} ${hz - 18}`} stroke={INK} strokeWidth={0.5} opacity={0.3} fill="none" />
    </g>
  );
}

/** 紅白の電波塔（東京） */
function RadioTower({ x, base }: { x: number; base: number }) {
  const legs = `M${x - 9.5} ${base}Q${x - 2.8} ${base - 22} ${x - 1} ${base - 54}M${x + 9.5} ${base}Q${x + 2.8} ${base - 22} ${x + 1} ${base - 54}`;
  return (
    <g>
      <path d={legs} fill="none" stroke={INK} strokeWidth={3.4} strokeLinecap="round" />
      <path d={`M${x - 6.4} ${base - 8}L${x + 5} ${base - 17}M${x + 6.4} ${base - 8}L${x - 5} ${base - 17}M${x - 3.6} ${base - 26}L${x + 2.6} ${base - 36}M${x + 3.6} ${base - 26}L${x - 2.6} ${base - 36}M${x - 2} ${base - 40}L${x + 1.4} ${base - 48}M${x + 2} ${base - 40}L${x - 1.4} ${base - 48}`} stroke={SHU} strokeWidth={0.9} fill="none" />
      <path d={legs} fill="none" stroke={SHU} strokeWidth={2.2} strokeLinecap="round" />
      <path d={`M${x - 7.4} ${base - 6}h14.8M${x - 3.4} ${base - 34}h6.8M${x - 1.6} ${base - 48}h3.2`} stroke={WASHI} strokeWidth={2} />
      <rect x={x - 5.2} y={base - 24} width={10.4} height={3.6} fill={WASHI} {...thin} />
      <rect x={x - 2.6} y={base - 44} width={5.2} height={2.6} fill={WASHI} {...thin} />
      <path d={`M${x} ${base - 54}V${base - 66}`} stroke={INK} strokeWidth={2} strokeLinecap="round" />
      <path d={`M${x} ${base - 54}V${base - 66}`} stroke={SHU} strokeWidth={1} strokeLinecap="round" />
      <path d={`M${x} ${base - 60}v-3`} stroke={WASHI} strokeWidth={1} />
    </g>
  );
}

/** 遠くの城（城下町・大阪・名古屋）。小山の上に石垣と三層の天守 */
function FarCastle({ x, base, wall, roof, gold, ctx, mood }: { x: number; base: number; wall: string; roof: string; gold: boolean; ctx: ArtCtx; mood: Mood }) {
  const parts: ReactNode[] = [];
  let y = base - 12;
  let half = 11;
  for (let i = 0; i < 3; i++) {
    const last = i === 2;
    parts.push(<rect key={`b${i}`} x={x - half} y={y - 5} width={half * 2} height={5} fill={wall} {...thin} />);
    y -= 5;
    const rh = last ? 6 : 3;
    parts.push(<path key={`r${i}`} d={roofD(x, y, half + 3.4, last ? 2.6 : half - 2, rh, 0.8)} fill={roof} {...thin} />);
    if (ctx.snow) parts.push(<path key={`s${i}`} d={`M${x - half} ${y - rh * 0.4}L${x + half} ${y - rh * 0.4}`} stroke={SNOW} strokeWidth={1.4} strokeLinecap="round" />);
    if (!last) parts.push(<path key={`g${i}`} d={`M${x - 2.8} ${y - 0.2}L${x} ${y - rh - 0.4}L${x + 2.8} ${y - 0.2}Z`} fill={wall} {...thin} />);
    y -= rh;
    half -= 2.8;
  }
  return (
    <g>
      <path d={`M${x - 40} ${base + 4}Q${x - 26} ${base - 6} ${x - 16} ${base - 6}L${x + 16} ${base - 6}Q${x + 26} ${base - 6} ${x + 40} ${base + 4}Z`} fill={ctx.snow ? SNOW_SHADE : mood.hillNear} {...thin} />
      <path d={`M${x - 16} ${base - 4}Q${x - 14} ${base - 9} ${x - 13} ${base - 12}L${x + 13} ${base - 12}Q${x + 14} ${base - 9} ${x + 16} ${base - 4}Z`} fill={STONE} {...thin} />
      <path d={`M${x - 14.4} ${base - 8}h28.8`} stroke={STONE_D} strokeWidth={0.5} />
      {parts}
      <path d={`M${x - 3} ${y - 0.8}q-1.6 -1 -0.6 -2.8q0.6 1.4 1.8 1.6ZM${x + 3} ${y - 0.8}q1.6 -1 0.6 -2.8q-0.6 1.4 -1.8 1.6Z`} fill={gold ? KIN_L : KIN} stroke={INK} strokeWidth={gold ? 0.5 : 0.35} transform={gold ? `translate(${x} ${y}) scale(1.5) translate(${-x} ${-y})` : undefined} />
      <RoundTree ctx={ctx} x={x - 25} y={base - 3} h={11} r={4.6} />
      <PineTree ctx={ctx} x={x + 24} y={base - 3} h={11} />
    </g>
  );
}

/** 遠くの五重塔と鳥居（古都・門前町） */
function FarPagoda({ x, base, mood, ctx }: { x: number; base: number; mood: Mood; ctx: ArtCtx }) {
  const body = mix(SHU, mood.sky[1], 0.12);
  const roof = mix('#5a4660', mood.sky[1], 0.1);
  const parts: ReactNode[] = [];
  let y = base - 4;
  let half = 6.4;
  for (let i = 0; i < 5; i++) {
    const last = i === 4;
    const bh = i === 0 ? 5 : 3.4;
    parts.push(<rect key={`b${i}`} x={x - half} y={y - bh} width={half * 2} height={bh} fill={body} {...thin} />);
    y -= bh;
    const rh = last ? 5 : 2.6;
    parts.push(<path key={`r${i}`} d={roofD(x, y, half + 4.4, last ? 0.8 : half - 0.6, rh, 0.8)} fill={roof} {...thin} />);
    if (ctx.snow) parts.push(<path key={`s${i}`} d={`M${x - half - 1.6} ${y - rh * 0.5}h${half * 2 + 3.2}`} stroke={SNOW} strokeWidth={1.2} strokeLinecap="round" />);
    y -= rh;
    half -= 0.8;
  }
  return (
    <g>
      <path d={`M${x - 44} ${base + 4}Q${x - 24} ${base - 9} ${x} ${base - 5}Q${x + 22} ${base - 9} ${x + 40} ${base + 4}Z`} fill={ctx.snow ? SNOW_SHADE : mood.hillNear} {...thin} />
      <PineTree ctx={ctx} x={x - 17} y={base - 5} h={14} />
      <RoundTree ctx={ctx} x={x + 15} y={base - 5} h={13} r={5.4} />
      {parts}
      <path d={`M${x} ${y}V${y - 6}`} stroke={KIN_D} strokeWidth={1.2} strokeLinecap="round" />
      <circle cx={x} cy={y - 1.6} r={0.9} fill={KIN} />
      {/* 参道の鳥居 */}
      <g>
        <rect x={x - 33} y={base - 9} width={1.4} height={10} fill={SHU} {...thin} />
        <rect x={x - 25.4} y={base - 9} width={1.4} height={10} fill={SHU} {...thin} />
        <path d={`M${x - 36} ${base - 9.4}Q${x - 28.6} ${base - 10.8} ${x - 21.4} ${base - 9.4}L${x - 21} ${base - 11.4}Q${x - 28.6} ${base - 12.6} ${x - 36.4} ${base - 11.4}Z`} fill={SHU} {...thin} />
        <rect x={x - 34} y={base - 7} width={11} height={1.1} fill={SHU} {...thin} />
      </g>
    </g>
  );
}

/** 工業地帯の岸（煙突とタンクの影） */
function FarChimneys({ x, base, mood }: { x: number; base: number; mood: Mood }) {
  const tone = mix('#5c5a66', mood.sky[1], 0.25);
  const tone2 = mix('#77747c', mood.sky[1], 0.3);
  const smoke = mood.dusk ? '#8f95a6' : '#d9d2c4';
  const stacks: [number, number][] = [[-30, 30], [-16, 38], [4, 26], [24, 34]];
  return (
    <g>
      <rect x={x - 46} y={base - 9} width={92} height={13} fill={tone} {...thin} />
      <path d={`M${x - 46} ${base - 9}v-5l8 5v-5l8 5v-5l8 5`} fill={tone} {...thin} />
      <circle cx={x + 38} cy={base - 6} r={7} fill={tone2} {...thin} />
      <rect x={x + 10} y={base - 16} width={12} height={12} fill={tone2} {...thin} />
      {stacks.map(([dx, h], i) => (
        <g key={i}>
          <rect x={x + dx - 1.6} y={base - h} width={3.2} height={h - 6} fill={i % 2 ? WASHI2 : tone2} {...thin} />
          {i % 2 === 1 && <path d={`M${x + dx - 1.6} ${base - h + 3}h3.2M${x + dx - 1.6} ${base - h + 10}h3.2`} stroke={SHU} strokeWidth={2.4} />}
          <g transform={`translate(${x + dx} ${base - h - 1})`}>
            <circle cx={1.4} cy={-2.6} r={2.6} fill={smoke} opacity={0.85} />
            <circle cx={5} cy={-6.4} r={3.6} fill={smoke} opacity={0.7} />
            <circle cx={10.4} cy={-9.6} r={4.6} fill={smoke} opacity={0.5} />
          </g>
        </g>
      ))}
    </g>
  );
}

/** 時計台（札幌） */
function ClockTower({ x, base, ctx }: { x: number; base: number; ctx: ArtCtx }) {
  const roof = ctx.snow ? SNOW : SHU;
  return (
    <g>
      <rect x={x - 16} y={base - 13} width={32} height={15} fill={WASHI} {...thin} />
      <path d={`M${x - 18} ${base - 13}L${x - 13} ${base - 20}H${x + 13}L${x + 18} ${base - 13}Z`} fill={roof} {...thin} />
      {[-11, -5, 5, 11].map(dx => (
        <rect key={dx} x={x + dx - 1.6} y={base - 10} width={3.2} height={6} fill={ctx.lit ? WIN_LIT : AI5} {...thin} />
      ))}
      <rect x={x - 5} y={base - 34} width={10} height={20} fill={WASHI} {...thin} />
      <circle cx={x} cy={base - 27} r={3.4} fill={WASHI2} stroke={INK} strokeWidth={0.7} />
      <path d={`M${x} ${base - 27}v-2.2M${x} ${base - 27}h1.6`} stroke={INK} strokeWidth={0.6} strokeLinecap="round" />
      <path d={`M${x - 6.6} ${base - 34}L${x} ${base - 42}L${x + 6.6} ${base - 34}Z`} fill={roof} {...thin} />
      <path d={`M${x} ${base - 42}v-4`} stroke={INK} strokeWidth={0.8} />
      <path d={`M${x} ${base - 47.4}l0.9 1.9 2 0.2-1.5 1.3 0.5 2-1.9-1.1-1.9 1.1 0.5-2-1.5-1.3 2-0.2Z`} fill={SHU} stroke={INK} strokeWidth={0.3} />
    </g>
  );
}

/** 観覧車（横浜） */
function Ferris({ x, base, mood }: { x: number; base: number; mood: Mood }) {
  const cy = base - 26;
  const r = 20;
  const spokes: string[] = [];
  const cars: ReactNode[] = [];
  const tones = [SHU_L, KIN_L, AI2, WASHI, KIND.tour, KIND.park];
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    spokes.push(`M${x} ${cy}L${x + Math.cos(a) * r} ${cy + Math.sin(a) * r}`);
    cars.push(<circle key={i} cx={x + Math.cos(a) * r} cy={cy + Math.sin(a) * r} r={2} fill={mood.dusk ? KIN_L : tones[i % tones.length]} stroke={INK} strokeWidth={0.5} />);
  }
  return (
    <g>
      <path d={`M${x} ${cy}L${x - 9} ${base + 2}M${x} ${cy}L${x + 9} ${base + 2}`} stroke={INK} strokeWidth={2.6} strokeLinecap="round" />
      <path d={`M${x} ${cy}L${x - 9} ${base + 2}M${x} ${cy}L${x + 9} ${base + 2}`} stroke={WASHI2} strokeWidth={1.4} strokeLinecap="round" />
      <circle cx={x} cy={cy} r={r} fill="none" stroke={INK} strokeWidth={2.6} />
      <circle cx={x} cy={cy} r={r} fill="none" stroke={WASHI} strokeWidth={1.4} />
      <circle cx={x} cy={cy} r={r * 0.62} fill="none" stroke={WASHI} strokeWidth={0.6} opacity={0.8} />
      <path d={spokes.join('')} stroke={WASHI} strokeWidth={0.6} opacity={0.9} />
      {cars}
      <circle cx={x} cy={cy} r={2.6} fill={SHU} stroke={INK} strokeWidth={0.6} />
    </g>
  );
}

/** 鼓の形の赤い塔（神戸） */
function PortTower({ x, base }: { x: number; base: number }) {
  const d = `M${x - 6} ${base + 2}Q${x - 1.4} ${base - 20} ${x - 5} ${base - 42}L${x + 5} ${base - 42}Q${x + 1.4} ${base - 20} ${x + 6} ${base + 2}Z`;
  return (
    <g>
      <path d={d} fill={SHU_L} stroke={INK} strokeWidth={0.7} strokeLinejoin="round" />
      <path d={`M${x - 5} ${base - 2}L${x + 3.2} ${base - 30}M${x + 5} ${base - 2}L${x - 3.2} ${base - 30}M${x - 2.4} ${base - 20}L${x + 4.4} ${base - 40}M${x + 2.4} ${base - 20}L${x - 4.4} ${base - 40}M${x - 3.8} ${base - 10}h7.6M${x - 2.4} ${base - 20}h4.8M${x - 3.4} ${base - 31}h6.8`} stroke={WASHI} strokeWidth={0.6} fill="none" opacity={0.9} />
      <rect x={x - 6.4} y={base - 46} width={12.8} height={4} rx={1} fill={WASHI} {...thin} />
      <path d={`M${x} ${base - 46}v-7`} stroke={INK} strokeWidth={1} strokeLinecap="round" />
    </g>
  );
}

/** 海に立つ大鳥居と島（広島） */
function SeaTorii({ x, base, mood }: { x: number; base: number; mood: Mood }) {
  return (
    <g>
      <path d={`M${x + 20} ${base - 2}Q${x + 44} ${base - 34} ${x + 66} ${base - 18}Q${x + 86} ${base - 26} ${x + 110} ${base - 2}Z`} fill={mix(mood.hillNear, mood.sky[1], 0.2)} {...thin} />
      <path d={`M${x - 13} ${base + 3}h8M${x + 5} ${base + 3}h8`} stroke={SHU_L} strokeWidth={1} opacity={0.5} strokeLinecap="round" />
      <rect x={x - 10} y={base - 22} width={2.4} height={24} fill={SHU} {...thin} />
      <rect x={x + 7.6} y={base - 22} width={2.4} height={24} fill={SHU} {...thin} />
      <path d={`M${x - 12.4} ${base - 6}l1.6 8M${x + 12.4} ${base - 6}l-1.6 8`} stroke={SHU_D} strokeWidth={1.4} strokeLinecap="round" />
      <rect x={x - 12} y={base - 17} width={24} height={1.8} fill={SHU} {...thin} />
      <path d={`M${x - 15} ${base - 22}Q${x} ${base - 24.4} ${x + 15} ${base - 22}L${x + 16} ${base - 25.4}Q${x} ${base - 28} ${x - 16} ${base - 25.4}Z`} fill={SHU} {...thin} />
      <path d={`M${x - 16} ${base - 25.4}Q${x} ${base - 28} ${x + 16} ${base - 25.4}`} fill="none" stroke={INK} strokeWidth={1.5} strokeLinecap="round" />
    </g>
  );
}

/** 大仏（鎌倉・奈良） */
function Daibutsu({ x, base, ctx, mood }: { x: number; base: number; ctx: ArtCtx; mood: Mood }) {
  const c = mix('#6f9a8a', mood.sky[1], 0.12);
  const d = mix('#4f7a6c', mood.sky[1], 0.1);
  return (
    <g>
      <RoundTree ctx={ctx} x={x - 26} y={base + 2} h={17} r={7} />
      <RoundTree ctx={ctx} x={x + 27} y={base + 2} h={15} r={6.4} />
      <rect x={x - 19} y={base - 3} width={38} height={5} rx={1} fill={STONE} {...thin} />
      <path d={`M${x - 18} ${base - 3}Q${x - 19} ${base - 10} ${x - 9} ${base - 11}L${x + 9} ${base - 11}Q${x + 19} ${base - 10} ${x + 18} ${base - 3}Z`} fill={d} {...thin} />
      <path d={`M${x - 11} ${base - 9}Q${x - 13} ${base - 24} ${x - 5} ${base - 27}L${x + 5} ${base - 27}Q${x + 13} ${base - 24} ${x + 11} ${base - 9}Z`} fill={c} {...thin} />
      <path d={`M${x - 5} ${base - 13}Q${x} ${base - 10.4} ${x + 5} ${base - 13}`} fill="none" stroke={INK} strokeWidth={0.6} opacity={0.6} />
      <circle cx={x} cy={base - 31} r={5.6} fill={c} {...thin} />
      <path d={`M${x - 5.4} ${base - 32.4}Q${x} ${base - 39.6} ${x + 5.4} ${base - 32.4}Q${x} ${base - 34.8} ${x - 5.4} ${base - 32.4}Z`} fill={d} {...thin} />
      <circle cx={x} cy={base - 37.6} r={1.5} fill={d} {...thin} />
      <path d={`M${x - 2.4} ${base - 30.6}h1.6M${x + 0.8} ${base - 30.6}h1.6`} stroke={INK} strokeWidth={0.6} strokeLinecap="round" />
      {ctx.snow && <path d={`M${x - 4.6} ${base - 34.4}Q${x} ${base - 40.4} ${x + 4.6} ${base - 34.4}`} fill="none" stroke={SNOW} strokeWidth={1.6} strokeLinecap="round" />}
    </g>
  );
}

/** 大の字の山（京都）。8月は送り火で赤く灯る */
function Daimonji({ x, base, mood, month }: { x: number; base: number; mood: Mood; month: number }) {
  const lit = month === 8;
  const c = lit ? '#ff9a4a' : WASHI;
  const cy = base - 21;
  return (
    <g>
      <path d={`M${x - 52} ${base + 4}Q${x - 26} ${base - 6} ${x - 6} ${base - 38}Q${x + 4} ${base - 46} ${x + 14} ${base - 34}Q${x + 30} ${base - 10} ${x + 54} ${base + 4}Z`} fill={mix(mood.hillNear, mood.sky[1], 0.15)} {...thin} />
      <g fill="none" stroke={c} strokeWidth={lit ? 1.9 : 1.5} strokeLinecap="round" opacity={lit ? 1 : 0.85}>
        <path d={`M${x - 5} ${cy - 2.4}h13.6`} />
        <path d={`M${x + 1.6} ${cy - 8}Q${x + 1.2} ${cy + 1} ${x - 6.4} ${cy + 7}`} />
        <path d={`M${x + 2} ${cy - 1.6}Q${x + 4.6} ${cy + 4} ${x + 9.6} ${cy + 7}`} />
      </g>
    </g>
  );
}

/** 赤い瓦の城と石垣（那覇） */
function Shuri({ x, base, ctx }: { x: number; base: number; ctx: ArtCtx }) {
  return (
    <g>
      <path d={`M${x - 34} ${base + 3}Q${x - 32} ${base - 6} ${x - 30} ${base - 8}H${x + 30}Q${x + 32} ${base - 6} ${x + 34} ${base + 3}Z`} fill={STONE} {...thin} />
      <path d={`M${x - 31.4} ${base - 3}h62.8`} stroke={STONE_D} strokeWidth={0.5} />
      <rect x={x - 20} y={base - 17} width={40} height={9} fill={SHU} {...thin} />
      {[-14, -7, 7, 14].map(dx => (
        <rect key={dx} x={x + dx - 1.4} y={base - 15} width={2.8} height={5} fill={ctx.lit ? WIN_LIT : AI7} {...thin} />
      ))}
      <rect x={x - 3.4} y={base - 15} width={6.8} height={7} fill={WOOD_D} {...thin} />
      <path d={roofD(x, base - 17, 24, 17, 4, 0.8)} fill="#d9603a" {...thin} />
      <rect x={x - 13} y={base - 25.6} width={26} height={5} fill={SHU} {...thin} />
      <path d={roofD(x, base - 25.6, 17, 8, 6, 0.8)} fill="#d9603a" {...thin} />
      <path d={`M${x - 5} ${base - 21}Q${x} ${base - 27} ${x + 5} ${base - 21}Z`} fill={KIN} {...thin} />
    </g>
  );
}

/** ヤシの木（南の町） */
function Palm({ x, y, h }: { x: number; y: number; h: number }) {
  const tx = x + h * 0.14;
  const ty = y - h;
  const frond = (a: number, len: number) => {
    const ex = tx + Math.cos(a) * len;
    const ey = ty + Math.sin(a) * len;
    return `M${tx} ${ty}Q${tx + Math.cos(a) * len * 0.55} ${ty + Math.sin(a) * len * 0.55 - len * 0.34} ${ex} ${ey}Q${tx + Math.cos(a) * len * 0.5} ${ty + Math.sin(a) * len * 0.5 - len * 0.08} ${tx} ${ty}Z`;
  };
  return (
    <g>
      <path d={`M${x} ${y}Q${x - h * 0.06} ${y - h * 0.5} ${tx} ${ty}`} fill="none" stroke={INK} strokeWidth={2.6} strokeLinecap="round" />
      <path d={`M${x} ${y}Q${x - h * 0.06} ${y - h * 0.5} ${tx} ${ty}`} fill="none" stroke={WOOD_L} strokeWidth={1.6} strokeLinecap="round" />
      <path d={[-2.9, -2.2, -1.57, -0.94, -0.24, 0.5, 2.64].map(a => frond(a, h * 0.5)).join('')} fill="#3f8f55" stroke={INK} strokeWidth={0.5} strokeLinejoin="round" />
    </g>
  );
}

/** 砂丘（鳥取） */
function Dunes({ x, base }: { x: number; base: number }) {
  return (
    <g>
      <path d={`M${x - 80} ${base + 6}Q${x - 46} ${base - 20} ${x - 14} ${base - 14}Q${x + 6} ${base - 30} ${x + 34} ${base - 12}Q${x + 56} ${base - 16} ${x + 84} ${base + 6}Z`} fill="#e6d19a" {...thin} />
      <path d={`M${x - 14} ${base - 14}Q${x - 4} ${base - 6} ${x - 12} ${base + 4}M${x + 34} ${base - 12}Q${x + 40} ${base - 4} ${x + 30} ${base + 4}M${x - 50} ${base - 6}q8 -2 14 2M${x + 4} ${base - 12}q8 -2 14 3M${x + 48} ${base - 4}q8 -2 14 2`} fill="none" stroke="#b89a5a" strokeWidth={0.6} strokeLinecap="round" />
    </g>
  );
}

/** 蒸気船（港湾都市） */
function Steamship({ x, y, ctx, mood }: { x: number; y: number; ctx: ArtCtx; mood: Mood }) {
  const smoke = mood.dusk ? '#8f95a6' : '#d9d2c4';
  return (
    <g>
      <g transform={`translate(${x + 2} ${y - 17})`}>
        <circle cx={-1.5} cy={-2.4} r={2.4} fill={smoke} opacity={0.85} />
        <circle cx={-6} cy={-5.4} r={3.4} fill={smoke} opacity={0.65} />
        <circle cx={-12.4} cy={-7.6} r={4.2} fill={smoke} opacity={0.45} />
      </g>
      <path d={`M${x - 20} ${y - 12}V${y - 4}M${x + 20} ${y - 12}V${y - 4}`} stroke={INK} strokeWidth={0.7} />
      <rect x={x - 3.4} y={y - 17} width={3.6} height={8} fill={SHU} {...thin} />
      <rect x={x + 3.6} y={y - 16} width={3.6} height={7} fill={SHU} {...thin} />
      <path d={`M${x - 3.4} ${y - 17}h3.6M${x + 3.6} ${y - 16}h3.6`} stroke={INK} strokeWidth={2} />
      <rect x={x - 11} y={y - 9.4} width={24} height={5.6} fill={WASHI} {...thin} />
      <path d={`M${x - 8} ${y - 7}h18`} stroke={ctx.lit ? WIN_LIT : AI5} strokeWidth={1.3} strokeDasharray="1.6 1.4" />
      <path d={`M${x - 27} ${y - 4.4}H${x + 28}L${x + 23} ${y + 3}H${x - 22}Z`} fill={AI9} {...thin} />
      <path d={`M${x - 23.4} ${y + 0.8}H${x + 24.6}`} stroke={SHU} strokeWidth={1.3} />
    </g>
  );
}

/** 帆かけ舟 */
function Sailboat({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M0 -1V-12" stroke={INK} strokeWidth={0.6} />
      <path d="M0.4 -11.6Q6 -7 5 -2H0.4Z" fill={WASHI} {...thin} />
      <path d="M-6 -1.4H7L5 1.6H-4.4Z" fill={WOOD} {...thin} />
    </g>
  );
}

/** 遠くの町並み（四角い建物の影）。大都市・都市・発展度 参 の町 */
function FarBlocks({ m, mood, seed, base, hMin, hMax, count, lit }: { m: SceneModel; mood: Mood; seed: number; base: number; hMin: number; hMax: number; count: number; lit: boolean }) {
  const far = mix(AI5, mood.sky[1], mood.dusk ? 0.3 : 0.55);
  const near = mix(AI7, mood.sky[1], mood.dusk ? 0.12 : 0.36);
  const out: ReactNode[] = [];
  const step = m.W / count;
  for (let layer = 0; layer < 2; layer++) {
    for (let i = 0; i < count; i++) {
      const r = (k: number) => hash01(seed, i + layer * 97, 40 + k);
      const w = 7 + r(1) * 8;
      const h = (hMin + r(2) * (hMax - hMin)) * (layer === 0 ? 1 : 0.62);
      const x = i * step + r(3) * (step - w) + (layer ? step * 0.4 : 0);
      out.push(
        <g key={`${layer}_${i}`}>
          <rect x={x} y={base - h} width={w} height={h + 6} fill={layer === 0 ? far : near} />
          {r(4) > 0.6 && <rect x={x + w * 0.3} y={base - h - 3} width={w * 0.4} height={3} fill={layer === 0 ? far : near} />}
          {h > 9 && (
            <path
              d={`M${x + 1.6} ${base - h + 3}h${w - 3.2}M${x + 1.6} ${base - h + 7}h${w - 3.2}${h > 16 ? `M${x + 1.6} ${base - h + 11}h${w - 3.2}` : ''}`}
              stroke={lit ? WIN_LIT : WASHI}
              strokeWidth={1}
              strokeDasharray="1.4 1.5"
              opacity={lit ? (mood.dusk ? 0.95 : 0.55) : 0.22}
              fill="none"
            />
          )}
        </g>,
      );
    }
  }
  return <g>{out}</g>;
}

/** 蔵の並ぶ町（商都） */
function KuraRow({ mood, seed, base, ctx }: { mood: Mood; seed: number; base: number; ctx: ArtCtx }) {
  const wall = mix(WASHI, mood.sky[1], 0.15);
  const roof = ctx.snow ? SNOW : mix('#4a5560', mood.sky[1], 0.2);
  const xs = [34, 58, 96, 150, 198, 226, 318, 342];
  return (
    <g>
      {xs.map((x, i) => {
        const s = 0.85 + hash01(seed, i, 61) * 0.4;
        const w = 9 * s;
        const h = 8 * s;
        return (
          <g key={i}>
            <rect x={x - w} y={base - h} width={w * 2} height={h + 3} fill={wall} {...thin} />
            <rect x={x - w} y={base - h * 0.34} width={w * 2} height={h * 0.34 + 3} fill="#3d4652" {...thin} />
            <rect x={x - 1.6} y={base - h * 0.86} width={3.2} height={h * 0.34} fill={AI7} {...thin} />
            <path d={roofD(x, base - h, w + 2.4, w * 0.5, 4.4 * s, 0.7)} fill={roof} {...thin} />
          </g>
        );
      })}
    </g>
  );
}

/** かやぶきの農家（村） */
function Farmhouses({ mood, base, ctx }: { mood: Mood; base: number; ctx: ArtCtx }) {
  const straw = ctx.snow ? SNOW : mix('#a98f5a', mood.sky[1], 0.12);
  const house = (x: number, s: number, key: number) => (
    <g key={key} transform={`translate(${x} ${base}) scale(${s})`}>
      <rect x={-10} y={-5} width={20} height={7} fill={WASHI2} {...thin} />
      <rect x={-2} y={-4} width={4} height={6} fill={WOOD_D} {...thin} />
      <path d="M-13 -4Q-11 -13 -5 -15H5Q11 -13 13 -4Z" fill={straw} {...thin} />
      <path d="M-5 -15h10" stroke={WOOD_D} strokeWidth={1.4} strokeLinecap="round" />
    </g>
  );
  return (
    <g>
      {house(48, 1, 0)}
      {house(308, 0.9, 1)}
      {house(206, 0.72, 2)}
    </g>
  );
}

/** 鯉のぼり（5月） */
function Koinobori({ x, base }: { x: number; base: number }) {
  const top = base - 62;
  const carp = (y: number, c: string, s: number) => (
    <g transform={`translate(${x + 1.4} ${y}) scale(${s})`}>
      <path d="M0 -2.6Q9 -4.6 17 -1.4L21.6 -4L20 0L21.6 4L17 1.4Q9 4.6 0 2.6Z" fill={c} {...thin} />
      <circle cx={3.2} cy={-0.3} r={1.2} fill={WASHI} stroke={INK} strokeWidth={0.4} />
      <path d="M7 -2.6q1.6 2.6 0 5.2M11 -2.4q1.4 2.4 0 4.8" fill="none" stroke={WASHI} strokeWidth={0.6} opacity={0.8} />
    </g>
  );
  return (
    <g>
      <path d={`M${x} ${base}V${top}`} stroke={INK} strokeWidth={1.2} strokeLinecap="round" />
      <circle cx={x} cy={top - 1.6} r={1.8} fill={KIN} stroke={INK} strokeWidth={0.5} />
      <path d={`M${x + 1} ${top + 2}q8 -2 16 0.6l-1 3.4q-7 -2 -14 0Z`} fill={WASHI} {...thin} />
      <path d={`M${x + 5} ${top + 2.6}v3M${x + 9} ${top + 2.4}v3M${x + 13} ${top + 2.8}v3`} stroke={SHU} strokeWidth={0.9} />
      {carp(top + 12, AI7, 1)}
      {carp(top + 21, SHU, 0.86)}
      {carp(top + 29, AI3, 0.7)}
    </g>
  );
}

/** 花火（8月） */
function Fireworks({ hz }: { hz: number }) {
  const burst = (cx: number, cy: number, r: number, c: string, c2: string, key: number) => {
    const rays: string[] = [];
    const dots: ReactNode[] = [];
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      rays.push(`M${cx + Math.cos(a) * r * 0.3} ${cy + Math.sin(a) * r * 0.3}L${cx + Math.cos(a) * r} ${cy + Math.sin(a) * r}`);
      dots.push(<circle key={i} cx={cx + Math.cos(a) * r * 1.16} cy={cy + Math.sin(a) * r * 1.16 + r * 0.06} r={0.9} fill={c2} />);
    }
    return (
      <g key={key}>
        <circle cx={cx} cy={cy} r={r * 1.3} fill={c} opacity={0.12} />
        <path d={rays.join('')} stroke={c} strokeWidth={1.1} strokeLinecap="round" fill="none" />
        {dots}
        <circle cx={cx} cy={cy} r={1.4} fill={WASHI} />
      </g>
    );
  };
  return (
    <g>
      {burst(196, hz - 44, 13, KIN_L, '#ffb36b', 0)}
      {burst(232, hz - 30, 8.4, '#ff8f7a', WASHI, 1)}
      {burst(168, hz - 26, 6.4, '#9fd6ff', WASHI, 2)}
    </g>
  );
}

/** 凧（1月） */
function Kite({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <path d={`M${x} ${y + 5}Q${x - 26} ${y + 30} ${x - 34} ${y + 62}`} fill="none" stroke={INK} strokeWidth={0.4} opacity={0.6} />
      <g transform={`rotate(-14 ${x} ${y})`}>
        <rect x={x - 4.6} y={y - 6} width={9.2} height={11.6} fill={WASHI} {...thin} />
        <circle cx={x} cy={y - 0.4} r={2.6} fill={SHU} />
        <path d={`M${x - 3} ${y + 5.6}q-1 4 0.6 8M${x + 3} ${y + 5.6}q1 4 -0.6 8`} fill="none" stroke={SHU} strokeWidth={0.9} strokeLinecap="round" />
      </g>
    </g>
  );
}

/** 役場と町長の旗。家紋は呼び出し側が crest で渡す */
export function TownHall({ x, base, color, crest, ctx }: { x: number; base: number; color: string; crest: ReactNode; ctx: ArtCtx }) {
  const top = base - 60;
  return (
    <g>
      <rect x={x - 11} y={base - 11} width={22} height={13} fill={WASHI} {...thin} />
      <rect x={x - 2.4} y={base - 7} width={4.8} height={9} fill={WOOD_D} {...thin} />
      {[-7.4, 7.4].map(dx => (
        <rect key={dx} x={x + dx - 1.8} y={base - 8} width={3.6} height={4} fill={ctx.lit ? WIN_LIT : AI5} {...thin} />
      ))}
      <path d={roofD(x, base - 11, 13.6, 7, 5.4, 0.8)} fill={ctx.snow ? SNOW : '#56606c'} {...thin} />
      <path d={`M${x + 4} ${base - 15}V${top}`} stroke={INK} strokeWidth={1.3} strokeLinecap="round" />
      <circle cx={x + 4} cy={top - 1.2} r={1.5} fill={KIN} stroke={INK} strokeWidth={0.5} />
      <path d={`M${x + 4.6} ${top + 1}h19l-2.6 6.4 2.6 6.4h-19Z`} fill={WASHI} stroke={INK} strokeWidth={0.7} strokeLinejoin="round" />
      <path d={`M${x + 4.6} ${top + 1}h19l-0.9 2.2h-18.1ZM${x + 4.6} ${top + 13.8}h19l-0.9 -2.2h-18.1Z`} fill={color} />
      <g transform={`translate(${x + 13.2} ${top + 7.4})`}>{crest}</g>
    </g>
  );
}

/** 表通りの裏の家並み（人口が増えるほど広がる）。top〜bottom の帯に、奥から手前へ並べる */
export const BackHouses = memo(function BackHouses({ m, mood, ctx, seed, top, bottom, count, salt = 0 }: LayerProps & { top: number; bottom: number; count: number; salt?: number }) {
  if (count <= 0) return null;
  const thatch = m.cls === 'village';
  const roof = ctx.snow ? SNOW : thatch ? mix('#a98f5a', mood.sky[1], 0.08) : m.cls === 'onsen' ? '#7a6258' : '#586674';
  const list = Array.from({ length: count }, (_, i) => ({
    // 黄金比でずらして、偏らずに散らす
    x: 12 + (((i + 1) * 0.618034 + hash01(seed, i, 101 + salt) * 0.1) % 1) * (m.W - 24),
    y: top + hash01(seed, i, 102 + salt) * (bottom - top),
    s: 0.95 + hash01(seed, i, 103 + salt) * 0.35,
    k: hash01(seed, i, 104 + salt),
    i,
  })).sort((a, b) => a.y - b.y);
  return (
    <g>
      {list.map(h => (
        <g key={h.i} transform={`translate(${h.x} ${h.y}) scale(${h.s})`}>
          <rect x={-6.4} y={-6} width={12.8} height={6} fill={h.k > 0.7 ? WASHI : WASHI2} {...thin} />
          {h.k > 0.45 && <rect x={-6.4} y={-2} width={12.8} height={2} fill={WOOD_L} {...thin} />}
          <rect x={h.k > 0.45 ? 1 : -4} y={-4.8} width={2.8} height={h.k > 0.45 ? 2.8 : 4.8} fill={ctx.lit ? WIN_LIT : AI5} {...thin} />
          {thatch ? <path d="M-8.4 -5.4Q-7 -11.4 -3 -12.4H3Q7 -11.4 8.4 -5.4Z" fill={roof} {...thin} /> : <path d={roofD(0, -6, 8.6, 4.6, 4.6, 0.7)} fill={roof} {...thin} />}
        </g>
      ))}
    </g>
  );
});

/** 空を飛ぶ鳥（幸福度の高い町） */
export function Birds({ x, y }: { x: number; y: number }) {
  return (
    <path
      d={`M${x} ${y}q2.8 -2.8 5.6 0q2.8 -2.8 5.6 0M${x + 16} ${y - 7}q2.2 -2.2 4.4 0q2.2 -2.2 4.4 0M${x + 9} ${y + 8}q1.8 -1.8 3.6 0q1.8 -1.8 3.6 0`}
      fill="none"
      stroke={INK}
      strokeWidth={0.8}
      strokeLinecap="round"
      opacity={0.75}
    />
  );
}

// ===== 背景のまとめ =====

export const Backdrop = memo(function Backdrop({ m, mood, ctx, seed, ids }: LayerProps & { ids: SceneIds }) {
  const hz = m.horizon;
  const W = m.W;
  const far = ctx.snow ? mix(SNOW_SHADE, mood.sky[1], 0.25) : mix(mood.hillFar, mood.sky[1], 0.12);
  const near = ctx.snow ? '#e3ecf2' : mood.hillNear;
  const ground = ctx.snow ? '#eef3f7' : m.cls === 'village' || m.cls === 'onsen' ? mood.grass : mix(mood.grass, mood.soil, 0.45);

  // 海の色（夕暮れは濃く）
  const seaTop = mood.dusk ? mix(AI5, mood.sky[2], 0.25) : mix(AI3, mood.sky[2], 0.25);
  const seaLow = mood.dusk ? AI7 : AI4;

  // 山の大きさは町の格で変える
  const amp: Record<SceneModel['cls'], [number, number, number]> = {
    metro: [8, 16, 5],
    city: [14, 26, 5],
    port: [12, 24, 3],
    onsen: [30, 50, 4],
    market: [10, 20, 5],
    village: [16, 28, 5],
  };
  const [aMin, aMax, peaks] = amp[m.cls];
  const fullSea = m.cls === 'port';
  const landEnd = m.sea ? (fullSea ? 150 : 200) : W + 10;
  const farD = ridgeD(seed, 1, -10, landEnd, hz + 2, aMin, aMax, m.sea ? Math.max(2, peaks - 2) : peaks, hz + 16, m.sea);
  const nearD = m.cls === 'metro' && !m.sea ? '' : ridgeD(seed, 7, -10, landEnd, hz + 4, aMin * 0.35, aMax * 0.5, m.sea ? 2 : peaks + 1, hz + 16, m.sea);
  const big = m.landmark === 'fuji' || m.landmark === 'volcano' || m.landmark === 'dunes';

  // 町の特色の遠景（古都の塔・城・工場）と、その町の目印の置き場所
  const feature = m.landmark === 'osakajo' || m.landmark === 'kinshachi' ? null : m.traits.includes('joka') ? 'castle' : m.traits.includes('koto') && m.landmark !== 'daibutsu' ? 'pagoda' : m.traits.includes('kogyo') ? 'chimneys' : null;
  const markX = feature ? 300 : 266;
  const featX = m.landmark && !big ? 214 : 262;
  const blackCastle = m.nodeId === 'matsumoto' || m.nodeId === 'kumamoto';

  const steamy = m.cls === 'onsen' || m.traits.includes('yunomachi');
  const blocks = m.cls === 'metro' ? { hMin: 12, hMax: 34, count: 13 } : m.cls === 'city' ? { hMin: 6, hMax: 17, count: 11 } : m.tier >= 3 ? { hMin: 6, hMax: 15, count: 10 } : null;

  // 中景の木（幸福度が高いほど多い）
  const treeCount = 2 + m.joy * 2;
  const trees: ReactNode[] = [];
  for (let i = 0; i < treeCount; i++) {
    const x = 12 + hash01(seed, i, 21) * (W - 24);
    const h = 13 + hash01(seed, i, 22) * 7;
    const y = m.groundY + 4 + hash01(seed, i, 23) * 6;
    if (m.south) trees.push(<Palm key={i} x={x} y={y} h={h + 8} />);
    else if (hash01(seed, i, 24) > 0.7) trees.push(<PineTree key={i} ctx={ctx} x={x} y={y} h={h} />);
    else trees.push(<RoundTree key={i} ctx={ctx} x={x} y={y} h={h} r={h * 0.36} />);
  }

  return (
    <g>
      <Sky m={m} mood={mood} ids={ids} />
      {mood.extra === 'hanabi' && <Fireworks hz={hz} />}
      {mood.extra === 'newyear' && <Kite x={214} y={22} />}

      {/* 遠くの大きな山（富士・火山・砂丘） */}
      {m.landmark === 'fuji' && <Fuji x={236} hz={hz} mood={mood} />}

      {/* 海と船 */}
      {m.sea && (
        <g>
          <rect x={0} y={hz - 13} width={W} height={m.groundY - hz + 18} fill={seaLow} />
          <rect x={0} y={hz - 13} width={W} height={7} fill={seaTop} />
          <path d={`M0 ${hz - 13}H${W}`} stroke={INK} strokeWidth={0.5} opacity={0.35} />
          <path
            d={[0, 1, 2, 3, 4, 5, 6, 7].map(i => `M${150 + i * 27 + (i % 2) * 9} ${hz - 4 + (i % 3) * 3.4}q4 -2.6 8 0q4 -2.6 8 0`).join('')}
            fill="none"
            stroke={WASHI}
            strokeWidth={0.7}
            strokeLinecap="round"
            opacity={0.55}
          />
          {m.landmark === 'volcano' && <Volcano x={258} hz={hz - 6} mood={mood} />}
          {m.landmark === 'seaTorii' && <SeaTorii x={236} base={hz - 2} mood={mood} />}
          {m.traits.includes('kowan') && <Steamship x={m.landmark === 'ferris' || m.landmark === 'portTower' ? 218 : 252} y={hz - 3} ctx={ctx} mood={mood} />}
          <Sailboat x={fullSea ? 206 : 326} y={hz - 8} s={0.8} />
          {fullSea && (
            <g>
              <path
                d={[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => `M${120 + i * 24 + (i % 2) * 10} ${hz + 6 + (i % 3) * 3}q4 -2.6 8 0q4 -2.6 8 0`).join('')}
                fill="none"
                stroke={WASHI}
                strokeWidth={0.7}
                strokeLinecap="round"
                opacity={0.5}
              />
              <Sailboat x={284} y={hz + 1} s={1.2} />
              <Sailboat x={330} y={hz - 9} s={0.6} />
              <Sailboat x={176} y={hz + 6} s={1.05} />
            </g>
          )}
          <path d={`M${fullSea ? 236 : 300} ${hz - 34}q2.6 -2.6 5.2 0q2.6 -2.6 5.2 0M${fullSea ? 256 : 318} ${hz - 42}q2 -2 4 0q2 -2 4 0`} fill="none" stroke={INK} strokeWidth={0.7} strokeLinecap="round" opacity={0.7} />
        </g>
      )}

      {/* 遠くの山と雪の頂 */}
      {!(m.landmark === 'dunes') && (
        <g>
          <path d={farD} fill={far} stroke={INK} strokeWidth={0.5} strokeLinejoin="round" />
          {m.snowCaps && !ctx.snow && (
            <>
              <defs>
                <clipPath id={ids.cap}>
                  <rect x={-10} y={0} width={W + 20} height={hz + 2 - aMin - (aMax - aMin) * 0.45} />
                </clipPath>
              </defs>
              <path d={farD} fill={SNOW} clipPath={`url(#${ids.cap})`} />
            </>
          )}
        </g>
      )}
      {m.landmark === 'dunes' && <Dunes x={200} base={hz} />}
      {m.landmark === 'daimonji' && <Daimonji x={markX} base={hz + 2} mood={mood} month={m.month} />}
      {steamy && (
        <g>
          <Steam ctx={ctx} x={92} y={hz - 2} s={1.5} />
          <Steam ctx={ctx} x={180} y={hz + 2} s={1.2} />
          <Steam ctx={ctx} x={300} y={hz - 4} s={1.4} />
        </g>
      )}
      {nearD && <path d={nearD} fill={near} stroke={INK} strokeWidth={0.5} strokeLinejoin="round" />}

      {/* 岬の灯台（港町） */}
      {fullSea && (
        <g>
          <rect x={97} y={hz - 22} width={5} height={14} fill={WASHI} {...thin} />
          <path d={`M97 ${hz - 16}h5`} stroke={SHU} strokeWidth={2.4} />
          <rect x={96} y={hz - 26} width={7} height={4} fill={ctx.lit ? WIN_LIT : WASHI2} {...thin} />
          <path d={`M95 ${hz - 26}L99.5 ${hz - 30}L104 ${hz - 26}Z`} fill={SHU_D} {...thin} />
        </g>
      )}

      {/* 地面（港町は浜を挟む） */}
      {fullSea && <path d={`M0 ${m.groundY + 3}V${m.groundY - 3}Q40 ${m.groundY - 6} 90 ${m.groundY - 2}T200 ${m.groundY - 2.4}T300 ${m.groundY - 1.6}T${W} ${m.groundY - 3}V${m.groundY + 3}Z`} fill={ctx.snow ? SNOW : '#ead9a6'} stroke={INK} strokeWidth={0.5} strokeLinejoin="round" />}
      <rect x={0} y={m.groundY} width={W} height={m.H - m.groundY} fill={ground} />
      <rect x={0} y={m.groundY} width={W} height={9} fill={WASHI} opacity={0.22} />
      <g fill={ctx.snow ? SNOW_SHADE : mix(ground, AI9, 0.12)} opacity={0.5}>
        {[0, 1, 2, 3].map(i => {
          const bw = 60 + hash01(seed, i, 26) * 90;
          return <rect key={i} x={hash01(seed, i, 27) * (W - bw)} y={m.groundY + 11 + i * 7.5 + hash01(seed, i, 28) * 3} width={bw} height={2.2} rx={1.1} />;
        })}
      </g>
      {m.sea && !fullSea && <path d={`M0 ${m.groundY}H${W}`} stroke={INK} strokeWidth={0.6} opacity={0.5} />}

      {/* 遠くの町並み */}
      {blocks && <FarBlocks m={m} mood={mood} seed={seed} base={m.groundY + 1} hMin={blocks.hMin} hMax={blocks.hMax} count={blocks.count} lit={ctx.lit} />}
      {m.cls === 'market' && <KuraRow mood={mood} seed={seed} base={hz + 8} ctx={ctx} />}
      {m.cls === 'village' && <Farmhouses mood={mood} base={hz + 9} ctx={ctx} />}

      {/* 町の特色とその町の目印 */}
      {feature === 'castle' && <FarCastle x={featX} base={hz + 6} wall={blackCastle ? '#3a3f48' : WASHI} roof={ctx.snow ? '#7a8590' : '#56606c'} gold={false} ctx={ctx} mood={mood} />}
      {feature === 'pagoda' && <FarPagoda x={featX} base={hz + 7} mood={mood} ctx={ctx} />}
      {feature === 'chimneys' && <FarChimneys x={featX} base={hz + 5} mood={mood} />}
      {m.landmark === 'tower' && <RadioTower x={markX} base={hz + 6} />}
      {m.landmark === 'osakajo' && <FarCastle x={markX} base={hz + 6} wall={WASHI} roof="#4f8a7a" gold={false} ctx={ctx} mood={mood} />}
      {m.landmark === 'kinshachi' && <FarCastle x={markX} base={hz + 6} wall={WASHI} roof="#5f9a84" gold ctx={ctx} mood={mood} />}
      {m.landmark === 'clock' && <ClockTower x={markX} base={hz + 8} ctx={ctx} />}
      {m.landmark === 'ferris' && <Ferris x={markX + 10} base={hz + 4} mood={mood} />}
      {m.landmark === 'portTower' && <PortTower x={markX + 14} base={hz + 4} />}
      {m.landmark === 'daibutsu' && <Daibutsu x={markX} base={hz + 6} ctx={ctx} mood={mood} />}
      {m.landmark === 'shuri' && <Shuri x={markX} base={hz + 6} ctx={ctx} />}

      {trees}
      {mood.extra === 'koinobori' && <Koinobori x={150} base={hz + 12} />}
    </g>
  );
});

// ===== 天気（いちばん上に重ねる） =====

export const Weather = memo(function Weather({ m, mood, seed }: { m: SceneModel; mood: Mood; seed: number }) {
  const out: ReactNode[] = [];
  if (mood.extra === 'ajisai') {
    const d: string[] = [];
    for (let i = 0; i < 46; i++) {
      const x = hash01(seed, i, 71) * (m.W + 30) - 10;
      const y = hash01(seed, i, 72) * (m.H - 20);
      d.push(`M${x} ${y}l-2.6 9`);
    }
    out.push(<path key="rain" d={d.join('')} stroke="#eef3f6" strokeWidth={0.6} strokeLinecap="round" opacity={0.55} fill="none" />);
  }
  if (m.snowy) {
    const flakes: ReactNode[] = [];
    for (let i = 0; i < 40; i++) {
      flakes.push(<circle key={i} cx={hash01(seed, i, 81) * m.W} cy={hash01(seed, i, 82) * (m.H - 16)} r={0.7 + hash01(seed, i, 83) * 1} fill={SNOW} opacity={0.9} />);
    }
    out.push(<g key="snow">{flakes}</g>);
  }
  if (mood.extra === 'sakura' || mood.extra === 'momiji') {
    const petals: ReactNode[] = [];
    const tones = mood.extra === 'sakura' ? ['#f7c6d0', '#fbe3e8', '#f2a7b8'] : [SHU_L, '#e08a2c', KIN_L];
    for (let i = 0; i < 16; i++) {
      const x = hash01(seed, i, 91) * m.W;
      const y = 10 + hash01(seed, i, 92) * (m.H - 40);
      petals.push(<ellipse key={i} cx={x} cy={y} rx={1.7} ry={0.9} fill={tones[i % 3]} transform={`rotate(${hash01(seed, i, 93) * 180} ${x} ${y})`} opacity={0.9} />);
    }
    out.push(<g key="petal">{petals}</g>);
  }
  if (mood.extra === 'typhoon') {
    const d: string[] = [];
    for (let i = 0; i < 9; i++) {
      const x = hash01(seed, i, 95) * m.W;
      const y = 20 + hash01(seed, i, 96) * (m.H - 60);
      d.push(`M${x} ${y}q14 -5 30 -2`);
    }
    out.push(<path key="gust" d={d.join('')} stroke={WASHI} strokeWidth={0.8} strokeLinecap="round" opacity={0.5} fill="none" />);
  }
  if (!out.length) return null;
  return <g>{out}</g>;
});

// ===== 手前の帯（川・港・田んぼ・渓流） =====

/** movingWater: 動く波を上に重ねるので、止まった波は描かない */
export const Foreground = memo(function Foreground({ m, mood, ctx, seed, y, movingWater = false }: LayerProps & { y: number; movingWater?: boolean }) {
  const W = m.W;
  const h = m.H - y;
  const water = mood.dusk ? AI5 : AI3;
  const waterD = mood.dusk ? AI7 : AI4;
  const waves = (rows: number) => {
    const d: string[] = [];
    for (let r = 0; r < rows; r++) {
      for (let i = 0; i < 9; i++) {
        const x = i * 42 + (r % 2) * 21 + hash01(seed, i + r * 13, 51) * 8 - 6;
        d.push(`M${x} ${y + 9 + r * 6}q4 -2.6 8 0q4 -2.6 8 0`);
      }
    }
    return <path d={d.join('')} fill="none" stroke={WASHI} strokeWidth={0.7} strokeLinecap="round" opacity={0.6} />;
  };
  const embank = (
    <g>
      <rect x={0} y={y} width={W} height={4.6} fill={ctx.snow ? SNOW : STONE} stroke={INK} strokeWidth={0.6} />
      <path d={Array.from({ length: 18 }, (_, i) => `M${i * 21 + 6} ${y}v4.6`).join('')} stroke={STONE_D} strokeWidth={0.5} />
    </g>
  );
  if (m.cls === 'village') {
    // 田んぼ（春は水、夏は青田、秋は黄金、冬は刈り跡）
    const mo = m.month;
    const field = ctx.snow ? '#f2f6f9' : mo >= 4 && mo <= 6 ? '#9cc3c9' : mo <= 8 && mo >= 7 ? '#6fb55f' : mo === 9 || mo === 10 ? '#dcb54a' : '#b79f72';
    const row = ctx.snow ? SNOW_SHADE : mo >= 4 && mo <= 6 ? '#4f9d5d' : mo === 7 || mo === 8 ? '#3f8f55' : mo === 9 || mo === 10 ? '#b8862f' : '#8a7448';
    const d: string[] = [];
    for (let r = 0; r < 3; r++) {
      for (let i = 0; i < 30; i++) d.push(`M${i * 12.4 + (r % 2) * 6 + 3} ${y + 7 + r * 6.4}v-3.4`);
    }
    return (
      <g>
        <rect x={0} y={y} width={W} height={h} fill={field} />
        <path d={`M0 ${y}H${W}`} stroke={INK} strokeWidth={0.6} opacity={0.6} />
        <path d={d.join('')} stroke={row} strokeWidth={1.3} strokeLinecap="round" fill="none" />
        <path d={`M120 ${y}L104 ${m.H}M246 ${y}L262 ${m.H}`} stroke={ctx.snow ? SNOW_SHADE : mix(mood.soil, WOOD, 0.3)} strokeWidth={2.4} />
        {/* かかし */}
        {mo >= 7 && mo <= 10 && (
          <g transform={`translate(182 ${y + 14})`}>
            <path d="M0 0V-12M-5 -8h10" stroke={WOOD_D} strokeWidth={1} strokeLinecap="round" />
            <path d="M-5 -8.6h10l-1.4 4.4h-7.2Z" fill={AI5} {...thin} />
            <circle cx={0} cy={-11} r={1.8} fill={WASHI2} {...thin} />
            <path d="M-3.6 -12L0 -14.6L3.6 -12Z" fill={WASHI3} {...thin} />
          </g>
        )}
      </g>
    );
  }
  if (m.cls === 'onsen') {
    // 渓流と朱の欄干、岩、湯けむり
    return (
      <g>
        <rect x={0} y={y} width={W} height={h} fill={water} />
        <path d={`M0 ${y}H${W}`} stroke={INK} strokeWidth={0.6} />
        {!movingWater && waves(2)}
        {[34, 118, 226, 312].map((x, i) => (
          <path key={i} d={`M${x - 9} ${m.H}Q${x - 8} ${y + 9 + (i % 2) * 3} ${x} ${y + 8 + (i % 2) * 3}Q${x + 9} ${y + 9} ${x + 11} ${m.H}Z`} fill={ctx.snow ? SNOW : STONE_D} {...thin} />
        ))}
        <path d={`M0 ${y + 0.6}H${W}`} stroke={SHU} strokeWidth={2.2} />
        <path d={Array.from({ length: 13 }, (_, i) => `M${i * 30 + 6} ${y - 4.4}v5`).join('')} stroke={SHU_D} strokeWidth={1.6} strokeLinecap="round" />
        <path d={`M0 ${y - 3.4}H${W}`} stroke={SHU} strokeWidth={1.2} />
        <Steam ctx={ctx} x={70} y={y + 10} s={0.9} />
        <Steam ctx={ctx} x={270} y={y + 12} s={0.8} />
      </g>
    );
  }
  // 川・港（石垣と水面、舟）
  const boatY = y + 15;
  return (
    <g>
      <rect x={0} y={y} width={W} height={h} fill={waterD} />
      <rect x={0} y={y} width={W} height={h * 0.5} fill={water} />
      {!movingWater && waves(3)}
      {embank}
      {m.cls === 'port' ? (
        <g>
          {/* 係留した小舟と浮き */}
          {[70, 168, 290].map((x, i) => (
            <g key={i}>
              <path d={`M${x - 15} ${boatY - 4}Q${x} ${boatY - 1} ${x + 16} ${boatY - 5}L${x + 12} ${boatY + 2}H${x - 11}Z`} fill={i === 1 ? WASHI : WOOD_L} {...thin} />
              <path d={`M${x - 12} ${boatY - 1}H${x + 13}`} stroke={i === 1 ? AI4 : SHU} strokeWidth={1} />
              <path d={`M${x - 4} ${y + 4.6}L${x - 8} ${boatY - 3}`} stroke={INK} strokeWidth={0.4} opacity={0.7} />
            </g>
          ))}
          {[118, 226, 334].map(x => (
            <circle key={x} cx={x} cy={boatY + 1} r={1.8} fill={SHU_L} stroke={INK} strokeWidth={0.5} />
          ))}
        </g>
      ) : m.cls === 'market' ? (
        <g>
          {/* 米俵を積んだ荷舟 */}
          <g transform={`translate(96 ${boatY})`}>
            <path d="M-24 -4Q0 -1 26 -5L21 2.6H-19Z" fill={WOOD_L} {...thin} />
            {[-11, -3.6, 3.8, 11.2].map(dx => (
              <ellipse key={dx} cx={dx} cy={-6.4} rx={3.6} ry={2.5} fill="#d9b86a" {...thin} />
            ))}
            {[-7.2, 0.2, 7.6].map(dx => (
              <ellipse key={dx} cx={dx} cy={-10.4} rx={3.6} ry={2.5} fill="#d9b86a" {...thin} />
            ))}
            <path d="M23 -5V-17" stroke={INK} strokeWidth={0.8} />
          </g>
          <g transform={`translate(270 ${boatY + 1}) scale(0.8)`}>
            <path d="M-20 -4Q0 -1 22 -5L18 2.6H-16Z" fill={WOOD_L} {...thin} />
            <rect x={-8} y={-9} width={12} height={5} fill={WASHI2} {...thin} />
          </g>
        </g>
      ) : (
        <g>
          {/* 屋形船 */}
          <g transform={`translate(${m.cls === 'metro' ? 250 : 110} ${boatY})`}>
            <path d="M-26 -4Q0 -1 28 -5L23 2.6H-21Z" fill={WOOD_L} {...thin} />
            <rect x={-15} y={-10.4} width={28} height={6.4} fill={WASHI} {...thin} />
            <path d="M-11.6 -8.4v3.4M-6 -8.4v3.4M-0.4 -8.4v3.4M5.2 -8.4v3.4M10.8 -8.4v3.4" stroke={ctx.lit ? WIN_LIT : AI5} strokeWidth={2.6} />
            <path d="M-18 -10.4Q0 -14.4 16 -10.4Z" fill={KIND.com} {...thin} />
            {[-15, 13].map(dx => (
              <ellipse key={dx} cx={dx} cy={-7} rx={1.4} ry={1.9} fill={SHU} stroke={INK} strokeWidth={0.4} />
            ))}
          </g>
        </g>
      )}
    </g>
  );
});
