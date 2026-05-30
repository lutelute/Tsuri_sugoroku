import { useGameStore } from '../../store/useGameStore';
import { NODE_MAP } from '../../data/boardNodes';
import { EQUIPMENT_DATA } from '../../data/equipmentData';
import { SHOP_TIER_MAX_LEVEL } from '../../game/constants';
import type { EquipmentType } from '../../game/types';
import EquipmentCard from './EquipmentCard';
import Button from '../shared/Button';
import Icon from '../shared/Icon';

export default function ShopOverlay() {
  const { players, currentPlayerIndex, buyEquipment, skipShop } = useGameStore();
  const player = players[currentPlayerIndex];
  const node = NODE_MAP.get(player.currentNode);
  const shopTier = node?.shopTier || 1;
  const maxLevel = SHOP_TIER_MAX_LEVEL[shopTier] || 3;

  const types: EquipmentType[] = ['rod', 'reel', 'lure'];

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="panel-ai rounded-2xl p-6 max-w-lg w-[90%] my-4 max-h-[90vh] overflow-y-auto">
        <div className="text-center mb-4">
          <div className="flex justify-center mb-2">
            <Icon name="cart" size={40} className="text-kin-300" />
          </div>
          <h2 className="text-xl font-mincho text-kin-300 ink-underline inline-block">{node?.name} ショップ</h2>
          <p className="text-sm text-ai-200 mt-2">Tier <span className="tabular-nums">{shopTier}</span> — Lv.<span className="tabular-nums">{maxLevel}</span>まで購入可能</p>
          <p className="text-sm text-kin-300 mt-1 flex items-center justify-center gap-1">
            <Icon name="coin" size={16} className="text-kin-400" />
            所持金: ¥<span className="tabular-nums">{player.money.toLocaleString()}</span>
          </p>
        </div>

        {types.map(type => (
          <div key={type} className="mb-4">
            <div className="space-y-2">
              {EQUIPMENT_DATA
                .filter(e => e.type === type && e.level <= maxLevel)
                .map(eq => {
                  const canAfford = player.money >= eq.cost;
                  const canBuy = eq.cost > 0 && eq.level <= maxLevel;

                  return (
                    <EquipmentCard
                      key={`${eq.type}-${eq.level}`}
                      equipment={eq}
                      ownedCount={player.equipment.inventory.filter(
                        i => i.type === eq.type && i.level === eq.level
                      ).length}
                      canAfford={canAfford}
                      canBuy={canBuy}
                      onBuy={() => buyEquipment(type, eq.level, eq.cost)}
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
