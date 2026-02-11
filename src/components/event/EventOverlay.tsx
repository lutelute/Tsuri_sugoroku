import { useState } from 'react';
import { useGameStore } from '../../store/useGameStore';
import Button from '../shared/Button';

const TYPE_STYLES: Record<string, { bg: string; icon: string }> = {
  good: { bg: 'from-green-900/50 to-green-950/50', icon: '✨' },
  bad: { bg: 'from-red-900/50 to-red-950/50', icon: '⚡' },
  random: { bg: 'from-purple-900/50 to-purple-950/50', icon: '❓' },
};

export default function EventOverlay() {
  const { currentEvent, applyEventCard, setTurnPhase } = useGameStore();
  const [applied, setApplied] = useState(false);

  if (!currentEvent) return null;

  const style = TYPE_STYLES[currentEvent.type] || TYPE_STYLES.random;

  const handleApply = () => {
    applyEventCard();
    setApplied(true);
  };

  const handleClose = () => {
    setTurnPhase('action_choice');
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className={`bg-gradient-to-b ${style.bg} rounded-2xl border border-white/10 p-8 max-w-sm w-[90%] text-center shadow-2xl`}>
        <div className="text-6xl mb-4">{style.icon}</div>
        <h3 className="text-xl font-bold mb-2">{currentEvent.name}</h3>
        <p className="text-white/70 mb-6 text-sm leading-relaxed">
          {currentEvent.description}
        </p>

        {!applied ? (
          <Button onClick={handleApply} variant="gold" size="md" className="w-full">
            イベント発動
          </Button>
        ) : (
          <Button onClick={handleClose} variant="primary" size="md" className="w-full">
            OK
          </Button>
        )}
      </div>
    </div>
  );
}
