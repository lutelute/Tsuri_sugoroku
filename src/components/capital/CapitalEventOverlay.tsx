// 県メインイベント（capital）モーダル。
// capital ノード到達時に表示され、固有選択肢を提示する。
// 1選択でターン終了。

import { useEffect, useState } from 'react';
import { playBad, playGood, playMatsuri } from '../../utils/sound';
import type { CSSProperties } from 'react';
import { useGameStore } from '../../store/useGameStore';
import { getCapitalEvent } from '../../data/capitalEvents';
import { NODE_MAP } from '../../data/boardNodes';
import { FISH_DATABASE } from '../../data/fishDatabase';
import Button from '../shared/Button';
import Icon from '../shared/Icon';
import Ruby from '../shared/Ruby';
import FishIllustration from '../shared/FishIllustration';
import Stamp from '../fx/Stamp';
import Confetti from '../fx/Confetti';
import ScreenFlash from '../fx/ScreenFlash';
import MoneyTicker from '../fx/MoneyTicker';
import type { CapitalChoice, CapitalResult } from '../../game/types';
import { priceScale } from '../../game/city';
import { choiceText } from './choiceText';
import FestivalArt, { ChoiceArt } from './FestivalArt';
import { festivalArtFor } from './festivalArtPick';
import type { FestivalKind } from './festivalArtPick';
import { GearTile } from '../shop/GearArt';

/** 選択肢の札に添える絵（宴のお膳・名物の魚・特産の道具・巻物 など） */
function ChoicePicture({ choice }: { choice: CapitalChoice }) {
  const eff = choice.effect;
  if (eff.kind === 'specialty_shop') return <GearTile type={eff.equipmentType} level={eff.level} size={52} />;
  if (eff.kind === 'special_fishing') {
    const fish = FISH_DATABASE.find(f => f.id === eff.fishId);
    if (fish) {
      return (
        <span className="fd-gear is-lv3" style={{ width: 52, height: 52 }}>
          <FishIllustration fishId={fish.id} width={46} height={31} />
        </span>
      );
    }
  }
  return <ChoiceArt kind={eff.kind} size={52} />;
}

/** 祭りの飾り絵（札の上いっぱい。下は藍に溶かして見出しを重ねる） */
function FestivalBanner({ kind }: { kind: FestivalKind }) {
  return (
    <div className="fd-festival" aria-hidden="true">
      <FestivalArt kind={kind} />
    </div>
  );
}

function ChoiceCard({ choice, money, onPick, scale = 1 }: { choice: CapitalChoice; money: number; onPick: () => void; scale?: number }) {
  const eff = choice.effect;
  const scaled = eff.kind === 'feast' && scale > 1 && !!eff.moneyBonus;
  let disabledReason: string | null = null;
  if (eff.kind === 'specialty_shop' && money < eff.price) disabledReason = `所持金が足りない (¥${eff.price.toLocaleString()})`;

  return (
    <button
      onClick={onPick}
      disabled={!!disabledReason}
      className={`w-full text-left rounded-xl border p-2.5 transition group flex items-center gap-3 min-h-[64px]
        ${disabledReason
          ? 'border-washi/10 bg-ai-900/30 opacity-60 cursor-not-allowed'
          : 'border-kin-500/30 bg-ai-800/60 hover:bg-ai-700/70 hover:border-kin-400/60 cursor-pointer'}`}
    >
      <ChoicePicture choice={choice} />
      <div className="flex-1 min-w-0">
        <div className="font-mincho font-bold text-sm text-washi flex items-center gap-1.5 flex-wrap">
          <Ruby>{choice.label}</Ruby>
          {scaled && (
            <span className="text-[10px] font-sans px-1.5 py-0.5 rounded-full border border-kin-400/50 bg-kin-500/15 text-kin-200" title="まちづくりでは年度が進むと賞金が上がる">
              <Ruby>物価</Ruby> ×{scale}
            </span>
          )}
        </div>
        <div className="text-xs text-washi/65 mt-1 leading-snug">
          <Ruby>{choiceText(choice, scale)}</Ruby>
        </div>
        {disabledReason && (
          <div className="text-xs text-shu-300/80 mt-1.5"><Ruby>{disabledReason}</Ruby></div>
        )}
      </div>
    </button>
  );
}

/** 祭りの提灯（入場時に一度だけ揺れる） */
function Lanterns() {
  return (
    <div className="absolute top-1 left-0 right-0 flex justify-around px-6 pointer-events-none" aria-hidden="true">
      <svg className="absolute left-4 right-4 top-2 w-[calc(100%-2rem)] h-4" viewBox="0 0 100 10" preserveAspectRatio="none">
        <defs>
          <radialGradient id="lantern-shade" cx="0.35" cy="0.35" r="0.8">
            <stop offset="0" stopColor="#fff3c4" stopOpacity="0.55" />
            <stop offset="1" stopColor="#6a1a10" stopOpacity="0.35" />
          </radialGradient>
        </defs>
        <path d="M0 1 Q50 9 100 1" fill="none" stroke="#1a1510" strokeWidth="0.6" />
      </svg>
      {[0, 1, 2, 3, 4].map(i => (
        <svg
          key={i}
          width="22"
          height="34"
          viewBox="0 0 22 34"
          className="fx-swing relative"
          style={{ '--d': `${120 + i * 90}ms`, marginTop: i === 2 ? 8 : i % 2 ? 5 : 0 } as CSSProperties}
        >
          <line x1="11" y1="0" x2="11" y2="5" stroke="#1a1510" strokeWidth="1" />
          <rect x="6" y="4" width="10" height="3" rx="1" fill="#1a1510" />
          <ellipse cx="11" cy="17" rx="9" ry="11" fill="#e34a33" />
          <ellipse cx="11" cy="17" rx="9" ry="11" fill="url(#lantern-shade)" />
          <path d="M3 13h16M2.4 17h17.2M3 21h16" stroke="#a92e1d" strokeWidth="0.7" opacity="0.8" />
          <rect x="6" y="27" width="10" height="3" rx="1" fill="#1a1510" />
          <text x="11" y="20" textAnchor="middle" fontSize="8" fill="#fff4e6" fontFamily='"Yuji Syuku", serif'>祭</text>
        </svg>
      ))}
    </div>
  );
}

function ResultView({ result, onOk, moneyFrom, money, art }: { result: CapitalResult; onOk: () => void; moneyFrom: number; money: number; art: FestivalKind | null }) {
  const fish = result.fishId ? FISH_DATABASE.find(f => f.id === result.fishId) : null;
  useEffect(() => {
    if (result.success) playGood();
    else playBad();
  }, [result.success]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      {result.success && <Confetti variant="festive" mode="burst" count={46} seed={result.choiceLabel.length + 3} originY="38%" />}
      <ScreenFlash color={result.success ? '#fff1c4' : '#7fa9cd'} opacity={0.3} />
      <div className={`w-[92%] max-w-md md:max-w-xl ${result.success ? '' : 'fx-shake'}`}>
      <div className={`panel-ai animate-bounce-in relative rounded-2xl shadow-2xl p-6 border-2 ${result.success ? 'border-kin-500/50' : 'border-shu-500/50'}`}>
        {result.success && <div className="fx-rays" style={{ zIndex: -1 }} />}
        {art && <div className="-mx-6 -mt-6 mb-1 rounded-t-[0.9rem] overflow-hidden"><FestivalBanner kind={art} /></div>}
        <div className={`relative text-center mb-4 ${art ? '-mt-10' : ''}`}>
          <div className="flex justify-center mb-2">
            <Stamp tone={result.success ? 'shu' : 'sumi'} size={58} delay={180} tilt={-10}>{result.success ? '成功' : '無念'}</Stamp>
          </div>
          <h2 className={`font-mincho text-2xl font-bold ${result.success ? 'text-kin-300' : 'text-shu-300'}`}>
            <Ruby>{result.choiceLabel}</Ruby>
          </h2>
        </div>

        {fish && result.success && (
          <div className="flex justify-center mb-3">
            <div className="washi-card rounded-2xl px-5 py-3">
              <FishIllustration fishId={fish.id} width={120} height={80} />
            </div>
          </div>
        )}

        <p className="relative text-center text-sm text-washi/85 font-mincho mb-4 leading-relaxed">
          <Ruby>{result.message}</Ruby>
        </p>

        {money !== moneyFrom && (
          <p className="relative text-center text-sm text-kin-300 mb-3 flex items-center justify-center gap-1.5">
            <Icon name="coin" size={15} />
            <MoneyTicker value={money} initialFrom={moneyFrom} className="font-bold" popClassName="text-base" />
          </p>
        )}

        {result.successChance !== undefined && (
          <div className="text-center text-[10px] text-washi/45 mb-3">
            判定確率: {Math.round(result.successChance * 100)}%
          </div>
        )}

        <Button onClick={onOk} variant={result.success ? 'gold' : 'secondary'} className="w-full">
          <Ruby>続ける</Ruby>
        </Button>
      </div>
      </div>
    </div>
  );
}

export default function CapitalEventOverlay() {
  const players = useGameStore(s => s.players);
  const currentPlayerIndex = useGameStore(s => s.currentPlayerIndex);
  const applyCapitalChoice = useGameStore(s => s.applyCapitalChoice);
  const setTurnPhase = useGameStore(s => s.setTurnPhase);
  const lastCapitalResult = useGameStore(s => s.lastCapitalResult);
  const acknowledgeCapitalResult = useGameStore(s => s.acknowledgeCapitalResult);
  const isCity = useGameStore(s => s.settings.mode === 'city');
  // まちづくりは年度が進むと宴の賞金が上がる（物価）
  const scale = useGameStore(s => (s.settings.mode === 'city' ? priceScale(s.turn) : 1));

  const player = players[currentPlayerIndex];
  const node = NODE_MAP.get(player?.currentNode || '');
  const event = node?.capitalEventId ? getCapitalEvent(node.capitalEventId) : null;
  // 祭りに入ったときの所持金（結果画面で増減を数え上げる）
  const [moneyAtOpen] = useState(player?.money ?? 0);
  // 祭りに入ったら太鼓
  useEffect(() => {
    playMatsuri();
  }, []);

  // 結果表示モード
  if (lastCapitalResult) {
    return <ResultView result={lastCapitalResult} onOk={acknowledgeCapitalResult} moneyFrom={moneyAtOpen} money={player?.money ?? 0} art={event ? festivalArtFor(event.id) : null} />;
  }

  if (!event) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="panel-ai fx-rise relative rounded-2xl border-kin-500/50 shadow-2xl p-6 pt-0 w-[92%] max-w-md md:max-w-xl max-h-[88vh] overflow-y-auto">
        {/* 祭りの飾り絵の上に提灯を渡し、見出しを絵の裾に重ねる */}
        <div className="-mx-6 pt-8 bg-[#081626]"><FestivalBanner kind={festivalArtFor(event.id)} /></div>
        <Lanterns />
        {/* ヘッダ */}
        <div className="relative text-center mb-4 -mt-5">
          <div className="text-[10px] tracking-[0.4em] text-kin-300/90 font-mincho mb-1 [text-shadow:0_1px_3px_#0a1a2c]"><Ruby>県メインイベント</Ruby></div>
          <div className="flex items-center justify-center gap-2">
            <Stamp tone="shu" size={40} delay={350} tilt={-10}>{node?.id === 'tokyo' || node?.id === 'kyoto' ? '都' : '祭'}</Stamp>
            <h2 className="font-brush text-3xl text-kin-300 kinpaku">
              <Ruby>{event.title}</Ruby>
            </h2>
          </div>
          <div className="text-xs text-washi/60 mt-2 mb-3 flex items-center justify-center gap-1">
            <svg viewBox="0 0 12 14" width="10" height="12" aria-hidden="true"><path d="M6 0.8 C3 0.8 1 3 1 5.6 C1 8.8 6 13.2 6 13.2 C6 13.2 11 8.8 11 5.6 C11 3 9 0.8 6 0.8Z" fill="#e34a33" stroke="#f4ecd8" strokeWidth="0.8" /><circle cx="6" cy="5.4" r="1.7" fill="#f4ecd8" /></svg>
            <Ruby>{node?.name ?? ''}</Ruby>
          </div>
          <p className="text-sm text-washi/75 font-mincho leading-relaxed ink-underline inline-block">
            <Ruby>{event.flavor}</Ruby>
          </p>
        </div>

        {/* 所持金表示 */}
        <div className="flex items-center justify-end gap-1.5 mb-3 text-sm text-kin-300">
          <Icon name="coin" size={16} />
          <MoneyTicker value={player?.money ?? 0} />
        </div>

        {/* 選択肢 */}
        <div className="space-y-2" data-guide="festival">
          {event.choices.map((c, i) => (
            <div key={c.id} className="fx-rise" style={{ '--d': `${250 + i * 90}ms` } as CSSProperties}>
              <ChoiceCard
                choice={c}
                money={player?.money ?? 0}
                onPick={() => applyCapitalChoice(c.id)}
                scale={scale}
              />
            </div>
          ))}
        </div>

        {/* スキップ（イベントを見送る） */}
        <Button
          onClick={() => setTurnPhase(isCity ? 'city' : 'turn_end')}
          variant="secondary"
          className="w-full mt-4"
          size="sm"
        >
          <Ruby>見送って次へ</Ruby>
        </Button>
      </div>
    </div>
  );
}
