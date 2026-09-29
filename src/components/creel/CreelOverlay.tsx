import { useState, useMemo } from 'react';
import { useGameStore } from '../../store/useGameStore';
import { FISH_DATABASE } from '../../data/fishDatabase';
import { NODE_MAP } from '../../data/boardNodes';
import type { FishRarity, CaughtFish } from '../../game/types';
import { calendarLabel } from '../../game/city';
import FishIllustration from '../shared/FishIllustration';
import Icon from '../shared/Icon';
import Ruby from '../shared/Ruby';

type SortMode = 'turn' | 'points' | 'size';
/** 'all' = みんなの釣果（新しい順）、数字 = その人の魚籠 */
type View = 'all' | number;
type FilterRarity = 'all' | FishRarity;

const RARITY_FILTERS: { key: FilterRarity; label: string }[] = [
  { key: 'all', label: '全て' },
  { key: 'common', label: 'コモン' },
  { key: 'uncommon', label: 'アンコモン' },
  { key: 'rare', label: 'レア' },
  { key: 'legendary', label: 'レジェンダリー' },
  { key: 'mythical', label: 'ミシカル' },
];

const RARITY_COLORS: Record<FishRarity, string> = {
  common: 'text-washi/70 bg-ai-700/50 border border-ai-600/40',
  uncommon: 'text-emerald-300 bg-emerald-900/40 border border-emerald-500/30',
  rare: 'text-ai-200 bg-ai-800/60 border border-ai-400/40',
  legendary: 'text-kin-300 bg-kin-500/20 border border-kin-500/30',
  mythical: 'text-shu-400 bg-shu-500/20 border border-shu-500/30',
};

const RARITY_NAMES: Record<FishRarity, string> = {
  common: 'コモン',
  uncommon: 'アンコモン',
  rare: 'レア',
  legendary: 'レジェンダリー',
  mythical: 'ミシカル',
};

const FISH_MAP = new Map(FISH_DATABASE.map(f => [f.id, f]));

const VIA_LABEL: Record<NonNullable<CaughtFish['via']>, string> = {
  tairyou: '大漁',
  event: 'イベント',
  capital: 'お祭り',
};

/** 何巡目か（まちづくりは「N年目 M月」） */
function turnLabel(turn: number, isCity: boolean): string {
  if (!isCity) return `${turn}巡目`;
  const c = calendarLabel(turn);
  return `${c.year}年目 ${c.month}月`;
}

function calculatePoints(caught: CaughtFish): number {
  const fish = FISH_MAP.get(caught.fishId);
  if (!fish) return 0;
  return Math.round(fish.points * caught.size * (caught.bonusMultiplier ?? 1));
}

interface CreelOverlayProps {
  onClose: () => void;
}

export default function CreelOverlay({ onClose }: CreelOverlayProps) {
  const players = useGameStore(s => s.players);
  const currentPlayerIndex = useGameStore(s => s.currentPlayerIndex);
  const turn = useGameStore(s => s.turn);
  const isCity = useGameStore(s => s.settings.mode === 'city');

  // 開いたときは「みんなの釣果」。次の人に回ったあとでも、直前に誰が何を釣ったか見返せる
  const [view, setView] = useState<View>(players.length > 1 ? 'all' : currentPlayerIndex);
  const [filter, setFilter] = useState<FilterRarity>('all');
  const [sortMode, setSortMode] = useState<SortMode>('turn');

  const player = view === 'all' ? undefined : players[view];
  const caughtFish = useMemo(() => player?.caughtFish ?? [], [player]);

  // みんなの釣果: 新しい順（巡 → 手番の順 → 釣った順の逆）に並べ、巡ごとにまとめる
  const timeline = useMemo(() => {
    const all = players.flatMap((p, pi) => p.caughtFish.map((c, ci) => ({ c, pi, ci })));
    all.sort((a, b) => b.c.turn - a.c.turn || b.pi - a.pi || b.ci - a.ci);
    const groups: { turn: number; items: typeof all }[] = [];
    for (const e of all) {
      const last = groups[groups.length - 1];
      if (last && last.turn === e.c.turn) last.items.push(e);
      else groups.push({ turn: e.c.turn, items: [e] });
    }
    return groups;
  }, [players]);
  const allCount = useMemo(() => players.reduce((n, p) => n + p.caughtFish.length, 0), [players]);

  const totalPoints = useMemo(
    () => caughtFish.reduce((sum, c) => sum + calculatePoints(c), 0),
    [caughtFish],
  );

  const filtered = useMemo(() => {
    let list = [...caughtFish];

    if (filter !== 'all') {
      list = list.filter(c => {
        const fish = FISH_MAP.get(c.fishId);
        return fish?.rarity === filter;
      });
    }

    switch (sortMode) {
      case 'points':
        list.sort((a, b) => calculatePoints(b) - calculatePoints(a));
        break;
      case 'size':
        list.sort((a, b) => b.size - a.size);
        break;
      case 'turn':
      default:
        list.sort((a, b) => a.turn - b.turn);
        break;
    }

    return list;
  }, [caughtFish, filter, sortMode]);

  return (
    <div className="fixed inset-0 z-50 bg-ai-900 overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 panel-ai backdrop-blur-sm px-4 py-3 flex items-center justify-between z-10 rounded-none border-x-0 border-t-0">
        <div>
          <h2 className="text-lg font-mincho text-kin-300 ink-underline flex items-center gap-2">
            <Icon name="creel" size={22} className="text-kin-300" />
            <Ruby>釣果バッグ</Ruby>
          </h2>
          <span className="text-sm text-washi/60 tabular-nums">
            {view === 'all'
              ? <><Ruby>みんなで</Ruby>{allCount}<Ruby>匹</Ruby></>
              : <>{caughtFish.length}<Ruby>匹</Ruby> / {totalPoints}pt</>}
          </span>
        </div>
        <button
          onClick={onClose}
          aria-label="閉じる"
          className="w-9 h-9 flex items-center justify-center rounded-full bg-ai-800/60 border border-kin-500/30 text-washi hover:bg-ai-700/60 transition-colors"
        >
          <Icon name="close" size={18} />
        </button>
      </div>

      {/* だれの釣果を見るか */}
      {players.length > 1 && (
        <div className="px-4 pt-3 flex gap-1.5 flex-wrap" role="tablist" aria-label="だれの釣果を見るか">
          {(['all', ...players.map((_, i) => i)] as View[]).map(v => {
            const p = v === 'all' ? null : players[v];
            const on = view === v;
            return (
              <button
                key={String(v)}
                role="tab"
                aria-selected={on}
                onClick={() => setView(v)}
                className={`px-3 py-1 rounded-full text-xs font-mincho font-bold transition cursor-pointer border inline-flex items-center gap-1.5 ${
                  on ? 'bg-kin-500/20 text-kin-300 border-kin-500/40' : 'bg-ai-800/40 text-washi/60 border-ai-600/30 hover:bg-ai-700/40'
                }`}
              >
                {p ? <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} /> : null}
                {p ? p.name : <Ruby>みんな</Ruby>}
              </button>
            );
          })}
        </div>
      )}

      {view === 'all' ? (
        <div className="p-4 space-y-4">
          {timeline.length === 0 ? (
            <div className="text-center py-16 text-washi/40 font-mincho">
              <Icon name="rod" size={56} className="text-washi/30 mx-auto mb-4" />
              <p><Ruby>まだだれも魚を釣っていません</Ruby></p>
            </div>
          ) : (
            timeline.map(g => (
              <section key={g.turn}>
                <h3 className="text-xs font-mincho font-bold text-kin-300/90 mb-1.5 flex items-center gap-2">
                  <Ruby>{turnLabel(g.turn, isCity)}</Ruby>
                  {g.turn === turn && <span className="text-[10px] text-shu-300 border border-shu-500/40 rounded-full px-1.5">いま</span>}
                  <span className="flex-1 h-px bg-kin-500/20" />
                </h3>
                <div className="space-y-1.5">
                  {g.items.map(({ c, pi, ci }) => {
                    const fish = FISH_MAP.get(c.fishId);
                    if (!fish) return null;
                    const who = players[pi];
                    return (
                      <div key={`${pi}-${ci}`} className="panel-ai px-2.5 py-2 flex items-center gap-2.5">
                        <div className="shrink-0 washi-card rounded-md p-0.5 flex items-center justify-center">
                          <FishIllustration fishId={c.fishId} width={40} height={26} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[11px] font-bold inline-flex items-center gap-1 text-washi/80">
                              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: who?.color }} />
                              {who?.name}
                            </span>
                            <span className="font-mincho font-bold text-sm text-washi"><Ruby>{fish.name}</Ruby></span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mincho ${RARITY_COLORS[fish.rarity]}`}>
                              {RARITY_NAMES[fish.rarity]}
                            </span>
                            {c.via && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-shu-500/15 text-shu-300 border border-shu-500/30 font-mincho">
                                <Ruby>{VIA_LABEL[c.via]}</Ruby>
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-washi/50 mt-0.5 flex flex-wrap gap-x-3">
                            <span>📍<Ruby>{NODE_MAP.get(c.caughtAt)?.name ?? c.caughtAt}</Ruby></span>
                            <span className="tabular-nums">サイズ {Math.round(c.size * 100)}%</span>
                            <span className="text-kin-300 tabular-nums">{calculatePoints(c)}pt</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))
          )}
        </div>
      ) : (
      <>
      {/* Filter tabs */}
      <div className="px-4 pt-3 flex gap-1.5 flex-wrap">
        {RARITY_FILTERS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-2.5 py-1 rounded-full text-xs font-mincho transition cursor-pointer border ${
              filter === key
                ? 'bg-kin-500/20 text-kin-300 border-kin-500/30'
                : 'bg-ai-800/40 text-washi/50 border-ai-600/30 hover:bg-ai-700/40'
            }`}
          >
            <Ruby>{label}</Ruby>
          </button>
        ))}
      </div>

      {/* Sort options */}
      <div className="px-4 pt-2 pb-1 flex gap-2 text-xs text-washi/50 font-mincho">
        <span><Ruby>並び替え</Ruby>:</span>
        {([['turn', '釣った順'], ['points', 'ポイント順'], ['size', 'サイズ順']] as const).map(([mode, label]) => (
          <button
            key={mode}
            onClick={() => setSortMode(mode)}
            className={`transition cursor-pointer ${
              sortMode === mode ? 'text-kin-300 font-bold' : 'hover:text-washi/70'
            }`}
          >
            <Ruby>{label}</Ruby>
          </button>
        ))}
      </div>

      {/* Fish list */}
      <div className="p-4 space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-washi/40 font-mincho">
            <Icon name="rod" size={56} className="text-washi/30 mx-auto mb-4" />
            <p><Ruby>まだ魚を釣っていません</Ruby></p>
          </div>
        ) : (
          filtered.map((caught, idx) => {
            const fish = FISH_MAP.get(caught.fishId);
            if (!fish) return null;
            const locationNode = NODE_MAP.get(caught.caughtAt);
            const pts = calculatePoints(caught);
            const sizePercent = Math.round(caught.size * 100);

            return (
              <div
                key={`${caught.fishId}-${caught.turn}-${idx}`}
                className="panel-ai p-3 flex items-start gap-3"
              >
                <div className="shrink-0 washi-card rounded-md p-1 flex items-center justify-center">
                  <FishIllustration fishId={caught.fishId} width={48} height={32} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mincho font-bold text-sm text-washi"><Ruby>{fish.name}</Ruby></span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mincho ${RARITY_COLORS[fish.rarity]}`}>
                      {RARITY_NAMES[fish.rarity]}
                    </span>
                    {caught.via && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-shu-500/15 text-shu-300 border border-shu-500/30 font-mincho">
                        <Ruby>{VIA_LABEL[caught.via]}</Ruby>
                      </span>
                    )}
                    {(caught.bonusMultiplier ?? 1) > 1 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-shu-500/20 text-shu-400 border border-shu-500/30 font-mincho tabular-nums">
                        x{caught.bonusMultiplier}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-washi/50 mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                    <span className="tabular-nums">サイズ {sizePercent}%</span>
                    <span className="text-kin-300 font-medium tabular-nums">{pts}pt</span>
                    <span>📍<Ruby>{locationNode?.name ?? caught.caughtAt}</Ruby></span>
                    <span className="tabular-nums"><Ruby>{turnLabel(caught.turn, isCity)}</Ruby></span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
      </>
      )}
    </div>
  );
}
