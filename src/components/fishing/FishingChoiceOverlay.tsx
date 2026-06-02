import { useGameStore } from '../../store/useGameStore';
import { BOAT_FISHING_COST } from '../../game/constants';
import { getEquippedItem } from '../../game/equipment';
import { NODE_MAP } from '../../data/boardNodes';
import Button from '../shared/Button';
import Icon from '../shared/Icon';
import Ruby from '../shared/Ruby';

export default function FishingChoiceOverlay() {
  const { players, currentPlayerIndex, startFishing, startBoatFishing, setTurnPhase, boatFishingRemaining } = useGameStore();
  const player = players[currentPlayerIndex];
  const node = NODE_MAP.get(player.currentNode);
  const isSpecialSpot = node?.type === 'fishing_special';
  const canAffordBoat = player.money >= BOAT_FISHING_COST;

  const rodItem = getEquippedItem(player.equipment, 'rod');
  const reelItem = getEquippedItem(player.equipment, 'reel');
  const lureItem = getEquippedItem(player.equipment, 'lure');
  const hasRod = !!rodItem;
  const hasReel = !!reelItem;
  const hasLure = !!lureItem;

  const missingWarnings: string[] = [];
  if (!hasReel) missingWarnings.push('リールなし: 巻き上げが困難');
  if (!hasLure) missingWarnings.push('ルアーなし: 当たりが遅くコモンのみ');

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="panel-ai rounded-2xl p-6 max-w-sm w-[90%] space-y-4 relative">
        {/* 閉じる */}
        <button
          onClick={() => setTurnPhase('action_choice')}
          aria-label="閉じる"
          className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center bg-ai-800/60 border border-kin-500/30 rounded-full text-washi/70 hover:text-washi transition"
        >
          <Icon name="close" size={16} />
        </button>

        <h3 className="text-xl font-mincho text-kin-300 text-center ink-underline"><Ruby>釣り方を選ぼう</Ruby></h3>
        <p className="text-sm text-washi/60 text-center flex items-center justify-center gap-1">
          <Icon name="coin" size={15} className="text-kin-300" />
          <Ruby>所持金</Ruby>: <span className="tabular-nums text-kin-300">¥{player.money.toLocaleString()}</span>
        </p>

        {/* 特別スポット表示 */}
        {isSpecialSpot && (
          <div className="bg-shu-500/20 border border-shu-500/30 rounded-lg p-3 text-center">
            <p className="text-shu-400 font-mincho font-bold text-sm">🌟 <Ruby>特別な釣りスポット！</Ruby></p>
            <p className="text-shu-400/70 text-xs mt-1"><Ruby>レア魚が出やすく、大漁のチャンスも UP！</Ruby></p>
          </div>
        )}

        {/* 装備なし警告 */}
        {!hasRod && (
          <div className="bg-shu-500/20 border border-shu-500/40 rounded-lg p-3 text-center">
            <p className="text-shu-400 font-mincho font-bold text-sm flex items-center justify-center gap-1.5">
              <Icon name="rod" size={16} /><Ruby>釣竿がありません！</Ruby>
            </p>
            <p className="text-shu-400/70 text-xs mt-1"><Ruby>竿がないと釣りはできません。ショップで購入しましょう。</Ruby></p>
          </div>
        )}

        {hasRod && missingWarnings.length > 0 && (
          <div className="bg-kin-500/15 border border-kin-500/30 rounded-lg p-2">
            {missingWarnings.map((w, i) => (
              <p key={i} className="text-kin-300/90 text-xs">⚠️ <Ruby>{w}</Ruby></p>
            ))}
          </div>
        )}

        {/* 船釣り続行中 */}
        {boatFishingRemaining > 0 && (
          <div className="bg-kin-500/15 border border-kin-500/30 rounded-lg p-3 text-center">
            <p className="text-kin-300 font-mincho font-bold text-sm flex items-center justify-center gap-1.5">
              <Icon name="boat" size={16} /><Ruby>船釣り乗船中！ 残り</Ruby><span className="tabular-nums">{boatFishingRemaining}</span><Ruby>回</Ruby>
            </p>
          </div>
        )}

        <div className="space-y-3">
          {/* 船釣り続行ボタン（残り回数がある場合は優先表示） */}
          {boatFishingRemaining > 0 && (
            <button
              onClick={() => hasRod && startBoatFishing()}
              disabled={!hasRod}
              className={`w-full border rounded-xl p-4 text-left transition
                ${hasRod
                  ? 'bg-kin-500/20 hover:bg-kin-500/30 border-kin-500/40 cursor-pointer'
                  : 'bg-ai-800/40 border-kin-500/15 opacity-40 cursor-not-allowed'
                }`}
            >
              <div className="flex items-center gap-3">
                <Icon name="boat" size={30} className="text-kin-300 shrink-0" />
                <div>
                  <p className="font-mincho font-bold text-washi"><Ruby>船釣りを続ける</Ruby>
                    <span className="text-emerald-300 ml-2 text-sm"><Ruby>無料</Ruby></span>
                  </p>
                  <p className="text-xs text-washi/60"><Ruby>残り</Ruby><span className="tabular-nums">{boatFishingRemaining}</span><Ruby>回（レア以上の魚を狙う）</Ruby></p>
                </div>
              </div>
            </button>
          )}

          {/* 通常釣り */}
          <button
            onClick={() => hasRod && startFishing(false)}
            disabled={!hasRod}
            className={`w-full border rounded-xl p-4 text-left transition
              ${hasRod
                ? 'bg-ai-700/50 hover:bg-ai-600/60 border-ai-500/40 cursor-pointer'
                : 'bg-ai-800/40 border-kin-500/15 opacity-40 cursor-not-allowed'
              }`}
          >
            <div className="flex items-center gap-3">
              <Icon name="rod" size={30} className="text-ai-200 shrink-0" />
              <div>
                <p className="font-mincho font-bold text-washi"><Ruby>通常の釣り</Ruby></p>
                <p className="text-xs text-washi/60"><Ruby>岸から釣る（無料）</Ruby></p>
              </div>
            </div>
          </button>

          {/* 船釣り（新規購入） */}
          {boatFishingRemaining === 0 && (
            <button
              onClick={() => hasRod && canAffordBoat && startBoatFishing()}
              disabled={!hasRod || !canAffordBoat}
              className={`w-full border rounded-xl p-4 text-left transition
                ${hasRod && canAffordBoat
                  ? 'bg-kin-500/20 hover:bg-kin-500/30 border-kin-500/40 cursor-pointer'
                  : 'bg-ai-800/40 border-kin-500/15 opacity-40 cursor-not-allowed'
                }`}
            >
              <div className="flex items-center gap-3">
                <Icon name="boat" size={30} className="text-kin-300 shrink-0" />
                <div>
                  <p className="font-mincho font-bold text-washi"><Ruby>船釣り</Ruby>
                    <span className="text-kin-300 ml-2 text-sm tabular-nums">¥{BOAT_FISHING_COST.toLocaleString()}</span>
                  </p>
                  <p className="text-xs text-washi/60"><Ruby>沖に出て3回レア以上の魚を狙う</Ruby></p>
                </div>
              </div>
            </button>
          )}
        </div>

        <Button
          onClick={() => setTurnPhase('action_choice')}
          variant="secondary"
          size="sm"
          className="w-full"
        >
          <Ruby>やめる</Ruby>
        </Button>
      </div>
    </div>
  );
}
