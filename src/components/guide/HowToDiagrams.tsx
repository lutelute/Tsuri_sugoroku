// 遊び方の画面の「動く図解」。SVG と CSS のアニメ（index.css の gd- ブロック）で描く。
// - アニメはそのページを表示している間だけ動く（ページを離れると消える）。
// - 動きを減らす設定ではアニメを止める。止めたときに意味の通る絵（到着した後・建った後など）を素の状態にしてある。
// - 図の中の文字は SVG なのでふりがなが付けられない。漢字は記号（マスの字・判子）だけにして、ひらがなの札を添える。
import type { CSSProperties, ReactNode } from 'react';
import type { DiagramId } from './howToPages';
import { BuildingShapes } from '../city/BuildingGlyph';
import BinboFigure from '../city/BinboFigure';
import { PLAYER_COLORS } from '../../game/constants';
import { CITY_ECONOMY } from '../../game/city';
import { SPECIALTY_ECONOMY } from '../../game/citySpecialties';

const W = 320;
const H = 160;
const C = {
  washi: '#f4ecd8',
  kin: '#f1d893',
  kinD: '#d4a843',
  shu: '#e34a33',
  ai: '#4a7faf',
  sumi: '#1a1510',
  green: '#2f9e6e',
  purple: '#a855f7',
  road: 'rgba(241,216,147,0.55)',
};
const [P1, P2, P3] = PLAYER_COLORS;
const SANS = '"Zen Kaku Gothic New", "Noto Sans JP", sans-serif';
const MINCHO = '"Shippori Mincho", serif';

type Delay = CSSProperties & { animationDelay?: string };
const delay = (s: number): Delay => ({ animationDelay: `${s}s` });

/** ひらがなの札（図の中の説明） */
function Kana({ x, y, children, size = 9, fill = C.washi, anchor = 'middle', weight = 700, className, style }: {
  x: number; y: number; children: ReactNode; size?: number; fill?: string; anchor?: 'start' | 'middle' | 'end'; weight?: number; className?: string; style?: CSSProperties;
}) {
  return (
    <text x={x} y={y} fontSize={size} fill={fill} textAnchor={anchor} fontFamily={SANS} fontWeight={weight} className={className} style={style}>
      {children}
    </text>
  );
}

/** すごろくのマス（丸に一文字） */
function Sq({ x, y, glyph, color, r = 11 }: { x: number; y: number; glyph: string; color: string; r?: number }) {
  return (
    <g>
      <circle cx={x} cy={y + 1.5} r={r} fill="rgba(6,18,31,0.5)" />
      <circle cx={x} cy={y} r={r} fill={color} stroke={C.kin} strokeWidth="1.6" />
      <text x={x} y={y + 0.5} fontSize={r * 1.15} fill="#fff" fontWeight={900} fontFamily={MINCHO} textAnchor="middle" dominantBaseline="central" stroke="#1a130c" strokeWidth={r * 0.14} style={{ paintOrder: 'stroke' }}>
        {glyph}
      </text>
    </g>
  );
}

/** 駒（地図の駒と同じピン）。原点がピンの先 */
function Pin({ color, scale = 1 }: { color: string; scale?: number }) {
  return (
    <g transform={`scale(${scale}) translate(0 -18)`}>
      <ellipse cx={0} cy={18} rx={6} ry={2} fill="rgba(6,18,31,0.45)" />
      <path d="M 0,18 L -6.6,1.8 A 8.7 8.7 0 1 1 6.6,1.8 Z" fill={color} stroke="#fff" strokeWidth="1.8" strokeLinejoin="round" />
      <circle cx={0} cy={-3} r={4.3} fill="#fbf6e8" />
    </g>
  );
}

/** サイコロ（和紙の目） */
const PIPS: Record<number, [number, number][]> = {
  1: [[0.5, 0.5]],
  2: [[0.28, 0.28], [0.72, 0.72]],
  3: [[0.26, 0.26], [0.5, 0.5], [0.74, 0.74]],
  4: [[0.28, 0.28], [0.72, 0.28], [0.28, 0.72], [0.72, 0.72]],
  5: [[0.27, 0.27], [0.73, 0.27], [0.5, 0.5], [0.27, 0.73], [0.73, 0.73]],
  6: [[0.28, 0.24], [0.72, 0.24], [0.28, 0.5], [0.72, 0.5], [0.28, 0.76], [0.72, 0.76]],
};
function Die({ size, value }: { size: number; value: number }) {
  return (
    <g>
      <rect x={-size / 2} y={-size / 2} width={size} height={size} rx={size * 0.2} fill="#fbf6e8" stroke={C.kinD} strokeWidth="1.5" />
      {PIPS[value].map(([px, py], i) => (
        <circle key={i} cx={-size / 2 + px * size} cy={-size / 2 + py * size} r={size * 0.09} fill={value === 1 ? C.shu : C.sumi} />
      ))}
    </g>
  );
}

/** 指差しの手（原点が指の先） */
function Hand({ scale = 0.62 }: { scale?: number }) {
  return (
    <g transform={`scale(${scale}) translate(-7 -4)`}>
      <path
        d="M9 4.5c2.2-1 4.4.3 5.2 2.4l4.6 12.2 1.1-1.4c1.4-1.8 4-2 5.6-.5l.6.6.6-.6c1.6-1.4 4.1-1.2 5.4.5l.5.7.4-.3c1.7-1.2 4.1-.7 5.2 1.1l2.7 4.6c2 3.5 2.5 7.7 1.2 11.5l-1.3 3.9c-1 3-3.8 5-7 5H23.8c-2.6 0-5-1.3-6.4-3.5L8.6 26.9c-1.2-1.8-.8-4.2.9-5.5 1.6-1.2 3.8-1 5.2.4l1.9 2L6.8 9.6C5.9 7.5 6.8 5.4 9 4.5Z"
        fill="#fbf6e8" stroke={C.sumi} strokeWidth="2" strokeLinejoin="round"
      />
    </g>
  );
}

/** 朱の判子（漢字＋ひらがなの読み） */
function Seal({ x, y, text, kana, size = 44, tone = C.shu, className }: { x: number; y: number; text: string; kana?: string; size?: number; tone?: string; className?: string }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <g className={className}>
        <rect x={-size / 2} y={-size / 2} width={size} height={size} rx={6} fill={tone} stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" transform="rotate(-8)" />
        <text x={0} y={kana ? -2 : 1} fontSize={text.length > 2 ? size * 0.26 : size * 0.36} fill="#fff" fontFamily={MINCHO} fontWeight={900} textAnchor="middle" dominantBaseline="central" transform="rotate(-8)">
          {text}
        </text>
        {kana && <text x={0} y={size * 0.3} fontSize={size * 0.17} fill="#fff" fontFamily={SANS} fontWeight={700} textAnchor="middle" transform="rotate(-8)">{kana}</text>}
      </g>
    </g>
  );
}

/** 建物（町の画面の絵を拡大して使う） */
function Building({ x, y, kind, level = 1, size = 34 }: { x: number; y: number; kind: 'res' | 'com' | 'ind' | 'power' | 'park' | 'tourism'; level?: number; size?: number }) {
  const s = size / 24;
  return (
    <g transform={`translate(${x - size / 2} ${y - size / 2}) scale(${s})`}>
      <BuildingShapes kind={kind} level={level} />
    </g>
  );
}

function Plot({ x, y, size = 44, owner }: { x: number; y: number; size?: number; owner?: string }) {
  return <rect x={x - size / 2} y={y - size / 2} width={size} height={size} rx={7} fill="rgba(12,31,51,0.75)" stroke={owner ?? 'rgba(241,216,147,0.35)'} strokeWidth={owner ? 2.4 : 1.2} />;
}

// ===== 釣り旅 =====

function DiceMove() {
  const xs = [40, 96, 152, 208, 264];
  const glyphs = ['始', '釣', '吉', '釣', '店'];
  const colors = ['#2f9e6e', '#2e5e8c', '#2f9e6e', '#2e5e8c', '#d4a843'];
  return (
    <>
      <path d={`M ${xs[0]} 112 Q 68 100 ${xs[1]} 112 T ${xs[2]} 112 T ${xs[3]} 112 T ${xs[4]} 112`} fill="none" stroke={C.road} strokeWidth="3" strokeDasharray="6 5" />
      {xs.map((x, i) => <Sq key={x} x={x} y={112} glyph={glyphs[i]} color={colors[i]} />)}
      <g transform="translate(62 46)">
        <g className="gd-fb gd-dm-die"><Die size={34} value={3} /></g>
      </g>
      <Kana x={100} y={42} anchor="start" size={11} fill={C.kin}>3が でた！</Kana>
      <Kana x={100} y={58} anchor="start" size={10}>3マス すすむ</Kana>
      <circle cx={xs[3]} cy={112} r={16} fill="none" stroke={C.kin} strokeWidth="2" className="gd-fb gd-dm-land" />
      <g transform={`translate(${xs[3]} 100)`}>
        <g className="gd-dm-tok"><Pin color={P1} /></g>
      </g>
    </>
  );
}

function Fork() {
  const S = { x: 46, y: 84 };
  const up = 'M 46 84 L 120 50 L 196 38 L 270 44';
  const down = 'M 46 84 L 120 116 L 196 128 L 270 120';
  return (
    <>
      <path d={up} fill="none" stroke={C.road} strokeWidth="3" strokeLinejoin="round" />
      <path d={down} fill="none" stroke={C.road} strokeWidth="3" strokeLinejoin="round" />
      <path d={up} fill="none" stroke={C.kin} strokeWidth="3" strokeLinejoin="round" className="gd-flow-demo" />
      <path d={down} fill="none" stroke={C.kin} strokeWidth="3" strokeLinejoin="round" className="gd-flow-demo" />
      <Sq x={S.x} y={S.y} glyph="道" color="#8a6a3a" r={9} />
      <Sq x={120} y={50} glyph="道" color="#8a6a3a" r={7} />
      <Sq x={196} y={38} glyph="道" color="#8a6a3a" r={7} />
      <Sq x={120} y={116} glyph="道" color="#8a6a3a" r={7} />
      <Sq x={196} y={128} glyph="道" color="#8a6a3a" r={7} />
      <circle cx={270} cy={44} r={17} fill="rgba(241,216,147,0.16)" stroke={C.kin} strokeWidth="2" className="gd-fb gd-pulse" />
      <circle cx={270} cy={120} r={17} fill="rgba(241,216,147,0.16)" stroke={C.kin} strokeWidth="2" className="gd-fb gd-pulse" style={delay(-0.5)} />
      <Sq x={270} y={44} glyph="釣" color="#2e5e8c" />
      <Sq x={270} y={120} glyph="店" color="#d4a843" />
      <Kana x={270} y={20} size={9}>ひかるマス</Kana>
      <g transform="translate(270 108)">
        <g className="gd-fk-tok"><Pin color={P1} /></g>
      </g>
      <g transform="translate(274 124)">
        <g className="gd-fb gd-fk-hand"><Hand /></g>
      </g>
      <Kana x={70} y={140} size={9} fill={C.kin}>タップして えらぶ</Kana>
    </>
  );
}

function FishingFlow() {
  const xs = [12, 88, 164, 240];
  const labels = ['なげる', 'アタリ', 'あわせる', 'まきあげる'];
  return (
    <>
      {xs.map((x, i) => (
        <g key={x} className="gd-ff-step" style={delay(i * 1.5)}>
          <rect x={x} y={14} width={68} height={104} rx={9} fill="rgba(255,255,255,0.06)" stroke={C.kin} strokeWidth="1.4" />
          <path d={`M ${x} 92 q 8.5 -5 17 0 t 17 0 t 17 0 t 17 0 V 118 H ${x} Z`} fill="rgba(74,127,175,0.45)" />
          <Kana x={x + 34} y={136} size={10} fill={C.kin}>{labels[i]}</Kana>
          <Kana x={x + 34} y={152} size={8} fill="rgba(244,236,216,0.6)">{`${i + 1}`}</Kana>
        </g>
      ))}
      {/* 1 なげる: 竿を振る */}
      <g transform="translate(22 96)">
        <g className="gd-ff-rod" style={{ transformOrigin: '0px 0px' }}>
          <path d="M 0 0 L 40 -60" stroke={C.kinD} strokeWidth="2.6" strokeLinecap="round" />
          <path d="M 40 -60 Q 50 -30 44 -6" fill="none" stroke={C.washi} strokeWidth="0.9" opacity="0.8" />
        </g>
      </g>
      {/* 2 アタリ: 浮きが沈む */}
      <g transform="translate(122 90)">
        <circle r={10} fill="none" stroke={C.washi} strokeWidth="1" opacity="0.7" className="gd-fb gd-ripple" />
        <circle r={10} fill="none" stroke={C.washi} strokeWidth="1" opacity="0.7" className="gd-fb gd-ripple" style={delay(-0.7)} />
        <g className="gd-ff-bob">
          <path d="M 0 -14 L 0 -4" stroke={C.washi} strokeWidth="1" />
          <ellipse cx={0} cy={0} rx={4.5} ry={6} fill={C.shu} stroke="#fff" strokeWidth="1" />
          <path d="M -4.5 0 H 4.5" stroke="#fff" strokeWidth="1.4" />
        </g>
        <Kana x={0} y={-28} size={14} fill={C.kin}>！</Kana>
      </g>
      {/* 3 あわせる: 朱の輪が金の帯へ縮む */}
      <g transform="translate(198 62)">
        <circle r={16} fill="none" stroke={C.kinD} strokeWidth="6" opacity="0.9" />
        <circle r={16} fill="none" stroke={C.shu} strokeWidth="2.4" className="gd-fb gd-ff-shrink" />
        <Kana x={0} y={4} size={10} fill={C.washi}>いま！</Kana>
      </g>
      {/* 4 まきあげる: 魚とテンション */}
      <g transform="translate(262 70)">
        <g className="gd-fb gd-ff-fish">
          <path d="M -12 0 q 9 -9 20 -2 l 7 -5 v 12 l -7 -5 q -11 7 -20 0 z" fill="#f1d893" stroke="#9a6f24" strokeWidth="0.9" />
          <circle cx={-7} cy={-1.5} r={1.2} fill={C.sumi} />
        </g>
        <path d="M 0 -40 L -2 -8" stroke={C.washi} strokeWidth="0.9" opacity="0.8" />
      </g>
      <rect x={296} y={26} width={8} height={62} rx={3} fill="rgba(0,0,0,0.35)" stroke={C.kin} strokeWidth="0.8" />
      <rect x={297.5} y={27.5} width={5} height={59} rx={2} fill={C.green} className="gd-fb-b gd-ff-tension" />
    </>
  );
}

function Star({ x, y, on }: { x: number; y: number; on: boolean }) {
  return <path transform={`translate(${x} ${y}) scale(0.5)`} d="M0-9 2.6-3 9-2.8 4-1.2 5.6 7 0 3.2-5.6 7-4 -1.2-9-2.8-2.6-3Z" fill={on ? C.kin : 'none'} stroke={C.kinD} strokeWidth="1.6" />;
}

function Gear() {
  const cards = [
    { x: 24, label: 'さお', icon: <path d="M -18 16 L 16 -18" stroke={C.kinD} strokeWidth="3" strokeLinecap="round" /> },
    {
      x: 122, label: 'リール', icon: (
        <g>
          <circle r={12} fill="#7fa9cd" stroke={C.sumi} strokeWidth="1.4" />
          <circle r={4} fill={C.washi} stroke={C.sumi} strokeWidth="1" />
          <path d="M 4 0 L 16 -6" stroke={C.sumi} strokeWidth="2" strokeLinecap="round" />
        </g>
      ),
    },
    {
      x: 220, label: 'ルアー', icon: (
        <g>
          <path d="M -14 0 q 10 -10 24 -2 l 6 -4 v 12 l -6 -4 q -14 8 -24 -2 z" fill="#ef6a52" stroke={C.sumi} strokeWidth="1.2" />
          <path d="M 16 2 q 5 6 0 10" fill="none" stroke={C.washi} strokeWidth="1.2" />
        </g>
      ),
    },
  ];
  return (
    <>
      {cards.map(c => (
        <g key={c.x}>
          <rect x={c.x} y={12} width={76} height={90} rx={9} fill="rgba(255,255,255,0.07)" stroke={C.kin} strokeWidth="1.2" />
          <g transform={`translate(${c.x + 38} 44)`}>{c.icon}</g>
          <Kana x={c.x + 38} y={78} size={10}>{c.label}</Kana>
          {[0, 1, 2, 3, 4].map(i => <Star key={i} x={c.x + 14 + i * 12} y={92} on={false} />)}
          <g><Star x={c.x + 14} y={92} on /></g>
          <g className="gd-fb gd-gear-s1"><Star x={c.x + 26} y={92} on /></g>
          <g className="gd-fb gd-gear-s2"><Star x={c.x + 38} y={92} on /></g>
        </g>
      ))}
      <Kana x={24} y={126} anchor="start" size={9}>つかうと いたむ</Kana>
      <rect x={100} y={118} width={150} height={10} rx={5} fill="rgba(0,0,0,0.35)" stroke={C.kin} strokeWidth="0.8" />
      <rect x={101.5} y={119.5} width={147} height={7} rx={3.5} fill={C.green} className="gd-fb-l gd-gear-dur" />
      <g transform="translate(276 123)">
        <g className="gd-fb gd-gear-fix">
          <circle r={13} fill="#14b8a6" stroke={C.kin} strokeWidth="1.5" />
          <text y={1} fontSize={14} fill="#fff" fontFamily={MINCHO} fontWeight={900} textAnchor="middle" dominantBaseline="central">湯</text>
        </g>
      </g>
      <Kana x={276} y={150} size={8} fill={C.kin}>なおす</Kana>
    </>
  );
}

function Squares() {
  const items = [
    { g: '祭', c: '#e8a23a', k: 'おまつり' },
    { g: '店', c: '#d4a843', k: 'つりぐてん' },
    { g: '湯', c: '#14b8a6', k: 'おんせん' },
    { g: '吉', c: '#2f9e6e', k: 'いいこと' },
    { g: '凶', c: '#e34a33', k: 'わるいこと' },
    { g: '籤', c: '#a855f7', k: 'くじ' },
  ];
  return (
    <>
      {items.map((it, i) => {
        const x = 34 + i * 50.4;
        return (
          <g key={it.g}>
            <g transform={`translate(${x} 66)`}>
              <g className="gd-fb gd-sq-pop" style={delay(i * 0.3)}>
                <Sq x={0} y={0} glyph={it.g} color={it.c} r={18} />
              </g>
            </g>
            <Kana x={x} y={106} size={9}>{it.k}</Kana>
          </g>
        );
      })}
      <path d="M 180 124 H 300" stroke={C.road} strokeWidth="1" />
      <Kana x={240} y={142} size={9} fill={C.kin}>うんめいの ふだ</Kana>
      <path d="M 20 124 H 140" stroke={C.road} strokeWidth="1" />
      <Kana x={80} y={142} size={9} fill={C.kin}>よりみち</Kana>
    </>
  );
}

function GoalScore() {
  const segs = [
    { w: 58, c: C.ai, k: 'さかな' },
    { w: 40, c: C.purple, k: 'めずらしさ' },
    { w: 34, c: C.green, k: 'ちほう' },
    { w: 30, c: C.shu, k: 'じゅんばん' },
  ];
  let x = 132;
  return (
    <>
      <path d="M 10 110 H 92" stroke={C.road} strokeWidth="3" strokeDasharray="6 5" />
      <Sq x={70} y={110} glyph="旗" color="#e34a33" r={12} />
      <g transform="translate(90 62)">
        <path d="M 0 0 V 46" stroke={C.washi} strokeWidth="2" />
        <path d="M 0 0 L 24 7 L 0 14 Z" fill={C.shu} className="gd-fb gd-flag" style={{ transformOrigin: '0px 7px' }} />
      </g>
      <Kana x={70} y={140} size={10}>ゴール（なは）</Kana>
      <g transform="translate(70 98)">
        <g className="gd-gs-tok"><Pin color={P1} /></g>
      </g>
      {segs.map((s, i) => {
        const el = (
          <g key={s.k}>
            <rect x={x} y={70} width={s.w} height={24} fill={s.c} stroke="rgba(0,0,0,0.35)" strokeWidth="1" className="gd-fb-l gd-gs-seg" style={delay(i * 0.35)} />
            <Kana x={x + s.w / 2} y={i % 2 === 0 ? 62 : 110} size={8.5}>{s.k}</Kana>
          </g>
        );
        x += s.w;
        return el;
      })}
      <Kana x={x - 81} y={40} size={12} fill={C.kin}>＝ とくてん</Kana>
    </>
  );
}

// ===== まちづくり =====

function Destination() {
  const pts = [{ x: 40, y: 112 }, { x: 110, y: 84 }, { x: 184, y: 100 }, { x: 262, y: 64 }];
  return (
    <>
      <path d={`M ${pts.map(p => `${p.x} ${p.y}`).join(' L ')}`} fill="none" stroke={C.road} strokeWidth="3" strokeLinejoin="round" />
      <line x1={52} y1={104} x2={250} y2={70} stroke={C.shu} strokeWidth="2.4" className="gd-flow-demo" />
      {pts.slice(0, 3).map((p, i) => <Sq key={i} x={p.x} y={p.y} glyph={i === 1 ? '町' : '道'} color={i === 1 ? '#2e5e8c' : '#8a6a3a'} r={i === 1 ? 11 : 8} />)}
      <Sq x={262} y={64} glyph="町" color="#2e5e8c" r={12} />
      <g transform="translate(270 22)">
        <path d="M 0 0 V 34" stroke={C.washi} strokeWidth="2" />
        <path d="M 0 0 L 26 8 L 0 16 Z" fill={C.shu} className="gd-fb gd-flag" style={{ transformOrigin: '0px 8px' }} />
      </g>
      <Kana x={262} y={96} size={9} fill={C.kin}>もくてきち</Kana>
      <g transform="translate(262 52)">
        <g className="gd-dst-tok"><Pin color={P1} /></g>
      </g>
      {[[-26, -20], [24, -24], [-30, 10], [30, 6], [0, -34]].map(([dx, dy], i) => (
        <circle key={i} cx={262} cy={56} r={4} fill={C.kin} stroke="#9a6f24" strokeWidth="1" className="gd-coin" style={{ '--dx': `${dx}px`, '--dy': `${dy}px` } as CSSProperties} />
      ))}
      <Seal x={184} y={40} text="一番乗り" kana="いちばんのり" size={46} className="gd-fb gd-stamp-late" />
      <Kana x={150} y={148} size={9}>しょうきん ＋ こうじが 1かい おおく できる</Kana>
    </>
  );
}

function BuildGrow() {
  return (
    <>
      <Plot x={46} y={46} owner={P1} />
      <Plot x={98} y={46} />
      <Plot x={46} y={98} owner={P2} />
      <Plot x={98} y={98} />
      <Building x={46} y={98} kind="com" level={1} size={32} />
      <text x={98} y={50} fontSize={20} fill="rgba(244,236,216,0.3)" textAnchor="middle">＋</text>
      <text x={98} y={104} fontSize={20} fill="rgba(244,236,216,0.3)" textAnchor="middle">＋</text>
      <Kana x={72} y={136} size={9}>あきちを タップ</Kana>
      {/* 建つ → 月末に育つ */}
      <g className="gd-fb gd-bg-l1"><Building x={46} y={46} kind="res" level={1} size={34} /></g>
      <g className="gd-fb gd-bg-l2"><Building x={46} y={46} kind="res" level={2} size={34} /></g>
      <g transform="translate(52 56)">
        <g className="gd-fb gd-bg-hand"><Hand /></g>
      </g>
      <path d="M 134 72 H 176" stroke={C.kin} strokeWidth="1.6" strokeDasharray="4 4" />
      <path d="M 176 72 l -6 -4 v 8 z" fill={C.kin} />
      <g transform="translate(212 70)">
        <g className="gd-fb gd-bg-cal">
          <rect x={-24} y={-26} width={48} height={52} rx={5} fill="#fbf6e8" stroke={C.kinD} strokeWidth="1.5" />
          <rect x={-24} y={-26} width={48} height={13} rx={5} fill={C.shu} />
          <text x={0} y={8} fontSize={15} fill={C.sumi} fontFamily={MINCHO} fontWeight={900} textAnchor="middle">月末</text>
        </g>
      </g>
      <Kana x={212} y={112} size={9}>げつまつ</Kana>
      <g className="gd-bg-coin">
        <circle cx={272} cy={60} r={9} fill={C.kin} stroke="#9a6f24" strokeWidth="1.2" />
        <text x={272} y={63.5} fontSize={10} fill="#7a5a2a" fontWeight={900} textAnchor="middle">¥</text>
        <Kana x={272} y={88} size={12} fill={C.kin}>＋¥</Kana>
      </g>
      <Kana x={262} y={128} size={9}>もちぬしへ</Kana>
      <Kana x={212} y={146} size={9} fill={C.kin}>そだつと ▲</Kana>
    </>
  );
}

function DemandBar({ x, kanji, kana, cls }: { x: number; kanji: string; kana: string; cls: string }) {
  return (
    <g>
      <rect x={x - 8} y={22} width={16} height={84} rx={3} fill="rgba(0,0,0,0.35)" stroke="rgba(241,216,147,0.3)" />
      <path d={`M ${x - 8} 64 H ${x + 8}`} stroke="rgba(244,236,216,0.4)" />
      <rect x={x - 6} y={cls === 'down' ? 64 : 26} width={12} height={38} fill={cls === 'down' ? C.shu : C.green} className={`${cls === 'down' ? 'gd-fb-t' : 'gd-fb-b'} gd-dd-${cls}`} />
      <text x={x} y={124} fontSize={13} fill={C.washi} fontFamily={MINCHO} fontWeight={800} textAnchor="middle">{kanji}</text>
      <Kana x={x} y={138} size={8}>{kana}</Kana>
    </g>
  );
}

function Demand() {
  return (
    <>
      <DemandBar x={30} kanji="住" kana="じゅう" cls="up" />
      <DemandBar x={74} kanji="商" kana="しょう" cls="mid" />
      <DemandBar x={118} kanji="工" kana="こう" cls="down" />
      <Kana x={74} y={154} size={9} fill={C.kin}>みどりが のびると そだつ</Kana>
      {/* 発電所から電気が届く */}
      <g transform="translate(196 60)">
        <circle r={14} fill="none" stroke={C.kin} strokeWidth="2" className="gd-fb gd-wave" />
        <circle r={14} fill="none" stroke={C.kin} strokeWidth="2" className="gd-fb gd-wave" style={delay(-1.1)} />
      </g>
      <Building x={196} y={60} kind="power" size={38} />
      <Kana x={196} y={96} size={9} fill={C.kin}>でんき</Kana>
      <g>
        <Building x={276} y={34} kind="res" level={2} size={40} />
        <circle cx={269} cy={41} r={2.8} fill={C.kin} className="gd-lit" />
        <Building x={286} y={92} kind="res" size={36} />
        <circle cx={281} cy={97} r={2.6} fill={C.kin} className="gd-lit" style={delay(-0.6)} />
      </g>
      {/* 工場の公害 */}
      <Building x={172} y={126} kind="ind" level={2} size={40} />
      <circle cx={183} cy={102} r={5} fill="#b9ae9a" className="gd-fb gd-smoke" />
      <circle cx={183} cy={102} r={5} fill="#b9ae9a" className="gd-fb gd-smoke" style={delay(-1)} />
      <Kana x={214} y={140} anchor="start" size={9} fill="#ef9a86">こうがいに ちゅうい</Kana>
    </>
  );
}

function Monopoly() {
  const xs = [34, 92, 150, 208];
  const kinds = ['res', 'com', 'res', 'com'] as const;
  return (
    <>
      {xs.map((x, i) => (
        <g key={x}>
          <Plot x={x} y={52} size={52} owner={P1} />
          <g className="gd-fb gd-mono-b" style={delay(i * 0.45)}>
            <Building x={x} y={52} kind={kinds[i]} level={2} size={38} />
          </g>
        </g>
      ))}
      <Kana x={121} y={98} size={9}>もとの くかくを ぜんぶ じぶんの たてものに</Kana>
      <Seal x={278} y={54} text="独占" kana="どくせん" size={50} className="gd-fb gd-stamp-late" />
      <g className="gd-late-pop">
        <Kana x={160} y={134} size={15} fill={C.kin}>{`しゅうにゅう ×${CITY_ECONOMY.monopolyMul}`}</Kana>
      </g>
    </>
  );
}

function Card({ glyph, color, kana }: { glyph: string; color: string; kana: string }) {
  return (
    <g>
      <rect x={-20} y={-30} width={40} height={60} rx={5} fill="#f6efdc" stroke={color} strokeWidth="2" />
      <rect x={-20} y={-30} width={40} height={11} rx={4} fill={color} />
      <text x={0} y={6} fontSize={22} fill={color} fontFamily={MINCHO} fontWeight={900} textAnchor="middle" dominantBaseline="central">{glyph}</text>
      <text x={0} y={25} fontSize={6.5} fill="#2a2118" fontFamily={SANS} fontWeight={700} textAnchor="middle">{kana}</text>
    </g>
  );
}

function Cards() {
  return (
    <>
      <g transform="translate(92 104) rotate(-12)"><Card glyph="牛" color="#8a5a2a" kana="ぎゅうほ" /></g>
      <g transform="translate(168 104) rotate(12)"><Card glyph="保" color="#2f7a6e" kana="ほけん" /></g>
      <g transform="translate(130 98)">
        <g className="gd-fb gd-card-fly"><Card glyph="急" color="#c63a26" kana="きゅうこう" /></g>
      </g>
      <Kana x={130} y={150} size={9}>てふだ（4まいまで）</Kana>
      <g transform="translate(250 58)">
        <g className="gd-dice-b"><Die size={30} value={4} /></g>
        <Die size={30} value={3} />
      </g>
      <Kana x={266} y={104} size={10} fill={C.kin}>サイコロ 2こ！</Kana>
      <path d="M 170 66 Q 200 40 226 52" fill="none" stroke={C.kin} strokeWidth="1.4" strokeDasharray="4 4" />
      <Kana x={40} y={30} anchor="start" size={9}>ふだを タップ → 「つかう」</Kana>
    </>
  );
}

function Specialty() {
  const spots = [{ x: 60, y: 60 }, { x: 118, y: 44 }, { x: 104, y: 104 }];
  return (
    <>
      <path d="M 26 70 C 20 34 70 18 120 22 C 168 26 186 58 172 92 C 160 124 110 136 66 126 C 36 118 30 100 26 70 Z" fill="rgba(229,213,168,0.18)" stroke="rgba(241,216,147,0.55)" strokeWidth="1.5" strokeDasharray="5 4" />
      <Kana x={100} y={146} size={9}>おなじ ちほうの めいさん</Kana>
      {spots.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r={15} fill="#fbf6e8" stroke="rgba(154,111,36,0.6)" strokeWidth="1.4" />
          <circle cx={p.x} cy={p.y} r={15} fill="none" stroke={P1} strokeWidth="3.4" className="gd-fb gd-spec-own" style={delay(i * 0.9)} />
          <text x={p.x} y={p.y + 1} fontSize={14} fill="#7a5a2a" fontFamily={MINCHO} fontWeight={900} textAnchor="middle" dominantBaseline="central">名</text>
        </g>
      ))}
      <Seal x={244} y={58} text="顔役" kana="かおやく" size={50} className="gd-fb gd-stamp-late" />
      <g className="gd-late-pop">
        <Kana x={244} y={112} size={10} fill={C.washi}>ちほう どくせん</Kana>
        <Kana x={244} y={132} size={15} fill={C.kin}>{`×${SPECIALTY_ECONOMY.monopolyMul}`}</Kana>
      </g>
    </>
  );
}

function Binbo() {
  return (
    <>
      <path d="M 16 116 H 304" stroke={C.road} strokeWidth="3" strokeDasharray="6 5" />
      <g transform="translate(292 72)">
        <path d="M 0 0 V 42" stroke={C.washi} strokeWidth="2" />
        <path d="M 0 0 L 22 7 L 0 14 Z" fill={C.shu} />
      </g>
      <Kana x={284} y={140} size={8.5}>もくてきち</Kana>
      <g transform="translate(284 116)"><g className="gd-bb-a"><Pin color={P1} /></g></g>
      <g transform="translate(150 116)"><Pin color={P2} /></g>
      <g transform="translate(178 116)"><g className="gd-bb-c"><Pin color={P3} /></g></g>
      <Kana x={40} y={140} size={8.5} fill="#ef9a86" className="gd-bb-far">いちばん とおい</Kana>
      <g transform="translate(150 60)">
        <g className="gd-bb-god">
          <BinboFigure size={40} x={-17} y={-14} />
        </g>
      </g>
      <Kana x={150} y={24} size={9} fill={C.kin} className="gd-late-pop">すれちがうと うつる</Kana>
    </>
  );
}

const SEASON_COLORS = ['#f4a6b8', '#5cb85c', '#e8833a', '#7fa9cd'];
function Seasons() {
  // 3月を真上に置き、3か月ずつ 春（3〜5月）・夏・秋・冬
  const cx = 88;
  const cy = 80;
  const r = 50;
  const arc = (i: number) => {
    const a0 = ((i * 30 - 90) * Math.PI) / 180;
    const a1 = (((i + 1) * 30 - 90) * Math.PI) / 180;
    return `M ${cx + Math.cos(a0) * r} ${cy + Math.sin(a0) * r} A ${r} ${r} 0 0 1 ${cx + Math.cos(a1) * r} ${cy + Math.sin(a1) * r}`;
  };
  const labels = ['はる', 'なつ', 'あき', 'ふゆ'];
  return (
    <>
      {Array.from({ length: 12 }, (_, i) => (
        <path key={i} d={arc(i)} fill="none" stroke={SEASON_COLORS[Math.floor(i / 3)]} strokeWidth="11" opacity="0.85" />
      ))}
      {Array.from({ length: 12 }, (_, i) => {
        const a = ((i * 30 + 15 - 90) * Math.PI) / 180;
        return <text key={i} x={cx + Math.cos(a) * r} y={cy + Math.sin(a) * r + 3} fontSize={7} fill="#1a1510" fontWeight={700} textAnchor="middle">{((i + 2) % 12) + 1}</text>;
      })}
      <g transform={`translate(${cx} ${cy})`}>
        <g className="gd-season-hand">
          <path d="M 0 4 L 0 -38" stroke={C.washi} strokeWidth="2.4" strokeLinecap="round" />
          <circle r={4} fill={C.washi} />
        </g>
      </g>
      {labels.map((l, i) => (
        <Kana key={l} x={cx} y={cy + 26} size={10} fill={SEASON_COLORS[i]} className={`gd-season-lbl${i === 0 ? ' is-first' : ''}`} style={delay(i * 2)}>{l}</Kana>
      ))}
      <Kana x={cx} y={152} size={9}>1かげつごとに ぎょうじ</Kana>
      {/* 観光と商業の収入 */}
      <g>
        <rect x={196} y={30} width={26} height={90} rx={3} fill="rgba(0,0,0,0.3)" />
        <rect x={198} y={32} width={22} height={86} rx={2} fill="#e8833a" className="gd-fb-b gd-season-tour" />
        <rect x={250} y={30} width={26} height={90} rx={3} fill="rgba(0,0,0,0.3)" />
        <rect x={252} y={32} width={22} height={86} rx={2} fill={C.ai} className="gd-fb-b gd-season-com" />
        <Kana x={209} y={136} size={8.5}>かんこう</Kana>
        <Kana x={263} y={136} size={8.5}>しょうぎょう</Kana>
        <Kana x={236} y={152} size={9} fill={C.kin}>しゅうにゅうが かわる</Kana>
      </g>
    </>
  );
}

function YearEnd() {
  const bars = [{ x: 58, h: 88, c: P1 }, { x: 116, h: 60, c: P2 }, { x: 174, h: 40, c: P3 }];
  return (
    <>
      <text x={264} y={38} fontSize={24} fill={C.washi} fontFamily={MINCHO} fontWeight={900} textAnchor="middle">3月</text>
      <Kana x={264} y={53} size={9}>さんがつ</Kana>
      <Kana x={264} y={76} size={11} fill={C.kin}>だいけっさん</Kana>
      <Kana x={264} y={94} size={9}>ばんづけ と しょうごう</Kana>
      <path d="M 30 132 H 212" stroke="rgba(244,236,216,0.4)" />
      {bars.map((b, i) => (
        <g key={b.x}>
          <rect x={b.x - 17} y={132 - b.h} width={34} height={b.h} rx={3} fill={b.c} stroke="rgba(0,0,0,0.3)" className="gd-fb-b gd-ye-bar" style={delay(i * 0.25)} />
          <Kana x={b.x} y={148} size={9}>{`${i + 1}い`}</Kana>
        </g>
      ))}
      <Seal x={58} y={30} text="長者" kana="ちょうじゃ" size={38} className="gd-fb gd-stamp-late" />
      {[[70, '#f1d893'], [120, '#e34a33'], [160, '#7fa9cd'], [200, '#f1d893'], [96, '#5cb85c'], [140, '#f4a6b8']].map(([x, c], i) => (
        <rect key={i} x={x as number} y={6} width={4} height={7} fill={c as string} className="gd-confetti" style={{ ...delay(i * 0.3), '--dx': `${(i % 2 ? 1 : -1) * 10}px` } as CSSProperties} />
      ))}
      <Kana x={264} y={122} size={9} fill={C.kin}>さいごは そうしさんで</Kana>
      <Kana x={264} y={137} size={10} fill={C.kin}>しょうぶ！</Kana>
    </>
  );
}

/** 図解と、その一巡の長さ（秒）。CSS の --gd-cycle で各アニメの長さをそろえる */
const DIAGRAMS: Record<DiagramId, { draw: () => ReactNode; cycle: number }> = {
  'dice-move': { draw: DiceMove, cycle: 4.2 },
  fork: { draw: Fork, cycle: 4.6 },
  'fishing-flow': { draw: FishingFlow, cycle: 6 },
  gear: { draw: Gear, cycle: 4.8 },
  squares: { draw: Squares, cycle: 5 },
  'goal-score': { draw: GoalScore, cycle: 5 },
  destination: { draw: Destination, cycle: 5 },
  'build-grow': { draw: BuildGrow, cycle: 6 },
  demand: { draw: Demand, cycle: 4.5 },
  monopoly: { draw: Monopoly, cycle: 5 },
  cards: { draw: Cards, cycle: 5 },
  specialty: { draw: Specialty, cycle: 6 },
  binbo: { draw: Binbo, cycle: 6.5 },
  seasons: { draw: Seasons, cycle: 8 },
  yearend: { draw: YearEnd, cycle: 5 },
};

/** 図解（ページを開いている間だけ動く） */
export default function HowToDiagram({ id }: { id: DiagramId }) {
  const d = DIAGRAMS[id];
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="gd-diagram w-full h-auto block"
      style={{ '--gd-cycle': `${d.cycle}s` } as CSSProperties}
      aria-hidden="true"
    >
      {d.draw()}
    </svg>
  );
}
