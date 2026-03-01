import { useGameStore } from '../../store/useGameStore';
import { BOAT_FISHING_COST } from '../../game/constants';
import { getEquippedItem } from '../../game/equipment';
import { NODE_MAP } from '../../data/boardNodes';
import Button from '../shared/Button';

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
      <div className="bg-gradient-to-b from-blue-900/90 to-blue-950/90 rounded-2xl border border-blue-500/20 p-6 max-w-sm w-[90%] space-y-4">
        <h3 className="text-xl font-bold text-center">釣り方を選ぼう</h3>
        <p className="text-sm text-white/50 text-center">
          所持金: ¥{player.money.toLocaleString()}
        </p>

        {/* 特別スポット表示 */}
        {isSpecialSpot && (
          <div className="bg-purple-900/50 border border-purple-400/30 rounded-lg p-3 text-center">
            <p className="text-purple-200 font-bold text-sm">🌟 特別な釣りスポット！</p>
            <p className="text-purple-300/70 text-xs mt-1">レア魚が出やすく、大漁のチャンスも UP！</p>
          </div>
        )}

        {/* 装備なし警告 */}
        {!hasRod && (
          <div className="bg-red-900/60 border border-red-500/30 rounded-lg p-3 text-center">
            <p className="text-red-300 font-bold text-sm">🚫 釣竿がありません！</p>
            <p className="text-red-300/70 text-xs mt-1">竿がないと釣りはできません。ショップで購入しましょう。</p>
          </div>
        )}

        {hasRod && missingWarnings.length > 0 && (
          <div className="bg-amber-900/40 border border-amber-500/20 rounded-lg p-2">
            {missingWarnings.map((w, i) => (
              <p key={i} className="text-amber-300/80 text-xs">⚠️ {w}</p>
            ))}
          </div>
        )}

        {/* 船釣り続行中 */}
        {boatFishingRemaining > 0 && (
          <div className="bg-amber-900/40 border border-amber-400/30 rounded-lg p-3 text-center">
            <p className="text-amber-300 font-bold text-sm">🚢 船釣り乗船中！ 残り{boatFishingRemaining}回</p>
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
                  ? 'bg-amber-600/60 hover:bg-amber-600/80 border-amber-400/30 cursor-pointer'
                  : 'bg-white/5 border-white/10 opacity-40 cursor-not-allowed'
                }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-3xl">🚢</span>
                <div>
                  <p className="font-bold">船釣りを続ける
                    <span className="text-emerald-300 ml-2 text-sm">無料</span>
                  </p>
                  <p className="text-xs text-white/50">残り{boatFishingRemaining}回（レア以上の魚を狙う）</p>
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
                ? 'bg-blue-600/60 hover:bg-blue-600/80 border-blue-400/30 cursor-pointer'
                : 'bg-white/5 border-white/10 opacity-40 cursor-not-allowed'
              }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-3xl">🎣</span>
              <div>
                <p className="font-bold">通常の釣り</p>
                <p className="text-xs text-white/50">岸から釣る（無料）</p>
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
                  ? 'bg-amber-600/60 hover:bg-amber-600/80 border-amber-400/30 cursor-pointer'
                  : 'bg-white/5 border-white/10 opacity-40 cursor-not-allowed'
                }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-3xl">🚢</span>
                <div>
                  <p className="font-bold">船釣り
                    <span className="text-amber-300 ml-2 text-sm">¥{BOAT_FISHING_COST.toLocaleString()}</span>
                  </p>
                  <p className="text-xs text-white/50">沖に出て3回レア以上の魚を狙う</p>
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
          やめる
        </Button>
      </div>
    </div>
  );
}
