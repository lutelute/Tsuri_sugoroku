import { useEffect, useState } from 'react';
import { playCardFlip } from '../../utils/sound';
import type { CSSProperties } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useGameStore } from '../../store/useGameStore';
import { NODE_MAP } from '../../data/boardNodes';
import { EQUIPMENT_DATA } from '../../data/equipmentData';
import { SHOP_TIER_MAX_LEVEL } from '../../game/constants';
import type { EquipmentType } from '../../game/types';
import EquipmentCard from './EquipmentCard';
import Button from '../shared/Button';
import Icon from '../shared/Icon';
import Ruby from '../shared/Ruby';
import MoneyTicker from '../fx/MoneyTicker';
import Stamp from '../fx/Stamp';

/** 店先の暖簾（入店時に一度だけはためく） */
function Noren() {
  return (
    <div className="flex flex-col items-center mb-3" aria-hidden="true">
      <div className="h-1.5 w-44 rounded-full bg-gradient-to-b from-kin-400 to-kin-700 shadow" />
      <div className="fx-noren flex justify-center gap-1">
        {['釣', '具', '屋'].map((c, i) => (
          <span
            key={c}
            className="w-[3.3rem] h-16 rounded-b-md flex items-start justify-center pt-2 font-brush text-2xl text-washi"
            style={{
              '--d': `${i * 90}ms`,
              background: 'linear-gradient(180deg, #24496e 0%, #15314f 100%)',
              boxShadow: 'inset 0 -8px 12px rgba(0,0,0,0.3), 0 4px 10px rgba(0,0,0,0.35)',
            } as CSSProperties}
          >
            {c}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function ShopOverlay() {
  const { player, buyEquipment, skipShop } = useGameStore(
    useShallow(s => ({ player: s.players[s.currentPlayerIndex], buyEquipment: s.buyEquipment, skipShop: s.skipShop })),
  );
  const node = NODE_MAP.get(player.currentNode);
  const shopTier = node?.shopTier || 1;
  const maxLevel = SHOP_TIER_MAX_LEVEL[shopTier] || 3;

  const types: EquipmentType[] = ['rod', 'reel', 'lure'];

  // 買えたとき（道具が増えたとき）だけ「毎度あり」の判子を押す
  const invCount = player.equipment.inventory.length;
  const [prevInv, setPrevInv] = useState(invCount);
  const [thanks, setThanks] = useState(0);
  // 暖簾をくぐる音
  useEffect(() => {
    playCardFlip();
  }, []);
  if (invCount !== prevInv) {
    if (invCount > prevInv) setThanks(t => t + 1);
    setPrevInv(invCount);
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="panel-ai fx-rise relative rounded-2xl p-6 max-w-lg w-[90%] my-4 max-h-[90vh] overflow-y-auto">
        {thanks > 0 && (
          <span key={thanks} className="absolute right-4 top-4 z-10 pointer-events-none">
            <Stamp tone="shu" size={60} vertical tilt={12}>毎度あり</Stamp>
          </span>
        )}
        <div className="text-center mb-4">
          <Noren />
          <h2 className="text-xl font-mincho text-kin-300 ink-underline inline-block"><Ruby>{node?.name ?? ''}</Ruby> ショップ</h2>
          <p className="text-sm text-ai-200 mt-2">Tier <span className="tabular-nums">{shopTier}</span> — Lv.<span className="tabular-nums">{maxLevel}</span><Ruby>まで購入可能</Ruby></p>
          <p className="text-sm text-kin-300 mt-1 flex items-center justify-center gap-1">
            <Icon name="coin" size={16} className="text-kin-400" />
            <Ruby>所持金</Ruby>: <MoneyTicker value={player.money} className="font-bold" popClassName="text-base" />
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
          <Ruby>ショップを出る</Ruby>
        </Button>
      </div>
    </div>
  );
}
