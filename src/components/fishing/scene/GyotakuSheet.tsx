// 魚拓ふうの台紙: 和紙に魚の絵、墨の写し、釣り場の添え書き、朱の落款。
// 釣果の札（FishCaughtModal）のほか、イベントの釣りや祭りの名物釣りの結果など、
// 「釣れた魚を見せる」所ならどこでも同じ絵柄で使える（ストアは読まない。CSS は index.css の「海の絵係」）。
import type { CSSProperties } from 'react';
import type { FishRarity } from '../../../game/types';
import FishIllustration from '../../shared/FishIllustration';
import Ruby from '../../shared/Ruby';
import Stamp from '../../fx/Stamp';
import { Ripple, Splash, SplashCrown } from '../FishingScene';

/** レア以上は魚拓に判を押す */
const RARITY_SEAL: Partial<Record<FishRarity, { text: string; tone: 'ai' | 'shu' }>> = {
  rare: { text: '逸品', tone: 'ai' },
  legendary: { text: '伝説', tone: 'shu' },
  mythical: { text: '幻の魚', tone: 'shu' },
};

interface GyotakuSheetProps {
  fishId: string;
  rarity: FishRarity;
  /** 大きさの倍率（0.5〜2 ほど）。絵の大きさに出し、1.5 以上は台紙からはみ出す。省くと 1 */
  size?: number;
  /** 釣り場の名前（「函館にて」と添える） */
  place?: string;
  /** 「初物」の落款 */
  isNew?: boolean;
  /** 「新記録」の金の判子 */
  record?: boolean;
  /** ふつうの魚を手早く見せる（台紙を低く、跳ねるのも早く） */
  fast?: boolean;
  /** 釣り上げた瞬間の水柱としぶきを出す */
  splash?: boolean;
  className?: string;
}

export default function GyotakuSheet({ fishId, rarity, size = 1, place, isNew = false, record = false, fast = false, splash = false, className = '' }: GyotakuSheetProps) {
  const seal = RARITY_SEAL[rarity];
  const big = rarity === 'legendary' || rarity === 'mythical';
  // 大きさは絵にも出す（小さい魚は小さく、巨大な魚は台紙からはみ出す）
  const artScale = Math.max(0.84, Math.min(1.26, 0.7 + size * 0.3));
  return (
    <div className={`um-gyotaku ${seal ? 'is-show' : ''} ${size >= 1.5 ? 'is-huge' : ''} ${fast ? 'is-fast' : ''} ${className}`}>
      {place && (
        <p className="um-gyotaku-note"><Ruby>{place}</Ruby>にて</p>
      )}
      {splash && (
        <div className="absolute left-1/2 bottom-[18%] w-0 h-0" aria-hidden>
          <Ripple size={150} flat />
          <SplashCrown size={big ? 150 : 110} tone={big ? 'kin' : 'foam'} />
          <Splash count={10} distance={74} spread={170} />
        </div>
      )}
      <div className="fg-jump relative" style={{ animationDelay: fast ? '0.05s' : '0.2s' }}>
        <div className="um-gyotaku-size" style={{ '--um-art-k': artScale } as CSSProperties}>
          <FishIllustration fishId={fishId} width={120} height={80} silhouette className="um-gyotaku-print" />
          <FishIllustration fishId={fishId} width={240} height={160} className="um-gyotaku-fish" />
        </div>
      </div>
      {seal && (
        <span className="absolute bottom-2 left-2">
          <Stamp tone={seal.tone} size={seal.text.length >= 3 ? 60 : big ? 50 : 44} delay={900} tilt={-7} silent>{seal.text}</Stamp>
        </span>
      )}
      {isNew && (
        <span className="seal animate-seal-stamp absolute top-2 right-2 w-11 h-11 sm:w-12 sm:h-12 rounded-md font-mincho text-[11px] sm:text-xs font-bold" style={{ animationDelay: '0.5s' }}>
          初物
        </span>
      )}
      {record && (
        <span className="absolute bottom-2 right-2">
          <Stamp tone="kin" size={46} delay={700} tilt={8}>新記録</Stamp>
        </span>
      )}
    </div>
  );
}
