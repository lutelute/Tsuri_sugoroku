import type { CSSProperties } from 'react';
import type { Fish } from '../../game/types';
import Button from '../shared/Button';
import FishIllustration from '../shared/FishIllustration';
import Icon from '../shared/Icon';
import Ruby from '../shared/Ruby';
import { REGION_LABELS, REGION_ORDER } from './encyclopediaFilter';

const RARITY_LABELS: Record<string, { label: string; color: string }> = {
  common: { label: 'コモン', color: 'text-washi/70' },
  uncommon: { label: 'アンコモン', color: 'text-emerald-300' },
  rare: { label: 'レア', color: 'text-ai-300' },
  legendary: { label: 'レジェンダリー', color: 'text-kin-300' },
  mythical: { label: 'ミシカル', color: 'text-shu-400' },
};

interface FishDetailProps {
  fish: Fish;
  caught: boolean;
  onClose: () => void;
}

/** 魚の詳細。魚拓のような和紙の台紙に大きな絵と、筆の名前（縦書き）と朱の印。まだの魚は墨の影だけ。 */
export default function FishDetail({ fish, caught, onClose }: FishDetailProps) {
  const rarity = RARITY_LABELS[fish.rarity];
  const name = caught ? fish.name : '？？？';
  const nameSize = name.length <= 4 ? 28 : name.length <= 6 ? 23 : name.length <= 8 ? 19 : 15;
  const regions = REGION_ORDER.filter(r => fish.regions.includes(r));

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="panel-ai relative rounded-2xl p-4 sm:p-5 max-w-sm md:max-w-md w-[90%] max-h-[92dvh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <button
          onClick={onClose}
          aria-label="閉じる"
          className="absolute top-1.5 right-1.5 z-10 flex items-center justify-center w-11 h-11 rounded-full bg-ai-900/70 border border-kin-500/40 text-washi/80 hover:text-washi transition"
        >
          <Icon name="close" size={18} />
        </button>

        <p className={`flex items-center min-h-[36px] pr-12 text-sm font-bold font-mincho ${rarity.color}`}>{rarity.label}</p>

        {/* 魚拓の台紙: 左に筆の名前（縦書き）、右に大きな絵、隅に朱の印 */}
        <div className={`fd-gyotaku ${caught ? '' : 'is-shadow'}`}>
          <div className="fd-gyotaku-name font-brush" style={{ fontSize: nameSize } as CSSProperties}>
            <Ruby>{name}</Ruby>
          </div>
          <div className="fd-gyotaku-fish">
            <FishIllustration fishId={fish.id} width={240} height={160} silhouette={!caught} className="fd-gyotaku-art" />
          </div>
          <span className="fd-gyotaku-seal seal font-mincho">{caught ? 'つれた' : 'まだ'}</span>
        </div>

        {caught ? (
          <div className="mt-2 space-y-2 text-sm">
            <p className="text-washi/75 leading-relaxed"><Ruby>{fish.description}</Ruby></p>

            <div className="flex flex-wrap justify-center gap-1.5 mt-3">
              <span className="text-xs bg-ai-500/20 text-ai-200 border border-ai-500/30 px-2 py-0.5 rounded-full"><Ruby>{fish.habitat}</Ruby></span>
              <span className="text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full"><Ruby>{fish.season}</Ruby></span>
              <span className="text-xs bg-kin-500/20 text-kin-300 border border-kin-500/30 px-2 py-0.5 rounded-full">
                {'★'.repeat(fish.difficulty)}{'☆'.repeat(5 - fish.difficulty)}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 mt-3">
              <div className="washi-card rounded-lg p-2 text-center">
                <div className="text-ai-900/60 text-xs">ポイント</div>
                <div className="font-bold text-shu-500 tabular-nums">{fish.points}</div>
              </div>
              <div className="washi-card rounded-lg p-2 text-center">
                <div className="text-ai-900/60 text-xs"><Ruby>重量</Ruby></div>
                <div className="font-bold text-ai-900 tabular-nums">{fish.weight.min}~{fish.weight.max}kg</div>
              </div>
              <div className="washi-card rounded-lg p-2 text-center">
                <div className="text-ai-900/60 text-xs"><Ruby>必要装備</Ruby></div>
                <div className="font-bold text-ai-900 tabular-nums">Lv.{fish.minEquipmentLevel}</div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-1 text-xs text-washi/55 mt-2">
              <span className="mr-0.5"><Ruby>地域</Ruby>:</span>
              {regions.map(r => (
                <span key={r} className="rounded-full border border-washi/20 bg-ai-900/40 px-2 py-0.5 text-washi/75"><Ruby>{REGION_LABELS[r]}</Ruby></span>
              ))}
            </div>

            {fish.wikiUrl && (
              <a
                href={fish.wikiUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 mt-3 min-h-[44px] text-center text-sm text-ai-300 hover:text-ai-200 underline transition"
              >
                <Icon name="book" size={16} />
                <Ruby>詳しく見る（Wikipedia）</Ruby>
              </a>
            )}
          </div>
        ) : (
          <p className="mt-3 text-sm text-washi/55 text-center"><Ruby>まだ釣っていません</Ruby></p>
        )}

        <Button onClick={onClose} variant="secondary" size="sm" className="w-full mt-4 min-h-[44px]">
          <Ruby>閉じる</Ruby>
        </Button>
      </div>
    </div>
  );
}
