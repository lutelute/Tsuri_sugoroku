// 魚の絵を SVG の中身（文字列）にする。形（forms.ts）と魚ごとの指定（data/fishForms.ts）から描き、
// 描き方（style）だけを差し替えられる。id の重なりを避けるため、定義の名前は `__K__` で書き、
// 画面に出すときに部品ごとの id に置き換える。
import type { Fish } from '../../../game/types';
import { FORMS } from './forms';
import type { Extra, FormSpec } from './forms';
import type { Pt } from './geometry';
import { bodyPath, caudal, edgeY, fan, finAlong, finlets, hashStr, lerp, mix, n1, rng, samplePath } from './geometry';
import type { FishFormEntry, Mark } from './types';

export type FishArtStyle = 'hanga' | 'flat' | 'gyotaku';

const INK = '#1c140c', WASHI = '#fbf6e8', KIN = '#d4a843', AI_LIGHT = '#7fa9cd';
const SIL = '#2a2a2a';

export interface FishColors { back: string; mid: string; belly: string; fin: string; edge: string; finlet?: string }

export function fishColors(fish: Fish, entry: FishFormEntry): FishColors {
  const b = fish.appearance.bodyColor, a = fish.appearance.accentColor;
  return {
    back: mix(b, '#000000', 0.16),
    mid: mix(b, '#ffffff', 0.24),
    belly: mix(b, '#ffffff', 0.8),
    fin: mix(mix(b, a, 0.5), '#ffffff', 0.12),
    edge: mix(b, '#000000', 0.62),
    ...entry.col,
  };
}

export interface RenderOpts {
  style: FishArtStyle;
  /** 横 110px 以下の小さな絵（ひれ条・うろこ・体側線を省き、線を太く） */
  small: boolean;
  /** 図鑑の台紙に載せる絵（空のぼかし・金の砂子） */
  framed: boolean;
  silhouette: boolean;
}

// ---- 形ごとの計算はまとめて覚えておく
interface Built {
  body: string;
  fins: string[];
  rays: [Pt, Pt][];
  pec: { d: string; rays: [Pt, Pt][] } | null;
  fl: string[];
  adipose: string | null;
  topPts: Pt[]; botPts: Pt[];
}
const built = new Map<string, Built>();
function build(formId: string, f: FormSpec): Built {
  const hit = built.get(formId);
  if (hit) return hit;
  const fins: string[] = [], rays: [Pt, Pt][] = [];
  const add = (r: { d: string; rays: [Pt, Pt][] }) => { if (r.d) { fins.push(r.d); rays.push(...r.rays); } };
  f.dorsal?.forEach(fn => add(finAlong(f.top, fn, -1)));
  f.anal?.forEach(fn => add(finAlong(f.bottom, fn, 1)));
  if (f.caudal) add(caudal(f.caudal));
  if (f.pelvic) add(fan(f.pelvic));
  const topPts = samplePath(f.top), botPts = samplePath(f.bottom);
  let adipose: string | null = null;
  if (f.adipose) {
    const { x, w, h } = f.adipose, y0 = edgeY(topPts, x - w / 2), y1 = edgeY(topPts, x + w / 2);
    adipose = `M ${n1(x - w / 2)},${n1(y0 + 1)} Q ${n1(x - w * 0.1)},${n1(Math.min(y0, y1) - h * 1.6)} ${n1(x + w / 2 + 2)},${n1(y1 - h * 0.4)} L ${n1(x + w / 2)},${n1(y1 + 1)} Z`;
  }
  const b: Built = {
    body: bodyPath(f.top, f.bottom), fins, rays,
    pec: f.pectoral ? fan(f.pectoral) : null,
    fl: [...(f.finletsTop ? finlets(f.top, f.finletsTop, -1) : []), ...(f.finletsBot ? finlets(f.bottom, f.finletsBot, 1) : [])],
    adipose, topPts, botPts,
  };
  built.set(formId, b);
  return b;
}

// ---- 模様
function yAt(b: Built, x: number, rel: number): number {
  return lerp(edgeY(b.topPts, x), edgeY(b.botPts, x), rel);
}
function xRange(b: Built): [number, number] {
  let lo = Infinity, hi = -Infinity;
  for (const p of b.topPts) { lo = Math.min(lo, p[0]); hi = Math.max(hi, p[0]); }
  return [lo, hi];
}
function isDark(hex: string): boolean {
  if (!hex.startsWith('#') || hex.length < 7) return true;
  const c = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);
  return 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2] < 0.42;
}
function marksSvg(marks: readonly Mark[], b: Built, seed: number, style: FishArtStyle, small: boolean): string {
  const out: string[] = [];
  const ink = style === 'gyotaku';
  const [X0, X1] = xRange(b);
  const W = X1 - X0;
  marks.forEach((m, mi) => {
    if (ink && !isDark(m.col)) return; // 魚拓では淡い模様は出ない
    const col = ink ? INK : m.col;
    const op = (m.op ?? 0.9) * (ink ? 0.55 : 1);
    const r = rng(seed + mi * 97);
    const x0 = X0 + W * (m.x0 ?? 0.2), x1 = X0 + W * (m.x1 ?? 0.92);
    switch (m.k) {
      case 'bands': {
        const w = m.w ?? 7;
        for (let i = 0; i < m.n; i++) {
          const x = m.n === 1 ? (x0 + x1) / 2 : lerp(x0, x1, i / (m.n - 1));
          const s = m.slant ?? 0;
          out.push(`<path d="M ${n1(x + s)},${n1(yAt(b, x, -0.1))} L ${n1(x - s)},${n1(yAt(b, x, 1.1))}" stroke="${col}" stroke-width="${n1(w)}" opacity="${op}" fill="none"/>`);
        }
        break;
      }
      case 'stripe': {
        let d = '';
        for (let x = x0; x <= x1; x += 4) d += `${d ? ' L' : 'M'} ${n1(x)},${n1(yAt(b, x, m.rel))}`;
        out.push(`<path d="${d}" stroke="${col}" stroke-width="${n1(m.w ?? 3)}" opacity="${op}" fill="none" stroke-linecap="round"/>`);
        break;
      }
      case 'spots': {
        const [r0, r1] = m.r ?? [1.2, 2.4];
        for (let i = 0; i < m.n; i++) {
          const x = lerp(x0, x1, r()), y = yAt(b, x, lerp(m.y0 ?? 0.08, m.y1 ?? 0.9, r()));
          out.push(`<circle cx="${n1(x)}" cy="${n1(y)}" r="${n1(lerp(r0, r1, r()) * (small ? 1.3 : 1))}" fill="${col}" opacity="${op}"/>`);
        }
        break;
      }
      case 'mottle': {
        const sz = m.size ?? 1;
        for (let i = 0; i < m.n; i++) {
          const x = lerp(x0, x1, r()), y = yAt(b, x, lerp(0.05, 0.95, r()));
          out.push(`<ellipse cx="${n1(x)}" cy="${n1(y)}" rx="${n1((5 + r() * 8) * sz)}" ry="${n1((3 + r() * 5) * sz)}" transform="rotate(${n1(r() * 180)} ${n1(x)} ${n1(y)})" fill="${col}" opacity="${n1(op * 0.62)}"/>`);
        }
        break;
      }
      case 'mushikui': {
        for (let x = x0; x < x1; x += 7.2) {
          const yt = yAt(b, x, -0.05), yl = yAt(b, x, m.to ?? 0.42), w = ((x * 13) % 5) - 2.5;
          out.push(`<path d="M ${n1(x)},${n1(yt)} C ${n1(x + 4 + w)},${n1(lerp(yt, yl, 0.3))} ${n1(x - 3)},${n1(lerp(yt, yl, 0.6))} ${n1(x + 2 + w * 0.5)},${n1(yl)}" stroke="${col}" stroke-width="2.3" fill="none" stroke-linecap="round" opacity="${op}"/>`);
        }
        break;
      }
      case 'parr': {
        for (let i = 0; i < m.n; i++) {
          const x = lerp(x0, x1, (i + 0.5) / m.n), y = yAt(b, x, 0.48);
          out.push(`<ellipse cx="${n1(x)}" cy="${n1(y)}" rx="4.5" ry="${n1((yAt(b, x, 1) - yAt(b, x, 0)) * 0.2)}" fill="${col}" opacity="${n1(op * 0.7)}"/>`);
        }
        break;
      }
      case 'eyespot': {
        const x = X0 + W * m.x, y = yAt(b, x, m.rel);
        if (m.ring) out.push(`<circle cx="${n1(x)}" cy="${n1(y)}" r="${n1(m.r * 1.35)}" fill="${ink ? 'none' : m.ring}" opacity="${op}"/>`);
        out.push(`<circle cx="${n1(x)}" cy="${n1(y)}" r="${n1(m.r)}" fill="${col}" opacity="${op}"/>`);
        break;
      }
      case 'patch': {
        const x = X0 + W * m.x, y = yAt(b, x, m.rel);
        out.push(`<ellipse cx="${n1(x)}" cy="${n1(y)}" rx="${n1(m.rx)}" ry="${n1(m.ry)}" fill="${col}" opacity="${op}"/>`);
        break;
      }
      case 'diag': {
        const w = m.w ?? 5;
        for (let i = 0; i < m.n; i++) {
          const x = lerp(x0, x1, m.n === 1 ? 0.5 : i / (m.n - 1));
          out.push(`<path d="M ${n1(x - 14)},${n1(yAt(b, x, -0.1))} L ${n1(x + 22)},${n1(yAt(b, x, 1.1))}" stroke="${col}" stroke-width="${n1(w)}" opacity="${op}" fill="none"/>`);
        }
        break;
      }
      case 'scutes': {
        for (let x = X0 + W * 0.52; x < X1 - 6; x += 3.2) {
          const y = yAt(b, x, 0.5);
          out.push(`<path d="M ${n1(x)},${n1(y - 2.4)} L ${n1(x + 1.4)},${n1(y)} L ${n1(x)},${n1(y + 2.4)}" stroke="${col}" stroke-width="0.8" fill="none" opacity="${op}"/>`);
        }
        break;
      }
      case 'prickles': {
        for (let i = 0; i < 40; i++) {
          const x = lerp(X0 + 20, X1 - 20, r()), rel = r(), y = yAt(b, x, rel);
          const dy = rel < 0.5 ? -1 : 1;
          out.push(`<path d="M ${n1(x - 1.6)},${n1(y)} L ${n1(x + 2)},${n1(y + dy * 6)} L ${n1(x + 1.6)},${n1(y)} Z" fill="${col}" opacity="${op}"/>`);
        }
        break;
      }
    }
  });
  return out.join('');
}

function fibers(): string {
  const r = rng(3), out: string[] = [];
  for (let i = 0; i < 26; i++) {
    const x = r() * 40, y = r() * 40, a = r() * Math.PI, L = 2 + r() * 5;
    out.push(`<line x1="${n1(x)}" y1="${n1(y)}" x2="${n1(x + Math.cos(a) * L)}" y2="${n1(y + Math.sin(a) * L)}" stroke="#b9a782" stroke-width="0.3" opacity="0.32"/>`);
  }
  return out.join('');
}
function sunago(seed: number): string {
  const r = rng(seed), out: string[] = [];
  for (let i = 0; i < 60; i++) {
    const x = r() * 240, y = r() * 160;
    out.push(`<rect x="${n1(x)}" y="${n1(y)}" width="${n1(0.8 + r() * 2.2)}" height="${n1(0.8 + r() * 2.2)}" fill="${KIN}" opacity="${n1(0.35 + r() * 0.5)}" transform="rotate(${n1(r() * 90)} ${n1(x)} ${n1(y)})"/>`);
  }
  return out.join('');
}

/** SVG の中身を作る（viewBox は 0 0 240 160）。id は `__K__` で書く */
export function renderFishSvg(fish: Fish, entry: FishFormEntry, o: RenderOpts): string {
  const form = FORMS[entry.form];
  const b = build(entry.form, form);
  const c = fishColors(fish, entry);
  const seed = hashStr(fish.id);
  const style = o.style, ink = style === 'gyotaku', small = o.small;
  const line = style === 'flat' ? c.edge : INK;
  const lw = style === 'flat' ? (small ? 1.6 : 1.1) : small ? 2.1 : 1.45;
  const s = entry.stretch ?? 1;
  const tf = `matrix(1,0,0,${s},0,${n1(80 - 75 * s)})`; // 縦に伸ばして 160 の中央へ
  const out: string[] = [];
  const rare = fish.rarity === 'legendary' || fish.rarity === 'mythical';

  // ---- 影絵
  if (o.silhouette) {
    out.push(`<g transform="${tf}" fill="${SIL}">`);
    for (const e of form.extras ?? []) if (e.layer === 'under') out.push(e.paint === 'none' ? `<path d="${e.d}" fill="none" stroke="${SIL}" stroke-width="2"/>` : `<path d="${e.d}"/>`);
    for (const d of b.fins) out.push(`<path d="${d}"/>`);
    for (const d of b.fl) out.push(`<path d="${d}"/>`);
    if (b.adipose) out.push(`<path d="${b.adipose}"/>`);
    out.push(`<path d="${b.body}"/>`);
    if (b.pec) out.push(`<path d="${b.pec.d}"/>`);
    for (const e of form.extras ?? []) if (e.layer !== 'under' && e.paint !== 'none') out.push(`<path d="${e.d}"/>`);
    out.push('</g>');
    return out.join('');
  }

  // ---- 定義
  out.push('<defs>');
  if (style === 'flat') {
    out.push(`<linearGradient id="__K__b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c.back}"/><stop offset="0.5" stop-color="${c.mid}"/><stop offset="1" stop-color="${c.belly}"/></linearGradient>`);
  } else if (style === 'hanga') {
    out.push(`<linearGradient id="__K__b" x1="0" y1="0.18" x2="0" y2="0.82"><stop offset="0" stop-color="${mix(c.back, '#000000', 0.12)}"/><stop offset="0.34" stop-color="${c.back}"/><stop offset="0.52" stop-color="${c.mid}"/><stop offset="0.7" stop-color="${c.belly}"/><stop offset="1" stop-color="${c.belly}"/></linearGradient>`);
  } else {
    out.push(`<radialGradient id="__K__b" cx="0.45" cy="0.45" r="0.6"><stop offset="0" stop-color="${INK}" stop-opacity="0.95"/><stop offset="0.75" stop-color="${INK}" stop-opacity="0.86"/><stop offset="1" stop-color="${INK}" stop-opacity="0.62"/></radialGradient>`);
    if (!small) out.push(`<filter id="__K__rough" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3"/><feDisplacementMap in="SourceGraphic" scale="1.4"/></filter>`);
    if (o.framed) out.push(`<pattern id="__K__fiber" width="40" height="40" patternUnits="userSpaceOnUse">${fibers()}</pattern>`);
  }
  // 空のぼかし: 四角い縁が出ないよう、上の真ん中から四方へ薄れる
  if (o.framed && style === 'hanga') out.push(`<radialGradient id="__K__sky" cx="0.5" cy="0" r="0.5"><stop offset="0" stop-color="${AI_LIGHT}" stop-opacity="0.7"/><stop offset="0.6" stop-color="${AI_LIGHT}" stop-opacity="0.28"/><stop offset="1" stop-color="${AI_LIGHT}" stop-opacity="0"/></radialGradient>`);
  if (rare && !o.framed && !ink) out.push(`<radialGradient id="__K__aura" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="${KIN}" stop-opacity="0.42"/><stop offset="0.7" stop-color="${KIN}" stop-opacity="0.12"/><stop offset="1" stop-color="${KIN}" stop-opacity="0"/></radialGradient>`);
  const u = form.scale ?? 0;
  const drawScales = u > 0 && !small;
  if (drawScales) {
    const sc = ink ? WASHI : mix(c.back, '#000000', style === 'flat' ? 0.25 : 0.35);
    out.push(`<pattern id="__K__sc" width="${u}" height="${u}" patternUnits="userSpaceOnUse"><path d="M ${n1(u * 0.15)},0 Q ${n1(u * 0.75)},${n1(u / 2)} ${n1(u * 0.15)},${u} M ${n1(u * 0.65)},${n1(-u / 2)} Q ${n1(u * 1.25)},0 ${n1(u * 0.65)},${n1(u / 2)} M ${n1(u * 0.65)},${n1(u / 2)} Q ${n1(u * 1.25)},${u} ${n1(u * 0.65)},${n1(u * 1.5)}" stroke="${sc}" stroke-width="${n1(u * 0.12)}" fill="none" opacity="${ink ? 0.42 : style === 'flat' ? 0.4 : 0.55}"/></pattern>`);
  }
  out.push(`<clipPath id="__K__clip"><path d="${b.body}"/></clipPath>`);
  out.push('</defs>');

  // ---- 地
  if (o.framed && style === 'hanga') {
    out.push(`<ellipse cx="120" cy="0" rx="118" ry="64" fill="url(#__K__sky)"/>`);
    if (rare) out.push(sunago(seed));
  }
  if (o.framed && ink) out.push(`<rect width="240" height="160" fill="url(#__K__fiber)"/>`);
  if (rare && !o.framed && !ink) out.push(`<ellipse cx="120" cy="80" rx="120" ry="74" fill="url(#__K__aura)"/>`);

  // ---- 魚
  const g: string[] = [];
  const finFill = ink ? INK : entry.fin ?? c.fin;
  const finOp = ink ? 0.5 : style === 'hanga' ? 0.82 : 0.85;
  const paint = (e: Extra): string => {
    if (ink) return e.paint === 'glow' ? WASHI : e.paint === 'none' ? 'none' : INK;
    switch (e.paint) {
      case 'fin': return finFill;
      case 'body': return c.back;
      case 'belly': return c.belly;
      case 'edge': return c.edge;
      case 'glow': return '#f6e27a';
      case 'dark': return INK;
      default: return 'none';
    }
  };
  const extra = (e: Extra) => {
    const fill = paint(e);
    const w = e.w ?? 0.6;
    const stroke = e.paint === 'none' ? (ink ? INK : line) : line;
    return `<path d="${e.d}" fill="${fill}"${e.paint === 'fin' ? ` fill-opacity="${finOp}"` : ''} stroke="${w > 0 ? stroke : 'none'}" stroke-width="${n1(lw * w)}" stroke-linejoin="round" stroke-linecap="round"/>`;
  };
  for (const e of form.extras ?? []) if (e.layer === 'under') g.push(extra(e));
  for (const d of b.fins) g.push(`<path d="${d}" fill="${finFill}" fill-opacity="${finOp}" stroke="${line}" stroke-width="${n1(lw * 0.7)}" stroke-linejoin="round"/>`);
  if (!small) for (const [p, q] of b.rays) g.push(`<line x1="${n1(p[0])}" y1="${n1(p[1])}" x2="${n1(q[0])}" y2="${n1(q[1])}" stroke="${ink ? INK : line}" stroke-width="${ink ? 0.9 : 0.55}" opacity="${ink ? 0.9 : 0.6}"/>`);
  for (const d of b.fl) g.push(`<path d="${d}" fill="${ink ? INK : c.finlet ?? finFill}" fill-opacity="${ink ? 0.7 : 1}" stroke="${line}" stroke-width="${n1(lw * 0.5)}"/>`);
  if (b.adipose) g.push(`<path d="${b.adipose}" fill="${ink ? INK : c.back}" fill-opacity="${ink ? 0.7 : 1}" stroke="${line}" stroke-width="${n1(lw * 0.6)}"/>`);
  // 体
  g.push(`<path d="${b.body}" fill="url(#__K__b)"/>`);
  g.push(`<g clip-path="url(#__K__clip)">`);
  if (drawScales) g.push(`<path d="${b.body}" fill="url(#__K__sc)"/>`);
  if (entry.marks?.length) g.push(marksSvg(entry.marks, b, seed, style, small));
  if (style === 'flat') g.push(`<ellipse cx="110" cy="${n1(edgeY(b.topPts, 110) + 9)}" rx="62" ry="6" fill="#ffffff" opacity="0.2"/>`);
  if (style === 'hanga') g.push(`<path d="${form.top}" stroke="#ffffff" stroke-width="2" fill="none" opacity="0.22" transform="translate(2,5)"/>`);
  g.push('</g>');
  if (form.keel) g.push(`<ellipse cx="${form.keel[0]}" cy="${form.keel[1]}" rx="7" ry="1.8" fill="${ink ? INK : c.edge}"/>`);
  g.push(`<path d="${b.body}" fill="none" stroke="${line}" stroke-width="${n1(lw)}" stroke-linejoin="round"/>`);
  // 胸びれは体の上
  if (b.pec) {
    g.push(`<path d="${b.pec.d}" fill="${finFill}" fill-opacity="${ink ? 0.45 : 0.78}" stroke="${line}" stroke-width="${n1(lw * 0.65)}" stroke-linejoin="round"/>`);
    if (!small) for (const [p, q] of b.pec.rays) g.push(`<line x1="${n1(p[0])}" y1="${n1(p[1])}" x2="${n1(q[0])}" y2="${n1(q[1])}" stroke="${ink ? INK : line}" stroke-width="0.5" opacity="0.6"/>`);
  }
  // 頭
  const headLine = ink ? WASHI : line;
  (form.gill ?? []).forEach((d, i) => g.push(`<path d="${d}" fill="none" stroke="${headLine}" stroke-width="${n1(i === 0 ? lw * 0.8 : lw * 0.5)}" stroke-linecap="round" opacity="${ink ? 0.45 : style === 'flat' ? 0.55 : 0.9}"/>`));
  for (const e of form.extras ?? []) if (e.layer !== 'under') g.push(extra(e));
  if (form.lateral && !small) g.push(`<path d="${form.lateral}" fill="none" stroke="${headLine}" stroke-width="0.7"${style === 'hanga' ? ' stroke-dasharray="1.4 1.6"' : ''} opacity="${ink ? 0.3 : 0.5}"/>`);
  if (form.mouth) g.push(`<path d="${form.mouth}" fill="none" stroke="${headLine}" stroke-width="${n1(lw * 0.8)}" stroke-linecap="round" opacity="${ink ? 0.5 : 1}"/>`);
  out.push(`<g transform="${tf}">`);
  out.push(ink && !small ? `<g filter="url(#__K__rough)">${g.join('')}</g>` : g.join(''));

  // 目（魚拓は後から筆で描き入れる）
  for (const eye of [form.eye, form.eye2]) {
    if (!eye) continue;
    const [ex, ey, er0] = eye, er = er0 * (entry.eye ?? 1) * (small ? 1.12 : 1);
    if (style === 'flat') out.push(`<circle cx="${ex}" cy="${ey}" r="${n1(er)}" fill="#ffffff" stroke="${c.edge}" stroke-width="0.8"/><circle cx="${n1(ex + 0.6)}" cy="${ey}" r="${n1(er * 0.55)}" fill="#111111"/><circle cx="${n1(ex - er * 0.15)}" cy="${n1(ey - er * 0.25)}" r="${n1(er * 0.18)}" fill="#ffffff"/>`);
    else if (style === 'hanga') out.push(`<circle cx="${ex}" cy="${ey}" r="${n1(er)}" fill="${entry.iris ?? KIN}" stroke="${INK}" stroke-width="1"/><circle cx="${n1(ex + 0.7)}" cy="${ey}" r="${n1(er * 0.6)}" fill="${INK}"/><circle cx="${n1(ex - er * 0.1)}" cy="${n1(ey - er * 0.32)}" r="${n1(er * 0.17)}" fill="#ffffff"/>`);
    else out.push(`<circle cx="${ex}" cy="${ey}" r="${n1(er * 1.05)}" fill="#f3ecdb"/><circle cx="${ex}" cy="${ey}" r="${n1(er * 0.95)}" fill="none" stroke="${INK}" stroke-width="1.2"/><circle cx="${n1(ex + 0.6)}" cy="${ey}" r="${n1(er * 0.55)}" fill="${INK}"/>`);
  }
  out.push('</g>');
  return out.join('');
}
