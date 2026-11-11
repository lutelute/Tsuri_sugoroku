// 釣り場の札: この釣り場で何が釣れるか（種類の数・まだ見ていない数・地域制覇までの残り・影絵3つ）。
// 釣り方を選ぶ画面の上に出す。釣り旅でもまちづくりでも同じ部品（まちづくりは下の欄 footer に魚市場の値段を出す）。
import { useMemo } from 'react';
import type { ReactNode } from 'react';
import type { CaughtFish, Fish, FishRarity, PlayerEquipment } from '../../game/types';
import { summarizeSpot, regionProgress } from '../../game/fishing';
import type { FishSelectOpts } from '../../game/fishing';
import { NODE_MAP } from '../../data/boardNodes';
import { REGION_NAME } from '../map/mapTheme';
import FishIllustration from '../shared/FishIllustration';
import Icon from '../shared/Icon';
import Ruby from '../shared/Ruby';

// レア度の印（図鑑と同じ並びの色を、和紙の上で見える濃さにしたもの）
const RARITY_TAG: Record<FishRarity, { label: string; dot: string }> = {
  common: { label: 'コモン', dot: 'var(--color-washi-300)' },
  uncommon: { label: 'アンコモン', dot: '#2f9e6e' },
  rare: { label: 'レア', dot: 'var(--color-ai-400)' },
  legendary: { label: 'レジェンダリー', dot: 'var(--color-kin-600)' },
  mythical: { label: 'ミシカル', dot: 'var(--color-shu-600)' },
};

interface SpotCardProps {
  nodeId: string;
  equipment: PlayerEquipment;
  /** 図鑑（魚の id → 見たことがある） */
  seen: Record<string, boolean>;
  /** この局で釣った魚（地域制覇までの残りを出す）。渡さなければ出さない（まちづくり） */
  caughtFish?: CaughtFish[];
  /** 漁場の補正（まちづくりの荒れ・豊か）。釣り旅では渡さない */
  selectOpts?: FishSelectOpts;
  /** 札の下の欄（まちづくりの魚市場の値段など） */
  footer?: ReactNode;
}

/** 影絵1つ。hidden なら黒塗りにして名前を伏せる */
function Shadow({ caption, fish, hidden, line, tone = 'plain' }: {
  caption: string;
  fish: Fish | null;
  hidden: boolean;
  /** 名前の代わりに出す1行（道具が足りない魚の「Lv3 の道具で会える」など） */
  line?: string;
  tone?: 'plain' | 'locked';
}) {
  const tag = fish ? RARITY_TAG[fish.rarity] : null;
  return (
    <div className={`tk-shadow washi-card rounded-lg px-1 pt-1 pb-1.5 flex flex-col items-center text-center min-w-0 ${tone === 'locked' ? 'tk-shadow-locked' : ''}`}>
      <span className="text-[10px] leading-tight font-mincho text-[#6b5a3a] whitespace-nowrap"><Ruby>{caption}</Ruby></span>
      <div className="h-[42px] flex items-center justify-center">
        {fish
          ? <FishIllustration fishId={fish.id} width={62} height={41} silhouette={hidden} className={hidden ? 'tk-shadow-fish' : ''} />
          : <span className="seal w-8 h-8 rounded-md font-mincho text-[10px] font-bold leading-none">済</span>}
      </div>
      <span className={`text-[11px] leading-tight font-bold text-sumi w-full ${line ? '' : 'truncate'}`}>
        {line ? <Ruby>{line}</Ruby> : fish ? (hidden ? '？？？' : <Ruby>{fish.name}</Ruby>) : <Ruby>ぜんぶ見た</Ruby>}
      </span>
      {tag && (
        <span className="mt-0.5 inline-flex items-center gap-1 text-[9px] leading-none text-[#5a4a2e] whitespace-nowrap">
          <span className="w-2 h-2 rounded-full border border-sumi/40" style={{ backgroundColor: tag.dot }} aria-hidden="true" />
          {tag.label}
        </span>
      )}
    </div>
  );
}

export default function SpotCard({ nodeId, equipment, seen, caughtFish, selectOpts, footer }: SpotCardProps) {
  const node = NODE_MAP.get(nodeId);
  const isSpecial = node?.type === 'fishing_special';
  const spot = useMemo(
    () => (node ? summarizeSpot(node.id, node.region, equipment, isSpecial, seen, selectOpts) : null),
    [node, equipment, isSpecial, seen, selectOpts],
  );
  const region = useMemo(
    () => (node && caughtFish ? regionProgress(caughtFish, node.region) : null),
    [node, caughtFish],
  );
  if (!node || !spot) return null;

  return (
    <section className="tk-spot rounded-xl border border-kin-500/30 bg-ai-950/45 px-3 py-2.5 space-y-2" data-guide="fish-spot" aria-label="この釣り場の魚">
      <div className="flex items-center gap-1.5 flex-wrap">
        <Icon name="fish" size={16} className="text-kin-300 shrink-0" />
        <span className="font-mincho font-bold text-kin-200 text-sm"><Ruby>{node.name}</Ruby><Ruby>の釣り場</Ruby></span>
        {isSpecial && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-shu-600/35 border border-shu-400/50 text-shu-100 font-mincho"><Ruby>名所</Ruby></span>
        )}
      </div>

      {isSpecial && (
        <p className="text-[11px] text-shu-400/90 leading-snug"><Ruby>特別な釣りスポット。レア魚が出やすく、大漁のチャンスも UP！</Ruby></p>
      )}

      {/* 種類の数 */}
      <p className="text-xs text-washi/85 leading-snug flex flex-wrap gap-x-3 gap-y-0.5">
        <span className="whitespace-nowrap">
          <Ruby>この釣り場の魚</Ruby> <span className="text-kin-300 font-bold tabular-nums text-sm">{spot.total}</span><Ruby>種類</Ruby>
        </span>
        <span className="whitespace-nowrap">
          {spot.unseen > 0
            ? <><Ruby>まだ見ていない</Ruby> <span className="text-shu-400 font-bold tabular-nums text-sm">{spot.unseen}</span><Ruby>種類</Ruby></>
            : <span className="text-emerald-300 font-bold"><Ruby>ぜんぶ見た</Ruby></span>}
        </span>
      </p>

      {/* 地域制覇までの残り（釣り旅） */}
      {region && (
        <div className="flex items-center gap-2 flex-wrap text-xs text-washi/85">
          <span>
            <Ruby>{REGION_NAME[node.region]}</Ruby>{' '}
            {region.left > 0
              ? <><Ruby>あと</Ruby><span className="text-kin-300 font-bold tabular-nums text-sm">{region.left}</span><Ruby>種類で制覇</Ruby></>
              : <span className="text-emerald-300 font-bold"><Ruby>制覇した</Ruby></span>}
          </span>
          <span className="flex gap-0.5" aria-hidden="true">
            {Array.from({ length: region.goal }, (_, i) => (
              <span key={i} className={`w-2 h-2 rounded-full border ${i < region.caught ? 'bg-kin-400 border-kin-300' : 'bg-ai-950/70 border-kin-500/30'}`} />
            ))}
          </span>
        </div>
      )}

      {/* 影絵3つ: 今の道具で釣れるいちばんの大物・まだ見ていない魚・道具が足りない魚 */}
      <div className="grid grid-cols-3 gap-1.5">
        <Shadow caption="いちばんの大物" fish={spot.best} hidden={!!spot.best && !seen[spot.best.id]} />
        <Shadow caption="まだ見ぬ魚" fish={spot.rarestUnseen} hidden />
        {spot.locked
          ? <Shadow caption="道具が足りない" fish={spot.locked.fish} hidden tone="locked" line={`Lv${spot.locked.needLevel} の道具で会える`} />
          : <Shadow caption="道具は十分" fish={null} hidden={false} line="ぜんぶ狙える" />}
      </div>
      {spot.lockedCount > 1 && (
        <p className="text-[10px] text-washi/50 leading-tight">
          <Ruby>道具を育てると、あと</Ruby><span className="tabular-nums">{spot.lockedCount}</span><Ruby>種類に会える</Ruby>
        </p>
      )}

      {footer}
    </section>
  );
}
