// まちづくり: まちイベントカード（補助金・好景気・地震・台風・大王イカ…）
import { useShallow } from 'zustand/react/shallow';
import { useGameStore } from '../../store/useGameStore';
import { BUILDING_INFO, getTownInfo } from '../../game/city';
import Button from '../shared/Button';
import Ruby from '../shared/Ruby';

const TYPE_STYLE = {
  good: { bg: 'from-emerald-900/70 to-ai-950/80', seal: '吉', sealBg: '#2f9e6e' },
  bad: { bg: 'from-shu-700/60 to-ai-950/85', seal: '凶', sealBg: '#c63a26' },
  random: { bg: 'from-purple-900/60 to-ai-950/85', seal: '籤', sealBg: '#8b5cc9' },
} as const;

export default function CityEventOverlay() {
  const { card, outcome, apply, ack, players } = useGameStore(
    useShallow(s => ({
      card: s.currentCityEvent,
      outcome: s.lastCityEventOutcome,
      apply: s.applyCityEventCard,
      ack: s.acknowledgeCityEvent,
      players: s.players,
    })),
  );
  if (!card) return null;
  const style = TYPE_STYLE[card.type];

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className={`bg-gradient-to-b ${style.bg} rounded-2xl border border-kin-500/25 p-6 max-w-sm w-[90%] text-center shadow-2xl`}>
        <div className="mx-auto mb-3 w-14 h-14 rounded-xl flex items-center justify-center text-3xl font-mincho font-bold text-white shadow-lg" style={{ background: style.sealBg }}>
          {style.seal}
        </div>
        <p className="text-[11px] tracking-widest text-kin-300/80 mb-1"><Ruby>まちの出来事</Ruby></p>
        <h3 className="text-xl font-bold font-mincho mb-2"><Ruby>{card.name}</Ruby></h3>
        <p className="text-washi/75 mb-4 text-sm leading-relaxed"><Ruby>{card.description}</Ruby></p>

        {outcome && (
          <div className="mb-4 rounded-lg bg-ai-950/50 border border-kin-500/20 p-3 text-left space-y-1">
            <p className="text-sm font-bold text-kin-300 text-center"><Ruby>{outcome.message}</Ruby></p>
            {outcome.moneyDelta !== 0 && (
              <p className={`text-center text-sm tabular-nums ${outcome.moneyDelta > 0 ? 'text-emerald-300' : 'text-shu-400'}`}>
                {outcome.moneyDelta > 0 ? '+' : '−'}¥{Math.abs(outcome.moneyDelta).toLocaleString()}
              </p>
            )}
            {outcome.disaster && outcome.disaster.damages.length > 0 && (
              <ul className="max-h-32 overflow-y-auto text-[11px] text-washi/75 space-y-0.5">
                {outcome.disaster.damages.map((d, i) => (
                  <li key={i} className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: players[d.owner]?.color }} />
                    <Ruby>{getTownInfo(d.nodeId)?.name ?? d.nodeId}</Ruby>の<Ruby>{BUILDING_INFO[d.kind].name}</Ruby>
                    <span className={d.destroyed ? 'text-shu-400' : 'text-kin-300'}>{d.destroyed ? '全壊' : '損壊'}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {!outcome ? (
          <Button onClick={apply} variant="gold" size="md" className="w-full"><Ruby>カードをめくる</Ruby></Button>
        ) : (
          <Button onClick={ack} variant="primary" size="md" className="w-full">OK</Button>
        )}
      </div>
    </div>
  );
}
