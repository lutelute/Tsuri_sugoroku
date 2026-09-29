import { useEffect, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useGameStore } from '../../store/useGameStore';
import { useFishing } from '../../hooks/useFishing';
import { getEffectiveLevel } from '../../game/fishing';
import { PondBackdrop, Bobber, Ripple, Splash } from './FishingScene';
import { buzz, HAPTIC } from './haptics';
import { playCast, playSplash } from '../../utils/sound';
import WaitingPhase from './WaitingPhase';
import StrikingPhase from './StrikingPhase';
import ReelingPhase from './ReelingPhase';
import TargetPhase from './TargetPhase';
import ReactionPhase from './ReactionPhase';
import RhythmPhase from './RhythmPhase';
import FishCaughtModal from './FishCaughtModal';
import Icon from '../shared/Icon';
import Ruby from '../shared/Ruby';

export default function FishingOverlay() {
  const { player, endFishing, initialEncyclopedia } = useGameStore(
    useShallow(s => ({
      player: s.players[s.currentPlayerIndex],
      endFishing: s.endFishing,
      initialEncyclopedia: s.initialEncyclopedias[s.currentPlayerIndex],
    })),
  );
  const {
    fishingState, begin, handleStrike, handleEarlyTap, handleMiss,
    handleMiniGameSuccess, handleMiniGameFail, strikeOutcome, failReason, headStart,
  } = useFishing();

  useEffect(() => begin(), [begin]);

  if (!fishingState) return null;

  const fish = fishingState.targetFish;
  const isNew = fish ? !initialEncyclopedia?.[fish.id] : false;
  const phase = fishingState.phase;
  const inMiniGame = phase === 'reeling' && !!fish;
  const miniProps = fish
    ? { fish, equipment: player.equipment, headStart, onSuccess: handleMiniGameSuccess, onFail: handleMiniGameFail }
    : null;

  return (
    <div className="fixed inset-0 z-40 bg-ai-950 overflow-hidden">
      <PondBackdrop boat={fishingState.boatFishing} />
      {/* ミニゲーム中は水面を暗くして操作面を際立たせる */}
      {(inMiniGame || phase === 'result') && <div className="absolute inset-0 bg-ai-950/60" />}

      {/* ヘッダー */}
      <div className="absolute top-0 left-0 right-0 h-12 bg-ai-950/50 px-4 flex justify-between items-center z-10 border-b border-kin-500/15">
        <span className="text-sm text-washi/75 font-mincho flex items-center gap-1.5">
          <Icon name={fishingState.boatFishing ? 'boat' : 'rod'} size={16} className="text-kin-300" />
          {player.name} の<Ruby>{fishingState.boatFishing ? '船釣り' : '釣り'}</Ruby>
        </span>
        {inMiniGame && (
          <span className="text-sm text-kin-300 font-mincho"><Ruby>何かがかかっている！</Ruby></span>
        )}
      </div>

      {/* フェーズ別UI（浮きの位置は全フェーズ共通: 横中央・縦56%） */}
      <div className="absolute inset-x-0 top-12 bottom-0">
        {phase === 'cast' && <CastPhase />}

        {phase === 'waiting' && fish && (
          <WaitingPhase
            hasBite={fishingState.hasBite}
            fish={fish}
            strikeLevel={getEffectiveLevel(player.equipment, 'strike')}
            onStrike={handleStrike}
            onEarlyTap={handleEarlyTap}
            onMiss={handleMiss}
          />
        )}

        {phase === 'strike' && (
          <StrikingPhase success={fishingState.strikeSuccess} outcome={strikeOutcome} rarity={fish?.rarity ?? null} />
        )}

        {inMiniGame && miniProps && fishingState.miniGame === 'reeling' && <ReelingPhase {...miniProps} />}
        {inMiniGame && miniProps && fishingState.miniGame === 'target' && <TargetPhase {...miniProps} />}
        {inMiniGame && miniProps && fishingState.miniGame === 'reaction' && <ReactionPhase {...miniProps} />}
        {inMiniGame && miniProps && fishingState.miniGame === 'rhythm' && <RhythmPhase {...miniProps} />}

        {phase === 'result' && (
          <FishCaughtModal
            fish={fish}
            size={fishingState.caughtSize}
            escaped={fishingState.escaped}
            tairyouCount={fishingState.tairyouCount}
            tairyouFishIds={fishingState.tairyouFishIds}
            isNew={isNew && !fishingState.escaped}
            failReason={failReason}
            onClose={endFishing}
          />
        )}
      </div>
    </div>
  );
}

/** 浮きが着水するまでの時間（ms）。CSS の fg-cast-* と揃える */
const CAST_LAND_MS = 1050;

/** キャスト: 浮きが弧を描いて飛び、ポチャンと着水する（1.5秒） */
function CastPhase() {
  const [landed, setLanded] = useState(false);
  useEffect(() => {
    playCast();
    const t = window.setTimeout(() => {
      setLanded(true);
      buzz(HAPTIC.tap);
      playSplash();
    }, CAST_LAND_MS);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none">
      <p className="absolute top-[10%] inset-x-0 text-center fg-pop font-brush text-4xl text-washi/90 drop-shadow-[0_3px_0_rgba(10,26,44,0.9)]">
        <Ruby>えいっ！</Ruby>
      </p>
      <div className="absolute left-1/2 top-[56%] w-0 h-0">
        <div className="absolute left-0 top-0 -translate-x-1/2 -translate-y-[55%]">
          <div className="fg-cast-x">
            <div className="fg-cast-y">
              <Bobber state="idle" />
            </div>
          </div>
        </div>
        {landed && (
          <div className="absolute left-0 top-[6px] w-0 h-0">
            <Ripple size={90} />
            <Ripple size={150} delay={150} />
            <Splash count={7} distance={40} />
          </div>
        )}
      </div>
      {landed && (
        <p className="absolute top-[72%] inset-x-0 text-center fg-pop text-lg text-washi/70">
          <Ruby>ポチャン</Ruby>
        </p>
      )}
    </div>
  );
}
