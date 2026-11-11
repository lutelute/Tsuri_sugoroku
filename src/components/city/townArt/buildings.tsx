// 町の絵: 建物の絵（種類 × 等級）。街並みの絵（TownScene）と小さな記号（BuildingGlyph）で同じ絵柄を使う。
// 座標: 地面が y=0、上がマイナス、中心が x=0。絵の大きさは artBox() で引く（記号はそれに合わせて縮める）。
// 浮世絵の調子: 平たい色面・墨の輪郭・反った瓦屋根。持ち主の色は、のれん・垂れ幕・旗だけに使う。
import type { ReactNode } from 'react';
import type { BuildingKind } from '../../../game/city';
import {
  INK, WASHI, WASHI2, WASHI3, PLASTER, KIN, KIN_L, KIN_D, SHU, SHU_L, SHU_D, AI7, AI5, AI2,
  WOOD, WOOD_L, WOOD_D, STONE, STONE_D, BRICK, BRICK_D, SNOW, SNOW_SHADE, WIN_LIT, WIN_DARK, KIND,
} from './palette';
import { roofD } from './art';
import type { ArtCtx } from './art';

const line = (ctx: ArtCtx, k = 1) => ({
  stroke: INK,
  strokeWidth: ctx.sw * k,
  strokeLinejoin: 'round' as const,
  strokeLinecap: 'round' as const,
});
const win = (ctx: ArtCtx) => (ctx.lit ? WIN_LIT : WIN_DARK);

// ===== 共通の部品 =====

/** 屋根に積もった雪（軒先に屋根の色を細く残す） */
function snowD(cx: number, ey: number, E: number, R: number, h: number, up = 0.9): string {
  const t = 0.22;
  const p0x = -E;
  const p0y = ey - up;
  const qx = -(E + R) / 2;
  const qy = ey - h * 0.3;
  const p1x = -R;
  const p1y = ey - h;
  const bx = (1 - t) * (1 - t) * p0x + 2 * t * (1 - t) * qx + t * t * p1x;
  const by = (1 - t) * (1 - t) * p0y + 2 * t * (1 - t) * qy + t * t * p1y;
  const c2x = qx + (p1x - qx) * t;
  const c2y = qy + (p1y - qy) * t;
  const top = p1y - 1;
  return `M${cx + bx} ${by}Q${cx + c2x} ${c2y - 0.6} ${cx + p1x} ${top}L${cx - p1x} ${top}Q${cx - c2x} ${c2y - 0.6} ${cx - bx} ${by}Q${cx} ${by + 1.3} ${cx + bx} ${by}Z`;
}

interface RoofProps {
  ctx: ArtCtx;
  cx?: number;
  ey: number;
  E: number;
  R: number;
  h: number;
  fill: string;
  ridge?: string;
  /** 瓦の筋を描く */
  tiles?: boolean;
}

function Roof({ ctx, cx = 0, ey, E, R, h, fill, ridge, tiles = true }: RoofProps) {
  const lines: string[] = [];
  if (tiles && !ctx.icon && !ctx.snow) {
    for (let k = -2; k <= 2; k++) lines.push(`M${cx + (k * R) / 2.6} ${ey - h + 0.6}L${cx + (k * E) / 2.9} ${ey - 0.8}`);
  }
  return (
    <g>
      <path d={roofD(cx, ey, E, R, h)} fill={fill} {...line(ctx)} />
      {lines.length > 0 && <path d={lines.join('')} stroke={INK} strokeWidth={0.45} opacity={0.3} fill="none" />}
      {ridge && <rect x={cx - R - 0.9} y={ey - h - 1.4} width={R * 2 + 1.8} height={1.9} rx={0.5} fill={ridge} {...line(ctx, 0.7)} />}
      {ctx.snow && <path d={snowD(cx, ey, E, R, h)} fill={SNOW} stroke={SNOW_SHADE} strokeWidth={ctx.sw * 0.5} />}
    </g>
  );
}

/** のれん・幕（持ち主の色の布） */
function Noren({ ctx, x, y, w, h, color, slits = 2, mon = true }: { ctx: ArtCtx; x: number; y: number; w: number; h: number; color: string; slits?: number; mon?: boolean }) {
  const cuts: string[] = [];
  for (let i = 1; i <= slits; i++) cuts.push(`M${x + (w * i) / (slits + 1)} ${y + h * 0.3}V${y + h}`);
  // 紋は切れ目のあいだ（左から1枚目と最後の1枚）の真ん中に染め抜く
  const panel = w / (slits + 1);
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} fill={color} {...line(ctx, 0.7)} />
      <path d={cuts.join('')} stroke={INK} strokeWidth={ctx.sw * 0.55} opacity={0.55} fill="none" />
      {mon && !ctx.icon && panel >= 3.4 && h >= 3.4 && (
        <>
          <circle cx={x + panel / 2} cy={y + h * 0.55} r={Math.min(1.3, h * 0.24)} fill={WASHI} opacity={0.92} />
          <circle cx={x + w - panel / 2} cy={y + h * 0.55} r={Math.min(1.3, h * 0.24)} fill={WASHI} opacity={0.92} />
        </>
      )}
    </g>
  );
}

/** 煙（煙突から上へ流れる）。ここは止まった絵。動く煙は TownScene が上に重ねる（smokeVents） */
function Smoke({ ctx, x, y, s = 1, tone = '#d9d2c4' }: { ctx: ArtCtx; x: number; y: number; s?: number; tone?: string }) {
  if (ctx.icon) {
    return (
      <g transform={`translate(${x} ${y})`}>
        <circle cx={0.8} cy={-3} r={3 * s} fill={tone} opacity={0.9} />
        <circle cx={4} cy={-7.5} r={2.4 * s} fill={tone} opacity={0.7} />
      </g>
    );
  }
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle cx={0.6} cy={-2.4} r={2.3 * s} fill={tone} opacity={0.92} />
      <circle cx={2.8} cy={-6.2} r={3 * s} fill={tone} opacity={0.78} />
      <circle cx={6} cy={-10.4} r={3.6 * s} fill={tone} opacity={0.56} />
    </g>
  );
}

/** 湯けむり（白い筋が立ちのぼる） */
export function Steam({ ctx, x, y, s = 1 }: { ctx: ArtCtx; x: number; y: number; s?: number }) {
  const d = `M0 0c${-2.4 * s} ${-2.6 * s} ${2.4 * s} ${-4.4 * s} 0 ${-7.4 * s}c${-2 * s} ${-2.6 * s} ${1.8 * s} ${-4 * s} ${0.4 * s} ${-6.6 * s}`;
  return (
    <g transform={`translate(${x} ${y})`} fill="none" stroke={WASHI} strokeLinecap="round">
      <path d={d} strokeWidth={1.7 * s} opacity={0.85} />
      {!ctx.icon && <path d={d} strokeWidth={1.5 * s} opacity={0.62} transform={`translate(${4 * s} ${1.5 * s})`} />}
    </g>
  );
}

/** 丸い木（桜・紅葉・冬の枯れ木は葉の色で変わる） */
export function RoundTree({ ctx, x, y = 0, h, r }: { ctx: ArtCtx; x: number; y?: number; h: number; r: number }) {
  const cy = y - h + r * 0.8;
  if (ctx.leaf.bare) {
    const tips: [number, number][] = [
      [x - r * 0.78, cy - r * 0.3],
      [x + r * 0.8, cy - r * 0.42],
      [x - r * 0.12, cy - r * 0.95],
      [x - r * 0.98, cy + r * 0.28],
      [x + r * 0.98, cy + r * 0.2],
    ];
    return (
      <g>
        <path
          d={`M${x} ${y}V${cy + r * 0.1}M${x} ${cy + r * 0.85}L${tips[0][0]} ${tips[0][1]}M${x} ${cy + r * 0.5}L${tips[1][0]} ${tips[1][1]}M${x} ${cy + r * 0.15}L${tips[2][0]} ${tips[2][1]}M${x - r * 0.36} ${cy + r * 0.36}L${tips[3][0]} ${tips[3][1]}M${x + r * 0.4} ${cy + r * 0.06}L${tips[4][0]} ${tips[4][1]}`}
          fill="none"
          stroke={WOOD_D}
          strokeWidth={ctx.sw * 1.3}
          strokeLinecap="round"
        />
        {ctx.leaf.blossom && tips.map(([tx, ty], i) => (
          <g key={i}>
            <circle cx={tx} cy={ty} r={r * 0.2} fill={ctx.leaf.blossom} />
            <circle cx={(tx + x) / 2} cy={(ty + cy + r * 0.4) / 2} r={r * 0.15} fill={WASHI} />
          </g>
        ))}
        {ctx.snow && tips.slice(0, 3).map(([tx, ty], i) => <circle key={i} cx={tx} cy={ty - 0.4} r={r * 0.2} fill={SNOW} />)}
      </g>
    );
  }
  const cs: [number, number, number][] = [
    [x - r * 0.46, cy + r * 0.26, r * 0.7],
    [x + r * 0.5, cy + r * 0.2, r * 0.66],
    [x, cy - r * 0.28, r * 0.8],
  ];
  return (
    <g>
      <path d={`M${x} ${y}V${cy}`} stroke={WOOD_D} strokeWidth={ctx.sw * 1.4 + 0.5} strokeLinecap="round" />
      {cs.map(([px, py, pr], i) => <circle key={`o${i}`} cx={px} cy={py} r={pr} fill={ctx.leaf.dark} stroke={INK} strokeWidth={ctx.sw * 1.8} />)}
      {cs.map(([px, py, pr], i) => <circle key={`f${i}`} cx={px} cy={py} r={pr} fill={i === 0 ? ctx.leaf.dark : ctx.leaf.main} />)}
      <circle cx={x - r * 0.18} cy={cy - r * 0.42} r={r * 0.44} fill={ctx.leaf.light} opacity={0.9} />
      {ctx.snow && <path d={`M${x - r * 0.7} ${cy - r * 0.55}Q${x} ${cy - r * 1.35} ${x + r * 0.7} ${cy - r * 0.55}Q${x} ${cy - r * 0.75} ${x - r * 0.7} ${cy - r * 0.55}Z`} fill={SNOW} />}
    </g>
  );
}

/** 松（平たい葉の段を重ねる） */
export function PineTree({ ctx, x, y = 0, h }: { ctx: ArtCtx; x: number; y?: number; h: number }) {
  const pads: [number, number, number, number][] = [
    [x - h * 0.16, y - h * 0.58, h * 0.3, h * 0.13],
    [x + h * 0.2, y - h * 0.74, h * 0.28, h * 0.12],
    [x + h * 0.02, y - h * 0.92, h * 0.22, h * 0.11],
  ];
  return (
    <g>
      <path d={`M${x} ${y}Q${x - h * 0.12} ${y - h * 0.5} ${x + h * 0.06} ${y - h * 0.86}`} fill="none" stroke={WOOD_D} strokeWidth={ctx.sw * 1.3 + 0.5} strokeLinecap="round" />
      {pads.map(([px, py, rx, ry], i) => (
        <g key={i}>
          <ellipse cx={px} cy={py} rx={rx} ry={ry} fill={ctx.pine} {...line(ctx, 0.8)} />
          {ctx.snow && <path d={`M${px - rx * 0.86} ${py - ry * 0.3}Q${px} ${py - ry * 1.9} ${px + rx * 0.86} ${py - ry * 0.3}Q${px} ${py - ry * 0.7} ${px - rx * 0.86} ${py - ry * 0.3}Z`} fill={SNOW} />}
        </g>
      ))}
    </g>
  );
}

/** 鳥居 */
function Torii({ ctx, cx, w, h }: { ctx: ArtCtx; cx: number; w: number; h: number }) {
  const l = cx - w / 2;
  const r = cx + w / 2;
  const t = -h;
  return (
    <g>
      <rect x={l - 0.85} y={t + 1.4} width={1.7} height={h - 1.4} fill={SHU} {...line(ctx, 0.6)} />
      <rect x={r - 0.85} y={t + 1.4} width={1.7} height={h - 1.4} fill={SHU} {...line(ctx, 0.6)} />
      <rect x={l - 1.6} y={t + 4.4} width={w + 3.2} height={1.4} fill={SHU} {...line(ctx, 0.6)} />
      <path d={`M${l - 3.2} ${t + 1.8}Q${cx} ${t + 0.5} ${r + 3.2} ${t + 1.8}L${r + 3.8} ${t - 0.5}Q${cx} ${t - 1.9} ${l - 3.8} ${t - 0.5}Z`} fill={SHU} {...line(ctx, 0.7)} />
      <path d={`M${l - 3.8} ${t - 0.5}Q${cx} ${t - 1.9} ${r + 3.8} ${t - 0.5}`} fill="none" stroke={INK} strokeWidth={ctx.sw * 1.5} strokeLinecap="round" />
      {ctx.snow && <path d={`M${l - 3} ${t - 1.2}Q${cx} ${t - 3} ${r + 3} ${t - 1.2}`} fill="none" stroke={SNOW} strokeWidth={1.3} strokeLinecap="round" />}
    </g>
  );
}

/** 提灯 */
export function Chochin({ ctx, x, y, r = 2, color = SHU }: { ctx: ArtCtx; x: number; y: number; r?: number; color?: string }) {
  return (
    <g>
      <ellipse cx={x} cy={y} rx={r} ry={r * 1.3} fill={color} {...line(ctx, 0.55)} />
      {ctx.lit && <ellipse cx={x} cy={y} rx={r * 0.5} ry={r * 0.8} fill={KIN_L} opacity={0.55} />}
      <path d={`M${x - r * 0.6} ${y - r * 1.3}h${r * 1.2}M${x - r * 0.6} ${y + r * 1.3}h${r * 1.2}`} stroke={INK} strokeWidth={ctx.sw * 1.1} strokeLinecap="round" />
    </g>
  );
}

// ===== 住宅（長屋 → 町家 → 蔵造りの大きな家） =====

function ResL1(ctx: ArtCtx) {
  const own = ctx.owner ?? AI5;
  return (
    <g>
      <rect x={-17} y={-9.5} width={34} height={9.5} fill={PLASTER} {...line(ctx)} />
      <rect x={-17} y={-3} width={34} height={3} fill={WOOD_L} {...line(ctx, 0.6)} />
      {[-11.3, 0, 11.3].map((x, i) => (
        <rect key={i} x={x - 3.3} y={-8} width={6.6} height={8} fill={i === 1 ? WOOD_D : win(ctx)} {...line(ctx, 0.7)} />
      ))}
      {!ctx.icon && <path d="M-11.3 -8V0M11.3 -8V0M-14.6 -5.3h6.6M8 -5.3h6.6" stroke={WOOD} strokeWidth={0.5} fill="none" />}
      <Noren ctx={ctx} x={-3.7} y={-8.4} w={7.4} h={3.9} color={own} slits={1} mon={false} />
      <Roof ctx={ctx} ey={-9.5} E={20.5} R={16} h={6} fill={KIND.res} ridge={KIND.resD} />
      {!ctx.icon && (
        <g>
          <rect x={17.4} y={-4.6} width={3.6} height={4.6} fill={WOOD_L} {...line(ctx, 0.6)} />
          <path d="M17.4 -3h3.6M17.4 -1.4h3.6" stroke={INK} strokeWidth={0.4} />
        </g>
      )}
    </g>
  );
}

function ResL2(ctx: ArtCtx) {
  const own = ctx.owner ?? AI5;
  const bars: string[] = [];
  for (let i = 0; i < 5; i++) bars.push(`M${-11.2 + i * 1.85} -10V-2.6`);
  return (
    <g>
      <rect x={-15} y={-12} width={30} height={12} fill={PLASTER} {...line(ctx)} />
      <rect x={-13} y={-10} width={11} height={7.4} fill={win(ctx)} {...line(ctx, 0.7)} />
      {!ctx.icon && <path d={bars.join('')} stroke={WOOD_D} strokeWidth={0.6} fill="none" />}
      <rect x={-15} y={-2.6} width={15.6} height={2.6} fill={WOOD_L} {...line(ctx, 0.6)} />
      <rect x={2} y={-10.6} width={10.6} height={10.6} fill={WOOD_D} {...line(ctx, 0.7)} />
      <Noren ctx={ctx} x={1.4} y={-11} w={11.8} h={4.8} color={own} slits={2} />
      <Roof ctx={ctx} ey={-12} E={18} R={15.5} h={3} fill={KIND.res} tiles={false} />
      <rect x={-13.5} y={-22} width={27} height={7.2} fill={WASHI} {...line(ctx)} />
      <rect x={-10.6} y={-20.4} width={8.6} height={3.8} rx={1} fill={win(ctx)} {...line(ctx, 0.7)} />
      <rect x={2} y={-20.4} width={8.6} height={3.8} rx={1} fill={win(ctx)} {...line(ctx, 0.7)} />
      {!ctx.icon && <path d="M-8.4 -20.4v3.8M-6.3 -20.4v3.8M-4.2 -20.4v3.8M4.2 -20.4v3.8M6.3 -20.4v3.8M8.4 -20.4v3.8" stroke={WOOD_D} strokeWidth={0.5} fill="none" />}
      <Roof ctx={ctx} ey={-22} E={18.5} R={12.5} h={7.5} fill={KIND.res} ridge={KIND.resD} />
    </g>
  );
}

function ResL3(ctx: ArtCtx) {
  const own = ctx.owner ?? AI5;
  const namako: string[] = [];
  for (let i = 0; i < 6; i++) {
    const x = -19.5 + i * 6.5;
    namako.push(`M${x} -7l6.5 7M${x + 6.5} -7l-6.5 7`);
  }
  const dark = '#2f343c';
  return (
    <g>
      <rect x={-19.5} y={-25} width={39} height={25} fill={WASHI} {...line(ctx)} />
      <rect x={-19.5} y={-7} width={39} height={7} fill="#3d4652" {...line(ctx, 0.7)} />
      {!ctx.icon && <path d={namako.join('')} stroke={WASHI} strokeWidth={0.55} opacity={0.85} fill="none" />}
      {[-13.6, 13.6].map(x => (
        <g key={x}>
          <rect x={x - 4} y={-21.4} width={8} height={9.4} fill={dark} {...line(ctx, 0.7)} />
          <rect x={x - 2.2} y={-20} width={4.4} height={6.6} fill={win(ctx)} {...line(ctx, 0.5)} />
        </g>
      ))}
      <rect x={-7} y={-15} width={14} height={15} fill={WOOD_D} {...line(ctx, 0.7)} />
      <Noren ctx={ctx} x={-7.7} y={-15.6} w={15.4} h={6.8} color={own} slits={2} />
      <Roof ctx={ctx} ey={-25} E={23} R={20} h={3.4} fill={KIND.res} tiles={false} />
      <rect x={-16} y={-35.5} width={32} height={7.4} fill={dark} {...line(ctx)} />
      {[-9.6, 0, 9.6].map(x => (
        <rect key={x} x={x - 2.6} y={-34} width={5.2} height={4.4} fill={win(ctx)} stroke={WASHI} strokeWidth={ctx.sw * 0.9} />
      ))}
      <Roof ctx={ctx} ey={-35.5} E={22.5} R={13} h={9} fill={KIND.res} />
      <rect x={-14.6} y={-47.4} width={29.2} height={3.2} rx={0.6} fill={dark} {...line(ctx, 0.7)} />
      <path d="M-14.6 -47l-2 -2.6 3.8 0.8ZM14.6 -47l2 -2.6 -3.8 0.8Z" fill={KIN} {...line(ctx, 0.5)} />
      {ctx.snow && <rect x={-13.6} y={-48.4} width={27.2} height={1.6} rx={0.8} fill={SNOW} />}
    </g>
  );
}

// ===== 商業（屋台 → 商店 → 百貨店） =====

function ComL1(ctx: ArtCtx) {
  const own = ctx.owner ?? SHU;
  return (
    <g>
      <circle cx={-7} cy={-2.6} r={2.6} fill={WOOD_L} {...line(ctx, 0.8)} />
      <circle cx={7} cy={-2.6} r={2.6} fill={WOOD_L} {...line(ctx, 0.8)} />
      <rect x={-10.5} y={-9.2} width={21} height={5.4} fill={WOOD_L} {...line(ctx)} />
      {!ctx.icon && (
        <g>
          <path d="M-10.5 -6.6h21" stroke={WOOD_D} strokeWidth={0.5} />
          <circle cx={-5.4} cy={-10.2} r={1.1} fill={WASHI} {...line(ctx, 0.4)} />
          <circle cx={-2.8} cy={-10.2} r={1.1} fill={KIND.park} {...line(ctx, 0.4)} />
          <circle cx={-0.2} cy={-10.2} r={1.1} fill={KIND.tour} {...line(ctx, 0.4)} />
          <rect x={3} y={-11.6} width={4.4} height={2.4} rx={0.4} fill={AI7} {...line(ctx, 0.4)} />
        </g>
      )}
      <path d="M-9.6 -9.2V-16M9.6 -9.2V-16" stroke={WOOD_D} strokeWidth={ctx.sw * 1.3} strokeLinecap="round" fill="none" />
      <path d="M-13 -15.6L0 -20.6L13 -15.6L12 -14.3L-12 -14.3Z" fill={KIND.com} {...line(ctx)} />
      {ctx.snow && <path d="M-9.6 -16.9L0 -20.6L9.6 -16.9Q0 -17.6 -9.6 -16.9Z" fill={SNOW} />}
      <Noren ctx={ctx} x={-10.2} y={-14.3} w={20.4} h={3.6} color={own} slits={3} mon={false} />
      <path d="M12.6 -14.3v1" stroke={INK} strokeWidth={0.5} />
      <Chochin ctx={ctx} x={12.6} y={-10.4} r={2} />
    </g>
  );
}

function ComL2(ctx: ArtCtx) {
  const own = ctx.owner ?? SHU;
  return (
    <g>
      <rect x={-17} y={-12.5} width={34} height={12.5} fill={PLASTER} {...line(ctx)} />
      <rect x={-15} y={-11} width={30} height={11} fill="#2a2018" {...line(ctx, 0.6)} />
      {!ctx.icon && (
        <g>
          <rect x={-13.6} y={-3.6} width={12} height={3.6} fill={WOOD_L} {...line(ctx, 0.5)} />
          <rect x={1.6} y={-3.6} width={12} height={3.6} fill={WOOD_L} {...line(ctx, 0.5)} />
          <circle cx={-10.6} cy={-4.7} r={1.25} fill={KIN_L} />
          <circle cx={-7.6} cy={-4.7} r={1.25} fill={SHU_L} />
          <circle cx={-4.6} cy={-4.7} r={1.25} fill={KIND.park} />
          <rect x={3.2} y={-5.9} width={2.6} height={2.3} fill={AI2} />
          <rect x={6.6} y={-5.9} width={2.6} height={2.3} fill={KIN_L} />
          <rect x={10} y={-5.9} width={2.6} height={2.3} fill={WASHI} />
        </g>
      )}
      <Noren ctx={ctx} x={-15.6} y={-12.2} w={31.2} h={5} color={own} slits={4} />
      <Roof ctx={ctx} ey={-12.5} E={20} R={17.5} h={3} fill={KIND.com} tiles={false} />
      <rect x={-15} y={-21.5} width={30} height={6.2} fill={WASHI} {...line(ctx)} />
      {[-9.6, 0, 9.6].map(x => (
        <rect key={x} x={x - 3} y={-20.2} width={6} height={3.7} fill={win(ctx)} {...line(ctx, 0.6)} />
      ))}
      <Roof ctx={ctx} ey={-21.5} E={19.5} R={13.5} h={6.5} fill={KIND.com} ridge={KIND.comD} />
      <path d="M-5.6 -29.2v-1.4M5.6 -29.2v-1.4" stroke={WOOD_D} strokeWidth={ctx.sw * 1.2} />
      <rect x={-8.4} y={-36} width={16.8} height={5.6} rx={0.6} fill={WOOD_D} stroke={KIN} strokeWidth={ctx.sw} />
      {!ctx.icon && <path d="M-5.4 -33.2h3M-0.2 -34.6v2.8M2.4 -33.2h3" stroke={KIN_L} strokeWidth={0.9} strokeLinecap="round" fill="none" />}
      <Chochin ctx={ctx} x={-18.6} y={-7.4} r={1.7} />
    </g>
  );
}

function ComL3(ctx: ArtCtx) {
  const own = ctx.owner ?? SHU;
  const wall = '#e6d9bb';
  const stripes: string[] = [];
  for (let x = -17; x <= 17; x += 4.25) stripes.push(`M${x} -12.4v2.4`);
  return (
    <g>
      <rect x={-19} y={-37} width={38} height={37} fill={wall} {...line(ctx)} />
      {!ctx.icon && <path d="M-10.6 -37V-12.4M10.6 -37V-12.4" stroke={WASHI3} strokeWidth={0.8} fill="none" />}
      {[-33.8, -26.8, -19.8].flatMap(y =>
        [-7.2, -2.4, 2.4, 7.2].map(x => <rect key={`${x}_${y}`} x={x - 1.7} y={y} width={3.4} height={5} fill={win(ctx)} {...line(ctx, 0.5)} />),
      )}
      {[-14.8, 14.8].map(x => (
        <g key={x}>
          <rect x={x - 2.4} y={-34.6} width={4.8} height={20.4} fill={own} {...line(ctx, 0.6)} />
          {!ctx.icon && <path d={`M${x} -32v2.8M${x} -26.6v2.8M${x} -21.2v2.8`} stroke={WASHI} strokeWidth={1} strokeLinecap="round" />}
        </g>
      ))}
      <rect x={-20} y={-12.4} width={40} height={2.4} fill={KIND.com} {...line(ctx, 0.7)} />
      {!ctx.icon && <path d={stripes.join('')} stroke={WASHI} strokeWidth={1.1} opacity={0.85} fill="none" />}
      <rect x={-17} y={-8.8} width={9} height={5.8} fill={win(ctx)} {...line(ctx, 0.6)} />
      <rect x={8} y={-8.8} width={9} height={5.8} fill={win(ctx)} {...line(ctx, 0.6)} />
      <path d="M-5.4 0V-6.6Q0 -10.4 5.4 -6.6V0Z" fill="#2a2018" {...line(ctx, 0.7)} />
      {!ctx.icon && <path d="M0 -8.6V0" stroke={KIN} strokeWidth={0.6} />}
      <rect x={-21} y={-39.6} width={42} height={3} rx={0.5} fill={KIND.comD} {...line(ctx, 0.7)} />
      <rect x={-6.4} y={-46} width={12.8} height={6.6} fill={wall} {...line(ctx)} />
      <circle cx={0} cy={-42.8} r={2.2} fill={WASHI} stroke={KIN_D} strokeWidth={ctx.sw * 0.9} />
      {!ctx.icon && <path d="M0 -42.8v-1.5M0 -42.8h1.1" stroke={INK} strokeWidth={0.5} strokeLinecap="round" fill="none" />}
      <path d="M-8 -46L0 -51.6L8 -46Z" fill={KIND.com} {...line(ctx)} />
      {ctx.snow && <path d="M-5 -47.8L0 -51.6L5 -47.8Q0 -48.6 -5 -47.8Z" fill={SNOW} />}
      {ctx.snow && <rect x={-20} y={-40.6} width={40} height={1.5} rx={0.7} fill={SNOW} />}
      <path d="M0 -51.6V-57" stroke={WOOD_D} strokeWidth={ctx.sw} strokeLinecap="round" />
      <path d="M0 -57h6.2l-1.7 1.8 1.7 1.8H0Z" fill={own} {...line(ctx, 0.5)} />
    </g>
  );
}

// ===== 工業（小さな工房 → 工場 → 煙突の大工場） =====

function IndL1(ctx: ArtCtx) {
  return (
    <g>
      <rect x={6} y={-21} width={3.6} height={12} fill={BRICK} {...line(ctx, 0.8)} />
      <rect x={5.4} y={-22.4} width={4.8} height={1.9} fill={BRICK_D} {...line(ctx, 0.6)} />
      <Smoke ctx={ctx} x={7.8} y={-22.8} s={0.8} />
      <rect x={-13} y={-11} width={25} height={11} fill={KIND.ind} {...line(ctx)} />
      {!ctx.icon && <path d="M-9.5 -11V0M8.6 -11V0" stroke={KIND.indD} strokeWidth={0.5} opacity={0.7} fill="none" />}
      <rect x={-3.6} y={-8.6} width={9.2} height={8.6} fill="#2a2018" {...line(ctx, 0.7)} />
      <path d="M-0.8 0c-1.7-2.1 0.2-3.2 0.9-4.9 1.5 1.5 2.8 2.8 1.5 4.9Z" fill={SHU_L} />
      <path d="M0.2 0c-0.6-1.1 0.2-1.7 0.5-2.6 0.8 0.9 1.1 1.7 0.5 2.6Z" fill={KIN_L} />
      <rect x={-11.4} y={-8.2} width={5.2} height={3.8} fill={win(ctx)} {...line(ctx, 0.6)} />
      <Roof ctx={ctx} ey={-11} E={15.5} R={9.5} h={5} fill={KIND.indRoof} ridge={WOOD_D} />
      {!ctx.icon && (
        <g>
          <rect x={-20} y={-2} width={5.4} height={2} fill={WOOD_L} {...line(ctx, 0.5)} />
          <rect x={-19.4} y={-4} width={5.4} height={2} fill={WOOD_L} {...line(ctx, 0.5)} />
          <rect x={-20} y={-6} width={5.4} height={2} fill={WOOD_L} {...line(ctx, 0.5)} />
        </g>
      )}
    </g>
  );
}

function IndL2(ctx: ArtCtx) {
  const teeth = [0, 1, 2].map(i => -18 + i * 10.4);
  return (
    <g>
      <path d="M14.6 0L15.4 -38H19.6L20.4 0Z" fill={BRICK} {...line(ctx)} />
      <rect x={14.8} y={-40.2} width={5.4} height={2.4} fill={BRICK_D} {...line(ctx, 0.6)} />
      {!ctx.icon && <path d="M15.2 -30h4.6M15 -20h5" stroke={BRICK_D} strokeWidth={0.7} fill="none" />}
      <Smoke ctx={ctx} x={17.5} y={-40.8} />
      {teeth.map(x => (
        <g key={x}>
          <path d={`M${x} -14V-22.5L${x + 10.4} -14Z`} fill={KIND.indRoof} {...line(ctx)} />
          <path d={`M${x + 0.9} -14.4V-20.6`} stroke={win(ctx)} strokeWidth={1.3} fill="none" />
          {ctx.snow && <path d={`M${x + 0.8} -22L${x + 9.4} -15`} stroke={SNOW} strokeWidth={1.6} strokeLinecap="round" fill="none" />}
        </g>
      ))}
      <rect x={-18} y={-14} width={31.4} height={14} fill={KIND.ind} {...line(ctx)} />
      {[-14.6, -8, -1.4].map(x => (
        <rect key={x} x={x} y={-11} width={4.6} height={5} fill={win(ctx)} {...line(ctx, 0.6)} />
      ))}
      <rect x={5.8} y={-9} width={5.6} height={9} fill={WOOD_D} {...line(ctx, 0.7)} />
      {!ctx.icon && <path d="M-18 -3.4h23.8" stroke={KIND.indD} strokeWidth={0.6} fill="none" />}
    </g>
  );
}

function IndL3(ctx: ArtCtx) {
  const teeth = [0, 1, 2, 3].map(i => -22 + i * 7.4);
  const stack = (x: number, top: number, smoke: boolean) => {
    const bands: ReactNode[] = [];
    for (let y = top + 2; y < -22; y += 9) bands.push(<rect key={y} x={x - 2} y={y} width={4} height={4.5} fill={SHU} />);
    return (
      <g key={x}>
        <rect x={x - 2} y={top} width={4} height={-top} fill={WASHI} {...line(ctx)} />
        {bands}
        <rect x={x - 2} y={top} width={4} height={-top} fill="none" {...line(ctx)} />
        <rect x={x - 2.7} y={top - 1.6} width={5.4} height={2} fill={STONE_D} {...line(ctx, 0.6)} />
        {smoke && <Smoke ctx={ctx} x={x} y={top - 2} s={1.05} />}
      </g>
    );
  };
  return (
    <g>
      {stack(-15, -50, true)}
      {stack(-5.4, -43, true)}
      <rect x={12.4} y={-33} width={5} height={9} fill={STONE_D} {...line(ctx, 0.8)} />
      {teeth.map(x => (
        <g key={x}>
          <path d={`M${x} -16V-23.4L${x + 7.4} -16Z`} fill={KIND.indRoof} {...line(ctx)} />
          <path d={`M${x + 0.9} -16.4V-21.6`} stroke={win(ctx)} strokeWidth={1.2} fill="none" />
          {ctx.snow && <path d={`M${x + 0.8} -22.8L${x + 6.6} -17`} stroke={SNOW} strokeWidth={1.5} strokeLinecap="round" fill="none" />}
        </g>
      ))}
      <rect x={-22} y={-16} width={29.6} height={16} fill={KIND.ind} {...line(ctx)} />
      {[-19, -13.2, -7.4, -1.6].map(x => (
        <rect key={x} x={x} y={-12.6} width={4} height={5} fill={win(ctx)} {...line(ctx, 0.6)} />
      ))}
      {!ctx.icon && <path d="M-22 -4h29.6" stroke={KIND.indD} strokeWidth={0.6} fill="none" />}
      <rect x={-12} y={-4} width={7} height={4} fill={WOOD_D} {...line(ctx, 0.6)} />
      <rect x={7.6} y={-25} width={14.4} height={25} fill="#b98f38" {...line(ctx)} />
      {[-21, -14.6, -8.2].flatMap(y =>
        [10, 15.6].map(x => <rect key={`${x}_${y}`} x={x} y={y} width={3.8} height={4} fill={win(ctx)} {...line(ctx, 0.5)} />),
      )}
      {ctx.snow && <rect x={7.6} y={-26} width={14.4} height={1.6} rx={0.8} fill={SNOW} />}
      <circle cx={18.4} cy={-4.4} r={4.2} fill={STONE} {...line(ctx, 0.8)} />
      {!ctx.icon && <path d="M14.3 -4.4h8.2M18.4 -8.6v8.4" stroke={STONE_D} strokeWidth={0.6} fill="none" />}
    </g>
  );
}

// ===== 公園 =====

function Park(ctx: ArtCtx) {
  const ground = ctx.snow ? SNOW : ctx.grass;
  return (
    <g>
      <path d="M-22 0Q-22 -4.4 -12 -5H12Q22 -4.4 22 0Z" fill={ground} {...line(ctx, 0.8)} />
      <ellipse cx={9.5} cy={-2.2} rx={8.6} ry={2} fill={ctx.snow ? '#dbe8f0' : AI2} {...line(ctx, 0.6)} />
      <path d="M2.4 -3Q9.5 -10.4 16.6 -3" fill="none" stroke={INK} strokeWidth={ctx.sw * 2 + 2} strokeLinecap="round" />
      <path d="M2.4 -3Q9.5 -10.4 16.6 -3" fill="none" stroke={SHU} strokeWidth={2} strokeLinecap="round" />
      {!ctx.icon && <path d="M5 -6.2v-2.2M9.5 -7.4v-2.4M14 -6.2v-2.2M4.6 -8.3Q9.5 -11.6 14.4 -8.3" fill="none" stroke={SHU_D} strokeWidth={0.7} strokeLinecap="round" />}
      <RoundTree ctx={ctx} x={-11} y={-4} h={23} r={8.6} />
      <PineTree ctx={ctx} x={19} y={-2} h={15} />
      {/* 石灯籠 */}
      <g>
        <rect x={-3.2} y={-6.4} width={3.6} height={1.6} fill={STONE} {...line(ctx, 0.6)} />
        <rect x={-2.2} y={-10.4} width={1.6} height={4} fill={STONE} {...line(ctx, 0.6)} />
        <rect x={-3.4} y={-13.6} width={4} height={3.2} fill={win(ctx)} {...line(ctx, 0.6)} />
        <path d="M-4.6 -13.6L-1.4 -16.6L1.8 -13.6Z" fill={STONE_D} {...line(ctx, 0.6)} />
      </g>
      {!ctx.icon && !ctx.snow && !ctx.leaf.bare && (
        <g>
          <circle cx={-18} cy={-4.6} r={0.9} fill={KIND.tour} />
          <circle cx={-15.6} cy={-5} r={0.9} fill={KIN_L} />
          <circle cx={-5.6} cy={-5.4} r={0.9} fill={WASHI} />
        </g>
      )}
    </g>
  );
}

// ===== 発電所 =====

function Power(ctx: ArtCtx) {
  const steel = ctx.icon ? '#3f4a55' : '#4f5b66';
  return (
    <g>
      <g fill="none" stroke={steel} strokeWidth={ctx.sw * 1.2} strokeLinejoin="round" strokeLinecap="round">
        <path d="M9 0L13.4 -40H15.6L20 0" />
        <path d="M5.6 -29H23.4M7.6 -35.6H21.4" />
        {!ctx.icon && <path d="M10 -9.5L18.4 -18M19 -9.5L10.6 -18M11 -18.5L17.3 -27M18 -18.5L11.7 -27M9.9 -9.5H19.1M10.9 -18.5H18.1M11.9 -27.5H17.1" strokeWidth={ctx.sw * 0.65} />}
      </g>
      {!ctx.icon && <path d="M5.6 -29v2.2M23.4 -29v2.2M7.6 -35.6v2.2M21.4 -35.6v2.2" stroke={WASHI} strokeWidth={1.2} strokeLinecap="round" fill="none" />}
      <path d="M-17.6 0L-16.8 -34H-12.2L-11.4 0Z" fill={STONE} {...line(ctx)} />
      <rect x={-17.4} y={-36} width={5.8} height={2.4} fill={STONE_D} {...line(ctx, 0.6)} />
      <rect x={-16.8} y={-31} width={4.6} height={2.6} fill={SHU} />
      <Smoke ctx={ctx} x={-14.5} y={-36.6} tone={WASHI} />
      <rect x={-21} y={-15} width={27} height={15} fill={BRICK} {...line(ctx)} />
      {!ctx.icon && <path d="M-21 -10h27M-21 -5h27" stroke={BRICK_D} strokeWidth={0.5} opacity={0.6} fill="none" />}
      <path d="M-22.6 -15L-7.5 -22.4L7.6 -15Z" fill="#5a4a3c" {...line(ctx)} />
      {ctx.snow && <path d="M-17 -17.6L-7.5 -22.4L2 -17.6Q-7.5 -18.6 -17 -17.6Z" fill={SNOW} />}
      {[-16.6, 1.6].map(x => (
        <path key={x} d={`M${x - 2.3} -3V-8.6a2.3 2.3 0 0 1 4.6 0V-3Z`} fill={win(ctx)} {...line(ctx, 0.6)} />
      ))}
      <circle cx={-7.5} cy={-7.6} r={ctx.icon ? 6 : 4.8} fill={AI7} stroke={KIND.power} strokeWidth={ctx.sw} />
      <path
        d="M-6.5 -11.6L-9.8 -7H-7.6L-8.7 -3.6L-5 -8.4H-7.2Z"
        fill={KIND.power}
        transform={ctx.icon ? 'translate(-7.5 -7.6) scale(1.3) translate(7.5 7.6)' : undefined}
      />
    </g>
  );
}

// ===== 漁港 =====

function Port(ctx: ArtCtx) {
  const own = ctx.owner ?? SHU;
  return (
    <g>
      {/* 桟橋と魚市場の上屋 */}
      <path d="M-20 -5V-0.6M-13 -5V-0.6M-6 -5V-0.6" stroke={WOOD_D} strokeWidth={ctx.sw * 1.3} strokeLinecap="round" fill="none" />
      <rect x={-23} y={-7} width={21.4} height={2.2} fill={WOOD_L} {...line(ctx, 0.7)} />
      {!ctx.icon && (
        <g>
          <rect x={-19.6} y={-10} width={4.4} height={3} fill={WASHI2} {...line(ctx, 0.5)} />
          <rect x={-14.4} y={-10} width={4.4} height={3} fill={AI2} {...line(ctx, 0.5)} />
          <rect x={-9.2} y={-9.4} width={3.6} height={2.4} fill={WASHI2} {...line(ctx, 0.5)} />
        </g>
      )}
      <path d="M-21 -7V-14.4M-4.6 -7V-14.4" stroke={WOOD_D} strokeWidth={ctx.sw * 1.3} strokeLinecap="round" fill="none" />
      <Roof ctx={ctx} cx={-12.8} ey={-14} E={11} R={6.5} h={5} fill={KIND.port} ridge={KIND.portD} />
      {/* 漁船と大漁旗 */}
      <path d="M14.2 -8V-25.4" stroke={WOOD_D} strokeWidth={ctx.sw * 1.2} strokeLinecap="round" />
      <path d="M14.2 -25.4H23L21.4 -22.2L23 -19H14.2Z" fill={own} {...line(ctx, 0.6)} />
      {!ctx.icon && <circle cx={17.8} cy={-22.2} r={1.5} fill={WASHI} />}
      <rect x={5.6} y={-12.6} width={6.6} height={5} fill={WASHI2} {...line(ctx, 0.7)} />
      <rect x={7} y={-11.4} width={3.6} height={2.1} fill={win(ctx)} {...line(ctx, 0.4)} />
      <path d="M-1.6 -8.8Q10 -6.4 22.8 -9.8L19.8 -2.4H2.4Z" fill={WASHI} {...line(ctx)} />
      <path d="M-0.2 -6.6Q10 -4.2 21.6 -7" stroke={SHU} strokeWidth={1.2} fill="none" />
      {/* 手前の水面 */}
      <path d="M-23 0V-3.4Q-17.25 -5 -11.5 -3.4T0 -3.4T11.5 -3.4T23 -3.4V0Z" fill={KIND.port} {...line(ctx, 0.7)} />
      {!ctx.icon && <path d="M-18 -1.4q2.5-1.2 5 0M-4 -1.2q2.5-1.2 5 0M10 -1.4q2.5-1.2 5 0" stroke={WASHI} strokeWidth={0.6} fill="none" opacity={0.85} />}
    </g>
  );
}

// ===== 観光名所: 塔（古都など） =====

/** 塔を下から積む。返り値は部品と、てっぺんの高さ */
function pagodaParts(ctx: ArtCtx, cx: number, tiers: number, base: number): ReactNode[] {
  const out: ReactNode[] = [];
  let y = base;
  let half = 3.6 + tiers * 0.9;
  out.push(<rect key="st" x={cx - half - 2.4} y={y - 1.6} width={half * 2 + 4.8} height={1.6} fill={STONE} {...line(ctx, 0.6)} />);
  y -= 1.6;
  for (let i = 0; i < tiers; i++) {
    const bodyH = i === 0 ? 6.4 : 4.2;
    const last = i === tiers - 1;
    out.push(
      <g key={`b${i}`}>
        <rect x={cx - half} y={y - bodyH} width={half * 2} height={bodyH} fill={SHU} {...line(ctx, 0.8)} />
        <rect x={cx - half * 0.42} y={y - bodyH + 1} width={half * 0.84} height={bodyH - (i === 0 ? 1 : 1.8)} fill={i === 0 ? WOOD_D : WASHI} {...line(ctx, 0.4)} />
      </g>,
    );
    y -= bodyH;
    const rh = last ? 6 : 3.2;
    out.push(<Roof key={`r${i}`} ctx={ctx} cx={cx} ey={y} E={half + 5.4} R={last ? 0.9 : half - 0.7} h={rh} fill={KIND.tour} tiles={false} />);
    y -= rh;
    half -= 0.9;
  }
  out.push(
    <g key="fin">
      <path d={`M${cx} ${y + 0.4}V${y - 7}`} stroke={KIN_D} strokeWidth={ctx.sw * 1.3 + 0.3} strokeLinecap="round" />
      <circle cx={cx} cy={y - 1.6} r={1.2} fill={KIN} {...line(ctx, 0.4)} />
      <circle cx={cx} cy={y - 4} r={0.9} fill={KIN} {...line(ctx, 0.4)} />
    </g>,
  );
  return out;
}

function TourPagoda(ctx: ArtCtx, level: number) {
  if (level <= 1) {
    return (
      <g>
        <rect x={5} y={-9.4} width={13} height={9.4} fill={WASHI} {...line(ctx)} />
        <rect x={9} y={-7} width={5} height={7} fill={WOOD_D} {...line(ctx, 0.6)} />
        <path d="M5 -9.4V0M18 -9.4V0" stroke={SHU} strokeWidth={1.4} fill="none" />
        <Roof ctx={ctx} cx={11.5} ey={-9.4} E={10} R={5} h={6.4} fill={KIND.tour} ridge={KIND.tourD} />
        {!ctx.icon && <path d="M6.4 -8.6Q11.5 -6.6 16.6 -8.6" fill="none" stroke={KIN_L} strokeWidth={1} strokeLinecap="round" />}
        <Torii ctx={ctx} cx={-8.4} w={11} h={17} />
        {!ctx.icon && (
          <g>
            <rect x={-18.6} y={-1.4} width={2.6} height={1.4} fill={STONE} {...line(ctx, 0.5)} />
            <rect x={-18} y={-5} width={1.4} height={3.6} fill={STONE} {...line(ctx, 0.5)} />
            <rect x={-18.8} y={-7.6} width={3} height={2.6} fill={win(ctx)} {...line(ctx, 0.5)} />
            <path d="M-19.6 -7.6L-17.3 -9.8L-15 -7.6Z" fill={STONE_D} {...line(ctx, 0.5)} />
          </g>
        )}
      </g>
    );
  }
  if (level === 2) {
    return (
      <g>
        {pagodaParts(ctx, 4, 3, 0)}
        <Torii ctx={ctx} cx={-13} w={8.6} h={12.6} />
      </g>
    );
  }
  return (
    <g>
      {/* 本堂 */}
      <rect x={6.4} y={-9} width={15} height={9} fill={WASHI} {...line(ctx)} />
      <path d="M6.4 -9V0M21.4 -9V0M13.9 -9V0" stroke={SHU} strokeWidth={1.3} fill="none" />
      <Roof ctx={ctx} cx={13.9} ey={-9} E={10} R={4.6} h={7.4} fill={KIND.tour} ridge={KIND.tourD} />
      {pagodaParts(ctx, -8, 5, 0)}
    </g>
  );
}

// ===== 観光名所: 城（城下町） =====

function castleParts(ctx: ArtCtx, cx: number, tiers: number, bodyH: number, baseH: number): ReactNode[] {
  const out: ReactNode[] = [];
  let half = 6 + tiers * 2.9;
  // 石垣（裾が広がる）
  out.push(
    <g key="base">
      <path d={`M${cx - half - 4} 0Q${cx - half - 1.2} ${-baseH * 0.55} ${cx - half} ${-baseH}L${cx + half} ${-baseH}Q${cx + half + 1.2} ${-baseH * 0.55} ${cx + half + 4} 0Z`} fill={STONE} {...line(ctx)} />
      {!ctx.icon && (
        <path
          d={`M${cx - half - 2} ${-baseH * 0.35}h${half * 2 + 4}M${cx - half - 0.6} ${-baseH * 0.7}h${half * 2 + 1.2}M${cx - half * 0.5} ${-baseH * 0.35}V0M${cx + half * 0.3} ${-baseH * 0.35}V0M${cx - half * 0.1} ${-baseH * 0.7}V${-baseH * 0.35}M${cx + half * 0.7} ${-baseH * 0.7}V${-baseH * 0.35}`}
          stroke={STONE_D}
          strokeWidth={0.55}
          fill="none"
        />
      )}
    </g>,
  );
  let y = -baseH;
  for (let i = 0; i < tiers; i++) {
    const last = i === tiers - 1;
    out.push(
      <g key={`b${i}`}>
        <rect x={cx - half} y={y - bodyH} width={half * 2} height={bodyH} fill={WASHI} {...line(ctx)} />
        <rect x={cx - half} y={y - bodyH * 0.38} width={half * 2} height={bodyH * 0.38} fill="#3d4652" {...line(ctx, 0.5)} />
        {[-0.5, 0, 0.5].map(k => (
          <rect key={k} x={cx + k * half - 0.9} y={y - bodyH + 1.2} width={1.8} height={bodyH * 0.36} fill={win(ctx)} {...line(ctx, 0.4)} />
        ))}
      </g>,
    );
    y -= bodyH;
    const rh = last ? 7.4 : 3.8;
    out.push(<Roof key={`r${i}`} ctx={ctx} cx={cx} ey={y} E={half + 4} R={last ? 3.2 : half - 2.4} h={rh} fill={KIND.tour} ridge={last ? KIND.tourD : undefined} tiles={false} />);
    if (!last) {
      // 千鳥破風（屋根の正面の三角）
      out.push(<path key={`g${i}`} d={`M${cx - 3.4} ${y - 0.2}L${cx} ${y - rh - 0.6}L${cx + 3.4} ${y - 0.2}Z`} fill={WASHI} {...line(ctx, 0.7)} />);
    }
    y -= rh;
    half -= 2.9;
  }
  // 金のしゃちほこ
  out.push(
    <path key="shachi" d={`M${cx - 3.6} ${y - 1.2}q-1.8 -1.2 -0.6 -3.2q0.6 1.6 2 1.8ZM${cx + 3.6} ${y - 1.2}q1.8 -1.2 0.6 -3.2q-0.6 1.6 -2 1.8Z`} fill={KIN} {...line(ctx, 0.5)} />,
  );
  return out;
}

function TourCastle(ctx: ArtCtx, level: number) {
  if (level <= 1) {
    // 石垣と櫓門
    return (
      <g>
        <path d="M-21 0Q-20 -5 -19 -8.4H19Q20 -5 21 0Z" fill={STONE} {...line(ctx)} />
        {!ctx.icon && <path d="M-19.8 -4.2h39.6M-10 -8.4v4.2M10 -8.4v4.2M-15 -4.2V0M15 -4.2V0" stroke={STONE_D} strokeWidth={0.55} fill="none" />}
        <path d="M-4.4 0V-6.4Q0 -9 4.4 -6.4V0Z" fill="#2a2018" {...line(ctx, 0.7)} />
        <rect x={-10} y={-14.6} width={20} height={6.2} fill={WASHI} {...line(ctx)} />
        <rect x={-10} y={-10.8} width={20} height={2.4} fill="#3d4652" {...line(ctx, 0.5)} />
        {[-5.6, 0, 5.6].map(x => (
          <rect key={x} x={x - 1} y={-13.6} width={2} height={2.2} fill={win(ctx)} {...line(ctx, 0.4)} />
        ))}
        <Roof ctx={ctx} ey={-14.6} E={14} R={7.4} h={6} fill={KIND.tour} ridge={KIND.tourD} />
        <PineTree ctx={ctx} x={17} y={-8.4} h={11} />
      </g>
    );
  }
  if (level === 2) return <g>{castleParts(ctx, 0, 2, 6, 8.4)}</g>;
  return <g>{castleParts(ctx, 0, 3, 6.4, 10.4)}</g>;
}

// ===== 観光名所: 温泉旅館（温泉町・湯の町） =====

function OnsenMark({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} fill="none" stroke={WASHI} strokeLinecap="round">
      <path d="M-2.4 0.6a2.4 1.5 0 0 0 4.8 0" strokeWidth={0.9} />
      <path d="M-1.3 -0.4c-0.6 -0.8 0.6 -1.2 0 -2M0 -0.4c-0.6 -0.8 0.6 -1.2 0 -2M1.3 -0.4c-0.6 -0.8 0.6 -1.2 0 -2" strokeWidth={0.6} />
    </g>
  );
}

function TourRyokan(ctx: ArtCtx, level: number) {
  const own = ctx.owner ?? AI5;
  const wall = '#8a6a48';
  if (level <= 1) {
    return (
      <g>
        <Steam ctx={ctx} x={-2} y={-17} s={0.9} />
        <rect x={-11} y={-10.4} width={22} height={10.4} fill={wall} {...line(ctx)} />
        <rect x={-9.4} y={-8.6} width={5.4} height={4.4} fill={win(ctx)} {...line(ctx, 0.6)} />
        <rect x={-1.4} y={-9} width={9.6} height={9} fill={WOOD_D} {...line(ctx, 0.7)} />
        <Noren ctx={ctx} x={-2} y={-9.4} w={10.8} h={5} color={own} slits={1} mon={false} />
        {!ctx.icon && <OnsenMark x={3.4} y={-6.2} s={0.8} />}
        <Roof ctx={ctx} ey={-10.4} E={14.4} R={6.4} h={7} fill={KIND.tour} ridge={KIND.tourD} />
        {/* 足湯の桶 */}
        <rect x={-18.6} y={-3.4} width={6.4} height={3.4} rx={0.6} fill={WOOD_L} {...line(ctx, 0.7)} />
        <path d="M-18 -2.6h5.2" stroke={AI2} strokeWidth={1.2} strokeLinecap="round" />
      </g>
    );
  }
  if (level === 2) {
    return (
      <g>
        <Steam ctx={ctx} x={-8} y={-27} />
        <rect x={-16} y={-11.4} width={32} height={11.4} fill={wall} {...line(ctx)} />
        {[-12, 7].map(x => (
          <rect key={x} x={x} y={-9.4} width={5.6} height={5} fill={win(ctx)} {...line(ctx, 0.6)} />
        ))}
        <rect x={-4.6} y={-9.6} width={9.2} height={9.6} fill={WOOD_D} {...line(ctx, 0.7)} />
        <Noren ctx={ctx} x={-5.2} y={-10} w={10.4} h={5} color={own} slits={1} mon={false} />
        {!ctx.icon && <OnsenMark x={0} y={-6.8} s={0.8} />}
        <Roof ctx={ctx} ey={-11.4} E={19} R={16.4} h={3} fill={KIND.tour} tiles={false} />
        <rect x={-14.4} y={-21} width={28.8} height={6.8} fill={WASHI} {...line(ctx)} />
        {[-10.6, -3.5, 3.6, 10.7].map(x => (
          <rect key={x} x={x - 2.5} y={-19.8} width={5} height={3.6} fill={win(ctx)} {...line(ctx, 0.5)} />
        ))}
        <path d="M-15.4 -15.2h30.8" stroke={SHU} strokeWidth={1.3} strokeLinecap="round" />
        <Roof ctx={ctx} ey={-21} E={19} R={11} h={7} fill={KIND.tour} ridge={KIND.tourD} />
        <Chochin ctx={ctx} x={-18} y={-6.6} r={1.6} />
      </g>
    );
  }
  return (
    <g>
      <Steam ctx={ctx} x={-13} y={-33} s={1.1} />
      <rect x={-19} y={-11.6} width={38} height={11.6} fill={wall} {...line(ctx)} />
      {[-15, -8.6, 9, 15.4].map(x => (
        <rect key={x} x={x - 2.2} y={-9.4} width={4.4} height={5} fill={win(ctx)} {...line(ctx, 0.6)} />
      ))}
      <rect x={-5} y={-10} width={10} height={10} fill={WOOD_D} {...line(ctx, 0.7)} />
      <Noren ctx={ctx} x={-5.6} y={-10.4} w={11.2} h={5.2} color={own} slits={1} mon={false} />
      {!ctx.icon && <OnsenMark x={0} y={-7} s={0.85} />}
      <Roof ctx={ctx} ey={-11.6} E={22.4} R={19.4} h={3} fill={KIND.tour} tiles={false} />
      <rect x={-17} y={-20.6} width={34} height={6.4} fill={WASHI} {...line(ctx)} />
      {[-13, -6.5, 0, 6.5, 13].map(x => (
        <rect key={x} x={x - 2.2} y={-19.4} width={4.4} height={3.4} fill={win(ctx)} {...line(ctx, 0.5)} />
      ))}
      <path d="M-18 -15h36" stroke={SHU} strokeWidth={1.3} strokeLinecap="round" />
      <Roof ctx={ctx} ey={-20.6} E={20.4} R={15.6} h={3} fill={KIND.tour} tiles={false} />
      <rect x={-13} y={-29.4} width={26} height={6.2} fill={WASHI} {...line(ctx)} />
      {[-8.6, -2.9, 2.9, 8.6].map(x => (
        <rect key={x} x={x - 2} y={-28.2} width={4} height={3.2} fill={win(ctx)} {...line(ctx, 0.5)} />
      ))}
      <path d="M-14 -23.8h28" stroke={SHU} strokeWidth={1.3} strokeLinecap="round" />
      <Roof ctx={ctx} ey={-29.4} E={17.4} R={8} h={7.4} fill={KIND.tour} ridge={KIND.tourD} />
      {/* 太鼓の櫓（赤い窓） */}
      <rect x={-3.6} y={-42.4} width={7.2} height={5} fill={WASHI} {...line(ctx)} />
      <rect x={-2.2} y={-41.4} width={4.4} height={3} fill={ctx.lit ? SHU_L : SHU_D} {...line(ctx, 0.5)} />
      <path d="M-6 -42.4L0 -47.4L6 -42.4Z" fill={KIND.tour} {...line(ctx)} />
      {ctx.snow && <path d="M-3.8 -44.2L0 -47.4L3.8 -44.2Q0 -44.9 -3.8 -44.2Z" fill={SNOW} />}
      <circle cx={0} cy={-48.6} r={1.2} fill={KIN} {...line(ctx, 0.4)} />
      <Chochin ctx={ctx} x={-21} y={-6.6} r={1.6} />
      <Chochin ctx={ctx} x={21} y={-6.6} r={1.6} />
    </g>
  );
}

// ===== 引き当て =====

/** 建物の絵（地面が y=0、中心が x=0） */
export function BuildingArt({ kind, level = 1, ctx }: { kind: BuildingKind; level?: number; ctx: ArtCtx }) {
  const lv = Math.max(1, Math.min(3, Math.round(level)));
  switch (kind) {
    case 'res': return lv === 1 ? ResL1(ctx) : lv === 2 ? ResL2(ctx) : ResL3(ctx);
    case 'com': return lv === 1 ? ComL1(ctx) : lv === 2 ? ComL2(ctx) : ComL3(ctx);
    case 'ind': return lv === 1 ? IndL1(ctx) : lv === 2 ? IndL2(ctx) : IndL3(ctx);
    case 'park': return Park(ctx);
    case 'power': return Power(ctx);
    case 'port': return Port(ctx);
    case 'tourism': return ctx.tourism === 'castle' ? TourCastle(ctx, lv) : ctx.tourism === 'ryokan' ? TourRyokan(ctx, lv) : TourPagoda(ctx, lv);
  }
}

/** 空き地（杭と縄・草・立て札） */
export function EmptyLotArt({ ctx }: { ctx: ArtCtx }) {
  const grass = ctx.snow ? SNOW_SHADE : ctx.grass;
  const tuft = (x: number, s = 1) => `M${x - 1.8 * s} 0l${-0.6 * s} ${-2.8 * s} ${1.5 * s} ${1.6 * s} ${0.9 * s} ${-3.4 * s} ${0.9 * s} ${3.4 * s} ${1.5 * s} ${-1.6 * s} ${-0.6 * s} ${2.8 * s}Z`;
  return (
    <g>
      <path d={`${tuft(-11.5)}${tuft(-3.4, 0.8)}${tuft(11, 1.1)}${tuft(15.6, 0.7)}`} fill={grass} stroke={INK} strokeWidth={ctx.sw * 0.4} strokeLinejoin="round" />
      <path d="M-18 0V-6.4M-7 0V-6.4M7 0V-6.4M18 0V-6.4" stroke={WOOD} strokeWidth={ctx.sw * 1.9} strokeLinecap="round" fill="none" />
      <path d="M-18 -5Q-12.5 -2.4 -7 -5Q0 -2.4 7 -5Q12.5 -2.4 18 -5" fill="none" stroke={WASHI3} strokeWidth={ctx.sw * 1.2} strokeLinecap="round" />
      <path d="M0.4 0V-9.6" stroke={WOOD_D} strokeWidth={ctx.sw * 1.5} strokeLinecap="round" />
      <rect x={-4.8} y={-15.4} width={10.4} height={6.6} rx={0.7} fill={WASHI2} {...line(ctx, 0.8)} />
      <path d="M0.4 -14v3.8M-1.5 -12.1h3.8" stroke={KIN_D} strokeWidth={1.2} strokeLinecap="round" fill="none" />
    </g>
  );
}

/** 空き家の印（戸板を打ち付け、草が伸びる）。灰色にした建物の上に重ねる */
export function VacantMarks({ ctx, w }: { ctx: ArtCtx; w: number }) {
  const half = Math.min(8, w * 0.2);
  return (
    <g>
      <rect x={-half} y={-8.4} width={half * 2} height={8.4} fill="#6f675a" {...line(ctx, 0.7)} />
      <path d={`M${-half} -7.6L${half} -1.2M${half} -7.6L${-half} -1.2`} stroke={WASHI3} strokeWidth={1.5} strokeLinecap="round" />
      <path d={`M${-half} -7.6L${half} -1.2M${half} -7.6L${-half} -1.2`} stroke={INK} strokeWidth={0.4} strokeLinecap="round" opacity={0.6} />
      <path d={`M${-half - 6} 0l-0.6 -3.4 1.6 2 0.8 -4 0.8 4 1.6 -2 -0.6 3.4ZM${half + 3} 0l-0.5 -2.8 1.3 1.6 0.7 -3.2 0.7 3.2 1.3 -1.6 -0.5 2.8Z`} fill="#8a9a6a" stroke={INK} strokeWidth={0.35} strokeLinejoin="round" />
    </g>
  );
}

/** あと少しで空き家（傾いた看板） */
export function WarnSign({ ctx, x }: { ctx: ArtCtx; x: number }) {
  return (
    <g transform={`translate(${x} 0) rotate(-16)`}>
      <path d="M0 0V-9" stroke={WOOD_D} strokeWidth={ctx.sw * 1.4} strokeLinecap="round" />
      <rect x={-4.4} y={-14.4} width={8.8} height={6} rx={0.6} fill={WASHI2} stroke={SHU_D} strokeWidth={ctx.sw} />
      <path d="M0 -13.2v2.6M0 -9.8v0.2" stroke={SHU} strokeWidth={1.3} strokeLinecap="round" />
    </g>
  );
}

/** 幟（持ち主の色の旗）。竿は地面から */
export function Nobori({ ctx, x, h = 20, color }: { ctx: ArtCtx; x: number; h?: number; color: string }) {
  const top = -h;
  return (
    <g>
      <path d={`M${x} 0V${top}M${x} ${top + 0.9}h5.6`} fill="none" stroke={WOOD_D} strokeWidth={ctx.sw * 1.1} strokeLinecap="round" />
      <rect x={x + 0.7} y={top + 1.3} width={4.6} height={h * 0.62} fill={color} {...line(ctx, 0.6)} />
      <circle cx={x + 3} cy={top + 1.3 + h * 0.17} r={1.2} fill={WASHI} />
      <path d={`M${x + 1.8} ${top + 1.3 + h * 0.36}h2.4M${x + 1.8} ${top + 1.3 + h * 0.46}h2.4`} stroke={WASHI} strokeWidth={0.7} strokeLinecap="round" />
    </g>
  );
}
