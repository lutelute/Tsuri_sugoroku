// 魚の絵の一覧を SVG にする（fish-sheet.mjs が esbuild で束ねて呼ぶ）。ブラウザを使わない。
import { FISH_DATABASE } from '../src/data/fishDatabase';
import { renderFishSvg } from '../src/components/shared/fishArt/render';
import type { FishArtStyle } from '../src/components/shared/fishArt/render';
import { resolveFishForm } from '../src/components/shared/fishArt/styles';

export interface SheetOpts { ids?: string[]; forms?: string[]; perForm?: boolean; style: FishArtStyle; sil: boolean; cols: number; w: number }

export function sheet(o: SheetOpts): { svg: string; count: number } {
  let list = FISH_DATABASE.filter(f => {
    const r = resolveFishForm(f);
    if ('legacy' in r) return false;
    if (o.ids && !o.ids.includes(f.id)) return false;
    if (o.forms && !o.forms.includes(r.entry.form)) return false;
    return true;
  });
  if (o.perForm) { // 型ごとに1匹（型の見直し用）
    const seen = new Set<string>();
    list = list.filter(f => { const r = resolveFishForm(f); if ('legacy' in r || seen.has(r.entry.form)) return false; seen.add(r.entry.form); return true; });
  }
  const w = o.w, h = Math.round(w * 2 / 3), lab = 26, cols = Math.min(o.cols, Math.max(1, list.length));
  const rows = Math.ceil(list.length / cols);
  const W = cols * (w + 6) + 6, H = rows * (h + lab + 6) + 6;
  const cells = list.map((f, i) => {
    const r = resolveFishForm(f);
    if ('legacy' in r) return '';
    const x = 6 + (i % cols) * (w + 6), y = 6 + Math.floor(i / cols) * (h + lab + 6);
    const inner = renderFishSvg(f, r.entry, { style: o.style, small: w <= 110, framed: false, silhouette: o.sil }).replaceAll('__K__', `c${i}`);
    return `<rect x="${x}" y="${y}" width="${w}" height="${h + lab}" fill="#fbf6e8" stroke="#cdbb93"/>`
      + `<svg x="${x}" y="${y}" width="${w}" height="${h}" viewBox="0 0 240 160">${inner}</svg>`
      + `<text x="${x + 4}" y="${y + h + 11}" font-size="11" font-family="Hiragino Sans, sans-serif" fill="#1c140c">${f.name}</text>`
      + `<text x="${x + 4}" y="${y + h + 23}" font-size="9" font-family="Menlo, monospace" fill="#6b5a43">${f.id} / ${r.entry.form}</text>`;
  });
  return { svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect width="${W}" height="${H}" fill="#efe6d2"/>${cells.join('')}</svg>`, count: list.length };
}
