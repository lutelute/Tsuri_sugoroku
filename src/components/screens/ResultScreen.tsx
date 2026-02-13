import { useMemo, useEffect } from 'react';
import { useGameStore } from '../../store/useGameStore';
import { useAuthStore } from '../../store/useAuthStore';
import { calculateScore } from '../../game/scoring';
import { saveEncyclopedia } from '../../utils/storage';
import Button from '../shared/Button';

export default function ResultScreen() {
  const { players, encyclopedia, resetGame } = useGameStore();
  const user = useAuthStore(s => s.user);

  const results = useMemo(() => {
    return players
      .map(player => ({
        player,
        score: calculateScore(player, encyclopedia),
      }))
      .sort((a, b) => b.score.total - a.score.total);
  }, [players, encyclopedia]);

  // ゲーム終了時に図鑑をクラウドに確実に保存
  useEffect(() => {
    if (user) {
      saveEncyclopedia(encyclopedia);
    }
  }, [user, encyclopedia]);

  const RANK_ICONS = ['🥇', '🥈', '🥉', '4️⃣'];

  return (
    <div className="flex flex-col items-center justify-center h-full px-4 overflow-y-auto py-8">
      <h1 className="text-3xl font-extrabold mb-2">
        <span className="bg-gradient-to-r from-amber-300 to-yellow-500 bg-clip-text text-transparent">
          結果発表
        </span>
      </h1>
      <p className="text-white/50 mb-6">お疲れ様でした！</p>

      <div className="w-full max-w-lg space-y-4">
        {results.map((result, index) => (
          <div
            key={result.player.id}
            className={`rounded-2xl p-5 border ${
              index === 0
                ? 'bg-gradient-to-r from-amber-900/30 to-yellow-900/20 border-amber-500/30'
                : 'bg-white/5 border-white/10'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{RANK_ICONS[index] || ''}</span>
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: result.player.color }}
                />
                <span className="font-bold text-lg">{result.player.name}</span>
              </div>
              <span className="text-2xl font-extrabold text-amber-400">
                {result.score.total.toLocaleString()}pt
              </span>
            </div>

            {/* スコア内訳 */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-white/60">
              <div className="flex justify-between">
                <span>🐟 魚ポイント</span>
                <span>{result.score.fishPoints.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>💎 レアリティ</span>
                <span>{result.score.rarityBonus.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>🗾 地域制覇</span>
                <span>{result.score.regionBonus.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>📖 図鑑</span>
                <span>{result.score.encyclopediaBonus.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>🌟 巨大魚</span>
                <span>{result.score.giantFishBonus.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>🏁 ゴール順位</span>
                <span>{result.score.finishBonus.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>💰 残金</span>
                <span>{result.score.moneyBonus.toLocaleString()}</span>
              </div>
            </div>

            {/* 統計 */}
            <div className="mt-3 pt-3 border-t border-white/10 flex gap-4 text-xs text-white/40">
              <span>釣った魚: {result.player.caughtFish.length}匹</span>
              <span>残金: ¥{result.player.money.toLocaleString()}</span>
              {result.player.finishOrder !== null && (
                <span>{result.player.finishOrder + 1}位でゴール</span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8">
        <Button onClick={resetGame} variant="gold" size="lg">
          タイトルに戻る
        </Button>
      </div>
    </div>
  );
}
