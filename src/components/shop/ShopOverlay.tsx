import { useGameStore } from '../../store/useGameStore';
import { NODE_MAP } from '../../data/boardNodes';
import { EQUIPMENT_DATA } from '../../data/equipmentData';
import { SHOP_TIER_MAX_LEVEL } from '../../game/constants';
import type { EquipmentType } from '../../game/types';
import EquipmentCard from './EquipmentCard';
import Button from '../shared/Button';

export default function ShopOverlay() {
  const { players, currentPlayerIndex, buyEquipment, skipShop } = useGameStore();
  const player = players[currentPlayerIndex];
  const node = NODE_MAP.get(player.currentNode);
  const shopTier = node?.shopTier || 1;
  const maxLevel = SHOP_TIER_MAX_LEVEL[shopTier] || 3;

  const types: EquipmentType[] = ['rod', 'reel', 'lure'];

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-gradient-to-b from-slate-800 to-slate-900 rounded-2xl border border-white/10 p-6 max-w-lg w-[90%] my-4 max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="text-center mb-4">
          <div className="text-4xl mb-2">🏪</div>
          <h2 className="text-xl font-bold">{node?.name} ショップ</h2>
          <p className="text-sm text-white/50">Tier {shopTier} — Lv.{maxLevel}まで購入可能</p>
          <p className="text-sm text-amber-400 mt-1">所持金: ¥{player.money.toLocaleString()}</p>
        </div>

        {types.map(type => (
          <div key={type} className="mb-4">
            <div className="space-y-2">
              {EQUIPMENT_DATA
                .filter(e => e.type === type && e.level <= maxLevel)
                .map(eq => {
                  const currentLevel = player.equipment[type];
                  const isNext = eq.level === currentLevel + 1;
                  const canAfford = player.money >= eq.cost;

                  return (
                    <EquipmentCard
                      key={`${eq.type}-${eq.level}`}
                      equipment={eq}
                      currentLevel={currentLevel}
                      canAfford={canAfford}
                      canBuy={isNext && eq.level <= maxLevel}
                      onBuy={() => buyEquipment(type, eq.cost)}
                    />
                  );
                })}
            </div>
          </div>
        ))}

        <Button onClick={skipShop} variant="secondary" className="w-full mt-2">
          ショップを出る
        </Button>
      </div>
    </div>
  );
}
