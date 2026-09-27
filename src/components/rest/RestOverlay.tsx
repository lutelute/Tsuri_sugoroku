import { useEffect, useState } from 'react';
import { playBuild, playChime } from '../../utils/sound';
import type { CSSProperties } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useGameStore } from '../../store/useGameStore';
import { REST_MONEY_BONUS } from '../../game/constants';
import MoneyTicker from '../fx/MoneyTicker';
import { calculateRepairCost, isBroken } from '../../game/equipment';
import { getEquipment } from '../../data/equipmentData';
import type { EquipmentType, EquipmentItem } from '../../game/types';
import Button from '../shared/Button';
import Icon from '../shared/Icon';
import type { IconName } from '../shared/Icon';
import Ruby from '../shared/Ruby';

const TYPE_ICONS: Record<EquipmentType, IconName> = {
  rod: 'rod',
  reel: 'reel',
  lure: 'lure',
};

/** 温泉マーク（湯気が数回立ちのぼる） */
function OnsenMark() {
  return (
    <svg width="72" height="64" viewBox="0 0 72 64" aria-hidden="true" className="mx-auto">
      {/* 静止の薄い湯気（アニメが終わっても湯気が残る） */}
      {[18, 36, 54].map(x => (
        <path key={`s${x}`} d={`M${x} 34 c-5 -5 5 -9 0 -14 c-5 -5 5 -9 0 -14`} fill="none" stroke="#f4ecd8" strokeWidth="3" strokeLinecap="round" opacity="0.3" />
      ))}
      {[18, 36, 54].map((x, i) => (
        <path
          key={x}
          className="fx-steam"
          style={{ '--d': `${i * 280}ms` } as CSSProperties}
          d={`M${x} 34 c-5 -5 5 -9 0 -14 c-5 -5 5 -9 0 -14`}
          fill="none"
          stroke="#f4ecd8"
          strokeWidth="3.4"
          strokeLinecap="round"
        />
      ))}
      <path d="M8 40 Q36 30 64 40 Q64 60 36 60 Q8 60 8 40 Z" fill="#e34a33" />
      <path d="M8 40 Q36 30 64 40" fill="none" stroke="#f1d893" strokeWidth="2" />
      <ellipse cx="28" cy="46" rx="10" ry="3" fill="#fff" opacity="0.25" />
    </svg>
  );
}

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
      <div data-guide="rest" className="panel-ai relative rounded-2xl p-6 max-w-sm w-[90%] my-4 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          aria-label="閉じる"
          className="absolute top-3 right-3 flex items-center justify-center w-8 h-8 rounded-full bg-ai-800/60 border border-kin-500/30 text-washi/70 hover:text-washi transition-colors"
        >
          <Icon name="close" size={16} />
        </button>
        <div className="text-center mb-4">
          <div className="mb-2"><OnsenMark /></div>
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
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon name={TYPE_ICONS[item.type]} size={20} className={broken ? 'text-shu-400' : 'text-ai-700'} />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mincho text-sm font-bold"><Ruby>{eqData?.name || '???'}</Ruby></span>
                            {broken && (
                              <span className="seal text-[10px] px-1.5 py-0.5">
                                <Ruby>故障</Ruby>
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <div className="w-16 h-1.5 bg-ai-900/30 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  item.durability > 50 ? 'bg-emerald-400' :
                                  item.durability > 20 ? 'bg-kin-400' : 'bg-shu-400'
                                }`}
                                style={{ width: `${item.durability}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-ai-700/60 tabular-nums">{item.durability}%</span>
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

        <Button onClick={onClose} variant="primary" className="w-full mt-4">
          OK
        </Button>
      </div>
    </div>
  );
}
