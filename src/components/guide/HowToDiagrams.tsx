// 遊び方の画面の「動く図解」。SVG と CSS のアニメ（index.css の gd- ブロック）で描く。
// - アニメはそのページを表示している間だけ動く（ページを離れると消える）。
// - 動きを減らす設定ではアニメを止める。止めたときに意味の通る絵（到着した後・建った後など）を素の状態にしてある。
// - 図の中の文字は SVG なのでふりがなが付けられない。漢字は記号（マスの字・判子）だけにして、ひらがなの札を添える。
import type { CSSProperties, ReactNode } from 'react';
import type { DiagramId } from './howToPages';
import { BuildingShapes } from '../city/BuildingGlyph';
import BinboFigure from '../city/BinboFigure';
import { HammerShapes } from '../city/RecoveryMark';
import { MayorCrestShape } from '../city/MayorCrest';
import { OrdinanceIcon } from '../city/OrdinanceCard';
import { ORDINANCE_KINDS } from '../../game/mayor';
import { PLAYER_COLORS } from '../../game/constants';
import { CITY_ECONOMY, RECOVERY } from '../../game/city';
import type { BuildingKind } from '../../game/city';
import { SPECIALTY_ECONOMY } from '../../game/citySpecialties';
import { TOWN_TRAITS } from '../../data/cityTraits';
import type { TownTraitId } from '../../data/cityTraits';
import { QUEST_ECONOMY, QUEST_GROUPS } from '../../game/cityQuests';
import { FISH_MARKET } from '../../game/fishMarket';
import { RIGS, RIG_ORDER } from '../../game/fishing';
import type { FishingRig } from '../../game/types';
import RigGlyph from '../fishing/RigGlyph';
import { VerdictMark } from '../city/BuildPreview';
import { ADVICE } from '../../game/cityAdvice';
import type { AdviceVerdict } from '../../game/cityAdvice';
import { CPU_PERSONAS } from '../../data/cpuPersonas';
import { CPU_STYLES } from '../../game/cpuAI';

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
function Building({ x, y, kind, level = 1, size = 34 }: { x: number; y: number; kind: BuildingKind; level?: number; size?: number }) {
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

/** おすすめの理由の札（番号つき）。warn は注意の札 */
function AdviceTag({ right, y, n, text, warn = false }: { right: number; y: number; n?: number; text: string; warn?: boolean }) {
  const w = (n ? 20 : 10) + text.length * 8.2;
  const x0 = right - w;
  return (
    <g>
      <rect x={x0} y={y - 7.5} width={w} height={15} rx={7.5} fill={warn ? '#a92e1d' : 'rgba(12,31,51,0.94)'} stroke={warn ? '#ef9a86' : C.kin} strokeWidth="1" />
      {n !== undefined && (
        <>
          <circle cx={x0 + 8} cy={y} r={5.2} fill={C.kin} />
          <text x={x0 + 8} y={y + 0.5} fontSize={7.5} fill="#3a2a0e" fontWeight={900} textAnchor="middle" dominantBaseline="central" fontFamily={SANS}>{n}</text>
        </>
      )}
      <text x={x0 + (n ? 16 : 5)} y={y + 0.5} fontSize={8} fill={warn ? '#fff' : C.kin} fontWeight={700} dominantBaseline="central" fontFamily={SANS}>{text}</text>
    </g>
  );
}

/**
 * 分かれ道: 光るマスのうち、おすすめには金の輪と番号・理由の札。下の金のボタンを押すと、いちばんのおすすめへ1回で進む。
 * city（まちづくり）では、買い物代のかかる行き先に注意の札も出す。
 */
function ForkAdvice({ city }: { city: boolean }) {
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
      <Sq x={270} y={44} glyph={city ? '町' : '店'} color={city ? '#2e5e8c' : '#d4a843'} />
      <Sq x={270} y={120} glyph={city ? '町' : '釣'} color="#2e5e8c" />
      {/* おすすめの金の輪（いちばんは太い輪）と、番号・理由の札 */}
      <circle cx={270} cy={120} r={16.5} fill="none" stroke={C.kin} strokeWidth="3" />
      <circle cx={270} cy={44} r={16} fill="none" stroke={C.kinD} strokeWidth="1.8" />
      <AdviceTag right={314} y={148} n={1} text={city ? 'もくてきちへ' : 'つりば'} />
      <AdviceTag right={300} y={18} n={2} text={city ? 'ちかい まち' : 'おみせ'} />
      {city && <AdviceTag right={300} y={71} text="！かいものだい" warn />}
      <Kana x={104} y={22} size={9}>ひかるマスを タップ</Kana>
      <g transform="translate(270 108)">
        <g className="gd-fk-tok"><Pin color={P1} /></g>
      </g>
      {/* 下の金のボタン: 1回押せば、いちばんのおすすめへ進む */}
      <g transform="translate(96 141)">
        <g className="gd-fb gd-fk-btn">
          <rect x={-84} y={-11} width={168} height={22} rx={8} fill={C.kinD} stroke={C.kin} strokeWidth="1.4" />
          <text y={3.4} fontSize={9.5} fill="#3a2a0e" fontFamily={SANS} fontWeight={800} textAnchor="middle">おすすめへ 1かいで すすむ</text>
        </g>
      </g>
      <g transform="translate(150 136)">
        <g className="gd-fb gd-fk-hand"><Hand /></g>
      </g>
    </>
  );
}
const Fork = () => <ForkAdvice city={false} />;
const PathAdvice = () => <ForkAdvice city />;

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
      {/* この町に足りないもの（町の画面に出る行） */}
      <Kana x={128} y={15} anchor="start" size={8} fill="rgba(244,236,216,0.75)">たりないもの</Kana>
      {[{ t: 'でんき', x: 196, w: 30 }, { t: 'こうえん', x: 234, w: 38 }].map(c => (
        <g key={c.t}>
          <rect x={c.x - c.w / 2} y={5.5} width={c.w} height={13} rx={6.5} fill="rgba(169,46,29,0.35)" stroke="rgba(239,154,134,0.7)" strokeWidth="0.9" />
          <Kana x={c.x} y={15} size={7.5}>{c.t}</Kana>
        </g>
      ))}
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

/** 災害と復興: 壊れた町 → 木槌（復興特需） → 安く建て直す。全壊の見舞金が飛ぶ */
function Recovery() {
  const off = Math.round((1 - RECOVERY.costMul) * 10);
  return (
    <>
      <path d="M 16 118 H 304" stroke="rgba(244,236,216,0.35)" />
      {/* 被災した建物（傾いてひびが入っている） */}
      <Seal x={30} y={32} text="災" kana="さいがい" size={34} />
      <g transform="rotate(-10 70 96)">
        <Building x={70} y={96} kind="res" level={2} size={46} />
      </g>
      <path d="M 64 78 l 6 8 l -4 6 l 7 9" stroke={C.sumi} strokeWidth="2" fill="none" />
      <Kana x={70} y={140} size={9} fill="#ef9a86">こわれた まち</Kana>
      {/* 見舞金（全壊した建物の持ち主へ） */}
      <g transform="translate(70 64)">
        <g className="gd-coin" style={{ '--dx': '0px', '--dy': '-26px' } as CSSProperties}>
          <circle r={8} fill={C.kin} stroke={C.kinD} strokeWidth="1.4" />
          <text y={3.4} fontSize={10} fontWeight={900} fill={C.sumi} textAnchor="middle" fontFamily={SANS}>¥</text>
        </g>
      </g>
      <Kana x={86} y={30} size={9} fill={C.kin} anchor="start" className="gd-late-pop">みまいきん</Kana>
      {/* 木槌 → 復興特需 */}
      <path d="M 106 86 H 138 M 132 81 L 138 86 L 132 91" stroke={C.road} strokeWidth="2.4" fill="none" />
      <g transform="translate(147 46) scale(1.6)">
        <g className="gd-fb gd-sq-pop">
          <HammerShapes />
        </g>
      </g>
      <Kana x={166} y={108} size={10} fill={C.kin}>ふっこうとくじゅ</Kana>
      <Kana x={166} y={122} size={9}>{`${RECOVERY.months}かげつ`}</Kana>
      {/* 新しい建物が安く建つ */}
      <path d="M 196 86 H 222 M 216 81 L 222 86 L 216 91" stroke={C.road} strokeWidth="2.4" fill="none" />
      <g className="gd-fb-b gd-late-pop">
        <Building x={258} y={94} kind="com" level={2} size={48} />
      </g>
      <Kana x={258} y={140} size={9} fill={C.kin} className="gd-late-pop">{`けんせつ ${off}わりびき`}</Kana>
    </>
  );
}


// ===== v6 で足した図解（仕掛け・釣り場の札・お題・町の特色・魚市場・鉄道） =====

/** 魚（左向き。原点は体の中ほど）。silhouette は影絵 */
function FishShape({ scale = 1, silhouette = false, fill = '#f1d893' }: { scale?: number; silhouette?: boolean; fill?: string }) {
  return (
    <g transform={`scale(${scale})`}>
      <path d="M -12 0 q 9 -9 20 -2 l 7 -5 v 12 l -7 -5 q -11 7 -20 0 z" fill={silhouette ? C.sumi : fill} stroke={silhouette ? 'none' : '#9a6f24'} strokeWidth="0.9" />
      {!silhouette && <circle cx={-7} cy={-1.5} r={1.2} fill={C.sumi} />}
    </g>
  );
}

/** 小判（¥）。原点が中心 */
function Coin({ r = 9 }: { r?: number }) {
  return (
    <>
      <circle r={r} fill={C.kin} stroke="#9a6f24" strokeWidth="1.2" />
      <text y={r * 0.4} fontSize={r * 1.1} fill="#7a5a2a" fontWeight={900} textAnchor="middle" fontFamily={SANS}>¥</text>
    </>
  );
}

/** 小さな旗（原点が竿の根元） */
function Flag() {
  return (
    <>
      <path d="M 0 0 V -20" stroke={C.washi} strokeWidth="1.8" />
      <path d="M 0 -20 L 13 -15.5 L 0 -11 Z" fill={C.shu} stroke="#fff" strokeWidth="0.6" />
    </>
  );
}

const RIG_KANA: Record<FishingRig, { name: string; note: string }> = {
  kazu: { name: 'かずねらい', note: 'こものが たくさん' },
  futsu: { name: 'ふつう', note: 'なにが かかるかな' },
  oomono: { name: 'おおものねらい', note: 'めずらしい さかな' },
};

/** 仕掛けを選ぶ: 3枚の札が順に光る。大物ねらいは2回ぶん。下に「雑魚は手早く」 */
function Rigs() {
  const w = 92;
  return (
    <>
      {RIG_ORDER.map((rig, i) => {
        const x = 10 + i * 104;
        const slots = RIGS[rig].slots;
        return (
          <g key={rig} className="gd-rg-step" style={delay(i * 2)}>
            <rect x={x} y={10} width={w} height={98} rx={9} fill="rgba(255,255,255,0.07)" stroke={C.kin} strokeWidth="1.3" />
            <g transform={`translate(${x + w / 2 - 22} 16)`}>
              <RigGlyph rig={rig} size={44} />
            </g>
            <Kana x={x + w / 2} y={74} size={10} fill={C.kin}>{RIG_KANA[rig].name}</Kana>
            <Kana x={x + w / 2} y={88} size={8}>{RIG_KANA[rig].note}</Kana>
            {/* 釣りの枠をいくつ使うか */}
            {Array.from({ length: slots }, (_, k) => (
              <circle key={k} cx={x + w / 2 - (slots - 1) * 5 + k * 10} cy={99} r={3} fill={C.kin} stroke="#9a6f24" strokeWidth="0.8" />
            ))}
          </g>
        );
      })}
      <Kana x={10 + 2 * 104 + w / 2} y={121} size={8} fill="rgba(244,236,216,0.7)">{`${RIGS.oomono.slots}かいぶん つかう`}</Kana>
      {/* 雑魚は手早く: 合わせただけで小物が跳ね上がる */}
      <path d="M 14 146 q 9 -5 18 0 t 18 0 t 18 0" fill="none" stroke="rgba(127,169,205,0.8)" strokeWidth="1.6" />
      <g transform="translate(40 132)">
        <g className="gd-fb gd-rg-quick"><FishShape scale={0.8} /></g>
      </g>
      <Kana x={76} y={140} anchor="start" size={9} fill={C.kin}>ざこは てばやく</Kana>
      <Kana x={76} y={153} anchor="start" size={8}>どうぐが そだつと あわせた だけで つれる</Kana>
    </>
  );
}

/** 釣り場の札: 種類の数と、まだ見ていない数。影絵の1つは釣ると姿が分かる */
function Spot() {
  const boxes = [
    { x: 30, cap: 'まだ みていない' },
    { x: 124, cap: 'まだ みていない' },
    { x: 218, cap: 'そだてると あえる' },
  ];
  return (
    <>
      <rect x={10} y={8} width={300} height={144} rx={10} fill="rgba(10,26,44,0.55)" stroke="rgba(241,216,147,0.45)" strokeWidth="1.2" />
      <Kana x={24} y={28} anchor="start" size={9}>この つりばの さかな</Kana>
      <Kana x={132} y={29} anchor="start" size={14} fill={C.kin}>12</Kana>
      <Kana x={152} y={28} anchor="start" size={8.5}>しゅるい</Kana>
      <Kana x={206} y={28} anchor="start" size={9}>みていない</Kana>
      <Kana x={262} y={29} anchor="start" size={14} fill={C.shu} className="gd-sp-old">5</Kana>
      <Kana x={262} y={29} anchor="start" size={14} fill={C.shu} className="gd-sp-new">4</Kana>
      {boxes.map((b, i) => (
        <g key={b.x} transform={`translate(${b.x} 40)`}>
          <g className="gd-fb gd-sq-pop" style={delay(i * 0.3)}>
            <rect width={72} height={84} rx={7} fill="#f4ecd8" stroke={i === 2 ? '#9a6f24' : 'rgba(154,111,36,0.5)'} strokeWidth={i === 2 ? 1.6 : 1} strokeDasharray={i === 2 ? '4 3' : undefined} />
            <text x={36} y={14} fontSize={7.5} fill="#6b5a3a" fontFamily={SANS} fontWeight={700} textAnchor="middle">{b.cap}</text>
            <g transform="translate(34 42)">
              {i === 0 ? (
                <>
                  <g className="gd-sp-sil"><FishShape scale={1.7} silhouette /></g>
                  <g className="gd-sp-fish"><FishShape scale={1.7} fill="#ef8a6a" /></g>
                </>
              ) : (
                <FishShape scale={i === 2 ? 2 : 1.5} silhouette />
              )}
            </g>
            {i === 0 ? (
              <>
                <text x={36} y={72} fontSize={9} fill={C.sumi} fontFamily={SANS} fontWeight={800} textAnchor="middle" className="gd-sp-old">？？？</text>
                <text x={36} y={72} fontSize={9} fill="#a92e1d" fontFamily={SANS} fontWeight={800} textAnchor="middle" className="gd-sp-new">つれた！</text>
              </>
            ) : (
              <text x={36} y={72} fontSize={i === 2 ? 8 : 9} fill={C.sumi} fontFamily={SANS} fontWeight={800} textAnchor="middle">{i === 2 ? 'いい どうぐで' : '？？？'}</text>
            )}
          </g>
        </g>
      ))}
      <Kana x={160} y={144} size={8.5} fill={C.kin}>かげえは まだ しらない さかな</Kana>
    </>
  );
}

const QUEST_ROWS = [
  { glyph: '建', w: 68, from: 0.2 },
  { glyph: '旗', w: 34, from: 0.1 },
  { glyph: '魚', w: 22, from: 0 },
];

/** お題と今年の舞台: 棒が伸びて「達成」の判子と賞金。舞台の地方が金に染まり、そこに目的地の旗が立つ */
function Quest() {
  return (
    <>
      <Kana x={12} y={20} anchor="start" size={9.5} fill={C.kin}>{`4がつに おだいが ${QUEST_GROUPS.length}つ`}</Kana>
      {QUEST_ROWS.map((r, i) => {
        const y = 44 + i * 30;
        return (
          <g key={r.glyph}>
            <rect x={12} y={y - 10} width={20} height={20} rx={4.5} fill="rgba(12,31,51,0.75)" stroke="rgba(241,216,147,0.5)" />
            {i === 0 && <rect x={12} y={y - 10} width={20} height={20} rx={4.5} fill={C.shu} stroke="rgba(255,240,230,0.85)" className="gd-q-done" />}
            <text x={22} y={y + 0.5} fontSize={12} fill={C.washi} fontFamily={MINCHO} fontWeight={900} textAnchor="middle" dominantBaseline="central">{r.glyph}</text>
            <rect x={40} y={y - 4} width={72} height={8} rx={4} fill="rgba(0,0,0,0.35)" stroke="rgba(241,216,147,0.3)" />
            <rect x={42} y={y - 2.5} width={r.w} height={5} rx={2.5} fill={i === 0 ? C.shu : C.kinD} className="gd-fb-l gd-q-bar" style={{ '--from': r.from } as CSSProperties} />
          </g>
        );
      })}
      <Seal x={138} y={44} text="達成" kana="たっせい" size={36} className="gd-fb gd-stamp-late" />
      {[[-16, -22], [14, -24], [22, 4]].map(([dx, dy], i) => (
        <circle key={i} cx={138} cy={44} r={4} fill={C.kin} stroke="#9a6f24" strokeWidth="1" className="gd-coin" style={{ '--dx': `${dx}px`, '--dy': `${dy}px` } as CSSProperties} />
      ))}
      <Kana x={12} y={134} anchor="start" size={9} fill={C.kin} className="gd-late-pop">{`さいしょの ひとは ×${QUEST_ECONOMY.firstMul}`}</Kana>
      <Kana x={12} y={150} anchor="start" size={8.5}>だれでも たっせい できる</Kana>
      {/* 今年の舞台（隣り合う2つの地方） */}
      <Kana x={244} y={20} size={9.5} fill={C.kin}>ことしの ぶたい</Kana>
      {[
        'M 262 34 C 286 30 304 44 300 62 C 296 76 280 80 266 76 C 256 72 252 50 262 34 Z',
        'M 226 66 C 244 60 262 70 266 82 C 270 98 252 108 236 104 C 222 100 216 78 226 66 Z',
        'M 186 100 C 204 94 222 102 226 116 C 228 130 212 138 198 134 C 184 130 176 110 186 100 Z',
      ].map((d, i) => (
        <g key={i}>
          <path d={d} fill="rgba(229,213,168,0.2)" stroke="rgba(241,216,147,0.45)" strokeWidth="1.2" />
          {i < 2 && <path d={d} fill="rgba(230,194,102,0.55)" stroke={C.kin} strokeWidth="2" className="gd-q-stage" />}
        </g>
      ))}
      <g transform="translate(244 92)"><g className="gd-fb-b gd-q-flag-a"><Flag /></g></g>
      <g transform="translate(278 62)"><g className="gd-fb-b gd-q-flag-b"><Flag /></g></g>
      <Kana x={244} y={150} size={9}>もくてきちが でやすい</Kana>
    </>
  );
}

const TRAIT_ORDER: TownTraitId[] = ['koto', 'joka', 'kowan', 'kogyo', 'yukiguni', 'yunomachi'];
const mulText = (v: number | undefined) => String(Number((v ?? 1).toFixed(2)));
const TRAIT_KANA: Record<TownTraitId, { name: string; effect: string }> = {
  koto: { name: 'こと・もんぜんまち', effect: `かんこう ×${mulText(TOWN_TRAITS.koto.incomeMul?.tourism)}` },
  joka: { name: 'じょうかまち', effect: 'おしろが めいしょに' },
  kowan: { name: 'こうわんとし', effect: `しょうぎょう ×${mulText(TOWN_TRAITS.kowan.incomeMul?.com)}` },
  kogyo: { name: 'こうぎょうちたい', effect: 'こうがいが すくない' },
  yukiguni: { name: 'ゆきぐに', effect: 'ふゆは じゅうたく ▼' },
  yunomachi: { name: 'ゆのまち', effect: 'ふゆは かんこう ▲' },
};

/** 町の特色: 6つの札が順に現れる（印と色は data/cityTraits.ts から） */
function Traits() {
  return (
    <>
      {TRAIT_ORDER.map((id, i) => {
        const t = TOWN_TRAITS[id];
        const x = 56 + (i % 3) * 104;
        const y = 34 + Math.floor(i / 3) * 74;
        return (
          <g key={id}>
            <g transform={`translate(${x} ${y})`}>
              <g className="gd-fb gd-sq-pop" style={delay(i * 0.35)}>
                <circle cy={1.5} r={17} fill="rgba(6,18,31,0.5)" />
                <circle r={17} fill={t.color} stroke={C.kin} strokeWidth="1.6" />
                <text y={0.5} fontSize={18} fill="#fff" fontFamily={MINCHO} fontWeight={900} textAnchor="middle" dominantBaseline="central">{t.mark}</text>
              </g>
            </g>
            <Kana x={x} y={y + 31} size={8.5} fill={C.kin}>{TRAIT_KANA[id].name}</Kana>
            <Kana x={x} y={y + 43} size={8}>{TRAIT_KANA[id].effect}</Kana>
          </g>
        );
      })}
    </>
  );
}

/** 魚市場: 商業地と漁港で小判が増える。工場の公害で減る。7月は釣り大会 */
function FishMarket() {
  return (
    <>
      <Kana x={14} y={20} anchor="start" size={9.5} fill={C.kin}>つった さかなを うる</Kana>
      <g transform="translate(36 58)"><FishShape scale={1.5} /></g>
      <path d="M 62 58 H 80 M 75 53 L 81 58 L 75 63" stroke={C.road} strokeWidth="2.2" fill="none" />
      {/* 売値の小判: はじめは1枚。商業地で2枚、漁港で3枚 */}
      <g transform="translate(98 58)"><Coin /></g>
      <g transform="translate(120 58)"><g className="gd-fb gd-fm-c2"><Coin /></g></g>
      <g transform="translate(142 58)"><g className="gd-fb gd-fm-c3"><Coin /></g></g>
      <g className="gd-fb-b gd-fm-b2"><Building x={92} y={104} kind="com" level={2} size={36} /></g>
      <g className="gd-fb-b gd-fm-b3"><Building x={130} y={104} kind="port" size={36} /></g>
      <Kana x={104} y={138} size={8.5}>しょうぎょうち と ぎょこう</Kana>
      <Kana x={104} y={151} size={9} fill={C.kin}>たかく うれる</Kana>
      {/* 工場の公害で漁場が荒れる */}
      <g className="gd-fb-b gd-fm-ind"><Building x={234} y={104} kind="ind" level={2} size={38} /></g>
      <g className="gd-fm-smoke">
        <circle cx={244} cy={80} r={5} fill="#b9ae9a" className="gd-fb gd-smoke" />
        <circle cx={244} cy={80} r={5} fill="#b9ae9a" className="gd-fb gd-smoke" style={delay(-1)} />
      </g>
      <g transform="translate(206 58)">
        <g className="gd-fm-down">
          <Coin r={8} />
          <path d="M 14 -5 V 5 M 10 1 L 14 6 L 18 1" stroke={C.shu} strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      </g>
      <Kana x={234} y={138} size={8.5} fill="#ef9a86">こうがいで あれると</Kana>
      <Kana x={234} y={151} size={9} fill="#ef9a86">やすくなる</Kana>
      {/* 7月は釣り大会 */}
      <Seal x={292} y={40} text="大会" kana="たいかい" size={36} className="gd-fb gd-stamp-late" />
      <Kana x={292} y={76} size={9} fill={C.kin} className="gd-late-pop">{`${FISH_MARKET.derbyMonth}がつ`}</Kana>
    </>
  );
}

/** 鉄道: 自分の建物がある町の隣の道に線路を敷く → 歩かずに通り抜ける → ほかの人が通ると運賃 */
function Rail() {
  const y = 112;
  const A = 40;
  const B = 280;
  const routes = [100, 160, 220];
  return (
    <>
      <Kana x={8} y={20} anchor="start" size={8.5}>じぶんの たてものが ある まち</Kana>
      <Plot x={A} y={54} size={34} owner={P1} />
      <Building x={A} y={54} kind="res" level={1} size={26} />
      <path d={`M ${A} ${y} H ${B}`} stroke={C.road} strokeWidth="3" strokeDasharray="6 5" />
      {routes.map(x => <Sq key={x} x={x} y={y} glyph="道" color="#8a6a3a" r={6.5} />)}
      {/* 線路（敷くと左から延びる） */}
      <g className="gd-fb-l gd-rl-rail">
        <line x1={54} y1={y} x2={266} y2={y} stroke="#14100c" strokeWidth="8" />
        <line x1={54} y1={y} x2={266} y2={y} stroke="#fbf6e8" strokeWidth="3.4" strokeDasharray="7 7" />
      </g>
      <Sq x={A} y={y} glyph="町" color="#2e5e8c" r={12} />
      <Sq x={B} y={y} glyph="町" color="#2e5e8c" r={12} />
      <g transform={`translate(${routes[0] + 2} ${y + 6})`}>
        <g className="gd-fb gd-rl-hand"><Hand /></g>
      </g>
      <Kana x={184} y={152} size={9} fill={C.kin}>となりの みちに しく</Kana>
      <Kana x={284} y={152} size={8} fill="rgba(244,236,216,0.65)">まいつき いじひ</Kana>
      {/* 自分の駒: 線路は歩数を使わずに通り抜ける（止まれない） */}
      <g transform={`translate(${B} ${y - 12})`}>
        <g className="gd-rl-me"><Pin color={P1} /></g>
      </g>
      <Kana x={166} y={62} size={9.5} fill={C.kin} className="gd-rl-lbl">あるかずに とおりぬける</Kana>
      {/* ほかの人が通ると、持ち主に運賃 */}
      <g transform={`translate(${A + 20} ${y - 12})`}>
        <g className="gd-rl-other"><Pin color={P2} scale={0.9} /></g>
      </g>
      <g transform={`translate(${B} 62)`}>
        <g className="gd-fb gd-rl-coin"><Coin /></g>
      </g>
      <Kana x={B} y={44} size={9} fill={C.kin} className="gd-rl-fare">うんちん</Kana>
    </>
  );
}


const ADVICE_ROWS: { verdict: AdviceVerdict; kind: BuildingKind; top: string; sub: string; bad?: boolean }[] = [
  { verdict: 'best', kind: 'res', top: 'つきに ＋¥', sub: `${ADVICE.bestMonths}かげつまでに もとが とれる` },
  { verdict: 'good', kind: 'com', top: 'つきに ＋¥', sub: `${ADVICE.goodMonths}かげつまでに もとが とれる` },
  { verdict: 'slow', kind: 'tourism', top: 'つきに ＋¥', sub: 'もとが とれるのは おそい' },
  { verdict: 'never', kind: 'ind', top: 'もうからない', sub: 'もとが とれない', bad: true },
];

/** 見込み札の読み方: 建てる物の札が順に現れ、◎の札を指で選ぶ。右に ♡（町の支え）と芽（育ちやすさ） */
function Advice() {
  return (
    <>
      {ADVICE_ROWS.map((r, i) => {
        const y = 8 + i * 30;
        return (
          <g key={r.verdict} className="gd-fb gd-ad-row" style={delay(i * 0.35)}>
            <rect x={8} y={y} width={190} height={26} rx={7} fill="rgba(12,31,51,0.75)" stroke={i === 0 ? C.kin : 'rgba(241,216,147,0.3)'} strokeWidth={i === 0 ? 1.6 : 1} />
            <g transform={`translate(13 ${y + 3})`}><VerdictMark verdict={r.verdict} size={20} /></g>
            <Building x={50} y={y + 13} kind={r.kind} level={1} size={22} />
            <Kana x={68} y={y + 11} anchor="start" size={8.5} fill={r.bad ? '#ef9a86' : '#6ee7b7'}>{r.top}</Kana>
            <Kana x={68} y={y + 22} anchor="start" size={7.5} fill={r.bad ? '#ef9a86' : C.washi}>{r.sub}</Kana>
          </g>
        );
      })}
      {/* いちばん良い物に「おすすめ」 */}
      <g transform="translate(170 16)">
        <g className="gd-fb gd-ad-pick">
          <rect x={-22} y={-7} width={44} height={14} rx={7} fill={C.kinD} />
          <text y={3.2} fontSize={8} fill="#3a2a0e" fontFamily={SANS} fontWeight={800} textAnchor="middle">おすすめ</text>
        </g>
      </g>
      <g transform="translate(120 28)">
        <g className="gd-fb gd-ad-hand"><Hand /></g>
      </g>
      <Kana x={103} y={140} size={9} fill={C.kin}>きんの「おすすめ」が いちばん とく</Kana>
      <Kana x={103} y={153} size={8}>◎は はやく もとが とれる</Kana>
      {/* ♡: 公園・発電所は、もうけは少なくても町の支え */}
      <g className="gd-late-pop">
        <g transform="translate(212 10)"><VerdictMark verdict="support" size={22} /></g>
        <Kana x={240} y={20} anchor="start" size={9} fill="#7fa9cd">まちの ささえ</Kana>
        <Building x={224} y={52} kind="park" size={26} />
        <Building x={256} y={52} kind="power" size={26} />
        <Kana x={262} y={78} size={7.5}>こうえん・はつでんしょ</Kana>
      </g>
      {/* 芽: 育ちやすさ（3つが最高） */}
      <g className="gd-late-pop">
        {[0, 1, 2].map(i => (
          <path
            key={i}
            transform={`translate(${218 + i * 16} 96) scale(1.5)`}
            d="M4.5 9.5 V4.5 M4.5 5 C4.5 2.6 2.8 1.2 0.8 1.2 C0.8 3.4 2.2 5 4.5 5 Z M4.5 6 C4.5 4.2 6 3 8.2 3 C8.2 4.9 6.8 6 4.5 6 Z"
            fill={i < 2 ? '#6ee7b7' : 'none'} stroke={i < 2 ? '#6ee7b7' : 'rgba(244,236,216,0.4)'} strokeWidth="0.9" strokeLinejoin="round" strokeLinecap="round"
          />
        ))}
        <Kana x={262} y={124} size={9} fill="#6ee7b7">そだちやすさ</Kana>
        <Kana x={262} y={137} size={7.5}>めが おおいほど そだつ</Kana>
      </g>
    </>
  );
}


const CPU_KANA: Record<string, { name: string; note: string }> = {
  omatsu: { name: 'おまつ', note: 'けんじつ' },
  gonzo: { name: 'ごんぞう', note: 'どくせん ねらい' },
  hayata: { name: 'はやた', note: 'もくてきちへ いそぐ' },
};

/** CPU の3人: 印の判子が順に現れ、上の札（思案中の札）に「いまの狙い」が出る */
function Cpu() {
  const people = CPU_STYLES.map((style, i) => ({ p: CPU_PERSONAS[style][0], color: PLAYER_COLORS[i + 1] ?? P2 }));
  const first = people[0];
  return (
    <>
      {people.map(({ p, color }, i) => {
        const x = 56 + i * 104;
        return (
          <g key={p.id}>
            <g transform={`translate(${x} 34)`}>
              <g className="gd-fb gd-sq-pop" style={delay(i * 0.4)}>
                <rect x={-18} y={-18} width={36} height={36} rx={8} fill={color} stroke="rgba(255,255,255,0.75)" strokeWidth="1.6" transform="rotate(-6)" />
                <text y={1} fontSize={21} fill="#fff" fontFamily={MINCHO} fontWeight={900} textAnchor="middle" dominantBaseline="central" transform="rotate(-6)" stroke="rgba(26,21,16,0.55)" strokeWidth="0.8" style={{ paintOrder: 'stroke' }}>{p.mark}</text>
              </g>
            </g>
            <Kana x={x} y={70} size={10} fill={C.kin}>{CPU_KANA[p.id]?.name ?? p.name}</Kana>
            <Kana x={x} y={83} size={8}>{CPU_KANA[p.id]?.note ?? ''}</Kana>
          </g>
        );
      })}
      {/* CPU の番に上に出る札: いまの狙いと、早送り */}
      <g className="gd-late-pop">
        <rect x={34} y={100} width={252} height={28} rx={14} fill="rgba(12,31,51,0.94)" stroke="rgba(241,216,147,0.55)" strokeWidth="1.2" />
        <rect x={42} y={105} width={18} height={18} rx={4.5} fill={first.color} stroke="rgba(255,255,255,0.7)" />
        <text x={51} y={114.5} fontSize={11} fill="#fff" fontFamily={MINCHO} fontWeight={900} textAnchor="middle" dominantBaseline="central">{first.p.mark}</text>
        <Kana x={66} y={118} anchor="start" size={9}>{`${CPU_KANA[first.p.id]?.name ?? first.p.name}：もくてきちへ むかう`}</Kana>
        <rect x={214} y={106} width={64} height={16} rx={8} fill="none" stroke="rgba(241,216,147,0.5)" />
        <Kana x={246} y={117.5} size={7.5} fill="rgba(244,236,216,0.8)">▶▶ はやおくり</Kana>
      </g>
      <Kana x={160} y={148} size={9} fill={C.kin} className="gd-late-pop">うえの ふだに「いまの ねらい」が でる</Kana>
    </>
  );
}

/** 図解と、その一巡の長さ（秒）。CSS の --gd-cycle で各アニメの長さをそろえる */
/** 町長と条例: 5区画のうち3つを建てると町長の家紋 → 条例の札が並ぶ */
function Mayor() {
  const xs = [30, 78, 126, 174, 222];
  const kinds = ['res', 'com', 'res', 'ind', 'res'] as const;
  return (
    <>
      {xs.map((x, i) => {
        const mine = i < 3;
        return (
          <g key={x}>
            <Plot x={x} y={48} size={42} owner={mine ? P1 : P2} />
            {mine ? (
              <g className="gd-fb gd-mono-b" style={delay(i * 0.45)}>
                <Building x={x} y={48} kind={kinds[i]} level={1} size={30} />
              </g>
            ) : (
              <Building x={x} y={48} kind={kinds[i]} level={1} size={30} />
            )}
          </g>
        );
      })}
      <Kana x={126} y={86} size={9}>くかくの はんぶんより おおく もつと</Kana>
      <g transform="translate(282 48)">
        <g className="gd-fb gd-stamp-late">
          <MayorCrestShape r={17} color={P1} />
        </g>
      </g>
      <Kana x={282} y={82} size={9} fill={C.kin} className="gd-late-pop">ちょうちょう</Kana>
      <g className="gd-late-pop">
        <Kana x={20} y={126} anchor="start" size={9}>じょうれい</Kana>
        <Kana x={252} y={126} anchor="start" size={8.5} fill={C.kin}>つきに 1かい</Kana>
        {ORDINANCE_KINDS.map((k, i) => (
          <g key={k} transform={`translate(${78 + i * 34} 112)`}>
            <OrdinanceIcon kind={k} size={26} />
          </g>
        ))}
        <Kana x={160} y={152} size={9} fill={C.washi}>ちょうぜい・かんこう しんこう … まちごと うごかす</Kana>
      </g>
    </>
  );
}

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
  recovery: { draw: Recovery, cycle: 5 },
  mayor: { draw: Mayor, cycle: 5 },
  rigs: { draw: Rigs, cycle: 6 },
  spot: { draw: Spot, cycle: 5.5 },
  quest: { draw: Quest, cycle: 6 },
  traits: { draw: Traits, cycle: 6 },
  'fish-market': { draw: FishMarket, cycle: 6.5 },
  rail: { draw: Rail, cycle: 7 },
  advice: { draw: Advice, cycle: 6 },
  'path-advice': { draw: PathAdvice, cycle: 4.6 },
  cpu: { draw: Cpu, cycle: 6 },
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
