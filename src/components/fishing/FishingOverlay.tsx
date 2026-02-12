import { useEffect } from 'react';
import { useGameStore } from '../../store/useGameStore';
import { useFishing } from '../../hooks/useFishing';
import { getEffectiveLevel } from '../../game/fishing';
import WaitingPhase from './WaitingPhase';
import StrikingPhase from './StrikingPhase';
import ReelingPhase from './ReelingPhase';
import FishCaughtModal from './FishCaughtModal';

export default function FishingOverlay() {
  const { players, currentPlayerIndex, endFishing } = useGameStore();
  const player = players[currentPlayerIndex];
  const { fishingState, begin, handleStrike, handleReelTap, handleMiss } = useFishing();

  useEffect(() => {
    begin();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!fishingState) return null;

  return (
    <div className="fixed inset-0 z-40 bg-gradient-to-b from-blue-900 to-blue-950">
      {/* ヘッダー */}
      <div className="absolute top-0 left-0 right-0 bg-black/30 px-4 py-2 flex justify-between items-center z-10">
        <span className="text-sm text-white/60">
          🎣 {player.name} の釣り
        </span>
        {fishingState.targetFish && fishingState.phase === 'reeling' && (
          <span className="text-sm text-amber-400">
            ??? がかかっている！
          </span>
        )}
      </div>

      {/* フェーズ別UI */}
      <div className="w-full h-full pt-12 pb-4">
        {fishingState.phase === 'cast' && (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="text-7xl animate-spin" style={{ animationDuration: '1s' }}>🎣</div>
            <p className="text-xl text-white/60 mt-4">キャスト中...</p>
          </div>
        )}

        {fishingState.phase === 'waiting' && (
          <WaitingPhase
            hasBite={fishingState.hasBite}
            onStrike={handleStrike}
            onMiss={handleMiss}
            strikeLevel={getEffectiveLevel(player.equipment, 'strike')}
          />
        )}

        {fishingState.phase === 'strike' && (
          <StrikingPhase success={fishingState.strikeSuccess} />
        )}

        {fishingState.phase === 'reeling' && (
          <ReelingPhase
            progress={fishingState.reelingProgress}
            tension={fishingState.tension}
            onTap={handleReelTap}
          />
        )}

        {fishingState.phase === 'result' && (
          <FishCaughtModal
            fish={fishingState.targetFish}
            size={fishingState.caughtSize}
            escaped={fishingState.escaped}
            onClose={endFishing}
          />
        )}
      </div>
    </div>
  );
}
