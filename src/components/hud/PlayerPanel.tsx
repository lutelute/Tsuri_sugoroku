import type { Player } from '../../game/types';
import { getEquipmentName, getEquippedLevel } from '../../game/equipment';
import { NODE_MAP } from '../../data/boardNodes';
import Icon from '../shared/Icon';

interface PlayerPanelProps {
  player: Player;
  isActive: boolean;
}

export default function PlayerPanel({ player, isActive }: PlayerPanelProps) {
  const node = NODE_MAP.get(player.currentNode);

  return (
    <div className={`rounded-xl p-3 transition-all ${
      isActive
        ? 'bg-ai-700/60 border border-kin-500/45 shadow-lg shadow-ai-950/40'
        : 'bg-ai-900/40 border border-kin-500/15 opacity-65'
    }`}>
      {/* ヘッダー */}
      <div className="flex items-center gap-2 mb-2">
        <div
          className="w-3 h-3 rounded-full shrink-0 ring-1 ring-white/30"
          style={{ backgroundColor: player.color }}
        />
        <span className="font-bold font-mincho text-sm truncate text-washi">{player.name}</span>
        {player.hasFinished && <span className="seal text-[8px] w-4 h-4 rounded-[3px] leading-none ml-auto">着</span>}
      </div>

      {/* ステータス */}
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-washi/75">
        <div className="flex items-center gap-1 text-kin-300"><Icon name="coin" size={13} /> ¥{player.money.toLocaleString()}</div>
        <div className="flex items-center gap-1"><Icon name="fish" size={13} className="text-ai-200" /> {player.caughtFish.length}匹</div>
        <div className="truncate">📍 {node?.name || '?'}</div>
        <div className="flex items-center gap-1"><Icon name="trophy" size={13} className="text-kin-300" /> {player.score}pt</div>
      </div>

      {/* 装備 */}
      {isActive && (
        <div className="mt-2 pt-2 border-t border-kin-500/15 text-xs text-washi/55 space-y-0.5">
          <div className="flex items-center gap-1.5"><Icon name="rod" size={13} className="text-washi/70" /> {getEquipmentName('rod', getEquippedLevel(player.equipment, 'rod')) || '未装着'}</div>
          <div className="flex items-center gap-1.5"><Icon name="reel" size={13} className="text-washi/70" /> {getEquipmentName('reel', getEquippedLevel(player.equipment, 'reel')) || '未装着'}</div>
          <div className="flex items-center gap-1.5"><Icon name="lure" size={13} className="text-washi/70" /> {getEquipmentName('lure', getEquippedLevel(player.equipment, 'lure')) || '未装着'}</div>
        </div>
      )}

      {/* バフ表示 */}
      {player.fishBonusTurnsLeft > 0 && (
        <div className="mt-1 text-xs text-kin-300 flex items-center gap-1">
          ✦ 釣り{player.fishBonusMultiplier}倍 (残{player.fishBonusTurnsLeft}T)
        </div>
      )}
    </div>
  );
}
