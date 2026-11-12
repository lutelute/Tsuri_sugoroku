#!/usr/bin/env node
// 魚の絵を、ブラウザを使わずに一覧の PNG にする（サンドボックスの中でも動く。rsvg-convert が要る）。
//   node scripts/fish-sheet.mjs -o out.png [--ids madai,saba] [--forms tai,ebi] [--per-form]
//                               [--style hanga|flat|gyotaku] [--sil] [--cols 5] [--w 200]
//   --per-form: 型ごとに1匹だけ並べる（型の見直し用）。イカ・タコなど「もとの絵」の物は出ない。
import { build } from 'esbuild';
import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const get = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const out = get('-o', 'fish-sheet.png');
const list = k => get(k)?.split(',').map(s => s.trim()).filter(Boolean);

const here = dirname(fileURLToPath(import.meta.url));
const res = await build({ entryPoints: [join(here, 'fish-sheet.ts')], bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'error' });
const tmp = mkdtempSync(join(tmpdir(), 'fish-sheet-'));
const js = join(tmp, 'sheet.mjs');
writeFileSync(js, res.outputFiles[0].text);
const { sheet } = await import(js);
const { svg, count } = sheet({
  ids: list('--ids'), forms: list('--forms'), perForm: args.includes('--per-form'),
  style: get('--style', 'hanga'), sil: args.includes('--sil'),
  cols: Number(get('--cols', 5)), w: Number(get('--w', 200)),
});
if (!count) { console.error('魚が見つからない（--ids / --forms を確かめる）'); process.exit(1); }
const svgPath = out.replace(/\.png$/, '') + '.svg';
writeFileSync(svgPath, svg);
execFileSync('rsvg-convert', [svgPath, '-o', out]);
console.log(`${count}匹 → ${out}`);
