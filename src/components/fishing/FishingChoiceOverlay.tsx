import { useGameStore } from '../../store/useGameStore';
import { BOAT_FISHING_COST } from '../../game/constants';
import Button from '../shared/Button';

export default function FishingChoiceOverlay() {
  const { players, currentPlayerIndex, startFishing, startBoatFishing, setTurnPhase } = useGameStore();
  const player = players[currentPlayerIndex];
  const canAffordBoat = player.money >= BOAT_FISHING_COST;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-gradient-to-b from-blue-900/90 to-blue-950/90 rounded-2xl border border-blue-500/20 p-6 max-w-sm w-[90%] space-y-4">
        <h3 className="text-xl font-bold text-center">釣り方を選ぼう</h3>
        <p className="text-sm text-white/50 text-center">
          所持金: ¥{player.money.toLocaleString()}
        </p>

        <div className="space-y-3">
          {/* 通常釣り */}
          <button
            onClick={() => startFishing(false)}
            className="w-full bg-blue-600/60 hover:bg-blue-600/80 border border-blue-400/30 rounded-xl p-4 text-left transition cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <span className="text-3xl">🎣</span>
              <div>
                <p className="font-bold">通常の釣り</p>
                <p className="text-xs text-white/50">岸から釣る（無料）</p>
              </div>
            </div>
          </button>

          {/* 船釣り */}
          <button
            onClick={() => canAffordBoat && startBoatFishing()}
            disabled={!canAffordBoat}
            className={`w-full border rounded-xl p-4 text-left transition
              ${canAffordBoat
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
                <p className="text-xs text-white/50">沖に出てレア以上の魚を狙う</p>
              </div>
            </div>
          </button>
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
