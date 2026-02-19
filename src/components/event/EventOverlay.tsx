import { useState, useMemo } from 'react';
import { useGameStore } from '../../store/useGameStore';
import { FISH_DATABASE } from '../../data/fishDatabase';
import type { Fish } from '../../game/types';
import TargetPhase from '../fishing/TargetPhase';
import ReactionPhase from '../fishing/ReactionPhase';
import RhythmPhase from '../fishing/RhythmPhase';
import Button from '../shared/Button';

const TYPE_STYLES: Record<string, { bg: string; icon: string }> = {
  good: { bg: 'from-green-900/50 to-green-950/50', icon: '✨' },
  bad: { bg: 'from-red-900/50 to-red-950/50', icon: '⚡' },
  random: { bg: 'from-purple-900/50 to-purple-950/50', icon: '❓' },
};

type EventUIState = 'card' | 'fighting' | 'result';
type MiniGameType = 'target' | 'reaction' | 'rhythm';

function isFishEvent(effect: { kind: string }): boolean {
  return effect.kind === 'random_fish' || effect.kind === 'multi_fish';
}

export default function EventOverlay() {
  const { currentEvent, applyEventCard, setTurnPhase, players, currentPlayerIndex } = useGameStore();
  const player = players[currentPlayerIndex];

  const [uiState, setUIState] = useState<EventUIState>('card');
  const [fightWon, setFightWon] = useState(false);
  const [nonFishApplied, setNonFishApplied] = useState(false);

  // 魚イベント用: 対戦魚とミニゲーム種類をランダム決定（初回レンダー時に確定）
  const { fightFish, miniGame } = useMemo(() => {
    if (!currentEvent || !isFishEvent(currentEvent.effect)) {
      return { fightFish: null as Fish | null, miniGame: 'target' as MiniGameType };
    }
    const effect = currentEvent.effect as { rarity?: string };
    const rarity = effect.rarity ?? 'common';
    const pool = FISH_DATABASE.filter(f => f.rarity === rarity);
    const fish = pool.length > 0 ? pool[Math.floor(Math.random() * pool.length)] : null;
    const games: MiniGameType[] = ['target', 'reaction', 'rhythm'];
    const game = games[Math.floor(Math.random() * games.length)];
    return { fightFish: fish, miniGame: game };
  }, [currentEvent]);

  if (!currentEvent) return null;

  const style = TYPE_STYLES[currentEvent.type] || TYPE_STYLES.random;
  const fishEvent = isFishEvent(currentEvent.effect);

  const handleApply = () => {
    if (fishEvent && fightFish) {
      // 魚イベント → ファイト開始
      setUIState('fighting');
    } else {
      // 非魚イベント → 即座に適用
      applyEventCard();
      setNonFishApplied(true);
    }
  };

  const handleFightSuccess = () => {
    applyEventCard();
    setFightWon(true);
    setUIState('result');
  };

  const handleFightFail = () => {
    setFightWon(false);
    setUIState('result');
  };

  const handleClose = () => {
    setTurnPhase('action_choice');
  };

  // ファイト中
  if (uiState === 'fighting' && fightFish) {
    return (
      <div className="fixed inset-0 z-40 bg-gradient-to-b from-blue-900 to-blue-950">
        {/* ヘッダー */}
        <div className="absolute top-0 left-0 right-0 p-4 z-10">
          <div className="text-center">
            <p className="text-xs text-amber-300/80 font-medium">イベントファイト</p>
            <p className="text-lg font-bold text-white">{fightFish.name}が現れた！</p>
          </div>
        </div>

        <div className="pt-16 h-full">
          {miniGame === 'target' && (
            <TargetPhase
              fish={fightFish}
              equipment={player.equipment}
              onSuccess={handleFightSuccess}
              onFail={handleFightFail}
            />
          )}
          {miniGame === 'reaction' && (
            <ReactionPhase
              fish={fightFish}
              equipment={player.equipment}
              onSuccess={handleFightSuccess}
              onFail={handleFightFail}
            />
          )}
          {miniGame === 'rhythm' && (
            <RhythmPhase
              fish={fightFish}
              equipment={player.equipment}
              onSuccess={handleFightSuccess}
              onFail={handleFightFail}
            />
          )}
        </div>
      </div>
    );
  }

  // ファイト結果
  if (uiState === 'result') {
    return (
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className={`bg-gradient-to-b ${fightWon ? 'from-green-900/50 to-green-950/50' : 'from-red-900/50 to-red-950/50'} rounded-2xl border border-white/10 p-8 max-w-sm w-[90%] text-center shadow-2xl`}>
          <div className="text-6xl mb-4">{fightWon ? '🎉' : '💨'}</div>
          <h3 className="text-xl font-bold mb-2">
            {fightWon ? '勝利！' : '逃げられた...'}
          </h3>
          <p className="text-white/70 mb-6 text-sm leading-relaxed">
            {fightWon
              ? `${currentEvent.name}の魚を手に入れた！`
              : '魚に逃げられてしまった...次こそ！'}
          </p>
          <Button onClick={handleClose} variant="primary" size="md" className="w-full">
            OK
          </Button>
        </div>
      </div>
    );
  }

  // カード表示（通常フロー）
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className={`bg-gradient-to-b ${style.bg} rounded-2xl border border-white/10 p-8 max-w-sm w-[90%] text-center shadow-2xl`}>
        <div className="text-6xl mb-4">{style.icon}</div>
        <h3 className="text-xl font-bold mb-2">{currentEvent.name}</h3>
        <p className="text-white/70 mb-6 text-sm leading-relaxed">
          {currentEvent.description}
        </p>

        {fishEvent && (
          <p className="text-xs text-amber-300/60 mb-3">
            ⚔️ 魚を手に入れるにはファイトに勝とう！
          </p>
        )}

        {!nonFishApplied ? (
          <Button onClick={handleApply} variant="gold" size="md" className="w-full">
            {fishEvent ? 'ファイト開始！' : 'イベント発動'}
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
