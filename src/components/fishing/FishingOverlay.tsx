import { useEffect, useEffectEvent, useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useGameStore } from '../../store/useGameStore';
import { useFishing } from '../../hooks/useFishing';
import { getEffectiveLevel, RIGS } from '../../game/fishing';
import { calendarLabel } from '../../game/city';
import { NODE_MAP } from '../../data/boardNodes';
import { Bobber, Ripple, Splash, SplashCrown } from './FishingScene';
import FishingStage, { StageAnchor } from './scene/FishingStage';
import type { StageOmen } from './scene/FishingStage';
import { pickScene } from './scene/sceneSpec';
import { SurfaceRig } from './scene/Angler';
import type { RigState } from './scene/Angler';
import { buzz, HAPTIC } from './haptics';
import { playCast, playSplash } from '../../utils/sound';
import WaitingPhase from './WaitingPhase';
import StrikingPhase from './StrikingPhase';
import ReelingPhase from './ReelingPhase';
import TargetPhase from './TargetPhase';
import ReactionPhase from './ReactionPhase';
import RhythmPhase from './RhythmPhase';
import FishCaughtModal from './FishCaughtModal';
import RigGlyph from './RigGlyph';
import Icon from '../shared/Icon';
import Ruby from '../shared/Ruby';

/** 浮きのある高さ（フェーズの箱に対する割合）。投げる・待つ・合わせで共通 */
const BOBBER_Y = 0.56;
/** 浮きの玉の中心から水面までのずれ（px）。玉が半分ほど水に浸かって見える */
const WATERLINE_PX = 6;

export default function FishingOverlay() {
  const { player, endFishing, initialEncyclopedia, turn, mode } = useGameStore(
    useShallow(s => ({
      player: s.players[s.currentPlayerIndex],
      endFishing: s.endFishing,
      initialEncyclopedia: s.initialEncyclopedias[s.currentPlayerIndex],
      turn: s.turn,
      mode: s.settings.mode,
    })),
  );
  const {
    fishingState, begin, handleStrike, handleEarlyTap, handleMiss,
    handleMiniGameSuccess, handleMiniGameFail, strikeOutcome, failReason, headStart,
  } = useFishing();
  // この釣りを始めたときの「手番の中で何回目か」（釣り上げた瞬間に空が変わらないよう、始めの値で固定する）
  const [startActions] = useState(() => useGameStore.getState().nodeActionsThisTurn);
  const [castLanded, setCastLanded] = useState(false);

  useEffect(() => begin(), [begin]);

  const node = NODE_MAP.get(player.currentNode);
  const boat = !!fishingState?.boatFishing;
  // 釣り場の絵: 場所（海・川・湖・名所・沖）と時刻で決まる
  const scene = useMemo(
    () => pickScene({ node, boat, mode, turn, actions: startActions, month: mode === 'city' ? calendarLabel(turn).month : null }),
    [node, boat, mode, turn, startActions],
  );

  if (!fishingState) return null;

  const fish = fishingState.targetFish;
  const rigKind = fishingState.rig ?? 'futsu';
  const isNew = fish ? !initialEncyclopedia?.[fish.id] : false;
  const phase = fishingState.phase;
  const inMiniGame = phase === 'reeling' && !!fish;
  const miniProps = fish
    ? { fish, equipment: player.equipment, headStart, onSuccess: handleMiniGameSuccess, onFail: handleMiniGameFail }
    : null;

  // 水中の光: 待つ間は大物だけ気配を出し、掛かってからはレア以上で光る（これまでの見せ方と同じ情報量）
  const hooked = inMiniGame || (phase === 'strike' && fishingState.strikeSuccess);
  const rarity = fish?.rarity;
  const omen: StageOmen | null =
    rarity === 'mythical' || rarity === 'legendary' ? (phase === 'waiting' || hooked ? rarity : null)
    : rarity === 'rare' && hooked ? 'rare'
    : null;

  // 近景の釣り人と竿（水面の場面だけ。ミニゲームは各フェーズが自分の窓の中に描く）
  const rig: RigState | null =
    phase === 'cast' ? 'cast'
    : phase === 'waiting' ? (fishingState.hasBite ? 'bite' : 'idle')
    : phase === 'strike' ? (fishingState.strikeSuccess ? 'hooked' : 'slack')
    : phase === 'result' ? (fishingState.escaped ? 'slack' : 'idle')
    : null;

  // これまでに釣った同じ魚の最大（今回の釣果と、一緒に揚がった魚は除く）
  const landedNow = phase === 'result' && !fishingState.escaped ? 1 + fishingState.tairyouCount : 0;
  const earlier = fish ? player.caughtFish.slice(0, Math.max(0, player.caughtFish.length - landedNow)).filter(c => c.fishId === fish.id) : [];
  const prevBest = earlier.length ? Math.max(...earlier.map(c => c.size)) : null;

  return (
    <div className="fixed inset-0 z-40 bg-ai-950 overflow-hidden">
      <FishingStage scene={scene} omen={omen} depth={rigKind === 'oomono' ? 'deep' : rigKind === 'kazu' ? 'shallow' : null} paused={phase === 'result'}>
        {/* ヘッダー */}
        <div className="absolute top-0 left-0 right-0 h-12 bg-ai-950/55 px-4 flex justify-between items-center z-10 border-b border-kin-500/25">
          <span className="text-sm text-washi/85 font-mincho flex items-center gap-1.5">
            <Icon name={boat ? 'boat' : 'rod'} size={16} className="text-kin-300" />
            {player.name} の<Ruby>{boat ? '船釣り' : '釣り'}</Ruby>
            {rigKind !== 'futsu' && (
              <span className={`ml-1 items-center gap-1 rounded-full border border-kin-500/40 bg-ai-950/50 pl-1 pr-2 text-xs text-washi/90 whitespace-nowrap ${inMiniGame ? 'hidden sm:inline-flex' : 'inline-flex'}`}>
                <RigGlyph rig={rigKind} size={18} />
                <Ruby>{`${RIGS[rigKind].name}（${RIGS[rigKind].place}）`}</Ruby>
              </span>
            )}
          </span>
          {inMiniGame && (
            <span className="text-sm text-kin-300 font-mincho"><Ruby>何かがかかっている！</Ruby></span>
          )}
        </div>

        {/* フェーズ別UI（浮きの位置は全フェーズ共通: 横中央・縦56%） */}
        <div className="absolute inset-x-0 top-12 bottom-0">
          {!inMiniGame && <StageAnchor surface={BOBBER_Y} offset={WATERLINE_PX} />}
          {rig && (
            <SurfaceRig
              color={player.color}
              boat={boat}
              state={rig}
              surface={BOBBER_Y}
              line={phase === 'cast' ? castLanded : phase !== 'result'}
            />
          )}
          {rig && phase !== 'result' && node && (
            <p className="um-place"><Ruby>{node.name}</Ruby></p>
          )}

          {phase === 'cast' && <CastPhase landed={castLanded} onLanded={() => setCastLanded(true)} />}

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
            <StrikingPhase
              success={fishingState.strikeSuccess}
              outcome={strikeOutcome}
              rarity={fish?.rarity ?? null}
              fishId={fish?.id}
              quick={!!fishingState.quick}
            />
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
              place={node?.name}
              prevBest={prevBest}
              sale={fishingState.sale}
              rig={rigKind}
              onClose={endFishing}
            />
          )}
        </div>
      </FishingStage>
    </div>
  );
}

/** 浮きが着水するまでの時間（ms）。CSS の um-cast-x / fg-cast-y / um-rod-cast と揃える */
const CAST_LAND_MS = 1050;

/** キャスト: 竿を振り、浮きが弧を描いて飛び、ポチャンと着水する（1.5秒） */
function CastPhase({ landed, onLanded }: { landed: boolean; onLanded: () => void }) {
  const land = useEffectEvent(() => {
    onLanded();
    buzz(HAPTIC.tap);
    playSplash();
  });
  useEffect(() => {
    playCast();
    const t = window.setTimeout(() => land(), CAST_LAND_MS);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none">
      <p className="um-ink absolute top-[10%] inset-x-0 text-center fg-pop font-brush text-4xl text-washi">
        <Ruby>えいっ！</Ruby>
      </p>
      <div className="absolute left-1/2 top-[56%] w-0 h-0">
        {landed && (
          <div className="absolute left-0 top-[6px] w-0 h-0">
            <Ripple size={120} flat />
            <Ripple size={200} delay={150} flat />
            <SplashCrown size={84} />
            <Splash count={7} distance={46} spread={150} />
          </div>
        )}
        <div className="absolute left-0 top-0 -translate-x-1/2 -translate-y-[55%]">
          <div className="um-cast-x">
            <div className="fg-cast-y">
              <Bobber state="idle" afloat={landed} />
            </div>
          </div>
        </div>
      </div>
      {landed && (
        <p className="um-ink absolute top-[66%] left-1/2 pl-10 fg-pop font-mincho text-lg text-washi/85">
          <Ruby>ポチャン</Ruby>
        </p>
      )}
    </div>
  );
}
