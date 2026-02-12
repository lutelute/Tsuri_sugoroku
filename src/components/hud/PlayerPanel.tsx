import type { Player } from '../../game/types';
import { getEquipmentName, getEquippedLevel } from '../../game/equipment';
import { NODE_MAP } from '../../data/boardNodes';

interface PlayerPanelProps {
  player: Player;
  isActive: boolean;
}

export default function PlayerPanel({ player, isActive }: PlayerPanelProps) {
  const node = NODE_MAP.get(player.currentNode);

  return (
    <div className={`rounded-xl p-3 transition-all ${
      isActive
        ? 'bg-white/15 border border-white/30 shadow-lg'
        : 'bg-white/5 border border-white/10 opacity-60'
    }`}>
      {/* ヘッダー */}
      <div className="flex items-center gap-2 mb-2">
        <div
          className="w-3 h-3 rounded-full shrink-0"
          style={{ backgroundColor: player.color }}
        />
        <span className="font-bold text-sm truncate">{player.name}</span>
        {player.hasFinished && <span className="text-xs text-amber-400">🏁</span>}
      </div>

      {/* ステータス */}
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-white/70">
        <div>💰 ¥{player.money.toLocaleString()}</div>
        <div>🐟 {player.caughtFish.length}匹</div>
        <div>📍 {node?.name || '?'}</div>
        <div>🏅 {player.score}pt</div>
      </div>

      {/* 装備 */}
      {isActive && (
        <div className="mt-2 pt-2 border-t border-white/10 text-xs text-white/50 space-y-0.5">
          <div>🎣 {getEquipmentName('rod', getEquippedLevel(player.equipment, 'rod')) || '未装着'}</div>
          <div>🔄 {getEquipmentName('reel', getEquippedLevel(player.equipment, 'reel')) || '未装着'}</div>
          <div>🪱 {getEquipmentName('lure', getEquippedLevel(player.equipment, 'lure')) || '未装着'}</div>
        </div>
      )}

      {/* バフ表示 */}
      {player.fishBonusTurnsLeft > 0 && (
        <div className="mt-1 text-xs text-amber-300">
          ✨ 釣り{player.fishBonusMultiplier}倍 (残{player.fishBonusTurnsLeft}T)
        </div>
      )}
    </div>
  );
}
