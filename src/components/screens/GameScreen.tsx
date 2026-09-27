import { useState, useEffect, useCallback } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useGameStore, MAX_FISHING_PER_TURN } from '../../store/useGameStore';
import { MOVE_STEP_MS } from '../map/PlayerToken';
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
import CityOverlay from '../city/CityOverlay';
import CityEventOverlay from '../city/CityEventOverlay';
import CityReportOverlay from '../city/CityReportOverlay';
import CityYearEndOverlay from '../city/CityYearEndOverlay';
import CardPlayBar from '../city/CardPlayBar';
import BinboOverlay from '../city/BinboOverlay';
import BinboAttachToast from '../city/BinboAttachToast';
import { isTown, calendarLabel } from '../../game/city';
import TurnBanner from '../fx/TurnBanner';
import StepCountdown from '../fx/StepCountdown';
import ArrivalBanner from '../fx/ArrivalBanner';
import GoalCelebration from '../fx/GoalCelebration';
import CityToastCard from '../fx/CityToastCard';
import MiniDie from '../fx/MiniDie';
import { NODE_STAMP } from '../fx/nodeStyle';
import Button from '../shared/Button';
import Icon from '../shared/Icon';
import Ruby from '../shared/Ruby';

/** 駒が着いてからマスの処理に移るまでの間（到着の巻物と判子を見せる） */
const ARRIVAL_PAUSE_MS = 900;
/** ターン終了から次の手番までの間 */
const TURN_END_MS = 1200;
/** ゴールの祝いを見せる時間（タップで早送りできる） */
const GOAL_CELEBRATION_MS = 4200;

export default function GameScreen() {
  // 釣りミニゲーム中の高頻度更新(fishingState)で画面全体が再描画されないよう、必要な値だけ購読する
  const {
    turnPhase, players, currentPlayerIndex, nodeActionsThisTurn,
    setTurnPhase, executeNodeAction, endTurn, doActionAgain, rouletteResult,
    setScreen, endGame, lastMove, isCity, cityToast, dismissCityToast, pendingDiceCount, pendingDiceCap,
    binboToast, binboEvent, dismissBinboToast, acknowledgeBinboEvent, turn,
  } = useGameStore(useShallow(s => ({
    turn: s.turn,
    isCity: s.settings.mode === 'city',
    pendingDiceCount: s.pendingDiceCount,
    pendingDiceCap: s.pendingDiceCap,
    binboToast: s.cityBinboToast,
    binboEvent: s.cityBinboEvent,
    dismissBinboToast: s.dismissBinboToast,
    acknowledgeBinboEvent: s.acknowledgeBinboEvent,
    cityToast: s.cityToast,
    dismissCityToast: s.dismissCityToast,
    turnPhase: s.turnPhase,
    players: s.players,
    currentPlayerIndex: s.currentPlayerIndex,
    nodeActionsThisTurn: s.nodeActionsThisTurn,
    setTurnPhase: s.setTurnPhase,
    executeNodeAction: s.executeNodeAction,
    endTurn: s.endTurn,
    doActionAgain: s.doActionAgain,
    rouletteResult: s.rouletteResult,
    setScreen: s.setScreen,
    endGame: s.endGame,
    lastMove: s.lastMove,
  })));

  const [showEncyclopedia, setShowEncyclopedia] = useState(false);
  const [showCreel, setShowCreel] = useState(false);
  const [showInventory, setShowInventory] = useState(false);
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);

  const player = players[currentPlayerIndex];
  const node = NODE_MAP.get(player?.currentNode || '');

  // node_action: 駒が1マスずつ進む演出を待ってからアクション実行
  const moveSteps = lastMove && lastMove.playerIndex === currentPlayerIndex ? lastMove.path.length - 1 : 0;
  useEffect(() => {
    if (turnPhase === 'node_action') {
      const timer = setTimeout(() => executeNodeAction(), ARRIVAL_PAUSE_MS + moveSteps * MOVE_STEP_MS);
      return () => clearTimeout(timer);
    }
  }, [turnPhase, executeNodeAction, moveSteps]);

  // ゴール到達の祝い（釣り旅のみ）。この間は次の手番へ進むのを少し待つ
  const showGoal = turnPhase === 'turn_end' && node?.type === 'goal' && !!player?.hasFinished;

  // turn_end → 次のプレイヤーへ（手動ではなく少し待つ）。タップでの早送りと二重に進まないよう状態を確かめる
  const proceedTurnEnd = useCallback(() => {
    if (useGameStore.getState().turnPhase === 'turn_end') endTurn();
  }, [endTurn]);
  useEffect(() => {
    if (turnPhase === 'turn_end') {
      const timer = setTimeout(proceedTurnEnd, showGoal ? GOAL_CELEBRATION_MS : TURN_END_MS);
      return () => clearTimeout(timer);
    }
  }, [turnPhase, proceedTurnEnd, showGoal]);

  // 目的地到着などのお知らせは数秒で自動的に閉じる
  useEffect(() => {
    if (!cityToast) return;
    const t = setTimeout(() => dismissCityToast(), 4200);
    return () => clearTimeout(t);
  }, [cityToast, dismissCityToast]);

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

        {/* 手番のはじめに「〇〇の番」の帯が横切る */}
        {turnPhase === 'idle' && player && (
          <TurnBanner
            key={`${turn}-${currentPlayerIndex}`}
            name={player.name}
            color={player.color}
            sub={isCity ? `${calendarLabel(turn).year}年目 ${calendarLabel(turn).month}月` : `${turn}巡目`}
          />
        )}

        {turnPhase === 'path_selection' && (
          <div className="absolute top-2 left-1/2 z-20 animate-slide-in-down washi-card rounded-full pl-2 pr-4 py-1.5 shadow-xl flex items-center gap-2 text-sm font-bold font-mincho text-[#2a2118]" role="status">
            {rouletteResult ? <MiniDie value={rouletteResult} size={26} /> : null}
            <span><Ruby>光っているマスをタップ！</Ruby></span>
          </div>
        )}

        {/* 移動中は残りマスを数え、着いたら巻物＋判子で到着を知らせる */}
        {turnPhase === 'node_action' && node && (
          <>
            {moveSteps > 0 && <StepCountdown key={`cd-${lastMove?.seq ?? 0}`} steps={moveSteps} stepMs={MOVE_STEP_MS} />}
            <ArrivalBanner
              key={`ar-${lastMove?.seq ?? 0}`}
              name={node.name}
              glyph={isCity && isTown(node) && node.type !== 'capital' ? '町' : node.id === 'tokyo' || node.id === 'kyoto' ? '都' : NODE_STAMP[node.type].glyph}
              tone={NODE_STAMP[node.type].tone}
              label={isCity && isTown(node) ? 'まち' : NODE_STAMP[node.type].label}
              delayMs={moveSteps * MOVE_STEP_MS}
            />
          </>
        )}

        {/* === フローティング: サイコロボタン === */}
        {turnPhase === 'idle' && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 w-[calc(100%-2rem)] max-w-md flex flex-col items-center gap-2">
            {/* まちづくり: 振る前に使えるカード（急行・ぶっとび・牛歩・保険・地上げ） */}
            {isCity && !player?.isCpu && <CardPlayBar timing="before_roll" compact />}
            {isCity && pendingDiceCount > 1 && (
              <span className="text-xs font-bold text-kin-200 bg-ai-900/85 border border-kin-500/40 rounded-full px-3 py-0.5"><Ruby>サイコロ</Ruby>{pendingDiceCount}<Ruby>個で振る</Ruby></span>
            )}
            {isCity && pendingDiceCap !== null && (
              <span className="text-xs font-bold text-shu-200 bg-ai-900/85 border border-shu-500/40 rounded-full px-3 py-0.5"><Ruby>牛歩中</Ruby>：<Ruby>出目は</Ruby>{pendingDiceCap}<Ruby>まで</Ruby></span>
            )}
            <div className="w-full max-w-xs">
            <Button
              onClick={() => setTurnPhase('roulette')}
              variant="gold"
              size="lg"
              className="w-full shadow-2xl font-mincho tracking-widest"
            >
              <span className="inline-flex items-center justify-center gap-2"><Icon name="dice" size={20} /> <Ruby>サイコロを振る</Ruby></span>
            </Button>
            </div>
          </div>
        )}

        {/* === フローティング: アクション選択 === */}
        {turnPhase === 'action_choice' && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 w-[calc(100%-2rem)] max-w-xs space-y-2">
            <div className="fx-rise text-center text-xs text-washi/80 bg-ai-950/70 backdrop-blur-sm rounded-lg px-3 py-1.5 border border-kin-500/25 font-mincho">
              <span className="text-kin-300 font-bold"><Ruby>{node?.name || '???'}</Ruby></span> — <Ruby>何をする？</Ruby>
            </div>
            {isCity && isTown(node) && (
              <Button
                onClick={() => setTurnPhase('city')}
                variant="gold"
                size="md"
                className="w-full shadow-xl"
              >
                <Ruby>まちづくり（区画を見る）</Ruby>
              </Button>
            )}
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
          <SoundToggle />
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
      {turnPhase === 'city' && <CityOverlay />}
      {turnPhase === 'city_event' && <CityEventOverlay />}
      {turnPhase === 'city_report' && <CityReportOverlay />}
      {turnPhase === 'city_yearend' && <CityYearEndOverlay />}

      {/* 貧乏神: 月末の悪さ（決算の画面を閉じた後に見せる） */}
      {binboEvent && turnPhase !== 'city_report' && turnPhase !== 'city_yearend' && players[binboEvent.playerIndex] && (
        <BinboOverlay
          playerName={players[binboEvent.playerIndex].name}
          playerColor={players[binboEvent.playerIndex].color}
          kind={binboEvent.kind}
          message={binboEvent.message}
          great={binboEvent.great}
          moneyDelta={binboEvent.moneyDelta}
          targetColor={binboEvent.giveTo !== undefined ? players[binboEvent.giveTo]?.color : undefined}
          onClose={acknowledgeBinboEvent}
        />
      )}
      {/* 貧乏神: とりついた・移ったお知らせ（瓦版と重ならないよう、瓦版が消えてから出す） */}
      {binboToast && !cityToast && players[binboToast.playerIndex] && (
        <BinboAttachToast
          key={`binbo-${binboToast.seq}`}
          playerName={players[binboToast.playerIndex].name}
          playerColor={players[binboToast.playerIndex].color}
          great={binboToast.great}
          reason={binboToast.reason}
          fromName={binboToast.fromIndex !== undefined ? players[binboToast.fromIndex]?.name : undefined}
          seq={binboToast.seq}
          onDone={dismissBinboToast}
        />
      )}

      {/* まちづくり: 目的地到着などのお知らせ（瓦版） */}
      {cityToast && (
        <CityToastCard
          key={`toast-${cityToast.seq}`}
          title={cityToast.title}
          body={cityToast.body}
          seq={cityToast.seq}
          onDismiss={dismissCityToast}
        />
      )}

      {/* 休憩所（修理機能付き） */}
      {turnPhase === 'rest' && node && (
        <RestOverlay
          nodeName={node.name}
          onClose={() => setTurnPhase('action_choice')}
        />
      )}

      {/* ゴール到達の祝い（金箔・着順の判子・賞金の数え上げ） */}
      {showGoal && player && (
        <GoalCelebration
          playerName={player.name}
          color={player.color}
          order={player.finishOrder ?? 0}
          reward={GOAL_MONEY_REWARD[player.finishOrder ?? 0] ?? GOAL_MONEY_REWARD[GOAL_MONEY_REWARD.length - 1]}
          onContinue={proceedTurnEnd}
        />
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

/** ゲーム中の効果音 ON/OFF（タイトルと同じ設定を切り替える） */
function SoundToggle() {
  const soundEnabled = useSettingsStore(st => st.soundEnabled);
  const toggleSound = useSettingsStore(st => st.toggleSound);
  return (
    <button
      onClick={toggleSound}
      className="bg-ai-900/55 hover:bg-ai-700/70 backdrop-blur-sm border border-kin-500/35 rounded-full w-14 h-14 flex flex-col items-center justify-center text-washi transition cursor-pointer leading-none"
      title={soundEnabled ? '効果音を消す' : '効果音を鳴らす'}
      aria-label={soundEnabled ? '効果音を消す' : '効果音を鳴らす'}
      aria-pressed={soundEnabled}
    >
      <span className="text-lg" aria-hidden="true">{soundEnabled ? '♪' : '×'}</span>
      <span className="text-[10px] font-mincho mt-0.5">おと</span>
    </button>
  );
}
