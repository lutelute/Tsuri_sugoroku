import { useState, useEffect } from 'react';
import { useGameStore, MAX_FISHING_PER_TURN } from '../../store/useGameStore';
import { NODE_MAP } from '../../data/boardNodes';
import { GOAL_MONEY_REWARD } from '../../game/constants';
import JapanMap from '../map/JapanMap';
import AllPlayersBar from '../hud/AllPlayersBar';
import TurnIndicator from '../hud/TurnIndicator';
import RouletteOverlay from '../roulette/RouletteOverlay';
import FishingChoiceOverlay from '../fishing/FishingChoiceOverlay';
import FishingOverlay from '../fishing/FishingOverlay';
import ShopOverlay from '../shop/ShopOverlay';
import EventOverlay from '../event/EventOverlay';
import EncyclopediaOverlay from '../encyclopedia/EncyclopediaOverlay';
import CreelOverlay from '../creel/CreelOverlay';
import InventoryPanel from '../inventory/InventoryPanel';
import RestOverlay from '../rest/RestOverlay';
import CapitalEventOverlay from '../capital/CapitalEventOverlay';
import DevPanel from '../dev/DevPanel';
import Button from '../shared/Button';
import Icon from '../shared/Icon';
import Ruby from '../shared/Ruby';

export default function GameScreen() {
  const {
    turnPhase, players, currentPlayerIndex, nodeActionsThisTurn,
    setTurnPhase, executeNodeAction, endTurn, doActionAgain, rouletteResult,
    setScreen, endGame,
  } = useGameStore();

  const [showEncyclopedia, setShowEncyclopedia] = useState(false);
  const [showCreel, setShowCreel] = useState(false);
  const [showInventory, setShowInventory] = useState(false);
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);

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

      {/* メインマップ + フローティングUI */}
      <div className="flex-1 min-h-0 relative overflow-hidden">
        <JapanMap />

        {turnPhase === 'path_selection' && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-amber-600/90 px-4 py-2 rounded-lg text-sm font-bold z-20 animate-bounce shadow-lg">
            <Ruby>光っているマスをタップ！</Ruby> (🎲{rouletteResult})
          </div>
        )}

        {turnPhase === 'node_action' && node && (
          <div className="absolute top-2 left-1/2 animate-slide-in-down bg-blue-600/90 px-4 py-2 rounded-lg text-sm z-20 shadow-lg flex items-center gap-2">
            <span className="animate-icon-pulse inline-block">📍</span>
            <span><Ruby>{node.name}</Ruby> <Ruby>に到着！</Ruby></span>
          </div>
        )}

        {/* === フローティング: サイコロボタン === */}
        {turnPhase === 'idle' && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 w-[calc(100%-2rem)] max-w-xs">
            <Button
              onClick={() => setTurnPhase('roulette')}
              variant="gold"
              size="lg"
              className="w-full shadow-2xl font-mincho tracking-widest"
            >
              <span className="inline-flex items-center justify-center gap-2"><Icon name="dice" size={20} /> <Ruby>サイコロを振る</Ruby></span>
            </Button>
          </div>
        )}

        {/* === フローティング: アクション選択 === */}
        {turnPhase === 'action_choice' && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 w-[calc(100%-2rem)] max-w-xs space-y-2">
            <div className="text-center text-xs text-white/70 bg-black/50 backdrop-blur-sm rounded-lg px-3 py-1.5">
              📍 <Ruby>{node?.name || '???'}</Ruby> — <Ruby>何をする？</Ruby>
            </div>
            {canDoActionAgain && (
              <Button
                onClick={doActionAgain}
                variant="primary"
                size="md"
                className="w-full shadow-xl"
              >
                <Ruby>{actionLabel}</Ruby>
              </Button>
            )}
            <Button
              onClick={() => setTurnPhase('turn_end')}
              variant="secondary"
              size="md"
              className="w-full shadow-xl"
            >
              <Ruby>ターンを終了する</Ruby>
            </Button>
          </div>
        )}

        {/* 左上: メニュー（タイトルに戻る / ゲーム終了） */}
        <div className="absolute left-3 top-2 flex flex-col gap-2 z-20">
          <button
            onClick={() => setScreen('title')}
            className="bg-ai-900/55 hover:bg-ai-700/70 backdrop-blur-sm border border-kin-500/35 rounded-full w-14 h-14 flex items-center justify-center text-washi transition cursor-pointer"
            title="タイトルに戻る（中断保存）"
            aria-label="タイトルに戻る"
          >
            <Icon name="home" size={26} />
          </button>
          <button
            onClick={() => setShowQuitConfirm(true)}
            className="bg-ai-900/55 hover:bg-shu-700/60 backdrop-blur-sm border border-shu-500/40 rounded-full w-14 h-14 flex items-center justify-center text-shu-200 transition cursor-pointer"
            title="ここで終了して結果を見る"
            aria-label="ここで終了して結果を見る"
          >
            <Icon name="trophy" size={26} />
          </button>
        </div>

        {/* 右サイドボタン群 */}
        <div className="absolute right-3 bottom-4 flex flex-col gap-2 z-20">
          <button
            onClick={() => setShowInventory(true)}
            className="bg-ai-900/55 hover:bg-ai-700/70 backdrop-blur-sm border border-kin-500/35 rounded-full w-14 h-14 flex items-center justify-center text-washi transition cursor-pointer"
            title="道具箱"
            aria-label="道具箱を開く"
          >
            <Icon name="tacklebox" size={28} />
          </button>
          <button
            onClick={() => setShowCreel(true)}
            className="bg-ai-900/55 hover:bg-ai-700/70 backdrop-blur-sm border border-kin-500/35 rounded-full w-14 h-14 flex items-center justify-center text-washi transition cursor-pointer"
            title="魚籠"
            aria-label="魚籠を開く"
          >
            <Icon name="creel" size={28} />
          </button>
          <button
            onClick={() => setShowEncyclopedia(true)}
            className="bg-ai-900/55 hover:bg-ai-700/70 backdrop-blur-sm border border-kin-500/35 rounded-full w-14 h-14 flex items-center justify-center text-washi transition cursor-pointer"
            title="図鑑"
            aria-label="魚図鑑を開く"
          >
            <Icon name="book" size={28} />
          </button>
        </div>
      </div>

      {/* プレイヤーバー */}
      <div className="shrink-0">
        <AllPlayersBar />
      </div>

      {/* オーバーレイ */}
      {turnPhase === 'roulette' && <RouletteOverlay />}
      {turnPhase === 'fishing_choice' && <FishingChoiceOverlay />}
      {turnPhase === 'fishing' && <FishingOverlay />}
      {turnPhase === 'shop' && <ShopOverlay />}
      {turnPhase === 'event' && <EventOverlay />}
      {turnPhase === 'capital_event' && <CapitalEventOverlay />}

      {/* 休憩所（修理機能付き） */}
      {turnPhase === 'rest' && node && (
        <RestOverlay
          nodeName={node.name}
          onClose={() => setTurnPhase('action_choice')}
        />
      )}

      {/* ゴール到達メッセージ */}
      {turnPhase === 'turn_end' && node?.type === 'goal' && player?.hasFinished && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-gradient-to-b from-amber-900/80 to-amber-950/80 rounded-2xl border border-amber-500/20 p-8 text-center max-w-sm w-[90%]">
            <div className="text-5xl mb-4">🏁</div>
            <h3 className="text-xl font-bold mb-2">ゴール！</h3>
            <p className="text-white/60 mb-3">{player.name}が<Ruby>ゴールに到達した！</Ruby></p>
            <p className="text-amber-300 font-bold text-lg">
              <Ruby>賞金</Ruby> ¥{(GOAL_MONEY_REWARD[player.finishOrder ?? 0] ?? GOAL_MONEY_REWARD[GOAL_MONEY_REWARD.length - 1]).toLocaleString()} <Ruby>獲得！</Ruby>
            </p>
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

      {/* インベントリ */}
      {showInventory && (
        <InventoryPanel onClose={() => setShowInventory(false)} />
      )}

      {/* 開発用チートパネル（DEVビルドのみ） */}
      {import.meta.env.DEV && <DevPanel />}

      {/* 途中終了の確認ダイアログ */}
      {showQuitConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowQuitConfirm(false)} />
          <div className="panel-ai relative rounded-2xl border-shu-500/40 shadow-2xl p-6 w-[85%] max-w-sm">
            <h3 className="font-mincho text-lg font-bold text-shu-300 mb-2 flex items-center gap-2">
              <Icon name="trophy" size={20} className="text-shu-400" />
              <Ruby>ここで終了しますか？</Ruby>
            </h3>
            <p className="text-sm text-washi/70 mb-1">
              <Ruby>ゴール前でも現在の釣果で結果画面に進みます。</Ruby>
            </p>
            <p className="text-xs text-washi/45 mb-4">
              <Ruby>図鑑・装備・所持金は通常どおり保存されます。</Ruby>
            </p>
            <div className="flex gap-3">
              <Button
                onClick={() => setShowQuitConfirm(false)}
                variant="secondary"
                className="flex-1"
              >
                <Ruby>続ける</Ruby>
              </Button>
              <Button
                onClick={() => { setShowQuitConfirm(false); endGame(); }}
                variant="danger"
                className="flex-1"
              >
                <Ruby>終了する</Ruby>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
