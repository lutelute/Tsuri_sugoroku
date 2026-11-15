// アプリのアイコン（ホーム画面・タブ）の SVG を作る（app-icon.mjs が esbuild で束ねて呼ぶ）。
// 藍の空・金の日・青海波の海から、木版の真鯛がはねる。鯛は図鑑と同じ描き方で描く。
import { FISH_DATABASE } from '../src/data/fishDatabase';
import { renderFishSvg } from '../src/components/shared/fishArt/render';
import { resolveFishForm } from '../src/components/shared/fishArt/styles';
import { INK, WASHI, KIN, KIN_L, KIN_D, AI9, AI7, AI5, AI4, AI2 } from '../src/components/city/townArt/palette';

const S = 512;

/** safe: 前景（日・鯛・しぶき）を中心へ縮める割合。maskable は 0.8（円く切られても欠けない） */
export function appIcon(safe = 1): string {
  const tai = FISH_DATABASE.find(f => f.id === 'madai');
  if (!tai) throw new Error('madai が図鑑にない');
  const r = resolveFishForm(tai);
  if ('legacy' in r) throw new Error('madai は型で描く魚のはず');
  const fish = renderFishSvg(tai, r.entry, { style: 'hanga', small: false, framed: false, silhouette: false }).replaceAll('__K__', 'tai');

  // 日の光条
  const sun = { x: 132, y: 128, r: 62 };
  const rays = Array.from({ length: 14 }, (_, i) => {
    const a0 = (i / 14) * Math.PI * 2, a1 = a0 + Math.PI / 30, L = 640;
    const p = (a: number) => `${(sun.x + Math.cos(a) * L).toFixed(1)},${(sun.y + Math.sin(a) * L).toFixed(1)}`;
    return `<path d="M ${sun.x},${sun.y} L ${p(a0)} L ${p(a1)} Z"/>`;
  }).join('');

  // 青海波（上の段から順に重ねる）
  const R = 30;
  let sea = '';
  for (let j = 0; j < 12; j++) {
    const y = 400 + j * (R / 2);
    for (let i = -1; i <= S / (2 * R) + 1; i++) {
      const x = i * 2 * R + (j % 2 ? R : 0);
      const fill = j < 2 ? AI4 : AI5;
      sea += `<circle cx="${x}" cy="${y}" r="${R}" fill="${fill}" stroke="${AI2}" stroke-width="2.4"/>`
        + [0.7, 0.42, 0.14].map(k => `<circle cx="${x}" cy="${y}" r="${(R * k).toFixed(1)}" fill="none" stroke="${AI2}" stroke-width="1.8"/>`).join('');
    }
  }

  // 鯛が水を切った所のしぶき（右下）と、跳ねた跡の粒
  const foam = [[300, 404, 15], [324, 396, 19], [352, 392, 22], [382, 398, 18], [406, 406, 14]]
    .map(([x, y, rr]) => `<circle cx="${x}" cy="${y}" r="${rr}"/>`).join('');
  const drops = [[430, 352, 8], [452, 318, 6], [416, 300, 5], [458, 372, 5], [270, 372, 6], [246, 352, 4]]
    .map(([x, y, rr]) => `<circle cx="${x}" cy="${y}" r="${rr}"/>`).join('');

  const fg = `<g transform="translate(${S / 2} ${S / 2}) scale(${safe}) translate(${-S / 2} ${-S / 2})">`
    + `<circle cx="${sun.x}" cy="${sun.y}" r="${sun.r + 16}" fill="${KIN_L}" opacity="0.28"/>`
    + `<circle cx="${sun.x}" cy="${sun.y}" r="${sun.r}" fill="${KIN}" stroke="${KIN_D}" stroke-width="4"/>`
    + `<g fill="${WASHI}" stroke="${INK}" stroke-width="3">${foam}</g>`
    + `<g transform="translate(262 252) rotate(20) scale(1.85) translate(-120 -80)">${fish}</g>`
    + `<g fill="${WASHI}" stroke="${INK}" stroke-width="2.5">${drops}</g>`
    + `</g>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">`
    + `<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${AI9}"/><stop offset="0.7" stop-color="${AI7}"/><stop offset="1" stop-color="${AI5}"/></linearGradient></defs>`
    + `<rect width="${S}" height="${S}" fill="url(#sky)"/>`
    + `<g fill="${KIN_L}" opacity="0.12">${rays}</g>`
    + sea + fg + `</svg>`;
}
