import { useEffect, useState } from 'react';
import type { Fish, FishRarity, FishingRig } from '../../game/types';
import { playChime, playFanfare, playGood } from '../../utils/sound';
import { FISH_SELL_PRICE } from '../../game/constants';
import { FISH_DATABASE } from '../../data/fishDatabase';
import Button from '../shared/Button';
import FishIllustration from '../shared/FishIllustration';
import Ruby from '../shared/Ruby';
import Confetti from '../fx/Confetti';
import HoloFoil from '../fx/HoloFoil';
import ScreenFlash from '../fx/ScreenFlash';
import { useReducedMotion } from '../fx/useReducedMotion';
import { useCountUp } from '../fx/useCountUp';
import { FAIL_HINT } from './miniGameMeta';
import type { FailReason } from './miniGameMeta';
import { Ripple } from './FishingScene';
import SaleNote from './SaleNote';
import GyotakuSheet from './scene/GyotakuSheet';
import FishShadow from './scene/FishShadow';
import { weightText } from './weightText';
import { useGameStore } from '../../store/useGameStore';

const RARITY_LABELS: Record<FishRarity, string> = {
  common: 'コモン',
  uncommon: 'アンコモン',
  rare: 'レア',
  legendary: 'レジェンダリー',
  mythical: 'ミシカル',
};

/** めずらしいほど、金箔の舞いが増える */
const KINPAKU_COUNT: Record<FishRarity, number> = { common: 0, uncommon: 0, rare: 18, legendary: 44, mythical: 72 };

/** 釣果の売値（ストアが計算したもの）。mul はまちづくりの魚市場の倍率、boom は大物で町おこしが起きたか */
interface SaleInfo {
  total: number;
  main: number;
  mul: number;
  boom?: boolean;
}

interface FishCaughtModalProps {
  fish: Fish | null;
  size: number;
  escaped: boolean;
  tairyouCount: number;
  /** 大漁で一緒に揚がった魚 */
  tairyouFishIds?: string[];
  isNew?: boolean;
  /** 逃げられた理由（ヒント表示用） */
  failReason?: FailReason | null;
  /** 釣り場の名前（魚拓の添え書き） */
  place?: string;
  /** これまでに釣った同じ魚の最大サイズ（無ければ null） */
  prevBest?: number | null;
  /** 売値の内訳（無ければ基本の売値を出す） */
  sale?: SaleInfo | null;
  /** 仕掛け（逃げられたときの一言に使う） */
  rig?: FishingRig;
  onClose: () => void;
}

const FISH_NAME = new Map(FISH_DATABASE.map(f => [f.id, f.name]));

/** 大物の後光（conic-gradient を回すだけ） */
const RAYS: Partial<Record<FishRarity, string>> = {
  legendary: 'repeating-conic-gradient(from 0deg, rgba(241,216,147,0.3) 0deg 10deg, transparent 10deg 24deg)',
  mythical: 'repeating-conic-gradient(from 0deg, rgba(239,106,82,0.32) 0deg 8deg, rgba(241,216,147,0.24) 8deg 16deg, transparent 16deg 24deg)',
};

/** 物差しの端（サイズの倍率）。魚の大きさはおよそ 0.5〜2.0 倍 */
const RULER_MIN = 0.5;
const RULER_MAX = 2;
const rulerPos = (size: number) => Math.max(0, Math.min(1, (size - RULER_MIN) / (RULER_MAX - RULER_MIN))) * 100;
/** 大きさの呼び名の境目（サイズの見出しと同じ） */
const RULER_ZONES: { upTo: number; label: string; tone: string }[] = [
  { upTo: 0.7, label: '小さい', tone: 'is-small' },
  { upTo: 1.2, label: '普通', tone: 'is-mid' },
  { upTo: 1.5, label: '大きい', tone: 'is-big' },
  { upTo: RULER_MAX, label: '巨大', tone: 'is-huge' },
];

/** 大きさの物差し: 今回の魚（上の魚のしるし）と、これまでの最大（下のひし形）を並べる */
function SizeRuler({ size, prevBest }: { size: number; prevBest: number | null }) {
  const record = prevBest !== null && size > prevBest;
  return (
    <div className="um-ruler-wrap">
      <div className="um-ruler">
        {RULER_ZONES.map((z, i) => {
          const from = i === 0 ? RULER_MIN : RULER_ZONES[i - 1].upTo;
          return (
            <span key={z.label} className={`um-ruler-zone ${z.tone}`} style={{ left: `${rulerPos(from)}%`, width: `${rulerPos(z.upTo) - rulerPos(from)}%` }}>
              <Ruby>{z.label}</Ruby>
            </span>
          );
        })}
        {prevBest !== null && <i className="um-ruler-prev" style={{ left: `${rulerPos(prevBest)}%` }} />}
        <svg className="um-ruler-now" style={{ left: `${rulerPos(size)}%` }} viewBox="0 0 30 26" aria-hidden>
          <path d="M28 8 C 22 1.5 11 1.5 7 8 C 11 14.5 22 14.5 28 8 Z M 7.6 8 L 1.4 2.8 V 13.2 Z" />
          <path d="M15 15 V 25" strokeWidth="2" />
        </svg>
      </div>
      {prevBest !== null && (
        <p className={`mt-1.5 text-xs ${record ? 'text-kin-300 font-bold' : 'text-washi/65'}`}>
          {record && <><Ruby>記録を更新！</Ruby>{' '}</>}
          <span className="um-ruler-key" /> <Ruby>これまでの最大</Ruby> {(prevBest * 100).toFixed(0)}%
        </p>
      )}
    </div>
  );
}

/** 釣り上げたときの札: 魚拓ふうの和紙の台紙に魚が跳ねて収まる */
function CaughtCard({ fish, size, tairyouCount, tairyouFishIds, isNew, place, prevBest, sale, onClose }: {
  fish: Fish; size: number; tairyouCount: number; tairyouFishIds: string[]; isNew: boolean;
  place?: string; prevBest: number | null; sale: SaleInfo | null; onClose: () => void;
}) {
  const [revealed, setRevealed] = useState(false);
  const reducedMotion = useReducedMotion();
  const foilTier = fish.rarity === 'mythical' || fish.rarity === 'legendary' ? fish.rarity : null;
  const points = Math.round(fish.points * size);
  const sellPrice = sale ? sale.main : Math.round((FISH_SELL_PRICE[fish.rarity] ?? 200) * size);
  const sizeLabel = size >= 1.5 ? '巨大！' : size >= 1.2 ? '大きい' : size <= 0.7 ? '小さい' : '普通';
  const weight = weightText(fish.weight.min + (fish.weight.max - fish.weight.min) * size);
  const rays = RAYS[fish.rarity];
  const kinpaku = KINPAKU_COUNT[fish.rarity];
  const record = prevBest !== null && size > prevBest;
  // 見せ方の段階: レア以上は絵を札いっぱいに大きく・金箔・魚拓の判。巨大は絵が台紙からはみ出す。
  // ふつうの魚（コモン・アンコモンで、巨大でも大漁でもない）は手早く見せる。
  const showcase = fish.rarity !== 'common' && fish.rarity !== 'uncommon';
  const huge = size >= 1.5;
  const fast = !showcase && !huge && tairyouCount === 0;
  const shownPoints = useCountUp(points, fast ? 350 : 700, 0, fast ? 150 : 450);
  const shownPrice = useCountUp(sellPrice, fast ? 350 : 700, 0, fast ? 220 : 600);
  // 背の低い画面で 巨大・大漁 が重なるときは、説明文をたたんで OK まで1画面に収める
  const busy = huge || tairyouCount > 0;
  const inCity = useGameStore(st => !!st.city);

  const sheet = (
    <GyotakuSheet
      fishId={fish.id}
      rarity={fish.rarity}
      size={size}
      place={place}
      isNew={isNew && prevBest === null}
      record={record}
      fast={fast}
      splash
    />
  );

  return (
    <>
      {rays && <div className="fg-rays um-result-rays" style={{ background: rays }} aria-hidden />}
      {!reducedMotion && kinpaku > 0 && (fish.rarity !== 'mythical' || revealed) && <Confetti variant="kin" mode="burst" count={kinpaku} seed={fish.points + Math.round(size * 100)} originY="34%" />}
      {revealed && fish.rarity === 'mythical' && !reducedMotion && <ScreenFlash color="#fff5d6" opacity={0.48} />}
      <div className={`um-card um-card-${fish.rarity} ${fast ? 'is-fast' : ''} ${busy ? 'is-busy' : ''} animate-bounce-in`}>
        <div className="um-card-grid">
          {/* 魚拓: 和紙の台紙・釣り場の添え書き・朱の落款 */}
          <div className="um-card-art">
            {foilTier
              ? <HoloFoil key={fish.id} tier={foilTier} reveal={foilTier === 'mythical'} onReveal={() => setRevealed(true)} className="hf-caught">{sheet}</HoloFoil>
              : sheet}
            <h3 className="font-mincho text-2xl sm:text-3xl font-bold mt-3 text-washi"><Ruby>{fish.name}</Ruby></h3>
            <p className={`um-rarity um-rarity-${fish.rarity}`}>{RARITY_LABELS[fish.rarity]}</p>
          </div>

          <div className="um-card-info">
            <p className="um-card-desc text-sm text-washi/75 mb-2.5"><Ruby>{fish.description}</Ruby></p>
            <div className="um-card-chips flex flex-wrap justify-center gap-1.5 mb-3">
              <span className="text-xs bg-ai-500/40 text-ai-200 px-2 py-0.5 rounded-full border border-ai-300/30"><Ruby>{fish.habitat}</Ruby></span>
              <span className="text-xs bg-kin-500/20 text-kin-300 px-2 py-0.5 rounded-full border border-kin-500/30"><Ruby>{fish.season}</Ruby></span>
            </div>

            {/* 4つの札（数字が主役。折り返さない） */}
            <div className="um-card-stats grid grid-cols-2 gap-2 mb-3">
              <div className="um-stat">
                <span className="um-stat-label"><Ruby>重量</Ruby></span>
                <span className="um-stat-value text-washi">{weight.value}<small>{weight.unit}</small></span>
              </div>
              <div className="um-stat">
                <span className="um-stat-label">サイズ</span>
                <span className="um-stat-value text-washi">{(size * 100).toFixed(0)}<small>%</small><em className={size >= 1.5 ? 'is-huge' : ''}><Ruby>{sizeLabel}</Ruby></em></span>
              </div>
              <div className="um-stat">
                <span className="um-stat-label">ポイント</span>
                <span className="um-stat-value text-kin-300">{shownPoints.toLocaleString()}<small>pt</small></span>
              </div>
              <div className="um-stat">
                <span className="um-stat-label"><Ruby>売却</Ruby></span>
                <span className="um-stat-value text-emerald-300"><small>¥</small>{shownPrice.toLocaleString()}</span>
              </div>
            </div>

            <SizeRuler size={size} prevBest={prevBest} />

            {/* 売値の内訳（まちづくりの魚市場・町おこし・釣り大会。釣り係の部品） */}
            <SaleNote className="mt-2.5" />
            {sale && tairyouCount > 0 && !inCity && (
              <p className="mt-2.5 text-xs">
                <span className="rounded-full border border-emerald-300/35 bg-emerald-500/15 px-2 py-0.5 text-emerald-200">あわせて ¥{sale.total.toLocaleString()}</span>
              </p>
            )}

            {(huge || tairyouCount > 0) && (
              <div className="um-bonus-row">
                {huge && (
                  <p className="um-bonus is-kin">
                    <Ruby>巨大魚</Ruby>ボーナス +200pt！
                  </p>
                )}
                {tairyouCount > 0 && (
                  <p className="um-bonus is-shu">
                    <Ruby>大漁</Ruby>！ +{tairyouCount}<Ruby>匹</Ruby>ボーナス！
                  </p>
                )}
              </div>
            )}
            {tairyouFishIds.length > 0 && (
              <div className="mt-1.5 flex flex-wrap justify-center gap-1.5">
                {/* 一緒に揚がった魚が、上から降ってくる */}
                {tairyouFishIds.map((id, i) => (
                  <span key={`${id}-${i}`} className="um-rain inline-flex items-center gap-1 text-xs text-washi/90 bg-ai-950/55 border border-kin-500/30 rounded-full pl-1 pr-2 py-0.5" style={{ animationDelay: `${0.9 + i * 0.18}s` }}>
                    <FishIllustration fishId={id} width={36} height={24} />
                    <Ruby>{FISH_NAME.get(id) ?? id}</Ruby>
                  </span>
                ))}
              </div>
            )}

            {/* OK は画面の下に留まる（札が画面より長くなっても、スクロールせずに押せる） */}
            <div className="um-card-ok">
              <Button onClick={onClose} variant="primary" size="md" className="w-full">
                OK
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/** 逃げられたときの札: 切れた糸がゆれ、波紋だけが残り、魚の影が遠ざかる */
function EscapedCard({ fish, failReason, rig, onClose }: { fish: Fish; failReason: FailReason | null; rig?: FishingRig; onClose: () => void }) {
  const hint = failReason ? FAIL_HINT[failReason] : null;
  // 釣り旅の大物ねらいは、逃がすと道具の傷みが倍になる（まちづくりでは道具は傷まない）
  const inCity = useGameStore(st => !!st.city);
  const rigCost = rig === 'oomono' && !inCity;
  return (
    <div className="um-card um-card-escaped animate-bounce-in">
      <div className="um-escape" aria-hidden>
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 240 130" preserveAspectRatio="xMidYMin slice">
          {/* 水面 */}
          <path d="M0 52 C 20 48 40 56 60 52 C 80 48 100 56 120 52 C 140 48 160 56 180 52 C 200 48 220 56 240 52 L 240 130 L 0 130 Z" fill="rgba(16,42,68,0.9)" />
          <path d="M0 52 C 20 48 40 56 60 52 C 80 48 100 56 120 52 C 140 48 160 56 180 52 C 200 48 220 56 240 52" fill="none" stroke="rgba(244,241,228,0.55)" strokeWidth="1.6" />
          {/* 残った波紋 */}
          <g fill="none" stroke="rgba(244,241,228,0.4)" strokeWidth="1.4">
            <ellipse cx="104" cy="56" rx="22" ry="4" />
            <ellipse cx="104" cy="56" rx="40" ry="7" opacity="0.6" />
          </g>
          {/* 竿先と、切れてちぢれた糸 */}
          <path d="M 248 -6 C 226 0 208 6 190 14" fill="none" stroke="#24170b" strokeWidth="5.4" strokeLinecap="round" />
          <path d="M 248 -6 C 226 0 208 6 190 14" fill="none" stroke="#c9963c" strokeWidth="3" strokeLinecap="round" />
          <g className="um-snapline">
            <path d="M 190 14 C 186 26 180 34 176 42 C 172 50 180 54 183 48 C 186 42 176 40 175 48 C 174 54 178 57 181 55" fill="none" stroke="rgba(244,236,216,0.9)" strokeWidth="1.5" strokeLinecap="round" />
          </g>
        </svg>
        <div className="absolute left-[43%] top-[43%] w-0 h-0">
          <Ripple size={150} flat />
          <Ripple size={230} delay={500} flat />
        </div>
        {/* 逃がした魚の影（逃がした魚は大きい） */}
        <div className="um-flee absolute left-[36%] top-[68%]">
          <FishShadow fixed>
            <FishIllustration fishId={fish.id} width={120} height={80} silhouette />
          </FishShadow>
        </div>
      </div>
      <h3 className="font-mincho text-2xl sm:text-3xl font-bold text-shu-400 mt-4 mb-1.5"><Ruby>{hint?.title ?? '逃げられた…'}</Ruby></h3>
      <p className="text-washi/75 mb-3"><Ruby>{fish.name}</Ruby><Ruby>に逃げられてしまった</Ruby></p>
      {hint && (
        <p className="mb-4 rounded-lg bg-ai-950/60 border border-kin-500/35 px-3 py-2 text-sm text-kin-300">
          <Ruby>コツ</Ruby>: <Ruby>{hint.hint}</Ruby>
        </p>
      )}
      {!hint && <p className="text-sm text-washi/55 mb-5"><Ruby>{fish.description}</Ruby></p>}
      {rigCost && (
        <p className="mb-4 text-xs text-shu-400"><Ruby>大物ねらいで逃がすと、道具が2倍傷む</Ruby></p>
      )}
      <Button onClick={onClose} variant="primary" size="md" className="w-full">
        OK
      </Button>
    </div>
  );
}

export default function FishCaughtModal({ fish, size, escaped, tairyouCount, tairyouFishIds = [], isNew, failReason, place, prevBest = null, sale = null, rig, onClose }: FishCaughtModalProps) {
  // 釣果の発表: 大物は太鼓と琴、レアは吉の音、図鑑に初めて載る魚はりん（釣り上げた音は締めで鳴らし済み）
  const caughtRarity = fish && !escaped ? fish.rarity : null;
  useEffect(() => {
    if (!caughtRarity) return;
    if (caughtRarity === 'legendary' || caughtRarity === 'mythical') playFanfare();
    else if (caughtRarity === 'rare') playGood();
    else if (isNew) playChime();
  }, [caughtRarity, isNew]);

  if (!fish) return null;

  return (
    <div className="um-result fixed inset-0 z-50">
      <div className="um-result-inner">
        {escaped ? (
          <EscapedCard fish={fish} failReason={failReason ?? null} rig={rig} onClose={onClose} />
        ) : (
          <CaughtCard
            key={fish.id}
            fish={fish}
            size={size}
            tairyouCount={tairyouCount}
            tairyouFishIds={tairyouFishIds}
            isNew={!!isNew}
            place={place}
            prevBest={prevBest}
            sale={sale}
            onClose={onClose}
          />
        )}
      </div>
    </div>
  );
}
