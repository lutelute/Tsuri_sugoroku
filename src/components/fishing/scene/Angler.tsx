// 近景の釣り人（笠をかぶった後ろ姿）と、のべ竿・糸。
// 画面の右下に大きく置いて、近景（釣り人）・中景（水面）・遠景（山）の奥行きを作る。
import type { CSSProperties } from 'react';
import { useBoxSize } from './useBoxSize';

const clamp = (min: number, v: number, max: number) => Math.max(min, Math.min(max, v));

/** 釣り人の後ろ姿（笠・着物の背）。岩に腰かける。船釣りでは岩を描かない（船べりは BoatRail）。 */
export function AnglerFigure({ color, boat = false, className = '', style }: { color: string; boat?: boolean; className?: string; style?: CSSProperties }) {
  return (
    <svg className={`um-angler ${className}`} style={style} viewBox="0 0 200 220" aria-hidden>
      {!boat && (
        <>
          <path d="M 0 220 C 8 190 34 172 66 174 C 96 160 148 150 200 140 L 200 220 Z" fill="#081726" />
          <path d="M 4 206 C 14 186 38 176 66 176 C 98 163 150 153 200 143" fill="none" stroke="rgba(127,169,205,0.4)" strokeWidth="2" strokeLinecap="round" />
          <path d="M 30 220 C 36 204 52 198 70 202 M 150 220 C 152 204 168 196 186 198" fill="none" stroke="rgba(127,169,205,0.16)" strokeWidth="2" strokeLinecap="round" />
        </>
      )}
      {/* 着物の背（なで肩のひとつながりの形。両わきに袖のひだ） */}
      <path d="M 36 220 C 32 190 38 160 58 141 C 68 130 82 123 96 119 C 110 115 126 115 140 119 C 154 123 168 130 178 141 C 196 160 202 190 198 220 Z" fill={color} stroke="#0a1a2c" strokeWidth="3" strokeLinejoin="round" />
      <path d="M 120 116 C 150 118 176 134 186 152 C 198 174 201 198 198 220 L 120 220 Z" fill="rgba(10,26,44,0.22)" />
      <path d="M 70 142 C 60 164 58 192 60 220 M 166 142 C 176 164 178 192 176 220" fill="none" stroke="#0a1a2c" strokeOpacity="0.45" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M 44 214 C 42 192 48 170 60 154" fill="none" stroke="rgba(255,255,255,0.32)" strokeWidth="3" strokeLinecap="round" />
      {/* 襟 */}
      <path d="M 94 121 C 108 128 126 128 140 121" fill="none" stroke="#f4ecd8" strokeWidth="4.5" strokeLinecap="round" />
      {/* 背の紋（丸に魚） */}
      <circle cx="117" cy="168" r="15" fill="none" stroke="#f4ecd8" strokeWidth="2.6" opacity="0.9" />
      <path d="M 107 168 q 8 -8 16 0 q -8 8 -16 0 Z M 123 168 l 6 -5 v 10 Z" fill="#f4ecd8" opacity="0.9" />
      {/* 帯 */}
      <path d="M 62 200 C 94 208 142 208 174 200 L 175 212 C 142 220 94 220 61 212 Z" fill="#0a1a2c" opacity="0.5" />
      {/* 笠 */}
      <path d="M 116 50 L 186 116 C 168 133 66 133 46 116 Z" fill="#dcc89a" stroke="#3b2a1a" strokeWidth="2.6" strokeLinejoin="round" />
      <path d="M 116 50 L 186 116 C 176 126 150 131 124 131 Z" fill="rgba(58,42,26,0.2)" />
      <g fill="none" stroke="#8a6a34" strokeWidth="1.3" opacity="0.7">
        <path d="M 116 52 L 62 120" /><path d="M 116 52 L 88 127" /><path d="M 116 52 L 116 129" /><path d="M 116 52 L 144 127" /><path d="M 116 52 L 170 120" />
        <path d="M 100 70 C 110 74 122 74 132 70" /><path d="M 84 90 C 104 98 128 98 148 90" /><path d="M 66 108 C 98 121 134 121 166 108" />
      </g>
      <circle cx="116" cy="51" r="3.4" fill="#3b2a1a" />
      {/* 笠のあご紐（プレイヤーの色） */}
      <path d="M 170 119 l 7 20 l -9 -3 Z" fill={color} stroke="#0a1a2c" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}

/** 船べり（船釣りの近景）。画面の下いっぱいに、右上がりの板を渡す。 */
export function BoatRail() {
  return (
    <svg className="um-boatrail" viewBox="0 0 400 60" preserveAspectRatio="none" aria-hidden>
      <path d="M0 60 L0 36 C 110 26 260 16 400 4 L400 60 Z" fill="#553719" />
      <path d="M0 60 L0 50 C 110 42 260 34 400 24 L400 60 Z" fill="#3d2610" />
      <g fill="none" vectorEffect="non-scaling-stroke">
        <path d="M0 36 C 110 26 260 16 400 4" stroke="#d2a35a" strokeWidth="3.4" vectorEffect="non-scaling-stroke" />
        <path d="M0 43 C 110 34 260 25 400 14" stroke="#2a180a" strokeWidth="1.4" vectorEffect="non-scaling-stroke" opacity="0.7" />
        <path d="M0 50 C 110 42 260 34 400 24" stroke="#7a5326" strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
      </g>
      <g fill="#d2a35a">
        <circle cx="60" cy="38" r="1.6" /><circle cx="170" cy="28" r="1.6" /><circle cx="280" cy="19" r="1.6" /><circle cx="372" cy="11" r="1.6" />
      </g>
    </svg>
  );
}

export type RigState = 'cast' | 'idle' | 'bite' | 'hooked' | 'slack';

interface SurfaceRigProps {
  /** プレイヤーの色（着物） */
  color: string;
  boat?: boolean;
  /** cast=振って投げる / idle=待つ / bite=当たり（竿先が引きこまれる）/ hooked=掛かった（大きくしなる）/ slack=外れた */
  state: RigState;
  /** 浮きのある位置（この箱の高さに対する割合） */
  surface?: number;
  /** 糸を描くか（投げて着水するまでは描かない） */
  line?: boolean;
  /** 人物を小さめに（ミニゲームの窓の中） */
  compact?: boolean;
  /** 浮きを大きめに描いている箱（CSS の um-bob-lg と揃える） */
  bigBobber?: boolean;
}

/** 竿のしなり（0〜1）と竿先の引きこまれ方 */
const RIG_POSE: Record<RigState, { pull: number; bow: number }> = {
  cast: { pull: 0, bow: 0.06 },
  idle: { pull: 0, bow: 0.07 },
  bite: { pull: 0.5, bow: 0.15 },
  hooked: { pull: 0.85, bow: 0.22 },
  slack: { pull: -0.12, bow: 0.03 },
};

/**
 * 水面の場面の釣り人・竿・糸（親の箱いっぱいに重ねる）。
 * 竿は人物の陰から立ち上がり、竿先から浮きへ糸が垂れる。箱の大きさが変わったときだけ描き直す。
 */
export function SurfaceRig({ color, boat = false, state, surface = 0.56, line = true, compact = false, bigBobber = false }: SurfaceRigProps) {
  const [ref, box] = useBoxSize<HTMLDivElement>();
  let art = null;
  if (box && box.w > 0 && box.h > 0) {
    const { w, h, vmin } = box;
    const s = compact ? clamp(84, 0.27 * Math.min(w, h), 170) : clamp(118, 0.34 * Math.min(w, h), 236);
    // 浮きの大きさ（CSS の um-bobber / um-bob-lg と同じ式）
    const bob = bigBobber ? clamp(44, 0.08 * vmin, 66) : clamp(38, 0.07 * vmin, 60);
    const sy = h * surface;
    // 竿の根元（人物の陰）と、待っているときの竿先
    const bx = w - 0.42 * s;
    const by = h - 0.5 * s;
    const dx = clamp(compact ? 60 : 84, 0.2 * w, 240);
    const dy = clamp(compact ? 70 : 96, 0.24 * h, 240);
    const pose = RIG_POSE[state];
    const tx = Math.min(bx - 24, w / 2 + dx) - pose.pull * dx * 0.52;
    const ty = Math.min(by - 60, sy - dy) + pose.pull * dy * 0.72;
    const vx = tx - bx;
    const vy = ty - by;
    const len = Math.hypot(vx, vy) || 1;
    // 竿は根元からまっすぐ立ち、先だけが水面の方へしなる
    const cx = bx + vx * 0.52 + (-vy / len) * len * pose.bow;
    const cy = by + vy * 0.52 + (vx / len) * len * pose.bow;
    const rod = `M ${bx.toFixed(1)} ${by.toFixed(1)} Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${tx.toFixed(1)} ${ty.toFixed(1)}`;
    // 糸: 竿先から浮きの羽根へ。待つ間はたるみ、当たりで張る
    const sunk = state === 'bite' || state === 'hooked';
    const ex = w / 2;
    const ey = sy - bob + (sunk ? 24 : 2);
    const sag = sunk ? 0 : Math.hypot(ex - tx, ey - ty) * 0.16;
    const lineD = `M ${tx.toFixed(1)} ${ty.toFixed(1)} Q ${((tx + ex) / 2 + sag * 0.3).toFixed(1)} ${((ty + ey) / 2 + sag).toFixed(1)} ${ex.toFixed(1)} ${ey.toFixed(1)}`;
    art = (
      <>
        <svg className="absolute inset-0 w-full h-full" aria-hidden>
          {line && state !== 'slack' && (
            <path d={lineD} fill="none" stroke={state === 'hooked' ? '#f1d893' : 'rgba(244,236,216,0.82)'} strokeWidth={sunk ? 1.7 : 1.2} strokeLinecap="round" />
          )}
          <g
            className={state === 'cast' ? 'um-rod um-rod-cast' : 'um-rod'}
            style={{ transformOrigin: `${bx.toFixed(1)}px ${by.toFixed(1)}px` }}
            fill="none"
            strokeLinecap="round"
          >
            <path d={rod} stroke="#24170b" strokeWidth="3.4" />
            <path d={rod} stroke="#24170b" strokeWidth="6" pathLength={100} strokeDasharray="70 100" />
            <path d={rod} stroke="#24170b" strokeWidth="8.4" pathLength={100} strokeDasharray="40 100" />
            <path d={rod} stroke="#c9963c" strokeWidth="1.6" />
            <path d={rod} stroke="#c9963c" strokeWidth="3.8" pathLength={100} strokeDasharray="70 100" />
            <path d={rod} stroke="#c9963c" strokeWidth="6" pathLength={100} strokeDasharray="40 100" />
            <path d={rod} stroke="#f1d893" strokeWidth="1.2" pathLength={100} strokeDasharray="68 100" opacity="0.55" />
            <path d={rod} stroke="#3b2a1a" strokeWidth="6.4" pathLength={100} strokeDasharray="0.9 11.1" strokeDashoffset="-6" opacity="0.6" strokeLinecap="butt" />
          </g>
        </svg>
        <AnglerFigure color={color} boat={boat} style={{ width: s }} />
        {boat && <BoatRail />}
      </>
    );
  }
  return (
    <div ref={ref} className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
      {art}
    </div>
  );
}
