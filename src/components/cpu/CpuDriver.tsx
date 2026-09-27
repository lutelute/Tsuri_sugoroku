// CPU の手番を自動で進める制御部品。現在のプレイヤーが CPU のとき、ターンの段階ごとに1手ずつ実行する（1手の中身は cpuStep.ts）。
// 何をしたかは通常の画面（地図・オーバーレイ・お知らせ）にそのまま映る。人が誤って操作しないよう薄い覆いを掛ける。
// 覆いをタップすると、その CPU の手番（と続く CPU の手番）を早送りする。人の手番になったら元の速さに戻る。
import { useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useGameStore, MAX_FISHING_PER_TURN } from '../../store/useGameStore';
import { useSettingsStore, useTempoScale } from '../../store/useSettingsStore';
import { NODE_MAP } from '../../data/boardNodes';
import { getEquippedItem } from '../../game/equipment';
import Ruby from '../shared/Ruby';
import MiniDie from '../fx/MiniDie';
import { runCpuStep } from './cpuStep';
import { AUTO_END_MS, CPU_SPEED_LABEL, CPU_STEP_DELAY, hasActionChoices, scaled } from '../../game/tempo';

export default function CpuDriver() {
  const { player, turnPhase, nodeActions, cityActions, capResult, cityOutcome, money, handSize, bonus, city, binboShown, dice, isCity } = useGameStore(
    useShallow(s => ({
      player: s.players[s.currentPlayerIndex],
      turnPhase: s.turnPhase,
      nodeActions: s.nodeActionsThisTurn,
      cityActions: s.cityActionsThisTurn,
      capResult: s.lastCapitalResult,
      cityOutcome: s.lastCityEventOutcome,
      money: s.players[s.currentPlayerIndex]?.money,
      handSize: s.cityCards?.hands[s.currentPlayerIndex]?.length ?? 0,
      bonus: s.cityBonusActions,
      city: s.city,
      binboShown: !!s.cityBinboEvent,
      dice: s.rouletteResult,
      isCity: s.settings.mode === 'city',
    })),
  );
  const isCpu = !!player?.isCpu;
  const scale = useTempoScale(isCpu);
  const skipping = useSettingsStore(st => st.cpuSkipping);
  const setSkipping = useSettingsStore(st => st.setCpuSkipping);
  const speed = useSettingsStore(st => st.cpuSpeed);
  const cycleSpeed = useSettingsStore(st => st.cycleCpuSpeed);

  // 早送りは CPU の手番の間だけ。人の手番になったら戻す
  useEffect(() => {
    if (!isCpu && skipping) setSkipping(false);
  }, [isCpu, skipping, setSkipping]);

  useEffect(() => {
    // 貧乏神の悪さの画面は人が閉じるまで待つ（見ている間に CPU が進まないように）
    if (!isCpu || binboShown) return;
    let delay = CPU_STEP_DELAY[turnPhase];
    if (delay === undefined) return;
    // 行動選択で「もう一度釣る」以外にやることがなければ、間を置かずに手番を終える
    if (turnPhase === 'action_choice') {
      const node = NODE_MAP.get(player.currentNode);
      const fishingNode = node?.type === 'fishing' || node?.type === 'fishing_special';
      const choices = hasActionChoices({ isCity, inTown: false, fishingNode, fishingLeft: nodeActions < MAX_FISHING_PER_TURN && !!getEquippedItem(player.equipment, 'rod') });
      if (!choices) delay = AUTO_END_MS;
    }
    const t = window.setTimeout(runCpuStep, scaled(delay, scale));
    return () => clearTimeout(t);
    // 段階や状態が変わるたびに次の1手を予約する
  }, [isCpu, binboShown, turnPhase, nodeActions, cityActions, capResult, cityOutcome, money, player?.currentNode, player?.equipment, handSize, bonus, city, isCity, scale]);

  // 決算・年度末・貧乏神の悪さの画面は人が閉じる（覆いを掛けない）
  if (!isCpu || turnPhase === 'city_report' || turnPhase === 'city_yearend' || binboShown) return null;
  return (
    <div
      className="fixed inset-0 z-[45] cursor-pointer"
      aria-live="polite"
      onClick={() => setSkipping(true)}
      title="タップで早送り"
    >
      <div className="absolute top-12 left-1/2 -translate-x-1/2 pl-3 pr-1 py-1 rounded-full bg-ai-900/85 border border-kin-500/40 text-washi text-xs font-mincho shadow-lg flex flex-wrap items-center justify-center gap-x-2 gap-y-1 max-w-[calc(100vw-1rem)]">
        <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: player?.color }} />
        <span>{player?.name} <Ruby>思案中</Ruby>…</span>
        {dice !== null && (dice >= 1 && dice <= 6 ? <MiniDie value={dice} size={18} /> : <span className="font-bold text-kin-300 tabular-nums">{dice}</span>)}
        <span className={`rounded-full px-2 py-0.5 border ${skipping ? 'bg-kin-500/30 border-kin-400/70 text-kin-200' : 'border-kin-500/35 text-washi/75'}`}>
          ▶▶ <Ruby>{skipping ? '早送り中' : '早送り'}</Ruby>
        </span>
        {/* 速さの切り替え（左の「CPU の速さ」と同じ設定。覆いの下で押せないのでここにも置く） */}
        <button
          type="button"
          onClick={e => { e.stopPropagation(); cycleSpeed(); }}
          className="rounded-full px-2 py-0.5 border border-kin-500/35 text-washi/75 hover:bg-ai-700/70 cursor-pointer"
          aria-label={`CPU の速さ ${CPU_SPEED_LABEL[speed]}。押すと切り替え`}
        >
          {CPU_SPEED_LABEL[speed]}
        </button>
      </div>
    </div>
  );
}
