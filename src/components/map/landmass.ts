import { BOARD_NODES } from '../../data/boardNodes';
import type { BoardNode } from '../../game/types';

// v3.2.3: 10エリア枠を実際の地方形状に近似した手書きSVGパスに変更。
// 凸包 + padding ではなく、各地方の bounding box にフィットする「目で見た地方シルエット」を描く。
// 各 builder は { x, y, w, h } を受け取り、その bbox に内接する形状のパスを返す。

type Pt = { x: number; y: number };

// === 10エリアの定義 ===
export interface MapArea {
  id: string;
  name: string;
  nodes: BoardNode[];
  pad: number;
  tone: number; // 0..1
}

const OKINAWA_IDS = new Set(['amami', 'tokunoshima', 'naha', 'goal', 'r_amami_tokunoshima', 'r_yakushima_amami', 'r_naha_goal']);
const TANEGASHIMA_IDS = new Set(['tanegashima', 'yakushima', 'r_tanegashima_yakushima', 'r_kagoshima_tanegashima', 'r_kagoshima_yakushima']);

const byRegion = (r: string) => BOARD_NODES.filter(n => n.region === r);
const kyushuMain = BOARD_NODES.filter(n =>
  n.region === 'kyushu' && !OKINAWA_IDS.has(n.id) && !TANEGASHIMA_IDS.has(n.id)
);

export const MAP_AREAS: MapArea[] = [
  { id: 'hokkaido', name: '北海道', nodes: byRegion('hokkaido'), pad: 60, tone: 0.0 },
  { id: 'tohoku', name: '東北', nodes: byRegion('tohoku'), pad: 52, tone: 0.1 },
  { id: 'kanto', name: '関東', nodes: byRegion('kanto'), pad: 52, tone: 0.2 },
  { id: 'chubu', name: '中部', nodes: byRegion('chubu'), pad: 52, tone: 0.3 },
  { id: 'kinki', name: '近畿', nodes: byRegion('kinki'), pad: 50, tone: 0.4 },
  { id: 'chugoku', name: '中国', nodes: byRegion('chugoku'), pad: 48, tone: 0.5 },
  { id: 'shikoku', name: '四国', nodes: byRegion('shikoku'), pad: 46, tone: 0.6 },
  { id: 'kyushu_main', name: '九州', nodes: kyushuMain, pad: 50, tone: 0.7 },
  { id: 'tanegashima', name: '種子島・屋久島', nodes: BOARD_NODES.filter(n => TANEGASHIMA_IDS.has(n.id)), pad: 30, tone: 0.85 },
  { id: 'okinawa', name: '沖縄・奄美', nodes: BOARD_NODES.filter(n => OKINAWA_IDS.has(n.id)), pad: 36, tone: 1.0 },
];

// === bounding box ===
interface Bounds { x: number; y: number; w: number; h: number; cx: number; cy: number }

function getBounds(nodes: BoardNode[], pad: number): Bounds | null {
  if (nodes.length === 0) return null;
  const xs = nodes.map(n => n.x);
  const ys = nodes.map(n => n.y);
  const minX = Math.min(...xs) - pad;
  const maxX = Math.max(...xs) + pad;
  const minY = Math.min(...ys) - pad;
  const maxY = Math.max(...ys) + pad;
  return {
    x: minX, y: minY,
    w: maxX - minX, h: maxY - minY,
    cx: (minX + maxX) / 2, cy: (minY + maxY) / 2,
  };
}

const f = (v: number) => Math.round(v * 10) / 10;
const P = (p: Pt) => `${f(p.x)},${f(p.y)}`;

// 正規化座標(0..1)をbbox座標へ
function np(b: Bounds, ux: number, uy: number): Pt {
  return { x: b.x + b.w * ux, y: b.y + b.h * uy };
}

// === 各地方の手描きシルエット（bbox にフィット）===

// 北海道: 卵型 + 南端に渡島半島(下方向に張り出し)
function buildHokkaido(b: Bounds): string {
  const p = (ux: number, uy: number) => np(b, ux, uy);
  return [
    `M ${P(p(0.10, 0.40))}`,
    `C ${P(p(0.05, 0.18))} ${P(p(0.20, 0.00))} ${P(p(0.45, 0.05))}`,
    `C ${P(p(0.70, 0.00))} ${P(p(0.95, 0.10))} ${P(p(0.98, 0.35))}`,
    `C ${P(p(1.00, 0.55))} ${P(p(0.90, 0.70))} ${P(p(0.70, 0.72))}`,
    `C ${P(p(0.55, 0.78))} ${P(p(0.45, 0.85))} ${P(p(0.35, 0.78))}`,
    `C ${P(p(0.20, 0.95))} ${P(p(0.05, 1.00))} ${P(p(0.05, 0.90))}`,
    `C ${P(p(0.00, 0.75))} ${P(p(0.05, 0.55))} ${P(p(0.10, 0.40))}`,
    'Z',
  ].join(' ');
}

// 東北: 南北に長い、太平洋側(東)に出っ張り(下北・三陸)
function buildTohoku(b: Bounds): string {
  const p = (ux: number, uy: number) => np(b, ux, uy);
  return [
    `M ${P(p(0.30, 0.02))}`,
    `C ${P(p(0.45, 0.00))} ${P(p(0.65, 0.05))} ${P(p(0.70, 0.10))}`,
    `C ${P(p(0.95, 0.10))} ${P(p(0.95, 0.20))} ${P(p(0.85, 0.30))}`,
    `C ${P(p(0.95, 0.45))} ${P(p(1.00, 0.60))} ${P(p(0.90, 0.75))}`,
    `C ${P(p(0.85, 0.90))} ${P(p(0.65, 1.00))} ${P(p(0.50, 0.98))}`,
    `C ${P(p(0.30, 1.00))} ${P(p(0.10, 0.90))} ${P(p(0.10, 0.75))}`,
    `C ${P(p(0.00, 0.55))} ${P(p(0.05, 0.35))} ${P(p(0.15, 0.20))}`,
    `C ${P(p(0.18, 0.10))} ${P(p(0.22, 0.05))} ${P(p(0.30, 0.02))}`,
    'Z',
  ].join(' ');
}

// 関東: 角丸四角 + 南東に房総半島(右下に張り出し)
function buildKanto(b: Bounds): string {
  const p = (ux: number, uy: number) => np(b, ux, uy);
  return [
    `M ${P(p(0.20, 0.08))}`,
    `C ${P(p(0.40, 0.00))} ${P(p(0.65, 0.00))} ${P(p(0.80, 0.10))}`,
    `C ${P(p(0.95, 0.20))} ${P(p(1.00, 0.40))} ${P(p(0.95, 0.55))}`,
    // 房総半島
    `C ${P(p(1.05, 0.65))} ${P(p(1.05, 0.85))} ${P(p(0.85, 0.92))}`,
    `C ${P(p(0.65, 1.00))} ${P(p(0.40, 1.00))} ${P(p(0.25, 0.90))}`,
    `C ${P(p(0.05, 0.80))} ${P(p(0.00, 0.55))} ${P(p(0.05, 0.35))}`,
    `C ${P(p(0.05, 0.20))} ${P(p(0.10, 0.12))} ${P(p(0.20, 0.08))}`,
    'Z',
  ].join(' ');
}

// 中部: 北日本海と南太平洋を斜めに結ぶ、北中部の山(中央高地)
function buildChubu(b: Bounds): string {
  const p = (ux: number, uy: number) => np(b, ux, uy);
  return [
    `M ${P(p(0.10, 0.20))}`,
    `C ${P(p(0.20, 0.05))} ${P(p(0.45, 0.00))} ${P(p(0.65, 0.05))}`,
    `C ${P(p(0.90, 0.10))} ${P(p(1.00, 0.30))} ${P(p(0.95, 0.50))}`,
    `C ${P(p(1.00, 0.70))} ${P(p(0.85, 0.95))} ${P(p(0.70, 0.98))}`,
    `C ${P(p(0.50, 1.00))} ${P(p(0.30, 0.95))} ${P(p(0.15, 0.85))}`,
    `C ${P(p(0.00, 0.70))} ${P(p(0.00, 0.45))} ${P(p(0.05, 0.30))}`,
    `C ${P(p(0.05, 0.25))} ${P(p(0.08, 0.22))} ${P(p(0.10, 0.20))}`,
    'Z',
  ].join(' ');
}

// 近畿: 紀伊半島が南に張り出す、北側は丸い
function buildKinki(b: Bounds): string {
  const p = (ux: number, uy: number) => np(b, ux, uy);
  return [
    `M ${P(p(0.20, 0.10))}`,
    `C ${P(p(0.40, 0.00))} ${P(p(0.65, 0.00))} ${P(p(0.85, 0.10))}`,
    `C ${P(p(1.00, 0.20))} ${P(p(1.00, 0.40))} ${P(p(0.90, 0.50))}`,
    // 紀伊半島南端
    `C ${P(p(0.95, 0.65))} ${P(p(0.85, 0.95))} ${P(p(0.65, 1.00))}`,
    `C ${P(p(0.50, 1.05))} ${P(p(0.40, 1.00))} ${P(p(0.30, 0.85))}`,
    `C ${P(p(0.10, 0.75))} ${P(p(0.00, 0.55))} ${P(p(0.05, 0.35))}`,
    `C ${P(p(0.08, 0.20))} ${P(p(0.15, 0.12))} ${P(p(0.20, 0.10))}`,
    'Z',
  ].join(' ');
}

// 中国: 横長の細い島型
function buildChugoku(b: Bounds): string {
  const p = (ux: number, uy: number) => np(b, ux, uy);
  return [
    `M ${P(p(0.05, 0.30))}`,
    `C ${P(p(0.10, 0.10))} ${P(p(0.25, 0.00))} ${P(p(0.45, 0.05))}`,
    `C ${P(p(0.65, 0.00))} ${P(p(0.85, 0.05))} ${P(p(0.95, 0.25))}`,
    `C ${P(p(1.00, 0.45))} ${P(p(0.95, 0.65))} ${P(p(0.85, 0.85))}`,
    `C ${P(p(0.70, 1.00))} ${P(p(0.45, 1.00))} ${P(p(0.30, 0.90))}`,
    `C ${P(p(0.10, 0.85))} ${P(p(0.00, 0.65))} ${P(p(0.05, 0.45))}`,
    `C ${P(p(0.03, 0.38))} ${P(p(0.03, 0.32))} ${P(p(0.05, 0.30))}`,
    'Z',
  ].join(' ');
}

// 四国: ひし形気味の島
function buildShikoku(b: Bounds): string {
  const p = (ux: number, uy: number) => np(b, ux, uy);
  return [
    `M ${P(p(0.50, 0.05))}`,
    `C ${P(p(0.75, 0.05))} ${P(p(0.95, 0.20))} ${P(p(1.00, 0.45))}`,
    `C ${P(p(0.98, 0.70))} ${P(p(0.80, 0.95))} ${P(p(0.55, 1.00))}`,
    `C ${P(p(0.30, 1.00))} ${P(p(0.05, 0.85))} ${P(p(0.00, 0.60))}`,
    `C ${P(p(0.00, 0.35))} ${P(p(0.20, 0.10))} ${P(p(0.50, 0.05))}`,
    'Z',
  ].join(' ');
}

// 九州本島: 縦長、東(右)に少し膨らむ、南端は薩摩半島
function buildKyushu(b: Bounds): string {
  const p = (ux: number, uy: number) => np(b, ux, uy);
  return [
    `M ${P(p(0.30, 0.05))}`,
    `C ${P(p(0.55, 0.00))} ${P(p(0.75, 0.05))} ${P(p(0.85, 0.20))}`,
    `C ${P(p(1.00, 0.35))} ${P(p(1.00, 0.55))} ${P(p(0.90, 0.70))}`,
    `C ${P(p(0.85, 0.85))} ${P(p(0.65, 0.95))} ${P(p(0.50, 1.00))}`,
    // 薩摩半島(南端)
    `C ${P(p(0.30, 1.05))} ${P(p(0.15, 0.95))} ${P(p(0.10, 0.80))}`,
    `C ${P(p(0.00, 0.65))} ${P(p(0.00, 0.40))} ${P(p(0.10, 0.25))}`,
    `C ${P(p(0.18, 0.12))} ${P(p(0.25, 0.07))} ${P(p(0.30, 0.05))}`,
    'Z',
  ].join(' ');
}

// 種子島・屋久島: 2つの円
function buildTanegashima(b: Bounds): string {
  if (b.w < 5 && b.h < 5) {
    return `M ${b.cx - 25},${b.cy} A 25,22 0 1,0 ${b.cx + 25},${b.cy} A 25,22 0 1,0 ${b.cx - 25},${b.cy} Z`;
  }
  // 2点それぞれを楕円で
  return `M ${b.x},${b.cy} A ${b.w/2},${b.h*0.65} 0 1,0 ${b.x + b.w},${b.cy} A ${b.w/2},${b.h*0.65} 0 1,0 ${b.x},${b.cy} Z`;
}

// 沖縄・奄美: 南北に細長い島列
function buildOkinawa(b: Bounds): string {
  const p = (ux: number, uy: number) => np(b, ux, uy);
  return [
    `M ${P(p(0.30, 0.05))}`,
    `C ${P(p(0.55, 0.00))} ${P(p(0.85, 0.10))} ${P(p(0.95, 0.30))}`,
    `C ${P(p(1.00, 0.55))} ${P(p(0.85, 0.80))} ${P(p(0.65, 0.95))}`,
    `C ${P(p(0.45, 1.05))} ${P(p(0.20, 0.95))} ${P(p(0.10, 0.75))}`,
    `C ${P(p(0.00, 0.55))} ${P(p(0.05, 0.30))} ${P(p(0.20, 0.10))}`,
    `C ${P(p(0.25, 0.07))} ${P(p(0.28, 0.06))} ${P(p(0.30, 0.05))}`,
    'Z',
  ].join(' ');
}

const SHAPE_BUILDERS: Record<string, (b: Bounds) => string> = {
  hokkaido: buildHokkaido,
  tohoku: buildTohoku,
  kanto: buildKanto,
  chubu: buildChubu,
  kinki: buildKinki,
  chugoku: buildChugoku,
  shikoku: buildShikoku,
  kyushu_main: buildKyushu,
  tanegashima: buildTanegashima,
  okinawa: buildOkinawa,
};

function buildAreaPath(area: MapArea): string {
  const b = getBounds(area.nodes, area.pad);
  if (!b) return '';
  const builder = SHAPE_BUILDERS[area.id];
  if (!builder) return '';
  return builder(b);
}

export const LAND_PATHS: string[] = MAP_AREAS.map(buildAreaPath);

// ISLANDS は廃止 (エリアに統合済み)
export const ISLANDS: { cx: number; cy: number; rx: number; ry: number }[] = [];

// 地方名の透かしラベル（各エリア重心）
export const REGION_LABELS = MAP_AREAS
  .filter(a => a.nodes.length > 0)
  .map(a => {
    const cx = a.nodes.reduce((s, n) => s + n.x, 0) / a.nodes.length;
    const cy = a.nodes.reduce((s, n) => s + n.y, 0) / a.nodes.length;
    return { name: a.name, x: cx, y: cy };
  });
