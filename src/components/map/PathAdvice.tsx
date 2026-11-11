// 行き先のおすすめ（損得係）: 分かれ道で「どこへ行くと得か」を見せる部品。
// 並べ方と理由は game/pathAdvice.ts（CPU の道選びと同じ点。人は堅実型の重み・乱数なし）。
//  - （usePathAdvice.ts）いまの分かれ道のおすすめ順（人の手番で、設定「おすすめ」が入のときだけ）
//  - PathAdviceRings  地図の中（SVG）: 上位3つに金の輪と短い理由の札。動きは出たときの数回だけ（CSS。index.css の ad-）
//  - PathAdvicePanel  地図の下（HTML）: 「おすすめ：○○へ」の大きなボタンと、おすすめ順の一覧
import { memo, useMemo, useState } from 'react';
import { useSettingsStore } from '../../store/useSettingsStore';
import { NODE_MAP } from '../../data/boardNodes';
import type { BoardNode } from '../../game/types';
import { ADVICE_TOP, topPaths } from '../../game/pathAdvice';
import type { RankedPath } from '../../game/pathAdvice';
import { nodeRadius } from './mapTheme';
import Ruby from '../shared/Ruby';

// ===== 地図の金の輪 =====

/** JapanMap の <svg> の中に置く（マスと地名の上・駒の下）。タップは素通し */
export const PathAdviceRings = memo(function PathAdviceRings({ ranked }: { ranked: RankedPath[] }) {
  const tops = topPaths(ranked);
  return (
    <g className="ad-map" aria-hidden="true">
      {tops.map((r, i) => {
        const n = NODE_MAP.get(r.nodeId);
        if (!n) return null;
        const top = i === 0;
        const rad = nodeRadius(n) + (top ? 7.5 : 6.5);
        const text = r.tag.short;
        const w = 21 + text.length * 8.6;
        return (
          <g key={r.nodeId} transform={`translate(${n.x} ${n.y})`}>
            {/* ズーム段階で大きさをそろえる（原点＝マスの中心を軸に拡大する） */}
            <g className="ad-map-s">
              {top && <circle r={rad} className="ad-ring-glow" />}
              <circle r={rad} className={`ad-ring${top ? ' is-top' : ''}`} />
              <circle r={rad} className="ad-ring ad-ring-pulse" style={{ animationDelay: `${i * 0.25}s` }} />
              {/* 理由の札は指で隠れないよう、マスの上側に出す */}
              <g transform={`translate(0 ${-(rad + 12.5)})`}>
                <rect x={-w / 2} y={-7.5} width={w} height={15} rx={7.5} className={`ad-tag-bg${top ? ' is-top' : ''}`} />
                <circle cx={-w / 2 + 8} cy={0} r={5.2} className={`ad-tag-num-bg${top ? ' is-top' : ''}`} />
                <text x={-w / 2 + 8} y={0.5} textAnchor="middle" dominantBaseline="central" className={`ad-tag-num${top ? ' is-top' : ''}`}>{i + 1}</text>
                <text x={-w / 2 + 16} y={0.5} dominantBaseline="central" className={`ad-tag-text${top ? ' is-top' : ''}`}>{text}</text>
              </g>
            </g>
          </g>
        );
      })}
    </g>
  );
});

// ===== 地図の下の一覧 =====

const TYPE_ORDER: Record<string, number> = { capital: 0, fishing_special: 1, fishing: 2, shop: 3, rest: 4, event_good: 5, event_random: 6, event_bad: 7, goal: 8, start: 9, route: 10 };
const TYPE_GLYPH: Record<string, string> = { capital: '祭', fishing_special: '名', fishing: '釣', shop: '店', rest: '湯', event_good: '吉', event_random: '籤', event_bad: '凶', goal: '旗', start: '始', route: '道' };

interface Item {
  /** reachableNodes の中の番号 */
  i: number;
  node: BoardNode;
  steps: number;
  ranked: RankedPath | undefined;
}

function Glyph({ type, dark = false }: { type: string; dark?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`w-6 h-6 shrink-0 rounded-full flex items-center justify-center font-mincho text-xs font-bold ${dark ? 'bg-[#3a2a0e] text-kin-300' : 'bg-ai-950/60 text-kin-300'}`}
    >
      {TYPE_GLYPH[type] ?? '・'}
    </span>
  );
}

function Steps({ n, className = '' }: { n: number; className?: string }) {
  return (
    <span className={`shrink-0 tabular-nums whitespace-nowrap ${className}`}>
      {n}<span className="text-[10px]">マス</span>
    </span>
  );
}

/** 注意の札（買い物代・運賃・悪い出来事） */
function Warns({ ranked, dark = false }: { ranked: RankedPath; dark?: boolean }) {
  if (!ranked.warns.length) return null;
  return (
    <>
      {ranked.warns.map(w => (
        <span
          key={w.kind}
          className={`inline-flex items-center gap-0.5 rounded px-1 font-bold whitespace-nowrap ${dark ? 'bg-shu-700 text-washi' : 'bg-shu-700/45 text-washi border border-shu-400/40'}`}
        >
          <span aria-hidden="true">!</span>
          <Ruby>{w.label}</Ruby>
        </span>
      ))}
    </>
  );
}

interface PanelProps {
  paths: string[][];
  /** 終点のマス → 歩数（線路の上は数えない） */
  steps: Map<string, number>;
  /** おすすめ順（null なら、おすすめなしの一覧） */
  ranked: RankedPath[] | null;
  onSelect: (i: number) => void;
}

/**
 * 分かれ道の代わりの操作（地図のマスを直接タップしてもよい）。
 * 閉じているとき: 「おすすめ：○○へ」の金のボタン（1回押せば進む）と、一覧を開くボタン。
 * 開いているとき: おすすめ順の一覧（いちばん上の金の行が金のボタンの代わり。4つ目からは「ほかの行き先」に畳む）と、「おすすめ ON/OFF」。
 * 置き場所: スマホは下の左寄り（右の道具ボタンを避け、一覧は左の丸いボタンの下に収める）、広い縦長は下の中央、
 * 横長の広い画面は左下（地図の真ん中を空ける）。
 */
export function PathAdvicePanel({ paths, steps, ranked, onSelect }: PanelProps) {
  const [open, setOpen] = useState(false);
  const [showRest, setShowRest] = useState(false);
  const enabled = useSettingsStore(s => s.adviceEnabled);
  const toggleAdvice = useSettingsStore(s => s.toggleAdvice);

  const items: Item[] = useMemo(() => {
    const byIndex = new Map((ranked ?? []).map(r => [r.index, r]));
    const list: Item[] = [];
    paths.forEach((path, i) => {
      const end = path[path.length - 1];
      const node = NODE_MAP.get(end);
      if (node) list.push({ i, node, steps: steps.get(end) ?? path.length - 1, ranked: byIndex.get(i) });
    });
    if (ranked) {
      const order = new Map(ranked.map((r, k) => [r.index, k]));
      return list.sort((a, b) => (order.get(a.i) ?? 99) - (order.get(b.i) ?? 99));
    }
    return list.sort((a, b) => (TYPE_ORDER[a.node.type] ?? 9) - (TYPE_ORDER[b.node.type] ?? 9) || b.steps - a.steps);
  }, [paths, steps, ranked]);

  const best = ranked ? items[0] : undefined;
  const tops = ranked ? items.slice(0, ADVICE_TOP) : [];
  const rest = ranked ? items.slice(ADVICE_TOP) : items;
  const restShown = !ranked || showRest || tops.length === 0;

  return (
    // 置き方: 左右と下は GameScreen の下の操作（left-4・right-[4.5rem]）にそろえ、右の丸いボタンを避ける。
    // スマホでは左の丸いボタン（44px が4つで、地図の上から 208px まで）の下に一覧を収める（重ねない）。
    // 幅 640px 以上は中央寄せ（左のボタンに掛からない）、横長の広い画面は左のボタンの右どなり
    <div className="ad-path absolute z-20 bottom-3 left-4 right-[4.5rem] top-[13.5rem] flex flex-col justify-end gap-1.5 pointer-events-none sm:top-16 sm:left-1/2 sm:right-auto sm:w-[min(72%,460px)] sm:-translate-x-1/2 landscape:lg:left-20 landscape:lg:w-[340px] landscape:lg:translate-x-0">
      {open && (
        <div className="min-h-0 overflow-y-auto overscroll-contain pointer-events-auto rounded-xl bg-ai-900/95 backdrop-blur-sm border border-kin-500/35 shadow-2xl p-2 space-y-1.5" role="group" aria-label="移動先を選択">
          <p className="text-[11px] leading-none text-washi/65 font-mincho"><Ruby>{ranked ? 'おすすめ順' : '行き先'}</Ruby></p>

          {tops.map((it, k) => (
            <button
              key={it.node.id}
              onClick={() => onSelect(it.i)}
              className={`w-full min-h-11 flex items-center gap-2 rounded-lg border px-2 py-1 text-left text-xs transition cursor-pointer ${
                k === 0 ? 'border-kin-300/80 bg-kin-500/20 hover:bg-kin-500/30' : 'border-kin-500/30 bg-ai-800/60 hover:bg-ai-700/70'
              }`}
            >
              <span className="w-5 h-5 shrink-0 rounded-full bg-kin-400 text-[#3a2a0e] text-[11px] font-bold flex items-center justify-center tabular-nums">{k + 1}</span>
              <Glyph type={it.node.type} />
              <span className="min-w-0 flex-1">
                <span className="block font-bold text-washi font-mincho text-[13px] leading-tight"><Ruby>{it.node.name}</Ruby></span>
                {it.ranked && (
                  <span className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[10px] leading-snug text-kin-300">
                    {(it.ranked.tags.length ? it.ranked.tags.slice(0, 2) : [it.ranked.tag]).map(t => (
                      <span key={t.kind} className="whitespace-nowrap"><Ruby>{t.label}</Ruby></span>
                    ))}
                    <Warns ranked={it.ranked} />
                  </span>
                )}
              </span>
              <Steps n={it.steps} className="text-washi/70" />
            </button>
          ))}

          {ranked && tops.length > 0 && rest.length > 0 && (
            <button
              type="button"
              onClick={() => setShowRest(v => !v)}
              aria-expanded={showRest}
              className="w-full min-h-11 rounded-lg border border-kin-500/25 bg-ai-800/40 hover:bg-ai-700/60 text-[11px] text-washi/75 transition cursor-pointer"
            >
              <span aria-hidden="true">{showRest ? '▼' : '▶'}</span> <Ruby>ほかの行き先</Ruby>（{rest.length}）
            </button>
          )}

          {restShown && rest.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 landscape:lg:grid-cols-2 gap-1">
              {rest.map(it => (
                <button
                  key={it.node.id}
                  onClick={() => onSelect(it.i)}
                  className={`min-h-11 flex items-center gap-1.5 text-left rounded-lg px-2 py-1 text-xs transition cursor-pointer border ${
                    it.node.type === 'route' ? 'bg-ai-800/50 border-transparent text-washi/60 hover:bg-ai-700/60' : 'bg-amber-700/40 border-amber-500/30 text-washi hover:bg-amber-600/60'
                  }`}
                >
                  <Glyph type={it.node.type} />
                  <span className="min-w-0 flex-1 truncate font-bold"><Ruby>{it.node.name}</Ruby></span>
                  {it.ranked && it.ranked.warns.length > 0 && (
                    <span className="shrink-0 w-4 h-4 rounded-full bg-shu-600 text-washi text-[10px] font-bold flex items-center justify-center" title={it.ranked.warns.map(w => w.label).join('・')}>!</span>
                  )}
                  {/* 狭い2列では名前を優先して、歩数は数字だけ */}
                  <span className="shrink-0 opacity-60 tabular-nums">{it.steps}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {best?.ranked && !open && (
        <button
          onClick={() => onSelect(best.i)}
          data-guide="path-best"
          className="shrink-0 pointer-events-auto min-h-12 w-full flex items-center gap-2 rounded-xl border border-kin-300/70 bg-gradient-to-b from-kin-300 to-kin-600 px-2.5 py-1.5 text-left text-[#3a2a0e] shadow-xl active:scale-[0.98] transition cursor-pointer"
        >
          <Glyph type={best.node.type} dark />
          <span className="min-w-0 flex-1 leading-tight">
            <span className="block text-[10px] font-bold tracking-widest opacity-80">おすすめ</span>
            <span className="flex items-baseline gap-x-1.5 flex-wrap">
              <span className="font-mincho text-[15px] font-bold"><Ruby>{best.node.name}</Ruby>へ</span>
              <span className="text-[11px] font-bold whitespace-nowrap"><Ruby>{best.ranked.tag.label}</Ruby></span>
            </span>
            {best.ranked.warns.length > 0 && (
              <span className="mt-0.5 flex flex-wrap gap-1 text-[10px] leading-snug"><Warns ranked={best.ranked} dark /></span>
            )}
          </span>
          <Steps n={best.steps} className="text-xs font-bold" />
        </button>
      )}

      <div className="shrink-0 flex items-center justify-center gap-2">
        <button
          onClick={() => setOpen(v => !v)}
          data-guide="path-list"
          aria-expanded={open}
          className="pointer-events-auto min-h-11 bg-amber-600/90 hover:bg-amber-500 text-white text-xs font-bold px-4 rounded-full shadow-lg backdrop-blur-sm transition-colors cursor-pointer"
        >
          {open ? <>▼ <Ruby>一覧を閉じる</Ruby></> : <>▲ <Ruby>行き先を一覧から選ぶ</Ruby>（{items.length}）</>}
        </button>
        {open && (
          <button
            type="button"
            onClick={toggleAdvice}
            aria-pressed={enabled}
            className={`pointer-events-auto min-h-11 rounded-full border px-3 text-[11px] font-bold shadow-lg backdrop-blur-sm transition cursor-pointer whitespace-nowrap ${enabled ? 'border-kin-400/70 bg-ai-900/90 text-kin-300' : 'border-kin-500/30 bg-ai-900/90 text-washi/60'}`}
            title="行き先のおすすめを出す・出さない"
          >
            おすすめ {enabled ? 'ON' : 'OFF'}
          </button>
        )}
      </div>
    </div>
  );
}
