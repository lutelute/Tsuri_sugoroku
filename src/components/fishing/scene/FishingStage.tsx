// 釣りの舞台: 空・遠景・水面・水中を1枚の絵として重ねる（浮世絵ふうの平たい色面）。
// 絵は「水面の高さ」を原点にして組んであり、フェーズが伝える位置（StageAnchor）へ絵ごと上下に動く。
// 動かすのは CSS の transform と opacity だけ。React の再描画は場面が変わるときだけ。
import { memo, useContext, useId, useLayoutEffect, useMemo, useRef } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useGameStore } from '../../../store/useGameStore';
import { NODE_MAP } from '../../../data/boardNodes';
import { calendarLabel } from '../../../game/city';
import Backdrop from './Backdrops';
import { DEFAULT_SCENE, pickScene } from './sceneSpec';
import type { StageScene, StageSeason, StageWater } from './sceneSpec';
import { StageContext, useStage } from './stageContext';
import type { StageApi } from './stageContext';

/** 水中の光（めずらしい魚の気配） */
export type StageOmen = 'rare' | 'legendary' | 'mythical';

/** 波頭の周期（px）。CSS の um-cut-drift と揃える */
const WAVE_PERIOD = 240;
/** 波頭を並べる数（拡大なしで 2880px ぶん。どの画面幅でも足りる） */
const WAVE_COUNT = 12;

/** 北斎ふうの波頭（大小ひと組）を WAVE_COUNT 回つないだ輪郭。継ぎ目が出ないよう1本の線で描く */
function wavePath(): string {
  let d = 'M0 34';
  for (let i = 0; i < WAVE_COUNT; i++) {
    const o = i * WAVE_PERIOD;
    const p = (x: number, y: number) => `${o + x} ${y}`;
    d += ` C${p(18, 34)} ${p(30, 30)} ${p(44, 22)} C${p(52, 17)} ${p(64, 13)} ${p(78, 15)}`
      + ` C${p(72, 17)} ${p(68, 21)} ${p(69, 26)} C${p(80, 31)} ${p(100, 36)} ${p(120, 36)}`
      + ` C${p(140, 36)} ${p(152, 33)} ${p(164, 27)} C${p(171, 23)} ${p(181, 20)} ${p(192, 22)}`
      + ` C${p(187, 24)} ${p(184, 27)} ${p(185, 30)} C${p(196, 33)} ${p(218, 34)} ${p(240, 34)}`;
  }
  return `${d} L${WAVE_COUNT * WAVE_PERIOD} 56 L0 56 Z`;
}
const WAVE_D = wavePath();
const WAVE_INDEXES = Array.from({ length: WAVE_COUNT }, (_, i) => i);

/** 波頭の列（水面の切り口）。同じ形を横に流す（手前と奥の2枚） */
function CutStrip({ layer }: { layer: 'back' | 'front' }) {
  return (
    <div className={`um-cut um-cut-${layer}`}>
      <svg className="um-cut-svg" height="56" aria-hidden>
        <path className="um-cut-body" d={WAVE_D} />
        {WAVE_INDEXES.map(i => (
          <g key={i} className="um-cut-foam" transform={`translate(${i * WAVE_PERIOD} 0)`}>
            <path d="M38 26 C48 18 62 13 78 15" fill="none" strokeWidth="3" strokeLinecap="round" />
            <path d="M158 31 C168 24 180 20 192 22" fill="none" strokeWidth="2.4" strokeLinecap="round" />
            {layer === 'front' && (
              <>
                <circle cx="83" cy="12" r="1.8" stroke="none" />
                <circle cx="88" cy="17" r="1.3" stroke="none" />
                <circle cx="74" cy="20" r="1.4" stroke="none" />
                <circle cx="196" cy="19" r="1.4" stroke="none" />
                <circle cx="189" cy="26" r="1.1" stroke="none" />
              </>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}

/** すやり霞（横に流れる金の雲） */
function Kasumi({ variant }: { variant: 'a' | 'b' }) {
  return (
    <svg className={`um-kasumi um-kasumi-${variant}`} viewBox="0 0 300 40" aria-hidden>
      <rect x="42" y="2" width="216" height="9" rx="4.5" />
      <rect x="0" y="15.5" width="204" height="9" rx="4.5" />
      <rect x="92" y="29" width="208" height="9" rx="4.5" />
    </svg>
  );
}

/** 水中へ差しこむ光の筋 */
function Rays({ variant }: { variant: 'a' | 'b' }) {
  const id = `um-ray-${useId().replace(/:/g, '')}`;
  return (
    <svg className={`um-rays um-rays-${variant}`} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.14" stopColor="#fff" stopOpacity="0.2" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      {variant === 'a' ? (
        <g fill={`url(#${id})`}>
          <polygon points="15,0 21,0 9,100 -4,100" />
          <polygon points="53,0 57,0 50,100 43,100" />
          <polygon points="85,0 92,0 84,100 71,100" />
        </g>
      ) : (
        <g fill={`url(#${id})`}>
          <polygon points="33,0 36,0 27,100 21,100" />
          <polygon points="68,0 74,0 65,100 55,100" />
        </g>
      )}
    </svg>
  );
}

/** 遠くを横切る小魚の群れ */
function School() {
  return (
    <svg className="um-school" viewBox="0 0 150 50" aria-hidden>
      {[[10, 14], [38, 6], [44, 26], [72, 16], [80, 38], [108, 24], [116, 8]].map(([x, y]) => (
        <path key={`${x}-${y}`} transform={`translate(${x} ${y})`} d="M0 0 q7 -5 14 0 q-7 5 -14 0 Z M-5 -3.4 L0 0 L-5 3.4 Z" />
      ))}
    </svg>
  );
}

/** 水底（岩と砂）。南の海は珊瑚、川は小石を足す */
function Seabed({ water }: { water: StageWater }) {
  return (
    <svg className="um-seabed" viewBox="0 0 1200 180" preserveAspectRatio="xMidYMax slice" aria-hidden>
      <g className="um-rock2">
        <path d="M 0 180 L 0 118 C 40 98 92 94 132 112 C 162 88 224 82 262 108 C 302 126 332 152 352 180 Z" />
        <path d="M 752 180 C 776 138 830 114 882 122 C 922 98 984 96 1022 124 C 1062 110 1112 118 1142 140 C 1172 150 1190 164 1200 170 L 1200 180 Z" />
        <path d="M 470 180 C 486 158 520 150 552 158 C 580 150 612 160 626 180 Z" />
      </g>
      <path className="um-sand" d="M 0 180 L 0 168 C 180 156 380 166 600 160 C 820 154 1010 166 1200 158 L 1200 180 Z" />
      <g className="um-rock">
        <path d="M 372 180 C 384 152 416 140 448 148 C 478 138 508 152 518 180 Z" />
        <path d="M 0 180 L 0 148 C 30 138 72 142 98 160 C 112 168 120 176 122 180 Z" />
        <path d="M 1034 180 C 1046 156 1080 146 1112 152 C 1150 146 1184 156 1200 162 L 1200 180 Z" />
        <path d="M 690 180 C 696 168 714 162 730 166 C 744 164 756 172 760 180 Z" />
      </g>
      {water === 'south' && (
        <g className="um-coral" fill="none" strokeWidth="5" strokeLinecap="round">
          <path d="M 600 172 V 140 M 600 156 L 586 140 M 600 150 L 616 134 M 586 140 V 128 M 616 134 V 122 M 616 134 L 628 126" />
          <path d="M 920 170 V 146 M 920 158 L 908 146 M 920 154 L 934 142 M 908 146 V 136" opacity="0.8" />
          <path d="M 300 172 V 150 M 300 160 L 290 150 M 300 158 L 312 146" opacity="0.7" />
        </g>
      )}
      {water === 'river' && (
        <g className="um-rock2" opacity="0.9">
          {[[150, 172, 20, 8], [230, 170, 14, 6], [560, 168, 22, 8], [640, 172, 13, 6], [860, 166, 18, 7], [960, 172, 24, 8], [1100, 168, 16, 6]].map(([cx, cy, rx, ry]) => (
            <ellipse key={cx} cx={cx} cy={cy} rx={rx} ry={ry} />
          ))}
        </g>
      )}
    </svg>
  );
}

/** ゆれる海藻 */
function Kelp({ index }: { index: number }) {
  return (
    <svg className={`um-kelp um-kelp-${index}`} viewBox="0 0 40 120" aria-hidden>
      <path d="M 20 120 C 8 96 30 80 18 56 C 8 36 28 22 20 2 C 34 24 16 40 26 58 C 36 80 14 96 26 120 Z" />
      <path d="M 12 120 C 4 104 16 92 8 76 C 4 66 12 58 10 48 C 18 60 10 70 16 82 C 22 96 12 106 18 120 Z" opacity="0.7" />
    </svg>
  );
}

const SEASON_BITS: Record<StageSeason, number> = { spring: 5, summer: 0, autumn: 4, winter: 6 };

/** 季節の小物: 春の花びら・秋の葉・冬の雪（まちづくりの暦があるときだけ） */
function SeasonBits({ season }: { season: StageSeason }) {
  const n = SEASON_BITS[season];
  if (!n) return null;
  return (
    <div className={`um-bits um-bits-${season}`} aria-hidden>
      {Array.from({ length: n }, (_, i) => {
        const style = {
          left: `${8 + ((i * 53) % 84)}%`,
          animationDuration: `${9 + ((i * 7) % 5)}s`,
          animationDelay: `${-((i * 31) % 90) / 10}s`,
          '--um-dx': `calc(${(i % 2 ? -1 : 1) * (14 + (i * 9) % 22)} * var(--um-vw))`,
        } as CSSProperties;
        return <i key={i} style={style} />;
      })}
    </div>
  );
}

interface PaintingProps {
  scene: StageScene;
}

/** 絵の中身（場面が同じなら描き直さない） */
const StagePainting = memo(function StagePainting({ scene }: PaintingProps) {
  return (
    <>
      <div className="um-world">
        <div className="um-above">
          <div className="um-sky" />
          {scene.sky === 'night' && <div className="um-stars" />}
          <div className="um-orb" />
          <Kasumi variant="b" />
          <Backdrop base={scene.base} landmark={scene.landmark} />
          <Kasumi variant="a" />
          <div className="um-sea">
            <div className="um-sea-row um-sea-r1" />
            <div className="um-sea-row um-sea-r2" />
            <div className="um-sea-row um-sea-r3" />
            <div className="um-glint" />
          </div>
          {scene.season && <SeasonBits season={scene.season} />}
        </div>
        <div className="um-below">
          <div className="um-tint" />
          <Rays variant="a" />
          <Rays variant="b" />
          <div className="um-omen" />
          <School />
          <i className="um-bubble um-bubble-1" />
          <i className="um-bubble um-bubble-2" />
          <i className="um-bubble um-bubble-3" />
          <i className="um-bubble um-bubble-4" />
        </div>
        <CutStrip layer="back" />
        <CutStrip layer="front" />
      </div>
      <div className="um-floor">
        <div className="um-ground" />
        <div className="um-haze" />
        <Seabed water={scene.water} />
        <Kelp index={1} />
        <Kelp index={2} />
        <Kelp index={3} />
      </div>
      <div className="um-grain" />
    </>
  );
});

interface FishingStageProps {
  scene: StageScene;
  /** めずらしい魚がかかっているとき、水中を淡く光らせる */
  omen?: StageOmen | null;
  /** 仕掛けの深さ: 浅場は明るく、深場は暗い水 */
  depth?: 'shallow' | 'deep' | null;
  /** 釣果の札の間は波を止める */
  paused?: boolean;
  /** 全画面でなく、親の箱いっぱいに置く（イベントの釣り） */
  inline?: boolean;
  children?: ReactNode;
}

/** 釣りの舞台。子はこの絵の上に載り、StageAnchor で水面の位置を伝える。 */
export default function FishingStage({ scene, omen = null, depth = null, paused = false, inline = false, children }: FishingStageProps) {
  const paintRef = useRef<HTMLDivElement>(null);
  const api = useMemo<StageApi>(() => ({
    setView(surfaceY, floorY) {
      const el = paintRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      el.style.setProperty('--um-sy', `${Math.round(surfaceY - rect.top)}px`);
      el.style.setProperty('--um-fy', `${Math.round(floorY - rect.top)}px`);
      // 水面が画面の上のほうにある＝潜っている（水面のきらめきなど、沖の小物を引っこめる）
      el.dataset.view = surfaceY - rect.top < rect.height * 0.36 ? 'dive' : 'surface';
    },
  }), []);

  return (
    <div
      className={`um-stage ${inline ? 'is-inline' : ''}`}
      data-sky={scene.sky}
      data-water={scene.water}
      data-base={scene.base}
      data-omen={omen ?? undefined}
      data-depth={depth ?? undefined}
      data-paused={paused ? '' : undefined}
    >
      <div ref={paintRef} className="um-paint" aria-hidden>
        <StagePainting scene={scene} />
      </div>
      <StageContext.Provider value={api}>
        <div className="um-stage-ui">{children}</div>
      </StageContext.Provider>
    </div>
  );
}

/** 舞台の外で使われたとき（イベントの釣り）だけ、その場に舞台を敷く */
export function StageScope({ children }: { children: ReactNode }) {
  const stage = useContext(StageContext);
  if (stage) return <>{children}</>;
  return <PlaceStage>{children}</PlaceStage>;
}

/**
 * 手番の人が今いるマスの絵で舞台を敷く（親の箱いっぱい）。
 * 釣りの画面の外（イベントの釣り・祭りの名物釣りなど）から、同じ絵柄の背景として使える。
 * 子を渡さなければ、絵だけの背景になる。
 */
export function PlaceStage({ boat = false, children }: { boat?: boolean; children?: ReactNode }) {
  const { nodeId, turn, mode } = useGameStore(
    useShallow(s => ({ nodeId: s.players[s.currentPlayerIndex]?.currentNode ?? '', turn: s.turn, mode: s.settings.mode })),
  );
  const scene = useMemo(() => {
    const node = NODE_MAP.get(nodeId);
    if (!node) return DEFAULT_SCENE;
    return pickScene({ node, boat, mode, turn, month: mode === 'city' ? calendarLabel(turn).month : null });
  }, [nodeId, boat, mode, turn]);
  return <FishingStage scene={scene} inline>{children}</FishingStage>;
}

interface StageAnchorProps {
  /** 水面の位置（この要素の高さに対する割合 0〜1。負なら上にはみ出す＝水中だけを見せる） */
  surface: number;
  /** 水面の位置の微調整（px） */
  offset?: number;
  /** 水底の位置（割合。既定は下の辺） */
  floor?: number;
}

/**
 * 親の箱いっぱいに広がる見えない目印。この箱の中のどこを水面にしたいかを舞台へ伝える。
 * 箱の大きさが変わったら伝え直す（毎フレームは動かない）。
 */
export function StageAnchor({ surface, offset = 0, floor = 1 }: StageAnchorProps) {
  const ref = useRef<HTMLDivElement>(null);
  const stage = useStage();
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !stage) return;
    const update = () => {
      const r = el.getBoundingClientRect();
      if (r.height <= 0) return;
      stage.setView(r.top + r.height * surface + offset, r.top + r.height * floor);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener('resize', update);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', update);
    };
  }, [stage, surface, offset, floor]);
  return <div ref={ref} className="absolute inset-0 pointer-events-none" aria-hidden />;
}
