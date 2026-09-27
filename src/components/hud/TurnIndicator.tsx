import { useShallow } from 'zustand/react/shallow';
import { useGameStore } from '../../store/useGameStore';
import { NODE_MAP } from '../../data/boardNodes';
import { computeDistanceToGoal } from '../../utils/pathfinding';
import { calendarLabel, seasonOf } from '../../game/city';
import { GOAL_CLOSE_ROUNDS } from '../../game/constants';
import Ruby from '../shared/Ruby';

const distanceToGoal = computeDistanceToGoal();

const PHASE_LABELS: Record<string, string> = {
  idle: 'サイコロを振ろう',
  roulette: 'サイコロ回転中...',
  path_selection: '移動先を選んでください',
  moving: '移動中...',
  node_action: 'マスのアクション',
  fishing_choice: '釣り方を選ぼう',
  fishing: '釣り中',
  shop: 'ショップ',
  event: 'イベント発生！',
  rest: '休憩中',
  capital_event: '祭り',
  action_choice: 'アクション選択',
  city: 'まちづくり',
  city_event: 'まちの出来事',
  city_report: '月末の決算',
  turn_end: 'ターン終了',
};

export default function TurnIndicator() {
  const { turn, player, turnPhase, maxTurns, destination, destinationReward, isCity, firstFinishTurn } = useGameStore(
    useShallow(s => ({
      firstFinishTurn: s.firstFinishTurn,
      turn: s.turn,
      player: s.players[s.currentPlayerIndex],
      turnPhase: s.turnPhase,
      maxTurns: s.settings.maxTurns,
      destination: s.city?.destination ?? null,
      destinationReward: s.city?.destinationReward ?? 0,
      isCity: s.settings.mode === 'city',
    })),
  );
  const node = NODE_MAP.get(player?.currentNode || '');
  const remainingDist = player ? distanceToGoal.get(player.currentNode) : undefined;
  const cal = calendarLabel(turn);
  const season = seasonOf(turn);
  const destName = destination ? NODE_MAP.get(destination)?.name : null;
  const monthsLeft = maxTurns > 0 ? Math.max(0, maxTurns - turn + 1) : null;

  // スマホ（360〜390px）でも1行に収まるよう、狭いときは「年目」「残り」「目的地」の文字を省き、名前と目的地の町名を省略表示にする
  return (
    <div
      className="backdrop-blur-sm px-2.5 sm:px-4 py-1.5 flex items-center justify-between gap-2 text-sm transition-colors duration-500"
      style={{
        backgroundColor: player?.color ? `${player.color}18` : 'rgba(0,0,0,0.3)',
        borderBottom: `2px solid ${player?.color || 'transparent'}`,
      }}
    >
      <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
        {isCity ? (
          <>
            <span className="font-mincho text-washi/65 whitespace-nowrap shrink-0">
              <span className="hidden min-[420px]:inline">{cal.year}<Ruby>年目</Ruby> </span>{cal.month}<Ruby>月</Ruby>
            </span>
            {/* 季節の行事: 月が替わるたびに札が弾んで光が横切る */}
            <span
              key={`${cal.year}-${cal.month}`}
              data-guide="season"
              className="fx-season-in relative overflow-hidden shrink-0 whitespace-nowrap rounded-full border border-kin-500/40 bg-kin-500/15 px-1.5 py-px text-[11px] leading-tight text-kin-200 font-mincho"
              title={season.desc}
            >
              <span className="fx-sheen" aria-hidden="true" />
              <Ruby>{season.name}</Ruby>
            </span>
            {monthsLeft !== null && (
              <span className="hidden sm:inline text-washi/40 text-xs whitespace-nowrap">(<Ruby>残り</Ruby>{monthsLeft})</span>
            )}
          </>
        ) : (
          <span className="font-mincho text-washi/60 whitespace-nowrap shrink-0">
            {turn}{maxTurns > 0 ? `/${maxTurns}` : ''} <Ruby>巡目</Ruby>
          </span>
        )}
        <span className="text-kin-500/40 shrink-0">｜</span>
        <span key={`${turn}-${player?.id}`} className="fx-rise font-bold font-mincho truncate min-w-0" style={{ color: player?.color }}>{player?.name}</span>
        {player && player.fishBonusMultiplier > 1 && (
          <span className="shrink-0 bg-kin-500/20 text-kin-300 text-xs font-bold px-1.5 py-0.5 rounded-full border border-kin-500/35 whitespace-nowrap">
            x{player.fishBonusMultiplier}<span className="hidden min-[420px]:inline"> ({player.fishBonusTurnsLeft}T)</span>
          </span>
        )}
      </div>

      <div className="flex items-center justify-end gap-1.5 sm:gap-3 text-washi/70 min-w-0 shrink text-xs sm:text-sm">
        {isCity && destName && (
          <span
            key={destination ?? ''}
            data-guide="destination"
            className="fx-pop inline-flex items-center gap-1 min-w-0 max-w-[48vw] sm:max-w-none bg-shu-600/25 border border-shu-500/40 rounded-full pl-1.5 pr-2 py-0.5 text-shu-100 font-mincho"
            title={`目的地 ${destName}（一番乗りで¥${destinationReward.toLocaleString()}）`}
          >
            <svg width="11" height="12" viewBox="0 0 11 12" aria-hidden="true" className="shrink-0">
              <path d="M1.5 0.5V11.5" stroke="#f4ecd8" strokeWidth="1.2" />
              <path d="M2 1H10L8.2 3.4L10 5.8H2Z" fill="#e34a33" stroke="#f4ecd8" strokeWidth="0.6" />
            </svg>
            <span className="hidden min-[420px]:inline shrink-0"><Ruby>目的地</Ruby></span>
            <span className="truncate min-w-0"><Ruby>{destName}</Ruby></span>
            <span className="text-kin-300 tabular-nums shrink-0">¥{destinationReward.toLocaleString()}</span>
          </span>
        )}
        {node && <span className="hidden md:inline font-mincho truncate"><Ruby>{node.name}</Ruby></span>}
        {!isCity && firstFinishTurn != null && (
          <span data-guide="deadline" className="shrink-0 whitespace-nowrap bg-shu-600/25 border border-shu-500/40 rounded-full px-2 py-0.5 text-shu-200 font-mincho text-xs" title="最初の人がゴールしたので、残り巡数で全体が終わる">
            <Ruby>締切</Ruby><span className="hidden min-[420px]:inline"><Ruby>まで</Ruby></span> {Math.max(0, firstFinishTurn + GOAL_CLOSE_ROUNDS - turn + 1)}<Ruby>巡</Ruby>
          </span>
        )}
        {!isCity && remainingDist !== undefined && remainingDist > 0 && (
          <span className="shrink-0 text-kin-300/80 text-xs whitespace-nowrap" title={`ゴールまで ${remainingDist} マス`}>
            <span className="hidden min-[420px]:inline">ゴールまで </span><span className="min-[420px]:hidden">あと</span>{remainingDist}マス
          </span>
        )}
        <span key={turnPhase} className="fx-fade-in hidden lg:inline whitespace-nowrap"><Ruby>{PHASE_LABELS[turnPhase] || ''}</Ruby></span>
      </div>
    </div>
  );
}
