import { useState, useEffect, useCallback, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useSettingsStore, useTempoScale } from '../../store/useSettingsStore';
import { useGameStore, MAX_FISHING_PER_TURN } from '../../store/useGameStore';
import {
  ARRIVAL_PAUSE_MS, AUTO_END_MS, CPU_SPEED_LABEL, GOAL_CELEBRATION_MS, MOVE_STEP_MS, TURN_END_MS,
  hasActionChoices, noticeDurationMs, scaled,
} from '../../game/tempo';
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
import { useReducedMotion } from '../fx/useReducedMotion';
import { binboSwapDelayMs } from '../map/binboDisplay';
import Button from '../shared/Button';
import Icon from '../shared/Icon';
import Ruby from '../shared/Ruby';
import GuideLayer from '../guide/GuideLayer';
import HowToPlayOverlay from '../guide/HowToPlayOverlay';
import { HowToButton } from '../guide/GuideButtons';

export default function GameScreen() {
  // 釣りミニゲーム中の高頻度更新(fishingState)で画面全体が再描画されないよう、必要な値だけ購読する
  const {
    turnPhase, players, currentPlayerIndex, nodeActionsThisTurn,
    setTurnPhase, executeNodeAction, endTurn, doActionAgain, rouletteResult,
    setScreen, endGame, lastMove, isCity, cityToast, dismissCityToast, pendingDiceCount, pendingDiceCap,
    binboToast, binboEvent, dismissBinboToast, acknowledgeBinboEvent, turn, noticeWaiting, skipMonthEnd, anyCpu,
  } = useGameStore(useShallow(s => ({
    turn: s.turn,
    noticeWaiting: s.noticeQueue.length,
    skipMonthEnd: s.skipMonthEnd,
    anyCpu: s.players.some(p => p.isCpu),
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
  // CPU の手番は速さの設定（と早送り）で間を縮める。人の手番は常に 1
  const scale = useTempoScale(!!player?.isCpu);
  const stepMs = scaled(MOVE_STEP_MS, scale);

  // node_action: 駒が1マスずつ進む演出を待ってからアクション実行
  const moveSteps = lastMove && lastMove.playerIndex === currentPlayerIndex ? lastMove.path.length - 1 : 0;
  useEffect(() => {
    if (turnPhase === 'node_action') {
      const timer = setTimeout(() => executeNodeAction(), scaled(ARRIVAL_PAUSE_MS, scale) + moveSteps * stepMs);
      return () => clearTimeout(timer);
    }
  }, [turnPhase, executeNodeAction, moveSteps, scale, stepMs]);

  // ゴール到達の祝い（釣り旅のみ）。この間は次の手番へ進むのを少し待つ
  const showGoal = turnPhase === 'turn_end' && node?.type === 'goal' && !!player?.hasFinished;

  // turn_end → 次のプレイヤーへ（手動ではなく少し待つ）。タップでの早送りと二重に進まないよう状態を確かめる
  const proceedTurnEnd = useCallback(() => {
    if (useGameStore.getState().turnPhase === 'turn_end') endTurn();
  }, [endTurn]);
  useEffect(() => {
    if (turnPhase === 'turn_end') {
      // CPU のゴールの祝いも速さに合わせて縮める（ただし着順と賞金が読めるよう2秒は見せる）
      const goalMs = scale < 1 ? Math.max(2000, scaled(GOAL_CELEBRATION_MS, scale)) : GOAL_CELEBRATION_MS;
      const timer = setTimeout(proceedTurnEnd, showGoal ? goalMs : scaled(TURN_END_MS, scale));
      return () => clearTimeout(timer);
    }
  }, [turnPhase, proceedTurnEnd, showGoal, scale]);

  // 瓦版のお知らせは順番待ち（ストアの noticeQueue）から1件ずつ出し、数秒で自動的に閉じる。
  // 後ろに待ちがあれば短く、CPU の手番なら速さに合わせる。本文が継ぎ足されたら（同じ見出しの続報）見せ直す
  const toastShown = useRef({ key: '', at: 0 });
  useEffect(() => {
    if (!cityToast) return;
    const key = `${cityToast.seq}|${cityToast.body}`;
    if (toastShown.current.key !== key) toastShown.current = { key, at: Date.now() };
    const left = noticeDurationMs('city', noticeWaiting, scale) - (Date.now() - toastShown.current.at);
    const t = setTimeout(() => dismissCityToast(), Math.max(0, left));
    return () => clearTimeout(t);
  }, [cityToast, noticeWaiting, scale, dismissCityToast]);

  // 貧乏神が「移った！」のお知らせは、地図の人形が移り先の駒に付け替わってから出す（binboSwapDelayMs と同じ待ち）。
  // 起点は移動の確定（lastMove.seq が変わった時）。順番待ちで遅れて出るときは、そのぶん待ちを減らす
  const reduced = useReducedMotion();
  const moveAt = useRef({ seq: -1, at: 0 });
  useEffect(() => {
    if (lastMove && moveAt.current.seq !== lastMove.seq) moveAt.current = { seq: lastMove.seq, at: Date.now() };
  }, [lastMove]);
  const [binboReadySeq, setBinboReadySeq] = useState(-1);
  const binboHolderNode = binboToast ? players[binboToast.playerIndex]?.currentNode : undefined;
  useEffect(() => {
    if (!binboToast) return;
    let wait = 0;
    const moved = lastMove && binboToast.reason === 'pass' && lastMove.playerIndex === binboToast.fromIndex;
    if (!reduced && moved && binboHolderNode) {
      const at = moveAt.current.seq === lastMove.seq ? moveAt.current.at : Date.now();
      wait = Math.max(0, at + binboSwapDelayMs(lastMove.path, binboHolderNode, stepMs) - Date.now());
    }
    const seq = binboToast.seq;
    const t = window.setTimeout(() => setBinboReadySeq(seq), wait);
    return () => clearTimeout(t);
    // 同じお知らせ（seq）の間は待ち直さない
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [binboToast?.seq]);

  // 現在のノードで再アクション可能か（店は出たら終わり。もう一度入り直す選択肢は出さない）
  const canDoActionAgain = (() => {
    if (!node) return false;
    if (node.type === 'fishing' || node.type === 'fishing_special') {
      return nodeActionsThisTurn < MAX_FISHING_PER_TURN;
    }
    return false;
  })();

  const actionLabel = canDoActionAgain ? `もう一度釣る (${nodeActionsThisTurn}/${MAX_FISHING_PER_TURN})` : '';

  // 「ターンを終了する」しか選べないときは押させずに終える（町の画面を開き直せる・もう一度釣れるときは選んでもらう）
  const autoEndTurn = turnPhase === 'action_choice' && !!player && !player.isCpu
    && !hasActionChoices({ isCity, inTown: isCity && isTown(node), fishingNode: canDoActionAgain, fishingLeft: canDoActionAgain });
  useEffect(() => {
    if (!autoEndTurn) return;
    const t = setTimeout(() => {
      if (useGameStore.getState().turnPhase === 'action_choice') setTurnPhase('turn_end');
    }, AUTO_END_MS);
    return () => clearTimeout(t);
  }, [autoEndTurn, setTurnPhase]);

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
            {moveSteps > 0 && <StepCountdown key={`cd-${lastMove?.seq ?? 0}`} steps={moveSteps} stepMs={stepMs} />}
            <ArrivalBanner
              key={`ar-${lastMove?.seq ?? 0}`}
              name={node.name}
              glyph={isCity && isTown(node) && node.type !== 'capital' ? '町' : node.id === 'tokyo' || node.id === 'kyoto' ? '都' : NODE_STAMP[node.type].glyph}
              tone={NODE_STAMP[node.type].tone}
              label={isCity && isTown(node) ? 'まち' : NODE_STAMP[node.type].label}
              delayMs={moveSteps * stepMs}
              lowered={!!player?.isCpu}
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
            <div className="w-full max-w-xs" data-guide="roll">
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
        {turnPhase === 'action_choice' && !autoEndTurn && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 w-[calc(100%-2rem)] max-w-xs space-y-2" data-guide="action-choice">
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
          {anyCpu && <CpuSpeedToggle />}
        </div>

        {/* 右サイドボタン群 */}
        <div className="absolute right-3 bottom-4 flex flex-col gap-2 z-20">
          <HowToButton mode={isCity ? 'city' : 'fishing'} />
          <button
            onClick={() => setShowInventory(true)}
            data-guide="side-tools"
            className="bg-ai-900/55 hover:bg-ai-700/70 backdrop-blur-sm border border-kin-500/35 rounded-full w-14 h-14 flex items-center justify-center text-washi transition cursor-pointer"
            title="道具箱"
            aria-label="道具箱を開く"
          >
            <Icon name="tacklebox" size={28} />
          </button>
          <button
            onClick={() => setShowCreel(true)}
            data-guide="side-tools"
            className="bg-ai-900/55 hover:bg-ai-700/70 backdrop-blur-sm border border-kin-500/35 rounded-full w-14 h-14 flex items-center justify-center text-washi transition cursor-pointer"
            title="魚籠"
            aria-label="魚籠を開く"
          >
            <Icon name="creel" size={28} />
          </button>
          <button
            onClick={() => setShowEncyclopedia(true)}
            data-guide="side-tools"
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

      {/* 月末の全画面が続くとき（決算・年度末の後に貧乏神の悪さ）: 次に何が出るかを知らせ、まとめて閉じられるようにする */}
      {(turnPhase === 'city_report' || turnPhase === 'city_yearend') && binboEvent && players[binboEvent.playerIndex] && (
        <div className="fixed top-2 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 whitespace-nowrap rounded-full bg-ai-900/90 border border-kin-500/40 pl-3 pr-1 py-1 text-xs text-washi font-mincho shadow-lg" role="status">
          <span><Ruby>このあと</Ruby>：<Ruby>{`${players[binboEvent.playerIndex].name}に貧乏神の悪さ`}</Ruby></span>
          <button type="button" onClick={skipMonthEnd} className="rounded-full border border-kin-400/60 bg-kin-500/20 px-2.5 py-0.5 text-kin-200 hover:bg-kin-500/35 cursor-pointer">
            <Ruby>まとめて閉じる</Ruby>
          </button>
        </div>
      )}

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
      {/* 貧乏神: とりついた・移ったお知らせ（順番待ちで瓦版とは重ならない。移ったときは人形が付け替わってから） */}
      {binboToast && binboReadySeq === binboToast.seq && !cityToast && players[binboToast.playerIndex] && (
        <BinboAttachToast
          key={`binbo-${binboToast.seq}`}
          playerName={players[binboToast.playerIndex].name}
          playerColor={players[binboToast.playerIndex].color}
          great={binboToast.great}
          reason={binboToast.reason}
          fromName={binboToast.fromIndex !== undefined ? players[binboToast.fromIndex]?.name : undefined}
          seq={binboToast.seq}
          durationMs={noticeDurationMs('binbo', noticeWaiting, scale)}
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

      {/* 案内役: 初めての場面の指差し案内と、遊び方の画面 */}
      {/* 魚籠・図鑑・道具箱を開いている間は案内を出さない（後ろの画面を指してしまう） */}
      {!(showEncyclopedia || showCreel || showInventory) && <GuideLayer />}
      <HowToPlayOverlay />

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

/** CPU の速さ（ゆっくり → ふつう → はやい）を押すたびに切り替える。CPU がいる対局だけ出す */
function CpuSpeedToggle() {
  const speed = useSettingsStore(st => st.cpuSpeed);
  const cycle = useSettingsStore(st => st.cycleCpuSpeed);
  const label = CPU_SPEED_LABEL[speed];
  return (
    <button
      onClick={cycle}
      data-guide="cpu-speed"
      className="bg-ai-900/55 hover:bg-ai-700/70 backdrop-blur-sm border border-kin-500/35 rounded-full w-14 h-14 flex flex-col items-center justify-center text-washi transition cursor-pointer leading-none"
      title={`CPU の速さ：${label}（押すと切り替え）`}
      aria-label={`CPU の速さ ${label}。押すと切り替え`}
    >
      <span className="text-[11px] tracking-tighter text-kin-300" aria-hidden="true">{speed === 'slow' ? '▶' : speed === 'normal' ? '▶▶' : '▶▶▶'}</span>
      <span className="text-[10px] font-mincho mt-1">{label}</span>
    </button>
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
