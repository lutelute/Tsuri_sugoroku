// まちづくり: まちイベントカード（補助金・好景気・地震・台風・大王イカ…）
// 伏せた札を「カードをめくる」で裏返すと同時に効果を適用し、結果を札の表に出す。
import { useShallow } from 'zustand/react/shallow';
import { useGameStore } from '../../store/useGameStore';
import { BUILDING_INFO, getTownInfo } from '../../game/city';
import Button from '../shared/Button';
import Ruby from '../shared/Ruby';
import Stamp from '../fx/Stamp';
import Confetti from '../fx/Confetti';
import ScreenFlash from '../fx/ScreenFlash';
import { useCountUp } from '../fx/useCountUp';
import { playBad, playCardFlip, playChime, playGood } from '../../utils/sound';

/** 札がめくれてから吉凶の音を鳴らすまでの間 */
const OUTCOME_SOUND_DELAY_MS = 380;

const TYPE_STYLE = {
  good: { seal: '吉', tone: 'shu', label: '吉報', flash: '#fff1c4', accent: '#1f6b3a' },
  bad: { seal: '凶', tone: 'sumi', label: '凶報', flash: '#e34a33', accent: '#a92e1d' },
  random: { seal: '籤', tone: 'ai', label: '運試し', flash: '#cfe0ff', accent: '#24496e' },
} as const;

function MoneyDelta({ delta }: { delta: number }) {
  const shown = useCountUp(Math.abs(delta), 900, 0, 350);
  return (
    <p className={`fx-pop text-center text-2xl font-bold font-mincho tabular-nums ${delta > 0 ? 'text-[#1f6b3a]' : 'text-[#a92e1d]'}`} style={{ '--d': '300ms' } as React.CSSProperties}>
      {delta > 0 ? '+' : '−'}¥{shown.toLocaleString()}
    </p>
  );
}

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

  // めくる: 紙の音 → 適用 → 結果に応じて吉凶の音
  const reveal = () => {
    playCardFlip();
    apply();
    const o = useGameStore.getState().lastCityEventOutcome;
    const hurt = card.type === 'bad' || (o?.moneyDelta ?? 0) < 0 || !!o?.disaster;
    window.setTimeout(() => {
      if (hurt) playBad();
      else if (card.type === 'good' || (o?.moneyDelta ?? 0) > 0) playGood();
      else playChime();
    }, OUTCOME_SOUND_DELAY_MS);
  };
  const style = TYPE_STYLE[card.type];
  const flipped = !!outcome;
  const disaster = !!outcome?.disaster;
  const bad = card.type === 'bad' || (outcome?.moneyDelta ?? 0) < 0;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      {flipped && !bad && <Confetti variant="festive" mode="burst" count={40} seed={card.name.length + 5} originY="40%" />}
      {flipped && <ScreenFlash color={style.flash} opacity={disaster ? 0.45 : 0.35} />}

      <div data-guide="city-event" className={`w-[90%] max-w-sm ${flipped && (bad || disaster) ? 'fx-shake' : ''}`}>
        <div className="fx-flip animate-bounce-in">
          <div className={`fx-flip-inner ${flipped ? 'is-flipped' : ''}`}>
            {/* 表（めくった面） */}
            <div className="fx-flip-face fx-flip-front fx-card-front p-5 sm:p-6 text-center max-h-[88dvh] overflow-y-auto overscroll-contain" inert={!flipped}>
              <div className="flex items-center justify-center gap-2 mb-2">
                <span className="h-px w-8" style={{ background: style.accent, opacity: 0.5 }} />
                <span className="text-[11px] tracking-[0.35em] font-mincho" style={{ color: style.accent }}><Ruby>まちの出来事</Ruby>・<Ruby>{style.label}</Ruby></span>
                <span className="h-px w-8" style={{ background: style.accent, opacity: 0.5 }} />
              </div>
              <div className="flex items-center justify-center gap-3 mb-2">
                {flipped && <Stamp tone={style.tone} size={50} delay={420} tilt={-10}>{style.seal}</Stamp>}
                <h3 className="font-brush text-3xl leading-tight text-[#2a2118]"><Ruby>{card.name}</Ruby></h3>
              </div>
              <p className="text-[#4a3a28] mb-4 text-sm leading-relaxed"><Ruby>{card.description}</Ruby></p>

              {outcome && (
                <div className="mb-4 rounded-lg bg-[#2a2118]/5 border border-[#9a6f24]/30 p-3 text-left space-y-1">
                  <p className="text-sm font-bold text-[#7a5a2a] text-center font-mincho"><Ruby>{outcome.message}</Ruby></p>
                  {outcome.moneyDelta !== 0 && <MoneyDelta delta={outcome.moneyDelta} />}
                  {outcome.disaster && outcome.disaster.damages.length > 0 && (
                    <ul className="max-h-32 overflow-y-auto text-[11px] text-[#4a3a28] space-y-0.5">
                      {outcome.disaster.damages.map((d, i) => (
                        <li key={i} className="fx-rise flex items-center gap-1.5" style={{ '--d': `${500 + i * 70}ms` } as React.CSSProperties}>
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: players[d.owner]?.color }} />
                          <Ruby>{getTownInfo(d.nodeId)?.name ?? d.nodeId}</Ruby>の<Ruby>{BUILDING_INFO[d.kind].name}</Ruby>
                          <span className={`font-bold ${d.destroyed ? 'text-[#a92e1d]' : 'text-[#9a6f24]'}`}>{d.destroyed ? '全壊' : '損壊'}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              <Button onClick={ack} variant="primary" size="md" className="w-full">OK</Button>
            </div>

            {/* 裏（伏せた札） */}
            <div className="fx-flip-face fx-flip-back fx-card-back flex flex-col items-center justify-center gap-4 p-6" inert={flipped}>
              <p className="text-[11px] tracking-[0.4em] text-kin-300/85 font-mincho"><Ruby>まちの出来事</Ruby></p>
              <Stamp tone={style.tone} size={80} tilt={-6} silent>{style.seal}</Stamp>
              <Button onClick={reveal} variant="gold" size="md" className="w-full max-w-[220px]"><Ruby>カードをめくる</Ruby></Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
