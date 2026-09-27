import { memo, useEffect, useState } from 'react';
import type { Player } from '../../game/types';
import { NODE_MAP } from '../../data/boardNodes';
import BinboFigure from '../city/BinboFigure';
import { playStep } from '../../utils/sound';
import { useTempoScale } from '../../store/useSettingsStore';
import { MOVE_STEP_MS, scaled } from '../../game/tempo';

/** 1マス進むのにかける時間（GameScreen の到着演出待ちと共有。CPU は速さの設定で縮む） */
export { MOVE_STEP_MS };

export interface MoveInfo {
  playerIndex: number;
  path: string[];
  seq: number;
}

interface PlayerTokenProps {
  player: Player;
  index: number;
  totalPlayers: number;
  isCurrent?: boolean;
  move: MoveInfo | null;
  /** 同じマスにいる駒の中での並び順 */
  stackIndex: number;
  stackSize: number;
  /** 貧乏神がとりついているか（大貧乏神なら 'great'） */
  binbo?: 'normal' | 'great' | null;
}

function PlayerTokenImpl({ player, index, isCurrent, move, stackIndex, stackSize, binbo }: PlayerTokenProps) {
  // 表示上の現在マス（移動中は経路に沿って1マスずつ進める）
  const [shownNode, setShownNode] = useState(player.currentNode);
  const stepMs = scaled(MOVE_STEP_MS, useTempoScale(!!player.isCpu));
  // 貧乏神がとりついた・移ってきた・大貧乏神になった瞬間だけ、人形を落として弾ませる（終わったら外す）
  const binboNow = binbo ?? null;
  const [prevBinbo, setPrevBinbo] = useState(binboNow);
  const [binboEntering, setBinboEntering] = useState(false);
  if (binboNow !== prevBinbo) {
    setPrevBinbo(binboNow);
    setBinboEntering(binboNow !== null);
  }

  useEffect(() => {
    const timers: number[] = [];
    const path = move && move.playerIndex === index ? move.path : null;
    if (path && path.length > 1 && path[path.length - 1] === player.currentNode) {
      path.slice(1).forEach((nid, i) => {
        timers.push(window.setTimeout(() => {
          setShownNode(nid);
          playStep();
        }, i * stepMs));
      });
    } else {
      timers.push(window.setTimeout(() => setShownNode(player.currentNode), 0));
    }
    return () => timers.forEach(t => clearTimeout(t));
    // move.seq が変わったとき（新しい移動）と currentNode が変わったときだけ再生
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player.currentNode, move?.seq]);

  const node = NODE_MAP.get(shownNode) ?? NODE_MAP.get(player.currentNode);
  if (!node) return null;

  const moving = shownNode !== player.currentNode;
  const offset = stackSize > 1 && !moving ? (stackIndex - (stackSize - 1) / 2) * 13 : 0;
  const x = node.x + 12 + offset;
  const y = node.y - 22;

  return (
    <g
      aria-hidden="true"
      style={{
        transform: `translate(${x}px, ${y}px)`,
        transition: `transform ${moving ? Math.max(40, stepMs - 20) : 450}ms ${moving ? 'linear' : 'ease-in-out'}`,
      }}
    >
      {/* 現在プレイヤーの強調オーラ（手番の頭に数回だけ脈打ち、以後は静止した輪。常時アニメで全体を描き直さない） */}
      {/* 地図に後から差し込む SMIL は文書の時計基準で始まり、数秒後には動かないため CSS アニメ（fx-token-pulse）で4回 */}
      {isCurrent && (
        <>
          <circle cx={0} cy={2} r={13} fill="none" stroke={player.color} strokeWidth="1.6" opacity="0.55" />
          <circle cx={0} cy={2} r={14} fill="none" stroke={player.color} strokeWidth="1.8" className="fx-token-pulse" />
        </>
      )}

      {/* 接地影 */}
      <ellipse cx={0} cy={18} rx={6.3} ry={2.1} fill="rgba(6,18,31,0.45)" />

      {/* 1マス進むごとに小さく跳ねる（key を変えてアニメを再生） */}
      <g key={moving ? shownNode : 'rest'} className={moving ? 'token-hop' : undefined}>
      {/* 取り憑いた貧乏神は自分のピンの真上に乗せる（隣の駒と見分けがつくよう中心を揃える） */}
      {/* 外の g は地図の LOD で拡大（引いた表示でも見える）、内の g はとりついた瞬間の落下 */}
      {binbo && (() => {
        const h = binbo === 'great' ? 26 : 22;
        return (
          <g className="token-binbo">
            <g className={binboEntering ? 'fx-binbo-in' : undefined} onAnimationEnd={() => setBinboEntering(false)}>
              <BinboFigure size={h} great={binbo === 'great'} x={-(h * 5) / 12} y={-12.5 - h} />
            </g>
          </g>
        );
      })()}

      {/* ピン本体（先端がマスを指す） */}
      <path
        d="M 0,18 L -6.6,1.8 A 8.7 8.7 0 1 1 6.6,1.8 Z"
        fill={player.color}
        stroke={isCurrent ? '#ffffff' : '#f1d893'}
        strokeWidth={isCurrent ? 2.2 : 1.65}
        strokeLinejoin="round"
      />
      <ellipse cx={-2.1} cy={-5.4} rx={3} ry={2.1} fill="#ffffff" opacity="0.35" />

      {/* 番号の白丸 */}
      <circle cx={0} cy={-3} r={5.1} fill="#fbf6e8" />
      <text
        x={0}
        y={-2.85}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="6.9"
        fill={player.color}
        fontWeight="bold"
        fontFamily='"Shippori Mincho", serif'
        className="pointer-events-none select-none"
      >
        {player.id + 1}
      </text>
      </g>
    </g>
  );
}

const PlayerToken = memo(PlayerTokenImpl);
export default PlayerToken;
