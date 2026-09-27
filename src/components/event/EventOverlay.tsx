import { useState, useMemo, useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useGameStore } from '../../store/useGameStore';
import { FISH_DATABASE } from '../../data/fishDatabase';
import type { Fish } from '../../game/types';
import { random } from '../../utils/random';
import TargetPhase from '../fishing/TargetPhase';
import ReactionPhase from '../fishing/ReactionPhase';
import RhythmPhase from '../fishing/RhythmPhase';
import Button from '../shared/Button';
import Ruby from '../shared/Ruby';
import Stamp from '../fx/Stamp';
import Confetti from '../fx/Confetti';
import ScreenFlash from '../fx/ScreenFlash';
import MoneyTicker from '../fx/MoneyTicker';
import { useReducedMotion } from '../fx/useReducedMotion';
import { playBad, playBite, playCardFlip, playChime, playGood } from '../../utils/sound';

// 吉=朱の判子と金の光、凶=墨の判子と朱のフラッシュ＋揺れ、籤=藍の判子
const TYPE_FX = {
  good: { glyph: '吉', tone: 'shu', label: '吉の札', flash: '#fff1c4', accent: '#a92e1d' },
  bad: { glyph: '凶', tone: 'sumi', label: '凶の札', flash: '#e34a33', accent: '#2a231c' },
  random: { glyph: '籤', tone: 'ai', label: 'くじの札', flash: '#cfe0ff', accent: '#24496e' },
} as const;

/** 伏せたカードが自動でめくれるまでの間 */
const AUTO_FLIP_MS = 520;

type EventUIState = 'card' | 'fighting' | 'result';
type MiniGameType = 'target' | 'reaction' | 'rhythm';

function isFishEvent(effect: { kind: string }): boolean {
  return effect.kind === 'random_fish' || effect.kind === 'multi_fish';
}

export default function EventOverlay() {
  const { currentEvent, applyEventCard, setTurnPhase, players, currentPlayerIndex } = useGameStore(
    useShallow(s => ({
      currentEvent: s.currentEvent,
      applyEventCard: s.applyEventCard,
      setTurnPhase: s.setTurnPhase,
      players: s.players,
      currentPlayerIndex: s.currentPlayerIndex,
    })),
  );
  const player = players[currentPlayerIndex];
  const reduced = useReducedMotion();

  const [uiState, setUIState] = useState<EventUIState>('card');
  const [fightWon, setFightWon] = useState(false);
  const [nonFishApplied, setNonFishApplied] = useState(false);
  const [flipped, setFlipped] = useState(false);

  // 伏せた札を少し見せてから自動でめくる（タップでもすぐめくれる）
  useEffect(() => {
    const t = window.setTimeout(() => setFlipped(true), reduced ? 0 : AUTO_FLIP_MS);
    return () => clearTimeout(t);
  }, [reduced]);

  // 札がめくれた音
  useEffect(() => {
    if (flipped) playCardFlip();
  }, [flipped]);

  // 魚イベント用: 対戦魚とミニゲーム種類をランダム決定（初回レンダー時に確定）
  const { fightFish, miniGame } = useMemo(() => {
    if (!currentEvent || !isFishEvent(currentEvent.effect)) {
      return { fightFish: null as Fish | null, miniGame: 'target' as MiniGameType };
    }
    const effect = currentEvent.effect as { rarity?: string };
    const rarity = effect.rarity ?? 'common';
    const pool = FISH_DATABASE.filter(f => f.rarity === rarity);
    const fish = pool.length > 0 ? pool[Math.floor(random() * pool.length)] : null;
    const games: MiniGameType[] = ['target', 'reaction', 'rhythm'];
    const game = games[Math.floor(random() * games.length)];
    return { fightFish: fish, miniGame: game };
  }, [currentEvent]);

  if (!currentEvent) return null;

  const fx = TYPE_FX[currentEvent.type] || TYPE_FX.random;
  const fishEvent = isFishEvent(currentEvent.effect);
  const moneyEvent = currentEvent.effect.kind === 'money';

  const handleApply = () => {
    if (fishEvent && fightFish) {
      // 魚イベント → ファイト開始
      playBite();
      setUIState('fighting');
    } else {
      // 非魚イベント → 即座に適用
      applyEventCard();
      setNonFishApplied(true);
      if (currentEvent.type === 'good') playGood();
      else if (currentEvent.type === 'bad') playBad();
      else playChime();
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
    // 移動イベントでゴールに到達した場合はターン終了へ（ゴール演出を出す）
    const p = useGameStore.getState().players[currentPlayerIndex];
    setTurnPhase(p?.hasFinished ? 'turn_end' : 'action_choice');
  };

  // ファイト中
  if (uiState === 'fighting' && fightFish) {
    return (
      <div className="fixed inset-0 z-40 bg-gradient-to-b from-ai-700 via-ai-800 to-ai-950">
        {/* ヘッダー */}
        <div className="absolute top-0 left-0 right-0 p-4 z-10">
          <div className="text-center">
            <p className="text-xs text-amber-300/80 font-medium">イベントファイト</p>
            <p className="text-lg font-bold text-white"><Ruby>{fightFish.name}</Ruby><Ruby>が現れた！</Ruby></p>
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
        {fightWon && <Confetti variant="festive" mode="burst" count={44} seed={currentPlayerIndex + 11} originY="40%" />}
        <ScreenFlash color={fightWon ? '#fff1c4' : '#7fa9cd'} opacity={0.35} />
        <div className={`fx-card-front animate-bounce-in p-7 max-w-sm w-[90%] text-center ${fightWon ? '' : 'fx-shake'}`}>
          <div className="flex justify-center mb-3">
            <Stamp tone={fightWon ? 'shu' : 'sumi'} size={72} delay={150}>{fightWon ? '勝' : '逃'}</Stamp>
          </div>
          <h3 className="font-brush text-3xl mb-2 text-[#2a2118]">
            <Ruby>{fightWon ? '勝利！' : '逃げられた...'}</Ruby>
          </h3>
          <p className="text-[#4a3a28] mb-6 text-sm leading-relaxed">
            {fightWon
              ? <><Ruby>{currentEvent.name}</Ruby><Ruby>の魚を手に入れた！</Ruby></>
              : <Ruby>魚に逃げられてしまった...次こそ！</Ruby>}
          </p>
          <Button onClick={handleClose} variant="primary" size="md" className="w-full">
            OK
          </Button>
        </div>
      </div>
    );
  }

  // カード表示（通常フロー）: 伏せた札 → めくる → 発動で判子
  const applied = nonFishApplied;
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      {applied && currentEvent.type === 'good' && <Confetti variant="festive" mode="burst" count={40} seed={currentEvent.name.length + currentPlayerIndex} originY="40%" />}
      {applied && <ScreenFlash color={fx.flash} opacity={currentEvent.type === 'bad' ? 0.32 : 0.4} />}

      <div className={`w-[90%] max-w-sm ${applied && currentEvent.type === 'bad' ? 'fx-shake' : ''}`}>
        <div className="fx-flip animate-bounce-in">
          <div className={`fx-flip-inner ${flipped ? 'is-flipped' : ''}`}>
            {/* 表（めくった面）: 高さはこちらで決まる */}
            <div className="fx-flip-face fx-flip-front fx-card-front p-6 text-center" inert={!flipped}>
              <div className="flex items-center justify-center gap-2 mb-2">
                <span className="h-px w-8" style={{ background: fx.accent, opacity: 0.5 }} />
                <span className="text-[11px] tracking-[0.35em] font-mincho" style={{ color: fx.accent }}><Ruby>{fx.label}</Ruby></span>
                <span className="h-px w-8" style={{ background: fx.accent, opacity: 0.5 }} />
              </div>
              <h3 className="font-brush text-3xl leading-tight mb-3 text-[#2a2118]"><Ruby>{currentEvent.name}</Ruby></h3>
              <p className="text-[#4a3a28] mb-4 text-sm leading-relaxed">
                <Ruby>{currentEvent.description}</Ruby>
              </p>

              {applied && (
                <div className="flex justify-center mb-3">
                  <Stamp tone={fx.tone} size={66} delay={80} tilt={-10}>{fx.glyph}</Stamp>
                </div>
              )}

              {moneyEvent && (
                <p className="text-sm text-[#7a5a2a] mb-3 font-mincho">
                  <Ruby>所持金</Ruby>{' '}
                  <MoneyTicker value={player.money} className="font-bold text-[#2a2118]" popClassName="text-base" />
                </p>
              )}

              {fishEvent && (
                <p className="text-xs text-[#9a6f24] mb-3">
                  <Ruby>魚を手に入れるにはファイトに勝とう！</Ruby>
                </p>
              )}

              {!applied ? (
                <Button onClick={handleApply} variant="gold" size="md" className="w-full">
                  <Ruby>{fishEvent ? 'ファイト開始！' : 'イベント発動'}</Ruby>
                </Button>
              ) : (
                <Button onClick={handleClose} variant="primary" size="md" className="w-full">
                  OK
                </Button>
              )}
            </div>

            {/* 裏（伏せた札）: タップですぐめくれる */}
            <button
              type="button"
              className="fx-flip-face fx-flip-back fx-card-back flex flex-col items-center justify-center gap-4 cursor-pointer"
              onClick={() => setFlipped(true)}
              inert={flipped}
              aria-label="札をめくる"
            >
              <Stamp tone={fx.tone} size={78} tilt={-6} silent>{fx.glyph}</Stamp>
              <span className="font-mincho text-kin-300 tracking-[0.5em] text-sm"><Ruby>運命の札</Ruby></span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
