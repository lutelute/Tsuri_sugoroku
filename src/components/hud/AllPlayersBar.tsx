import { memo, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useGameStore } from '../../store/useGameStore';
import { calculateScore } from '../../game/scoring';
import { cityScore } from '../../game/city';
import type { CityScore } from '../../game/city';
import { getEquippedLevel } from '../../game/equipment';
import type { Player, TurnPhase } from '../../game/types';
import { useMoneyDelta } from '../fx/useMoneyDelta';
import Icon from '../shared/Icon';
import Ruby from '../shared/Ruby';

// 画面下のプレイヤー欄が全面オーバーレイで隠れているフェーズ。
// この間の所持金の増減はため込み、画面に戻ったときにまとめて「+¥…」を見せる。
const COVERED_PHASES = new Set<TurnPhase>([
  'roulette', 'fishing_choice', 'fishing', 'shop', 'event', 'rest',
  'capital_event', 'city', 'city_event', 'city_report', 'city_yearend',
  // ゴールの祝い（全面）で隠れる。ふだんの turn_end は短いので、ため込んでも次の手番の頭で見える
  'turn_end',
]);

interface PlayerCardProps {
  player: Player;
  active: boolean;
  hold: boolean;
  /** 手番が回ってくるたびに変わる値（光が横切る演出のきっかけ） */
  turnKey: string;
  score: number | null;
  city: CityScore | null;
}

const PlayerCard = memo(function PlayerCard({ player: p, active, hold, turnKey, score, city }: PlayerCardProps) {
  // 欄の音は増えたときだけ（買い物などの減額は店の画面で鳴らし済み）
  const { shown, pops, removePop, last } = useMoneyDelta(p.money, hold, undefined, 'gain');
  return (
    <div
      className={`relative min-w-[150px] flex-1 rounded-lg px-2.5 py-1.5 border transition-all ${active ? 'bg-ai-700/70 shadow-lg' : 'bg-ai-900/45 opacity-75'}`}
      style={{ borderColor: active ? p.color : 'rgba(212,168,67,0.15)' }}
    >
      {/* 手番が来たら一度だけ光が横切る / 所持金が動いたらカードがふわっと光る */}
      {active && <span key={turnKey} className="fx-sheen" aria-hidden="true" />}
      {last && <span key={`g${last.id}`} className={`fx-glow ${last.delta > 0 ? 'is-gain' : 'is-loss'}`} aria-hidden="true" />}

      <div className="flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 rounded-full shrink-0 ring-1 ring-white/30" style={{ backgroundColor: p.color }} />
        <span className="font-bold font-mincho text-[13px] truncate text-washi">{p.name}</span>
        {p.hasFinished && <span className="seal animate-seal-stamp text-[8px] w-4 h-4 rounded-[3px] leading-none"><Ruby>着</Ruby></span>}
        <span className="relative ml-auto text-[12px] text-kin-300 tabular-nums flex items-center gap-0.5">
          <Icon name="coin" size={12} />¥{shown.toLocaleString()}
          {pops.map(pop => (
            <span
              key={pop.id}
              aria-hidden="true"
              className={`fx-money-pop is-right text-[13px] ${pop.delta > 0 ? 'is-gain' : 'is-loss'}`}
              style={{ bottom: 'auto', top: '-2px' }}
              onAnimationEnd={() => removePop(pop.id)}
            >
              {pop.delta > 0 ? '+' : '−'}¥{Math.abs(pop.delta).toLocaleString()}
            </span>
          ))}
        </span>
      </div>
      <div className="flex items-center gap-2.5 text-[11px] text-washi/70 mt-0.5">
        {city ? (
          <>
            <span title="総資産（所持金＋建物）"><Ruby>総資産</Ruby> <b className="text-washi tabular-nums">¥{city.assets.toLocaleString()}</b></span>
            <span title="人口"><Ruby>人口</Ruby> <b className="text-emerald-300 tabular-nums">{city.population.toLocaleString()}</b></span>
            <span title="建物の数" className="text-washi/50">🏠{city.buildings}</span>
          </>
        ) : (
          <>
            <span className="flex items-center gap-0.5"><Icon name="fish" size={12} className="text-ai-200" />{p.caughtFish.length}</span>
            <span className="flex items-center gap-0.5" title="現在の得点"><Icon name="trophy" size={12} className="text-kin-300" /><b className="text-washi tabular-nums">{(score ?? 0).toLocaleString()}</b>pt</span>
          </>
        )}
        {active && (
          <span className="ml-auto flex items-center gap-1.5 text-washi/60" title="装着中の装備レベル（竿/リール/ルアー）">
            <span className="flex items-center"><Icon name="rod" size={11} />{getEquippedLevel(p.equipment, 'rod') || '×'}</span>
            <span className="flex items-center"><Icon name="reel" size={11} />{getEquippedLevel(p.equipment, 'reel') || '×'}</span>
            <span className="flex items-center"><Icon name="lure" size={11} />{getEquippedLevel(p.equipment, 'lure') || '×'}</span>
          </span>
        )}
      </div>
    </div>
  );
});

// 画面下のプレイヤー欄（コンパクト版）。釣りモードは現在の得点、まちづくりモードは総資産と人口を表示。
export default function AllPlayersBar() {
  const { players, currentPlayerIndex, encyclopedias, city, turnPhase, turn } = useGameStore(
    useShallow(s => ({
      players: s.players,
      currentPlayerIndex: s.currentPlayerIndex,
      encyclopedias: s.encyclopedias,
      city: s.city,
      turnPhase: s.turnPhase,
      turn: s.turn,
    })),
  );
  const hold = COVERED_PHASES.has(turnPhase);

  const scores = useMemo(
    () => players.map((p, i) => (city ? null : calculateScore(p, encyclopedias[i] ?? {}).total)),
    [players, encyclopedias, city],
  );
  const citySc = useMemo(() => (city ? players.map((p, i) => cityScore(city, i, p.money)) : null), [players, city]);

  return (
    <div className="flex gap-1.5 px-2 py-1.5 overflow-x-auto">
      {players.map((p, i) => (
        <PlayerCard
          key={p.id}
          player={p}
          active={i === currentPlayerIndex}
          hold={hold}
          turnKey={`${turn}-${currentPlayerIndex}`}
          score={scores[i]}
          city={citySc ? citySc[i] : null}
        />
      ))}
    </div>
  );
}
