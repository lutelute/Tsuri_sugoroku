import { useState, useEffect } from 'react';
import { loadScoreRankings, loadEncyclopediaRankings } from '../../lib/firestore';
import type { RankingEntry } from '../../game/types';
import Button from '../shared/Button';

type RankingTab = 'score' | 'encyclopedia';

interface RankingOverlayProps {
  onClose: () => void;
}

export default function RankingOverlay({ onClose }: RankingOverlayProps) {
  const [tab, setTab] = useState<RankingTab>('score');
  const [rankings, setRankings] = useState<RankingEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const load = tab === 'score' ? loadScoreRankings : loadEncyclopediaRankings;
    load(50)
      .then(setRankings)
      .catch(() => setRankings([]))
      .finally(() => setLoading(false));
  }, [tab]);

  const RANK_ICONS = ['🥇', '🥈', '🥉'];

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-b from-slate-900 to-slate-950 overflow-y-auto">
      {/* ヘッダー */}
      <div className="sticky top-0 bg-black/50 backdrop-blur-sm px-4 py-3 z-10">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">🏆 ランキング</h2>
          <Button onClick={onClose} variant="secondary" size="sm">閉じる</Button>
        </div>

        {/* タブ切替 */}
        <div className="flex gap-2 mt-2">
          <button
            onClick={() => setTab('score')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition cursor-pointer
              ${tab === 'score' ? 'bg-amber-600 text-white' : 'bg-white/10 text-white/50 hover:bg-white/20'}`}
          >
            スコアランキング
          </button>
          <button
            onClick={() => setTab('encyclopedia')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition cursor-pointer
              ${tab === 'encyclopedia' ? 'bg-emerald-600 text-white' : 'bg-white/10 text-white/50 hover:bg-white/20'}`}
          >
            図鑑コンプ率
          </button>
        </div>
      </div>

      {/* ランキング一覧 */}
      <div className="p-4">
        {loading ? (
          <p className="text-center text-white/40 py-8">読み込み中...</p>
        ) : rankings.length === 0 ? (
          <p className="text-center text-white/40 py-8">まだ記録がありません</p>
        ) : (
          <div className="space-y-2">
            {rankings.map((entry, i) => (
              <div
                key={entry.id ?? i}
                className={`rounded-xl p-3 border ${
                  i < 3
                    ? 'bg-gradient-to-r from-amber-900/20 to-transparent border-amber-500/20'
                    : 'bg-white/5 border-white/10'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="w-8 text-center text-lg font-bold text-white/60">
                    {RANK_ICONS[i] ?? `${i + 1}`}
                  </span>
                  <div className="flex-1 min-w-0">
                    <span className="font-bold truncate block">{entry.displayName}</span>
                    <div className="flex gap-3 text-xs text-white/40 mt-0.5">
                      <span>{new Date(entry.date).toLocaleDateString('ja-JP')}</span>
                      <span>🐟 {entry.fishCount}匹</span>
                      <span>📖 {entry.encyclopediaRate}%</span>
                    </div>
                  </div>
                  <div className="text-right">
                    {tab === 'score' ? (
                      <span className="text-lg font-extrabold text-amber-400">
                        {entry.score.toLocaleString()}pt
                      </span>
                    ) : (
                      <span className="text-lg font-extrabold text-emerald-400">
                        {entry.encyclopediaRate}%
                      </span>
                    )}
                  </div>
                </div>

                {/* スコア内訳（展開は無し、コンパクト表示） */}
                {tab === 'score' && entry.breakdown && (
                  <div className="mt-2 pt-2 border-t border-white/5 grid grid-cols-4 gap-1 text-[10px] text-white/30">
                    <span>🐟{entry.breakdown.fishPoints}</span>
                    <span>💎{entry.breakdown.rarityBonus}</span>
                    <span>🗾{entry.breakdown.regionBonus}</span>
                    <span>📖{entry.breakdown.encyclopediaBonus}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
