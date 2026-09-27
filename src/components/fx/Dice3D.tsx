import type { CSSProperties } from 'react';
import { FACES, FACE_ROT, IDLE_ROT, PIPS, REST_TILT } from './diceFaces';
import { hash01 } from './prng';

interface Dice3DProps {
  /** 止まる出目（1〜6） */
  value: number;
  /** 何回目の振りか（0 = まだ振っていない） */
  rollId: number;
  rolling: boolean;
  durationMs: number;
  size?: number;
  onClick?: () => void;
  /** 複数個振るときの何個目か（回り方と止まる角度を少しずつ変える。0 はこれまでと同じ） */
  spinSeed?: number;
}

function Face({ value, half }: { value: number; half: number }) {
  const pips = PIPS[value] ?? [];
  const face = FACES.find(f => f.value === value);
  return (
    <div className="fx-dice-face" style={{ transform: face ? face.transform(half) : undefined }}>
      {Array.from({ length: 9 }, (_, cell) => (
        <div key={cell} className="flex items-center justify-center">
          {pips.includes(cell) && <span className={`fx-pip ${value === 1 ? 'is-one' : ''}`} />}
        </div>
      ))}
    </div>
  );
}

/** 和紙色の立方体サイコロ。振ると放り上げられ、転がって出目の面で止まる。 */
export default function Dice3D({ value, rollId, rolling, durationMs, size = 104, onClick, spinSeed = 0 }: Dice3DProps) {
  const half = size / 2;
  let rx = IDLE_ROT[0];
  let ry = IDLE_ROT[1];
  if (rollId > 0) {
    const [fx, fy] = FACE_ROT[value] ?? FACE_ROT[1];
    // 振るたびに回転数を変える（見た目だけ・決定論的）
    const kx = 2 + Math.floor(hash01(rollId, value, 1 + 16 * spinSeed) * 2);
    const ky = 2 + Math.floor(hash01(rollId, value, 2 + 16 * spinSeed) * 2);
    // 2個目以降は止まる向きを少しだけずらし、並んだサイコロが揃いすぎないようにする（±8°）
    const tilt = spinSeed ? (hash01(spinSeed, rollId, 3) - 0.5) * 16 : 0;
    rx = fx + REST_TILT[0] + 360 * kx * rollId;
    ry = fy + REST_TILT[1] + tilt + 360 * ky * rollId;
  }
  const idle = rollId === 0;

  return (
    <div className="fx-dice-stage" style={{ width: size * 1.6, height: size * 1.6 }}>
      <div
        className={`fx-dice-shadow ${rolling ? 'is-rolling' : ''}`}
        style={{ '--roll-ms': `${durationMs}ms`, bottom: size * 0.08 } as CSSProperties}
      />
      {/* 常に同じ要素で描く（切り替えると立方体が作り直され、転がる遷移が飛ぶため） */}
      <button
        type="button"
        onClick={onClick}
        disabled={!onClick}
        className="rounded-2xl enabled:cursor-pointer focus-visible:outline-2 focus-visible:outline-kin-300"
        aria-label={onClick ? 'サイコロを振る' : rollId > 0 && !rolling ? `出目 ${value}` : 'サイコロ'}
      >
        <div
          className={`fx-dice-hop ${rolling ? 'is-rolling' : idle ? 'is-idle' : ''}`}
          style={{ width: size, height: size, '--roll-ms': `${durationMs}ms` } as CSSProperties}
        >
          <div
            className="fx-dice"
            style={{
              transform: `rotateX(${rx}deg) rotateY(${ry}deg)`,
              transition: idle ? undefined : `transform ${durationMs}ms cubic-bezier(0.16, 0.6, 0.24, 1)`,
            }}
          >
            {/* 角のすき間を埋める芯 */}
            <div className="fx-dice-core" style={{ transform: 'rotateX(90deg)' }} />
            <div className="fx-dice-core" style={{ transform: 'rotateY(90deg)' }} />
            <div className="fx-dice-core" />
            {FACES.map(f => (
              <Face key={f.value} value={f.value} half={half} />
            ))}
          </div>
        </div>
      </button>
    </div>
  );
}
