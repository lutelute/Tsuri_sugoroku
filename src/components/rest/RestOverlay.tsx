import { useEffect, useState } from 'react';
import { playBuild, playChime } from '../../utils/sound';
import { useShallow } from 'zustand/react/shallow';
import { useGameStore } from '../../store/useGameStore';
import { REST_MONEY_BONUS } from '../../game/constants';
import MoneyTicker from '../fx/MoneyTicker';
import { calculateRepairCost, isBroken } from '../../game/equipment';
import { getEquipment } from '../../data/equipmentData';
import type { EquipmentItem } from '../../game/types';
import Button from '../shared/Button';
import Icon from '../shared/Icon';
import Ruby from '../shared/Ruby';
import OnsenScene from './OnsenScene';
import { GearTile } from '../shop/GearArt';
import { DurabilityBamboo } from '../shop/GearStats';

interface RestOverlayProps {
  nodeName: string;
  onClose: () => void;
}

export default function RestOverlay({ nodeName, onClose }: RestOverlayProps) {
  const { player, repairEquipment } = useGameStore(
    useShallow(s => ({ player: s.players[s.currentPlayerIndex], repairEquipment: s.repairEquipment })),
  );
  const [repaired, setRepaired] = useState<{ name: string; seq: number } | null>(null);
  // 休憩のボーナス（到着時に加算済み）を、開いた瞬間に数え上げて見せる
  const [moneyFrom] = useState(() => Math.max(0, player.money - REST_MONEY_BONUS));
  // 湯に浸かる、りんの一打（+¥500 の鈴は所持金表示が鳴らす）
  useEffect(() => {
    playChime();
  }, []);

  const damagedItems = player.equipment.inventory.filter(item => item.durability < 100);

  const handleRepair = (item: EquipmentItem) => {
    const cost = calculateRepairCost(item);
    if (player.money >= cost) {
      repairEquipment(item.id, cost);
      playBuild();
      setRepaired(r => ({ name: getEquipment(item.type, item.level)?.name ?? '道具', seq: (r?.seq ?? 0) + 1 }));
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-sm overflow-y-auto">
      <div data-guide="rest" className="panel-ai relative rounded-2xl p-5 sm:p-6 pt-0 sm:pt-0 max-w-sm md:max-w-md w-[90%] my-4 max-h-[90vh] overflow-y-auto">
        {/* 露天風呂の一枚絵（札の上いっぱい） */}
        <div className="-mx-5 sm:-mx-6 mb-4 border-b border-kin-500/40"><OnsenScene /></div>
        <button
          onClick={onClose}
          aria-label="閉じる"
          className="absolute top-2 right-2 z-10 flex items-center justify-center w-11 h-11 rounded-full bg-ai-900/70 border border-kin-500/40 text-washi/80 hover:text-washi transition-colors"
        >
          <Icon name="close" size={18} />
        </button>
        <div className="text-center mb-4">
          <h3 className="font-mincho text-kin-300 text-xl font-bold mb-1 ink-underline inline-block animate-ink-rise"><Ruby>{nodeName}</Ruby><Ruby>で休憩</Ruby></h3>
          <p className="text-washi/60 text-sm mt-2"><Ruby>ゆっくり湯に浸かって体力回復! ¥500を獲得した!</Ruby></p>
          <p className="text-sm text-kin-300 mt-3 inline-flex items-center gap-1">
            <Icon name="coin" size={14} className="text-kin-400" />
            <Ruby>所持金</Ruby>: <MoneyTicker value={player.money} initialFrom={moneyFrom} className="font-bold" popClassName="text-base" />
          </p>
          {repaired && (
            <p key={repaired.seq} className="fx-pop block text-xs text-emerald-300 mt-2 font-mincho" role="status">
              <Ruby>{`${repaired.name}を修理した！`}</Ruby>
            </p>
          )}
        </div>

        {/* 修理セクション */}
        {damagedItems.length > 0 && (
          <div className="mt-4 pt-4 border-t border-kin-500/20">
            <h4 className="font-mincho text-kin-300 text-sm font-bold text-center mb-3 inline-flex items-center justify-center gap-1.5 w-full">
              <Icon name="repair" size={16} className="text-shu-400" />
              <Ruby>装備修理</Ruby>
            </h4>
            <div className="space-y-2">
              {damagedItems.map(item => {
                const eqData = getEquipment(item.type, item.level);
                const cost = calculateRepairCost(item);
                const canAfford = player.money >= cost;
                const broken = isBroken(item);

                return (
                  <div
                    key={item.id}
                    className={`rounded-xl p-3 border ${
                      broken
                        ? 'bg-shu-500/15 border-shu-500/30'
                        : 'washi-card'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <GearTile type={item.type} level={item.level} size={44} broken={broken} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mincho text-sm font-bold"><Ruby>{eqData?.name || '???'}</Ruby></span>
                            {broken && (
                              <span className="seal text-[10px] px-1.5 py-0.5">
                                <Ruby>故障</Ruby>
                              </span>
                            )}
                          </div>
                          <div className="mt-1">
                            <DurabilityBamboo value={item.durability} onWashi={!broken} />
                          </div>
                        </div>
                      </div>
                      <Button
                        onClick={() => handleRepair(item)}
                        variant="gold"
                        size="sm"
                        disabled={!canAfford}
                      >
                        {canAfford ? <span className="tabular-nums">¥{cost.toLocaleString()}</span> : <Ruby>金欠</Ruby>}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {damagedItems.length === 0 && (
          <p className="text-center text-xs text-washi/30 mt-3">
            <Ruby>修理が必要な装備はありません</Ruby>
          </p>
        )}

        <Button onClick={onClose} variant="primary" className="w-full mt-4 min-h-[44px]">
          OK
        </Button>
      </div>
    </div>
  );
}
