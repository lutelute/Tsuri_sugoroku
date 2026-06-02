import { useMemo, useEffect, useRef } from 'react';
import { useGameStore } from '../../store/useGameStore';
import { calculateScore } from '../../game/scoring';
import { saveEncyclopedia } from '../../utils/storage';
import { saveUserEncyclopedia, saveUserScore } from '../../lib/firestore';
import { FISH_DATABASE } from '../../data/fishDatabase';
import Button from '../shared/Button';
import Ruby from '../shared/Ruby';

export default function ResultScreen() {
  const { players, encyclopedias, resetGame } = useGameStore();
  const savedRef = useRef(false);

  const results = useMemo(() => {
    return players
      .map((player, i) => ({
        player,
        score: calculateScore(player, encyclopedias[i] ?? {}),
      }))
      .sort((a, b) => b.score.total - a.score.total);
  }, [players, encyclopedias]);

  // ゲーム終了時に図鑑をクラウドに確実に保存 + ランキングにスコア保存
  useEffect(() => {
    if (savedRef.current) return;
    savedRef.current = true;

    for (let i = 0; i < players.length; i++) {
      const p = players[i];
      const enc = encyclopedias[i];
      if (p.uid && enc) {
        saveUserEncyclopedia(p.uid, enc).catch(() => {});
      } else if (!p.uid && enc) {
        saveEncyclopedia(enc);
      }
    }

    // ランキング保存（ログインユーザーのみ）
    for (let i = 0; i < players.length; i++) {
      const p = players[i];
      const enc = encyclopedias[i] ?? {};
      if (!p.uid) continue;
      const score = calculateScore(p, enc);
      const totalFish = FISH_DATABASE.length;
      const caughtCount = Object.keys(enc).filter(k => enc[k]).length;
      const encyclopediaRate = Math.round((caughtCount / totalFish) * 100);
      saveUserScore({
        uid: p.uid,
        displayName: p.name,
        score: score.total,
        fishCount: p.caughtFish.length,
        encyclopediaRate,
        date: new Date().toISOString(),
        breakdown: score,
      }).catch(() => {});
    }
  }, [players, encyclopedias]);

  const RANK_ICONS = ['🥇', '🥈', '🥉', '4️⃣'];

  return (
    <div className="flex flex-col items-center justify-center h-full px-4 overflow-y-auto py-8">
      <h1 className="font-brush text-5xl mb-2 kinpaku kinpaku-shimmer animate-ink-rise">
        <Ruby>釣果番付</Ruby>
      </h1>
      <p className="text-washi/55 mb-6 font-mincho tracking-widest"><Ruby>お疲れ様でした</Ruby></p>

      <div className="w-full max-w-lg space-y-4">
        {results.map((result, index) => (
          <div
            key={result.player.id}
            className={`relative rounded-2xl p-5 ${
              index === 0
                ? 'panel-ai border-kin-500/50 shadow-kin-700/20'
                : 'panel-ai'
            }`}
          >
            {index === 0 && (
              <span className="seal animate-seal-stamp absolute -top-3 -right-2 w-12 h-12 rounded-md font-mincho text-xs font-bold" style={{ animationDelay: '0.3s' }}>
                <Ruby>優勝</Ruby>
              </span>
            )}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{RANK_ICONS[index] || ''}</span>
                <div
                  className="w-4 h-4 rounded-full ring-2 ring-white/20"
                  style={{ backgroundColor: result.player.color }}
                />
                <span className="font-bold font-mincho text-lg text-washi">{result.player.name}</span>
              </div>
              <span className="text-2xl font-extrabold text-kin-300">
                {result.score.total.toLocaleString()}pt
              </span>
            </div>

            {/* スコア内訳 */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-white/60">
              <div className="flex justify-between">
                <span>🐟 <Ruby>魚</Ruby>ポイント</span>
                <span>{result.score.fishPoints.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>💎 レアリティ</span>
                <span>{result.score.rarityBonus.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>🗾 <Ruby>地域制覇</Ruby></span>
                <span>{result.score.regionBonus.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>📖 <Ruby>図鑑</Ruby></span>
                <span>{result.score.encyclopediaBonus.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>🌟 <Ruby>巨大魚</Ruby></span>
                <span>{result.score.giantFishBonus.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>🏁 ゴール<Ruby>順位</Ruby></span>
                <span>{result.score.finishBonus.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>💰 <Ruby>残金</Ruby></span>
                <span>{result.score.moneyBonus.toLocaleString()}</span>
              </div>
            </div>

            {/* 統計 */}
            <div className="mt-3 pt-3 border-t border-white/10 flex gap-4 text-xs text-white/40">
              <span><Ruby>釣った魚</Ruby>: {result.player.caughtFish.length}<Ruby>匹</Ruby></span>
              <span><Ruby>残金</Ruby>: ¥{result.player.money.toLocaleString()}</span>
              {result.player.finishOrder !== null && (
                <span>{result.player.finishOrder + 1}<Ruby>位でゴール</Ruby></span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8">
        <Button onClick={resetGame} variant="gold" size="lg">
          <Ruby>タイトルに戻る</Ruby>
        </Button>
      </div>
    </div>
  );
}
