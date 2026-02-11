import { useState, useEffect } from 'react';
import { useGameStore, MAX_FISHING_PER_TURN } from '../../store/useGameStore';
import { NODE_MAP } from '../../data/boardNodes';
import JapanMap from '../map/JapanMap';
import AllPlayersBar from '../hud/AllPlayersBar';
import TurnIndicator from '../hud/TurnIndicator';
import RouletteOverlay from '../roulette/RouletteOverlay';
import FishingOverlay from '../fishing/FishingOverlay';
import ShopOverlay from '../shop/ShopOverlay';
import EventOverlay from '../event/EventOverlay';
import EncyclopediaOverlay from '../encyclopedia/EncyclopediaOverlay';
import CreelOverlay from '../creel/CreelOverlay';
import Button from '../shared/Button';

export default function GameScreen() {
  const {
    turnPhase, players, currentPlayerIndex, nodeActionsThisTurn,
    setTurnPhase, executeNodeAction, endTurn, doActionAgain, rouletteResult,
  } = useGameStore();

  const [showEncyclopedia, setShowEncyclopedia] = useState(false);
  const [showCreel, setShowCreel] = useState(false);

  const player = players[currentPlayerIndex];
  const node = NODE_MAP.get(player?.currentNode || '');

  // node_action: 到着演出後にアクション実行
  useEffect(() => {
    if (turnPhase === 'node_action') {
      const timer = setTimeout(() => executeNodeAction(), 600);
      return () => clearTimeout(timer);
    }
  }, [turnPhase, executeNodeAction]);

  // turn_end → 次のプレイヤーへ（手動ではなく少し待つ）
  useEffect(() => {
    if (turnPhase === 'turn_end') {
      const timer = setTimeout(() => endTurn(), 1200);
      return () => clearTimeout(timer);
    }
  }, [turnPhase, endTurn]);

  // 現在のノードで再アクション可能か
  const canDoActionAgain = (() => {
    if (!node) return false;
    if (node.type === 'fishing' || node.type === 'fishing_special') {
      return nodeActionsThisTurn < MAX_FISHING_PER_TURN;
    }
    if (node.type === 'shop') return true;
    return false;
  })();

  const actionLabel = (() => {
    if (!node) return '';
    if (node.type === 'fishing' || node.type === 'fishing_special') {
      return `もう一度釣る (${nodeActionsThisTurn}/${MAX_FISHING_PER_TURN})`;
    }
    if (node.type === 'shop') return 'もう一度ショップへ';
    return '';
  })();

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="shrink-0">
        <TurnIndicator />
      </div>

      {/* メインマップ */}
      <div className="flex-1 min-h-0 relative overflow-hidden">
        <JapanMap />

        {turnPhase === 'path_selection' && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-amber-600/90 px-4 py-2 rounded-lg text-sm font-bold z-20 animate-bounce shadow-lg">
            光っているマスをタップ！ (🎲{rouletteResult})
          </div>
        )}

        {turnPhase === 'node_action' && node && (
          <div className="absolute top-2 left-1/2 animate-slide-in-down bg-blue-600/90 px-4 py-2 rounded-lg text-sm z-20 shadow-lg flex items-center gap-2">
            <span className="animate-icon-pulse inline-block">📍</span>
            <span>{node.name} に到着！</span>
          </div>
        )}

        {/* クリールバッグボタン */}
        <button
          onClick={() => setShowCreel(true)}
          className="absolute bottom-26 right-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-full w-10 h-10 flex items-center justify-center text-lg transition cursor-pointer z-20"
        >
          🎒
        </button>

        {/* 図鑑ボタン */}
        <button
          onClick={() => setShowEncyclopedia(true)}
          className="absolute bottom-14 right-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-full w-10 h-10 flex items-center justify-center text-lg transition cursor-pointer z-20"
        >
          📖
        </button>
      </div>

      {/* プレイヤーバー */}
      <div className="shrink-0">
        <AllPlayersBar />
      </div>

      {/* === 下部アクションエリア === */}

      {/* サイコロを振る */}
      {turnPhase === 'idle' && (
        <div className="p-3 bg-black/30">
          <Button
            onClick={() => setTurnPhase('roulette')}
            variant="gold"
            size="lg"
            className="w-full"
          >
            🎲 サイコロを振る
          </Button>
        </div>
      )}

      {/* アクション選択メニュー */}
      {turnPhase === 'action_choice' && (
        <div className="p-3 bg-black/40 backdrop-blur-sm space-y-2">
          <div className="text-center text-sm text-white/60 mb-1">
            📍 {node?.name || '???'} — 何をする？
          </div>
          {canDoActionAgain && (
            <Button
              onClick={doActionAgain}
              variant="primary"
              size="md"
              className="w-full"
            >
              {actionLabel}
            </Button>
          )}
          <Button
            onClick={() => setTurnPhase('turn_end')}
            variant="secondary"
            size="md"
            className="w-full"
          >
            ターンを終了する
          </Button>
        </div>
      )}

      {/* オーバーレイ */}
      {turnPhase === 'roulette' && <RouletteOverlay />}
      {turnPhase === 'fishing' && <FishingOverlay />}
      {turnPhase === 'shop' && <ShopOverlay />}
      {turnPhase === 'event' && <EventOverlay />}

      {/* 休憩メッセージ */}
      {turnPhase === 'rest' && node && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-gradient-to-b from-teal-900/80 to-teal-950/80 rounded-2xl border border-teal-500/20 p-8 text-center max-w-sm w-[90%]">
            <div className="text-5xl mb-4">🏖️</div>
            <h3 className="text-xl font-bold mb-2">{node.name}で休憩</h3>
            <p className="text-white/60 mb-4">ゆっくり休んで体力回復！¥500を獲得した！</p>
            <Button onClick={() => setTurnPhase('action_choice')} variant="primary" className="w-full">
              OK
            </Button>
          </div>
        </div>
      )}

      {/* ゴール到達メッセージ */}
      {turnPhase === 'turn_end' && node?.type === 'goal' && player?.hasFinished && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-gradient-to-b from-amber-900/80 to-amber-950/80 rounded-2xl border border-amber-500/20 p-8 text-center max-w-sm w-[90%]">
            <div className="text-5xl mb-4">🏁</div>
            <h3 className="text-xl font-bold mb-2">ゴール！</h3>
            <p className="text-white/60">{player.name}がゴールに到達した！</p>
          </div>
        </div>
      )}

      {/* 図鑑 */}
      {showEncyclopedia && (
        <EncyclopediaOverlay onClose={() => setShowEncyclopedia(false)} />
      )}

      {/* 釣果バッグ */}
      {showCreel && (
        <CreelOverlay onClose={() => setShowCreel(false)} />
      )}
    </div>
  );
}
