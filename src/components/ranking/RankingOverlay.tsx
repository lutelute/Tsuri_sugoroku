import { useState, useEffect } from 'react';
import { loadScoreRankings, loadEncyclopediaRankings } from '../../lib/firestore';
import type { RankingEntry } from '../../game/types';
import Icon from '../shared/Icon';
import Ruby from '../shared/Ruby';

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

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-b from-ai-900 to-ai-950 overflow-y-auto">
      {/* ヘッダー */}
      <div className="sticky top-0 panel-ai px-4 py-3 z-10 border-b border-kin-500/20">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-mincho font-bold text-kin-300 ink-underline flex items-center gap-2">
            <Icon name="trophy" size={22} className="text-kin-400" />
            <Ruby>番付</Ruby>
          </h2>
          <button
            onClick={onClose}
            aria-label="閉じる"
            className="w-9 h-9 flex items-center justify-center rounded-full bg-ai-800/60 border border-kin-500/30 text-washi/80 hover:text-washi transition cursor-pointer"
          >
            <Icon name="close" size={18} />
          </button>
        </div>

        {/* タブ切替 */}
        <div className="flex gap-2 mt-3">
          <button
            onClick={() => setTab('score')}
            className={`flex-1 py-2 rounded-lg text-sm font-mincho font-medium transition cursor-pointer border
              ${tab === 'score'
                ? 'bg-kin-500/20 text-kin-300 border-kin-500/40'
                : 'bg-ai-800/50 text-washi/50 border-transparent hover:bg-ai-700/50'}`}
          >
            <Ruby>スコア番付</Ruby>
          </button>
          <button
            onClick={() => setTab('encyclopedia')}
            className={`flex-1 py-2 rounded-lg text-sm font-mincho font-medium transition cursor-pointer border
              ${tab === 'encyclopedia'
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-ai-800/50 text-washi/50 border-transparent hover:bg-ai-700/50'}`}
          >
            <Ruby>図鑑コンプ率</Ruby>
          </button>
        </div>
      </div>

      {/* ランキング一覧 */}
      <div className="p-4">
        {loading ? (
          <p className="text-center text-washi/40 py-8 font-mincho"><Ruby>読み込み中...</Ruby></p>
        ) : rankings.length === 0 ? (
          <p className="text-center text-washi/40 py-8 font-mincho"><Ruby>まだ記録がありません</Ruby></p>
        ) : (
          <div className="space-y-2">
            {rankings.map((entry, i) => (
              <div
                key={entry.id ?? i}
                className={`rounded-xl p-3 ${
                  i < 3
                    ? 'panel-ai border border-kin-500/40'
                    : 'panel-ai'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="w-8 flex items-center justify-center">
                    {i < 3 ? (
                      <span className="seal w-8 h-8 rounded-full font-mincho text-sm font-bold tabular-nums">
                        {i + 1}
                      </span>
                    ) : (
                      <span className="text-lg font-mincho font-bold text-washi/50 tabular-nums">
                        {i + 1}
                      </span>
                    )}
                  </span>
                  <div className="flex-1 min-w-0">
                    <span className="font-mincho font-bold text-washi truncate block">{entry.displayName}</span>
                    <div className="flex gap-3 text-xs text-washi/40 mt-0.5">
                      <span className="tabular-nums">{new Date(entry.date).toLocaleDateString('ja-JP')}</span>
                      <span className="inline-flex items-center gap-1 tabular-nums">
                        <Icon name="fish" size={13} className="text-ai-300" />{entry.fishCount}<Ruby>匹</Ruby>
                      </span>
                      <span className="inline-flex items-center gap-1 tabular-nums">
                        <Icon name="book" size={13} className="text-ai-300" />{entry.encyclopediaRate}%
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    {tab === 'score' ? (
                      <span className="text-lg font-mincho font-extrabold text-kin-300 tabular-nums">
                        {entry.score.toLocaleString()}pt
                      </span>
                    ) : (
                      <span className="text-lg font-mincho font-extrabold text-emerald-300 tabular-nums">
                        {entry.encyclopediaRate}%
                      </span>
                    )}
                  </div>
                </div>

                {/* スコア内訳（展開は無し、コンパクト表示） */}
                {tab === 'score' && entry.breakdown && (
                  <div className="mt-2 pt-2 border-t border-kin-500/10 grid grid-cols-4 gap-1 text-[10px] text-washi/35 tabular-nums">
                    <span className="inline-flex items-center gap-0.5">
                      <Icon name="fish" size={11} className="text-ai-300/70" />{entry.breakdown.fishPoints}
                    </span>
                    <span>💎{entry.breakdown.rarityBonus}</span>
                    <span>🗾{entry.breakdown.regionBonus}</span>
                    <span className="inline-flex items-center gap-0.5">
                      <Icon name="book" size={11} className="text-ai-300/70" />{entry.breakdown.encyclopediaBonus}
                    </span>
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
