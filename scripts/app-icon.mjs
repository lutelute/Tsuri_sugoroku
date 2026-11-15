#!/usr/bin/env node
// アプリのアイコンを public/ に作る（rsvg-convert が要る）。
//   node scripts/app-icon.mjs [--out public]
// 作るもの: favicon.svg・favicon-32.png・apple-touch-icon.png(180)・icon-192.png・icon-512.png・icon-maskable-512.png
import { build } from 'esbuild';
import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const here = dirname(fileURLToPath(import.meta.url));
const out = args.includes('--out') ? args[args.indexOf('--out') + 1] : join(here, '..', 'public');

const res = await build({ entryPoints: [join(here, 'app-icon.ts')], bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'error' });
const tmp = mkdtempSync(join(tmpdir(), 'app-icon-'));
const js = join(tmp, 'icon.mjs');
writeFileSync(js, res.outputFiles[0].text);
const { appIcon } = await import(js);

const icon = join(out, 'favicon.svg');
const mask = join(tmp, 'maskable.svg');
writeFileSync(icon, appIcon(1));
writeFileSync(mask, appIcon(0.8));
const png = (src, size, name) => execFileSync('rsvg-convert', ['-w', String(size), '-h', String(size), src, '-o', join(out, name)]);
png(icon, 32, 'favicon-32.png');
png(icon, 180, 'apple-touch-icon.png');
png(icon, 192, 'icon-192.png');
png(icon, 512, 'icon-512.png');
png(mask, 512, 'icon-maskable-512.png');
console.log(`アイコン → ${out}`);
