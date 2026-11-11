// 札の絵係: 道具の絵（竿・リール・ルアーを等級 Lv1〜5 ごとに形と色を変えて描く）。
// 64x64 の viewBox。ほかの SVG の中に入れるときは <GearShapes> を <g transform> で包む。
// 名前は equipmentData.ts に合わせる（竹竿 → グラス → カーボン → 競技 → 名匠 など）。
import type { ReactNode } from 'react';
import type { EquipmentType } from '../../game/types';
import { INK, WASHI, WASHI2, KIN, KIN_LIGHT, KIN_PALE, KIN_DARK, KIN_DEEP, SHU, SHU_LIGHT, SHU_DARK, AI, AI_MID, AI_SOFT, AI_LIGHT, LEAF, WOOD, WOOD_LIGHT } from '../event/artBase';

const STEEL = '#aeb7c1';
const STEEL_LIGHT = '#dfe5ea';
const STEEL_DARK = '#7d8792';
const CARBON = '#23272e';

// ===== 竿（左下の握りから右上の穂先へ） =====

const pt = (t: number): [number, number] => [8 + 50 * t, 56 - 50 * t];
const D = Math.SQRT1_2;

interface Seg { a: number; b: number; w: number; c: string }

/** 節ごとに太さと色の変わる竿（先に輪郭をまとめて描き、あとから色を重ねる） */
function Pole({ segs }: { segs: Seg[] }) {
  return (
    <>
      {segs.map((s, i) => {
        const [x1, y1] = pt(s.a);
        const [x2, y2] = pt(s.b);
        return <line key={`o${i}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke={INK} strokeWidth={s.w + 2.2} strokeLinecap="round" />;
      })}
      {segs.map((s, i) => {
        const [x1, y1] = pt(s.a);
        const [x2, y2] = pt(s.b);
        return <line key={`f${i}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke={s.c} strokeWidth={s.w} strokeLinecap="round" />;
      })}
    </>
  );
}

/** 竿に直角の短い線（節・糸巻き・金具） */
function Tick({ t, h, c, w = 1.3 }: { t: number; h: number; c: string; w?: number }) {
  const [x, y] = pt(t);
  return <line x1={x - h * D} y1={y - h * D} x2={x + h * D} y2={y + h * D} stroke={c} strokeWidth={w} strokeLinecap="round" />;
}

/** 糸を通す輪（ガイド） */
function Guide({ t, r, c = INK, o = 3 }: { t: number; r: number; c?: string; o?: number }) {
  const [x, y] = pt(t);
  return (
    <>
      <line x1={x} y1={y} x2={x + o * D} y2={y + o * D} stroke={INK} strokeWidth="1" />
      <circle cx={x + (o + r) * D} cy={y + (o + r) * D} r={r} fill="none" stroke={c} strokeWidth="1.2" />
    </>
  );
}

function Sparkle({ x, y, s = 1, c = KIN_PALE }: { x: number; y: number; s?: number; c?: string }) {
  return <path transform={`translate(${x} ${y}) scale(${s})`} d="M0 -5 L1.3 -1.3 L5 0 L1.3 1.3 L0 5 L-1.3 1.3 L-5 0 L-1.3 -1.3Z" fill={c} stroke={INK} strokeWidth="0.5" strokeLinejoin="round" />;
}

function Rod({ level }: { level: number }) {
  switch (level) {
    case 1:
      // 竹竿: 節のある竹に、糸と玉ウキ
      return (
        <g>
          <path d="M58 6 C61 20 51 28 54 40" fill="none" stroke={INK} strokeWidth="0.9" />
          <ellipse cx="53.6" cy="42" rx="3" ry="4" fill={WASHI} stroke={INK} strokeWidth="1" />
          <path d="M50.7 41.4h5.8" stroke={SHU} strokeWidth="2.4" />
          <path d="M53.6 46 v4 c0 3 -4 3 -4 0" fill="none" stroke={INK} strokeWidth="1" strokeLinecap="round" />
          <Pole segs={[{ a: 0, b: 0.42, w: 5.2, c: '#c2ad55' }, { a: 0.42, b: 0.74, w: 3.8, c: '#cdb963' }, { a: 0.74, b: 1, w: 2.2, c: '#d8c676' }]} />
          {[0.1, 0.24, 0.42, 0.58, 0.74, 0.88].map((t, i) => <Tick key={t} t={t} h={i < 3 ? 3.2 : i < 5 ? 2.5 : 1.6} c="#6f5d1e" w={1.5} />)}
          <path d="M13 50 C8 44 9 38 14 36 C16 41 16 46 13 50Z" fill={LEAF} stroke={INK} strokeWidth="0.9" strokeLinejoin="round" />
          <path d="M17 46 C19 40 24 38 28 40 C26 45 22 47 17 46Z" fill="#7fbf6a" stroke={INK} strokeWidth="0.9" strokeLinejoin="round" />
        </g>
      );
    case 2:
      // グラスロッド: コルクの握りに、うす緑のしなる竿
      return (
        <g>
          <Pole segs={[{ a: 0, b: 0.25, w: 6.4, c: '#cfa26a' }, { a: 0.25, b: 0.32, w: 5, c: STEEL }, { a: 0.32, b: 0.68, w: 3.4, c: '#86c4ab' }, { a: 0.68, b: 1, w: 2, c: '#b5e0cd' }]} />
          {[0.05, 0.11, 0.17, 0.22].map(t => <Tick key={t} t={t} h={3.6} c="#8e6a3c" w={0.9} />)}
          <Tick t={0.32} h={3.2} c={INK} w={1} />
          <Tick t={0.005} h={3.8} c={WOOD} w={2.2} />
          {[0.46, 0.62, 0.78, 0.93].map((t, i) => <Guide key={t} t={t} r={2.4 - i * 0.4} />)}
          <line x1="31" y1="35" x2="50" y2="16" stroke={WASHI} strokeWidth="0.9" opacity="0.7" strokeLinecap="round" />
        </g>
      );
    case 3:
      // カーボンロッド: 黒く細い竿に朱の糸巻きと金の輪
      return (
        <g>
          <Pole segs={[{ a: 0, b: 0.23, w: 6, c: '#3d434d' }, { a: 0.23, b: 0.33, w: 5.2, c: AI_MID }, { a: 0.33, b: 0.66, w: 3, c: CARBON }, { a: 0.66, b: 1, w: 1.8, c: '#343a44' }]} />
          <Tick t={0.23} h={3.4} c={KIN} w={1.4} />
          <Tick t={0.33} h={3.2} c={KIN} w={1.4} />
          {[0.06, 0.12, 0.18].map(t => <Tick key={t} t={t} h={3.2} c="#1f2329" w={0.9} />)}
          {[0.44, 0.58, 0.72, 0.84, 0.94].map((t, i) => (
            <g key={t}>
              <Tick t={t - 0.015} h={2.2 - i * 0.2} c={SHU_LIGHT} w={1.6} />
              <Guide t={t} r={2.2 - i * 0.3} c={KIN} o={2.6} />
            </g>
          ))}
          <line x1="27" y1="36.4" x2="52" y2="11.4" stroke="#8b96a6" strokeWidth="0.8" opacity="0.85" strokeLinecap="round" />
        </g>
      );
    case 4:
      // 競技ロッド: 朱の分かれた握り、藍の竿に白の帯
      return (
        <g>
          <Pole segs={[{ a: 0, b: 0.1, w: 6.6, c: SHU }, { a: 0.1, b: 0.18, w: 3.2, c: AI }, { a: 0.18, b: 0.32, w: 6.6, c: SHU }, { a: 0.32, b: 0.66, w: 3.2, c: '#24496e' }, { a: 0.66, b: 1, w: 1.9, c: AI_SOFT }]} />
          {[0.1, 0.18, 0.32].map(t => <Tick key={t} t={t} h={3.6} c={KIN_LIGHT} w={1.5} />)}
          <Tick t={0.0} h={3.6} c={KIN_LIGHT} w={1.5} />
          {[0.38, 0.41, 0.52, 0.55].map(t => <Tick key={t} t={t} h={1.9} c={WASHI} w={1.2} />)}
          {[0.46, 0.6, 0.72, 0.83, 0.92, 0.98].map((t, i) => <Guide key={t} t={t} r={2.3 - i * 0.27} c={KIN_LIGHT} o={2.6} />)}
          <path d="M14 22 l2.2 4.6 5 .7 -3.6 3.5 .9 5 -4.5 -2.4 -4.5 2.4 .9 -5 -3.6 -3.5 5 -.7Z" fill={KIN_LIGHT} stroke={INK} strokeWidth="0.9" strokeLinejoin="round" />
          <Sparkle x={52} y={24} s={0.8} c={WASHI} />
        </g>
      );
    default:
      // 名匠ロッド: 柄巻きの握り、朱漆に金の蒔絵、房
      return (
        <g>
          <circle cx="32" cy="32" r="27" fill={KIN_PALE} opacity="0.22" />
          <path d="M21.5 43 C18 49 22 53 20 59" fill="none" stroke={INK} strokeWidth="2.6" strokeLinecap="round" />
          <path d="M21.5 43 C18 49 22 53 20 59" fill="none" stroke={SHU_LIGHT} strokeWidth="1.3" strokeLinecap="round" />
          <path d="M17 57 l3 -3 3 3 -1 5 h-4Z" fill={SHU} stroke={INK} strokeWidth="0.9" strokeLinejoin="round" />
          <Pole segs={[{ a: 0, b: 0.28, w: 7, c: '#3a2a5a' }, { a: 0.28, b: 0.34, w: 5.6, c: KIN }, { a: 0.34, b: 0.64, w: 3.6, c: '#8a2016' }, { a: 0.64, b: 1, w: 2, c: '#2a1a14' }]} />
          <Tick t={0.0} h={3.9} c={KIN} w={2.2} />
          {[0.05, 0.1, 0.15, 0.2, 0.25].map(t => {
            const [x, y] = pt(t);
            return <path key={t} d={`M${x} ${y - 2.6} l2.6 2.6 -2.6 2.6 -2.6 -2.6Z`} fill={KIN_LIGHT} opacity="0.95" />;
          })}
          {[0.39, 0.45, 0.51, 0.57].map((t, i) => {
            const [x, y] = pt(t);
            return <circle key={t} cx={x + (i % 2 ? 0.6 : -0.6)} cy={y + (i % 2 ? 0.6 : -0.6)} r="0.85" fill={KIN_LIGHT} />;
          })}
          <Tick t={0.64} h={2.4} c={KIN} w={1.6} />
          {[0.47, 0.61, 0.73, 0.84, 0.93, 0.985].map((t, i) => <Guide key={t} t={t} r={2.3 - i * 0.27} c={KIN} o={2.6} />)}
          <Sparkle x={50} y={26} s={1} />
          <Sparkle x={26} y={14} s={0.75} />
          <Sparkle x={12} y={30} s={0.55} c={WASHI} />
        </g>
      );
  }
}

// ===== リール =====

function Reel({ level }: { level: number }) {
  switch (level) {
    case 1:
      // 基本リール: 木の太鼓リール
      return (
        <g>
          <rect x="21" y="6.5" width="22" height="5" rx="2.2" fill="#8b8478" stroke={INK} strokeWidth="1.3" />
          <rect x="29.5" y="11" width="5" height="5" fill="#8b8478" stroke={INK} strokeWidth="1.2" />
          <circle cx="32" cy="35" r="20" fill={WOOD_LIGHT} stroke={INK} strokeWidth="2" />
          <path d="M16 30 C22 22 40 20 48 28 M15 38 C22 46 42 48 49 40" fill="none" stroke={WOOD} strokeWidth="0.9" opacity="0.55" />
          <circle cx="32" cy="35" r="14.5" fill="none" stroke={WOOD} strokeWidth="1.5" />
          <circle cx="32" cy="35" r="10" fill={WASHI2} stroke={INK} strokeWidth="1.2" />
          <circle cx="32" cy="35" r="7" fill="none" stroke={AI_LIGHT} strokeWidth="1" />
          <circle cx="32" cy="35" r="4.6" fill="none" stroke={AI_LIGHT} strokeWidth="1" />
          <path d="M32 35 L46 23" stroke={INK} strokeWidth="3.6" strokeLinecap="round" />
          <path d="M32 35 L46 23" stroke={KIN_DARK} strokeWidth="1.7" strokeLinecap="round" />
          <circle cx="32" cy="35" r="2.6" fill={KIN_DARK} stroke={INK} strokeWidth="1" />
          <circle cx="47" cy="22" r="4" fill={WOOD} stroke={INK} strokeWidth="1.3" />
          <circle cx="45.8" cy="20.8" r="1.1" fill={WASHI} opacity="0.6" />
        </g>
      );
    case 2:
      // スピニングリール: 銀色の胴、前に糸巻き、ぐるりと回る腕
      return (
        <g>
          <rect x="14" y="7" width="27" height="5" rx="2.3" fill={STEEL_DARK} stroke={INK} strokeWidth="1.3" />
          <path d="M25 12 h7 l2.4 13 h-9.4Z" fill={STEEL} stroke={INK} strokeWidth="1.3" strokeLinejoin="round" />
          <path d="M43 23 C46 11 61 15 60.5 31" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" />
          <path d="M43 23 C46 11 61 15 60.5 31" fill="none" stroke={STEEL_LIGHT} strokeWidth="1.3" strokeLinecap="round" />
          <rect x="39" y="25" width="7" height="22" rx="2.4" fill={STEEL_DARK} stroke={INK} strokeWidth="1.4" />
          <rect x="45.5" y="23" width="10.5" height="26" rx="3" fill={STEEL_LIGHT} stroke={INK} strokeWidth="1.5" />
          <path d="M47.6 27.5 v17 M49.8 27 v18 M52 27 v18 M54.1 27.5 v17" stroke={AI_LIGHT} strokeWidth="1.1" />
          <rect x="55.4" y="21.5" width="3.2" height="29" rx="1.6" fill={STEEL} stroke={INK} strokeWidth="1.2" />
          <path d="M16 31 C16 24 25 22.5 33 24.5 C41 26.5 43.5 34 41.5 42 C39.5 50 27 52 21.5 48 C15.5 44 16 37 16 31Z" fill={STEEL} stroke={INK} strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M20 30 C21 27 26 26 31 27" fill="none" stroke={WASHI} strokeWidth="1.4" opacity="0.8" strokeLinecap="round" />
          <circle cx="29" cy="38" r="5.2" fill={STEEL_DARK} stroke={INK} strokeWidth="1.2" />
          <path d="M29 38 L14.5 51" stroke={INK} strokeWidth="3.8" strokeLinecap="round" />
          <path d="M29 38 L14.5 51" stroke={STEEL_LIGHT} strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="29" cy="38" r="2" fill={KIN} stroke={INK} strokeWidth="0.8" />
          <rect x="6.5" y="47" width="10" height="9.5" rx="3.6" fill="#2a2f37" stroke={INK} strokeWidth="1.3" transform="rotate(-42 11.5 51.7)" />
        </g>
      );
    case 3:
      // ベイトリール: 黒い低い胴、朱の輪、2つのつまみ
      return (
        <g>
          <rect x="17" y="49" width="30" height="5.4" rx="2.4" fill={STEEL_DARK} stroke={INK} strokeWidth="1.3" />
          <path d="M12 28 C12 20 19 17 30 17 L41 17 C50 17 54 22 54 30 L54 40 C54 47 48 50 41 50 L24 50 C17 50 12 46 12 39Z" fill="#2b3038" stroke={INK} strokeWidth="1.9" strokeLinejoin="round" />
          <path d="M17 24 C20 20 26 19.5 34 19.5" fill="none" stroke="#6b7480" strokeWidth="1.3" strokeLinecap="round" />
          <rect x="35" y="23.5" width="15" height="19" rx="2.2" fill={STEEL_LIGHT} stroke={INK} strokeWidth="1.3" />
          <path d="M37.6 25.5 v15 M40.2 25 v16 M42.8 25 v16 M45.4 25 v16 M48 25.5 v15" stroke={AI_LIGHT} strokeWidth="1.1" />
          <path d="M35 45.4 h15" stroke={KIN} strokeWidth="1.6" strokeLinecap="round" />
          <circle cx="24" cy="33.5" r="9.4" fill="#3d444e" stroke={INK} strokeWidth="1.4" />
          <circle cx="24" cy="33.5" r="6.6" fill="none" stroke={SHU_LIGHT} strokeWidth="1.7" />
          <path d="M10.5 24 L37.5 43" stroke={INK} strokeWidth="4.2" strokeLinecap="round" />
          <path d="M10.5 24 L37.5 43" stroke="#c0c7ce" strokeWidth="2" strokeLinecap="round" />
          <path d="M24 28.6 l1.4 3 3.3 .4 -2.4 2.3 .6 3.3 -2.9 -1.6 -2.9 1.6 .6 -3.3 -2.4 -2.3 3.3 -.4Z" fill={KIN} stroke={INK} strokeWidth="0.8" strokeLinejoin="round" />
          <circle cx="9.5" cy="23.2" r="4.6" fill={SHU} stroke={INK} strokeWidth="1.3" />
          <circle cx="38.5" cy="43.8" r="4.6" fill={SHU} stroke={INK} strokeWidth="1.3" />
          <circle cx="8.2" cy="21.9" r="1.2" fill={WASHI} opacity="0.65" />
          <circle cx="37.2" cy="42.5" r="1.2" fill={WASHI} opacity="0.65" />
        </g>
      );
    case 4:
      // 電動リール: 液晶のついた箱形、電線つき
      return (
        <g>
          <path d="M19 49 C19 60 9 53 5 61" fill="none" stroke={INK} strokeWidth="3.4" strokeLinecap="round" />
          <path d="M19 49 C19 60 9 53 5 61" fill="none" stroke="#3d434d" strokeWidth="1.7" strokeLinecap="round" />
          <rect x="26" y="49.5" width="23" height="5" rx="2.2" fill={STEEL_DARK} stroke={INK} strokeWidth="1.3" />
          <rect x="15" y="9" width="25" height="13" rx="4" fill="#1b3a5b" stroke={INK} strokeWidth="1.6" />
          <rect x="18.5" y="11.6" width="18" height="7.6" rx="1.3" fill="#bfe3c8" stroke={INK} strokeWidth="1" />
          <path d="M21.5 13.4 v4 M21.5 13.4 h2.6 v4 h-2.6 M26.6 13.4 h2.6 v2 h-2.6 v2 h2.6 M31.6 13.4 v4 M33.4 13.4 v4" fill="none" stroke="#24496e" strokeWidth="0.9" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="10" y="19" width="44" height="31" rx="5.5" fill="#24496e" stroke={INK} strokeWidth="1.9" />
          <path d="M14 24.5 C17 22 24 21.6 30 21.6" fill="none" stroke={AI_LIGHT} strokeWidth="1.2" opacity="0.8" strokeLinecap="round" />
          <rect x="12.6" y="27.5" width="13.5" height="18.5" rx="3.4" fill={AI_SOFT} stroke={INK} strokeWidth="1.3" />
          <path d="M20.4 29.6 l-4 7.4 h3.4 l-1.6 6.6 5 -8.4 h-3.6 l1.9 -5.6Z" fill={KIN_LIGHT} stroke={INK} strokeWidth="0.8" strokeLinejoin="round" />
          <rect x="29.5" y="27.5" width="20" height="18.5" rx="2.2" fill={STEEL_LIGHT} stroke={INK} strokeWidth="1.3" />
          <path d="M32.4 29.5 v14.5 M35.2 29 v15.5 M38 29 v15.5 M40.8 29 v15.5 M43.6 29 v15.5 M46.4 29.5 v14.5" stroke={AI_LIGHT} strokeWidth="1.1" />
          <circle cx="44.6" cy="23.4" r="1.9" fill={SHU_LIGHT} stroke={INK} strokeWidth="0.8" />
          <circle cx="49.6" cy="23.4" r="1.9" fill={KIN_LIGHT} stroke={INK} strokeWidth="0.8" />
          <path d="M53 33 L60 25.5" stroke={INK} strokeWidth="3.6" strokeLinecap="round" />
          <path d="M53 33 L60 25.5" stroke="#c0c7ce" strokeWidth="1.7" strokeLinecap="round" />
          <circle cx="60.2" cy="25" r="3.3" fill="#2a2f37" stroke={INK} strokeWidth="1.2" />
        </g>
      );
    default:
      // 伝説のリール: 海神の三つ又と波を彫った金のリール
      return (
        <g>
          <circle cx="32" cy="35" r="27.5" fill={KIN_PALE} opacity="0.28" />
          <rect x="21" y="5.5" width="22" height="5" rx="2.2" fill={KIN_DARK} stroke={INK} strokeWidth="1.3" />
          <rect x="29.5" y="10" width="5" height="5.5" fill={KIN_DARK} stroke={INK} strokeWidth="1.2" />
          <circle cx="32" cy="35" r="20.5" fill={KIN} stroke={INK} strokeWidth="2" />
          <circle cx="32" cy="35" r="17" fill="none" stroke={KIN_DEEP} strokeWidth="1.4" />
          <circle cx="32" cy="35" r="13.2" fill={KIN_LIGHT} stroke={INK} strokeWidth="1.1" />
          <path d="M22 41.5 q2.5 -3 5 0 t5 0 t5 0 t5 0" fill="none" stroke={AI_MID} strokeWidth="1.4" strokeLinecap="round" />
          <path d="M24.5 45 q2.5 -2.6 5 0 t5 0 t5 0" fill="none" stroke={AI_MID} strokeWidth="1.2" strokeLinecap="round" opacity="0.8" />
          <path d="M32 25 V39.5 M26.4 26.5 C26.4 33.5 28.6 34.6 32 34.6 C35.4 34.6 37.6 33.5 37.6 26.5" fill="none" stroke={AI} strokeWidth="2" strokeLinecap="round" />
          <path d="M32 22.6 l1.9 3.4 h-3.8Z M26.4 24 l1.8 3.2 h-3.6Z M37.6 24 l1.8 3.2 h-3.6Z" fill={AI} />
          {[45, 135, 225, 315].map(a => (
            <circle key={a} cx={32 + Math.cos((a * Math.PI) / 180) * 18.8} cy={35 + Math.sin((a * Math.PI) / 180) * 18.8} r="1.9" fill={SHU_LIGHT} stroke={INK} strokeWidth="0.7" />
          ))}
          <path d="M43 24 L52 14.5" stroke={INK} strokeWidth="3.8" strokeLinecap="round" />
          <path d="M43 24 L52 14.5" stroke={KIN_LIGHT} strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="53" cy="13.5" r="4.3" fill={WASHI} stroke={INK} strokeWidth="1.3" />
          <circle cx="51.8" cy="12.3" r="1.2" fill="#fff" />
          <Sparkle x={9} y={16} s={0.9} />
          <Sparkle x={56} y={52} s={0.8} />
          <Sparkle x={10} y={54} s={0.55} c={WASHI} />
        </g>
      );
  }
}

// ===== ルアー・エサ =====

/** 小魚の形のルアー（ミノーと黄金ルアーで使う） */
function MinnowBody({ back, belly, eye, lip, hook, scale }: { back: string; belly: string; eye: string; lip: boolean; hook: string; scale: string }) {
  return (
    <g transform="rotate(-18 32 32)">
      {/* 針（腹と尾） */}
      {[27, 50].map(x => (
        <g key={x}>
          <circle cx={x} cy="41.6" r="1.7" fill="none" stroke={INK} strokeWidth="1" />
          <path d={`M${x} 43.4 v3 c0 4.2 -5.4 4.2 -5.4 0 M${x} 43.4 v3 c0 4.2 5.4 4.2 5.4 0`} fill="none" stroke={INK} strokeWidth="2.3" strokeLinecap="round" />
          <path d={`M${x} 43.4 v3 c0 4.2 -5.4 4.2 -5.4 0 M${x} 43.4 v3 c0 4.2 5.4 4.2 5.4 0`} fill="none" stroke={hook} strokeWidth="1" strokeLinecap="round" />
        </g>
      ))}
      {lip && <path d="M10 34.5 L1.5 42.5 L13.5 38Z" fill={WASHI} opacity="0.9" stroke={INK} strokeWidth="1.1" strokeLinejoin="round" />}
      <path d="M7 31 C13 20.5 37 18 51 26.5 L60 21.5 L57.5 31 L60 40.5 L51 35.5 C37 44 13 41.5 7 31Z" fill={belly} stroke={INK} strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M7 31 C13 20.5 37 18 51 26.5 L60 21.5 L57.5 31 C41 28.4 20 27.8 7 31Z" fill={back} />
      <path d="M7 31 C13 20.5 37 18 51 26.5 L60 21.5 L57.5 31 L60 40.5 L51 35.5 C37 44 13 41.5 7 31Z" fill="none" stroke={INK} strokeWidth="1.8" strokeLinejoin="round" />
      {[26, 31, 36, 41, 46].map(x => <path key={x} d={`M${x} 30.5 q2.4 2.6 0 5.4`} fill="none" stroke={scale} strokeWidth="0.9" opacity="0.8" />)}
      <path d="M21.5 24.5 q-3 6.5 0 12.6" fill="none" stroke={INK} strokeWidth="1" opacity="0.7" />
      <circle cx="15.2" cy="29" r="3.2" fill={eye} stroke={INK} strokeWidth="1" />
      <circle cx="15.2" cy="29" r="1.4" fill={INK} />
      <path d="M12 23.6 C18 21 28 20.4 36 21.4" fill="none" stroke={WASHI} strokeWidth="1.1" opacity="0.7" strokeLinecap="round" />
      <circle cx="6.6" cy="30.6" r="1.7" fill="none" stroke={INK} strokeWidth="1" />
    </g>
  );
}

function Lure({ level }: { level: number }) {
  switch (level) {
    case 1:
      // ミミズ: 針につけた生きエサ
      return (
        <g>
          <path d="M41 9 L48 1" stroke={INK} strokeWidth="0.9" />
          <circle cx="41" cy="10.5" r="2.5" fill="none" stroke={INK} strokeWidth="1.3" />
          <path d="M41 13 V37 C41 50 24.5 50 24.5 38.5 l4.6 -1.6" fill="none" stroke={INK} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M41 13 V37 C41 50 24.5 50 24.5 38.5 l4.6 -1.6" fill="none" stroke={STEEL} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M19 27 C12 33 20 43 30 41.5 C41 40 38 53.5 47.5 54 C56 54.4 56.5 46 52 43" fill="none" stroke={INK} strokeWidth="8" strokeLinecap="round" />
          <path d="M19 27 C12 33 20 43 30 41.5 C41 40 38 53.5 47.5 54 C56 54.4 56.5 46 52 43" fill="none" stroke="#dc8e88" strokeWidth="5.4" strokeLinecap="round" />
          <path d="M26 42 C28.5 42.4 31 41.6 33.5 41.4" fill="none" stroke="#f3bcae" strokeWidth="5.4" />
          <path d="M17.6 31.5 l4 -1.4 M19 36 l3.8 -2.6 M22.6 39.6 l2.4 -3.8 M37 44 l3.8 -1.2 M39.4 48.6 l3.6 -2.2 M43.6 52.4 l1.6 -4" stroke="#a85a55" strokeWidth="0.9" strokeLinecap="round" />
          <circle cx="20.4" cy="27.6" r="0.9" fill={INK} />
        </g>
      );
    case 2:
      // スプーン: 光るしずく形の金属
      return (
        <g>
          <path d="M33 6 L37 0" stroke={INK} strokeWidth="0.9" />
          <circle cx="32.6" cy="8.4" r="2.6" fill="none" stroke={INK} strokeWidth="1.3" />
          <g transform="rotate(14 32 32)">
            <path d="M32 11 C43 15 47.5 32 41 46 C37 54.5 27 54.5 23 46 C16.5 32 21 15 32 11Z" fill={STEEL_LIGHT} stroke={INK} strokeWidth="1.9" strokeLinejoin="round" />
            <path d="M32 14.5 C24 19 21 32 26 44.5 C22.5 34 24.5 21 32 14.5Z" fill="#fff" opacity="0.9" />
            <path d="M33.5 15 C41.5 20 44 33 39 45.5 C36 51.5 30 52 27.5 49 C36 49 40.5 33 33.5 15Z" fill={STEEL_DARK} opacity="0.55" />
            <path d="M27 21 C30 17.5 34.5 17.5 37.5 21 C35 24.6 29.5 24.6 27 21Z" fill={SHU_LIGHT} stroke={INK} strokeWidth="0.8" />
            <circle cx="31" cy="31" r="1.5" fill={STEEL_DARK} opacity="0.5" />
            <circle cx="35" cy="37" r="1.5" fill={STEEL_DARK} opacity="0.5" />
            <circle cx="30" cy="42" r="1.3" fill={STEEL_DARK} opacity="0.5" />
          </g>
          <circle cx="27.4" cy="53.4" r="2.2" fill="none" stroke={INK} strokeWidth="1.2" />
          <path d="M27 55.6 C27 63 18 62.6 18.6 55.6 l3.4 -1" fill="none" stroke={INK} strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M27 55.6 C27 63 18 62.6 18.6 55.6 l3.4 -1" fill="none" stroke={STEEL} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          <Sparkle x={46} y={18} s={1.05} c="#fff" />
          <Sparkle x={15} y={36} s={0.6} c="#fff" />
        </g>
      );
    case 3:
      // ミノー: 小魚そっくりの硬いルアー
      return <MinnowBody back={AI_MID} belly={STEEL_LIGHT} eye={KIN_LIGHT} lip hook={STEEL} scale={AI_SOFT} />;
    case 4:
      // ソフトベイトPro: 朱の重り頭に、くるりと巻いた尾のやわらかい虫
      return (
        <g>
          <path d="M19 19 L25 9" stroke={INK} strokeWidth="1" />
          <circle cx="18.4" cy="20.6" r="2.3" fill="none" stroke={INK} strokeWidth="1.2" />
          <path d="M33 27 C39 12.5 52 16 47.6 26.5" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" />
          <path d="M33 27 C39 12.5 52 16 47.6 26.5" fill="none" stroke={STEEL} strokeWidth="1.3" strokeLinecap="round" />
          <path d="M47 32 C60 29 62.5 45 52.5 47 C45 48.6 42.6 40.6 48 38.6 C52.4 37.4 54 42 50.6 43.2" fill="none" stroke={INK} strokeWidth="6.4" strokeLinecap="round" />
          <path d="M47 32 C60 29 62.5 45 52.5 47 C45 48.6 42.6 40.6 48 38.6 C52.4 37.4 54 42 50.6 43.2" fill="none" stroke="#b592dc" strokeWidth="3.9" strokeLinecap="round" />
          <path d="M20 23.5 C30 18.5 43 22.5 50 31 C43 38 30 38.5 20 34Z" fill="#8a5fb0" stroke={INK} strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M24 23.4 C31 21 39 23 44.5 27" fill="none" stroke="#c9afea" strokeWidth="1.3" strokeLinecap="round" opacity="0.9" />
          {[27, 31.5, 36, 40.5, 45].map(x => <path key={x} d={`M${x} ${23.6 + (x - 27) * 0.2} q2.2 5.6 0 ${11.4 - (x - 27) * 0.32}`} fill="none" stroke="#5d3a80" strokeWidth="1" />)}
          {[[29, 30], [34, 27], [38, 32], [43, 30], [33, 34]].map(([x, y]) => <circle key={`${x}-${y}`} cx={x} cy={y} r="0.85" fill={KIN_LIGHT} />)}
          <circle cx="16.5" cy="28.6" r="7.2" fill={SHU} stroke={INK} strokeWidth="1.7" />
          <circle cx="14.6" cy="26.6" r="2.9" fill={WASHI} stroke={INK} strokeWidth="0.9" />
          <circle cx="14.2" cy="26.8" r="1.3" fill={INK} />
          <path d="M19 33.5 C20.5 32.6 21.6 31 22 29.4" fill="none" stroke={SHU_DARK} strokeWidth="1" strokeLinecap="round" />
          <Sparkle x={52} y={14} s={0.7} c={WASHI} />
        </g>
      );
    default:
      // 黄金ルアー: 金色に光る小魚
      return (
        <g>
          <circle cx="32" cy="32" r="27.5" fill={KIN_PALE} opacity="0.3" />
          <MinnowBody back={KIN} belly={KIN_PALE} eye={SHU_LIGHT} lip={false} hook={KIN_LIGHT} scale={KIN_DEEP} />
          <Sparkle x={48} y={11} s={1.1} />
          <Sparkle x={13} y={13} s={0.7} c="#fff" />
          <Sparkle x={54} y={47} s={0.75} />
          <Sparkle x={9} y={50} s={0.5} c="#fff" />
        </g>
      );
  }
}

/** 道具の形だけ（ほかの SVG に入れるとき用）。64x64 の箱に描く */
export function GearShapes({ type, level }: { type: EquipmentType; level: number }): ReactNode {
  const lv = Math.max(1, Math.min(5, Math.round(level)));
  if (type === 'rod') return <Rod level={lv} />;
  if (type === 'reel') return <Reel level={lv} />;
  return <Lure level={lv} />;
}

interface GearArtProps {
  type: EquipmentType;
  level: number;
  size?: number;
  className?: string;
}

/** 道具の絵（1枚） */
export default function GearArt({ type, level, size = 56, className = '' }: GearArtProps) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className={`shrink-0 ${className}`} aria-hidden="true">
      <GearShapes type={type} level={level} />
    </svg>
  );
}

interface GearTileProps extends GearArtProps {
  /** 壊れている（朱の斜線をかける） */
  broken?: boolean;
  /** 装着中（金の縁を光らせる） */
  active?: boolean;
}

/** 等級で縁の色が変わる台紙に乗せた道具の絵 */
export function GearTile({ type, level, size = 60, broken = false, active = false, className = '' }: GearTileProps) {
  const lv = Math.max(1, Math.min(5, Math.round(level)));
  return (
    <span
      className={`fd-gear is-lv${lv} ${active ? 'is-active' : ''} ${broken ? 'is-broken' : ''} ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 64 64" width={size - 6} height={size - 6}>
        <GearShapes type={type} level={lv} />
        {broken && (
          <g>
            <path d="M10 12 L26 28 L20 34 L40 40 L34 46 L54 54" fill="none" stroke={WASHI} strokeWidth="4.5" strokeLinejoin="round" strokeLinecap="round" />
            <path d="M10 12 L26 28 L20 34 L40 40 L34 46 L54 54" fill="none" stroke={SHU_DARK} strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
          </g>
        )}
      </svg>
    </span>
  );
}
