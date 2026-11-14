import { useMemo, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { useGameStore } from '../../store/useGameStore';
import { FISH_DATABASE } from '../../data/fishDatabase';
import type { Fish, FishRarity } from '../../game/types';
import FishCard from './FishCard';
import FishDetail from './FishDetail';
import Button from '../shared/Button';
import Icon from '../shared/Icon';
import Ruby from '../shared/Ruby';
import Stamp from '../fx/Stamp';
import { FILTER_TEXT, HABITAT_GROUPS, NO_FILTER, RARITY_NAMES, RARITY_ORDER, REGION_LABELS, REGION_ORDER, filterFish, rarityProgress } from './encyclopediaFilter';
import type { FishFilter } from './encyclopediaFilter';
import { useSettingsStore } from '../../store/useSettingsStore';
import { FISH_ART_LABELS, FISH_ART_PREFS } from '../shared/fishArt/styles';

// レア度色（セマンティクスを保ちつつ和モダンに調和）
const RARITY_COLORS: Record<FishRarity, string> = {
  common: 'text-washi/55',
  uncommon: 'text-emerald-300',
  rare: 'text-ai-300',
  legendary: 'text-kin-300',
  mythical: 'text-shu-400',
};
// 達成の輪の色
const RARITY_RING: Record<FishRarity, string> = {
  common: '#d8c79e',
  uncommon: '#6ee7b7',
  rare: '#7fa9cd',
  legendary: '#f1d893',
  mythical: '#ef6a52',
};

const EMPTY_ENCYCLOPEDIA: Record<string, boolean> = {};

/** しぼる札の1行（横に流せる） */
function ChipRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="shrink-0 w-[3.4em] text-[11px] text-washi/55 font-mincho"><Ruby>{label}</Ruby></span>
      <div className="fd-chiprow flex-1 min-w-0">{children}</div>
    </div>
  );
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      className={`fd-chip ${on ? 'is-on' : ''}`}
      onClick={e => {
        onClick();
        // 選んだ札が横の流れの外に隠れないよう、見える所へ寄せる
        e.currentTarget.scrollIntoView({ inline: 'center', block: 'nearest' });
      }}
    >
      {children}
    </button>
  );
}

interface EncyclopediaOverlayProps {
  onClose: () => void;
  standaloneEncyclopedia?: Record<string, boolean>; // タイトル画面からの表示用
  onReset?: () => void; // リセット後のコールバック
}

export default function EncyclopediaOverlay({ onClose, standaloneEncyclopedia, onReset }: EncyclopediaOverlayProps) {
  const encyclopedias = useGameStore(s => s.encyclopedias);
  const initialEncyclopedias = useGameStore(s => s.initialEncyclopedias);
  const players = useGameStore(s => s.players);
  const currentPlayerIndex = useGameStore(s => s.currentPlayerIndex);
  const [viewingPlayerIndex, setViewingPlayerIndex] = useState(currentPlayerIndex);
  const [selectedFish, setSelectedFish] = useState<Fish | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetInput, setResetInput] = useState('');
  const [resetting, setResetting] = useState(false);
  const fishArt = useSettingsStore(s => s.fishArt);
  const setFishArt = useSettingsStore(s => s.setFishArt);

  const isStandalone = standaloneEncyclopedia != null;
  const encyclopedia = useMemo(
    () => standaloneEncyclopedia ?? encyclopedias[viewingPlayerIndex] ?? EMPTY_ENCYCLOPEDIA,
    [standaloneEncyclopedia, encyclopedias, viewingPlayerIndex],
  );
  const initEnc = isStandalone ? null : (initialEncyclopedias[viewingPlayerIndex] ?? null);
  const [filter, setFilter] = useState<FishFilter>(NO_FILTER);
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => filterFish(FISH_DATABASE, filter, encyclopedia, query), [filter, encyclopedia, query]);
  const progress = useMemo(() => rarityProgress(FISH_DATABASE, encyclopedia), [encyclopedia]);
  const caughtCount = FISH_DATABASE.filter(f => encyclopedia[f.id]).length;
  const totalCount = FISH_DATABASE.length;
  const percent = Math.round((caughtCount / totalCount) * 100);

  const handleReset = async () => {
    if (resetInput !== 'リセット') return;
    setResetting(true);
    try {
      if (onReset) onReset();
    } finally {
      setResetting(false);
      setShowResetConfirm(false);
      setResetInput('');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-b from-ai-900 to-ai-950 overflow-y-auto">
      {/* リセット確認ダイアログ */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowResetConfirm(false)} />
          <div className="panel-ai relative rounded-2xl border-shu-500/40 shadow-2xl p-6 w-[85%] max-w-sm">
            <h3 className="font-mincho text-lg font-bold text-shu-400 mb-2"><Ruby>図鑑データをリセット</Ruby></h3>
            <p className="text-sm text-washi/60 mb-1">
              <Ruby>全ての図鑑データが削除されます。この操作は取り消せません。</Ruby>
            </p>
            <p className="text-sm text-washi/80 mb-4">
              <Ruby>続行するには「</Ruby><span className="text-shu-400 font-bold">リセット</span><Ruby>」と入力してください。</Ruby>
            </p>
            <input
              type="text"
              value={resetInput}
              onChange={(e) => setResetInput(e.target.value)}
              placeholder="リセット"
              className="w-full bg-ai-800/60 border border-kin-500/20 rounded-lg px-3 py-2 text-washi placeholder-washi/20 outline-none focus:border-shu-400 transition mb-4"
            />
            <div className="flex gap-3">
              <Button
                onClick={() => { setShowResetConfirm(false); setResetInput(''); }}
                variant="secondary"
                className="flex-1"
              >
                キャンセル
              </Button>
              <Button
                onClick={handleReset}
                variant="danger"
                className="flex-1"
                disabled={resetInput !== 'リセット' || resetting}
              >
                <Ruby>{resetting ? '処理中...' : '実行'}</Ruby>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ヘッダー */}
      <div className="sticky top-0 bg-ai-900/70 backdrop-blur-sm border-b border-kin-500/20 px-4 py-3 z-10">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-mincho text-lg font-bold text-kin-300">
            <Icon name="book" size={22} className="text-kin-400" />
            <Ruby>図鑑</Ruby>
          </h2>
          <div className="flex items-center gap-3">
            <span className="text-sm text-washi/60 tabular-nums">
              {caughtCount}/{totalCount} ({percent}%)
            </span>
            {isStandalone && onReset && (
              <Button onClick={() => setShowResetConfirm(true)} variant="danger" size="sm">リセット</Button>
            )}
            <button
              onClick={onClose}
              aria-label="閉じる"
              className="flex items-center justify-center w-11 h-11 rounded-full bg-ai-800/60 border border-kin-500/30 text-washi/80 hover:text-washi hover:border-kin-500/50 transition cursor-pointer"
            >
              <Icon name="close" size={18} />
            </button>
          </div>
        </div>

        {/* プレイヤー切替タブ（ゲーム中のみ表示） */}
        {!isStandalone && players.length > 1 && (
          <div className="fd-chiprow mt-2">
            {players.map((p, i) => (
              <button
                key={p.id}
                onClick={() => setViewingPlayerIndex(i)}
                className={`flex items-center gap-1.5 px-3 min-h-[44px] shrink-0 rounded-lg text-xs font-medium transition cursor-pointer whitespace-nowrap
                  ${viewingPlayerIndex === i
                    ? 'bg-ai-600 text-washi border border-kin-500/40'
                    : 'bg-ai-800/50 text-washi/50 border border-transparent hover:bg-ai-700/60'
                  }`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: p.color }}
                />
                {p.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mx-auto w-full max-w-6xl">
        {/* めずらしさごとの達成（判子の列）。押すと、そのめずらしさだけにしぼる */}
        <div className="px-3 sm:px-4 pt-3 grid grid-cols-5 gap-1.5 sm:gap-2">
          {RARITY_ORDER.map(rarity => {
            const { found, total } = progress[rarity];
            const done = total > 0 && found >= total;
            const on = filter.rarity === rarity;
            return (
              <button
                key={rarity}
                type="button"
                aria-pressed={on}
                onClick={() => setFilter(f => ({ ...f, rarity: on ? 'all' : rarity }))}
                className={`fd-rar ${on ? 'is-on' : ''}`}
              >
                {done ? (
                  <Stamp tone="shu" size={40} tilt={-8} silent>達成</Stamp>
                ) : (
                  <span className="fd-ring" style={{ '--p': total ? (found / total) * 100 : 0, '--c': RARITY_RING[rarity] } as CSSProperties}>
                    <span className="tabular-nums">{found}</span>
                  </span>
                )}
                <span className={`text-[9px] sm:text-[11px] leading-tight whitespace-nowrap font-mincho ${RARITY_COLORS[rarity]}`}>{RARITY_NAMES[rarity]}</span>
                <span className="text-[9px] sm:text-[10px] leading-none text-washi/45 tabular-nums">{found}/{total}</span>
              </button>
            );
          })}
        </div>

        <label className="block px-3 sm:px-4 pt-3">
          <span className="block mb-1 text-xs text-washi/70 font-mincho"><Ruby>{FILTER_TEXT.search}</Ruby></span>
          <input
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="つったさかな（ひらがなでもOK）"
            className="w-full min-h-[44px] rounded-lg border border-washi/20 bg-ai-950 px-3 text-base text-washi placeholder:text-washi/45 focus:outline-none focus:ring-2 focus:ring-washi/50"
          />
        </label>

        {/* しぼる札: 地方・すみか・見つけたか */}
        <div className="px-3 sm:px-4 pt-3 space-y-1.5">
          <ChipRow label={FILTER_TEXT.region}>
            <Chip on={filter.region === 'all'} onClick={() => setFilter(f => ({ ...f, region: 'all' }))}><Ruby>{FILTER_TEXT.all}</Ruby></Chip>
            {REGION_ORDER.map(r => (
              <Chip key={r} on={filter.region === r} onClick={() => setFilter(f => ({ ...f, region: r }))}><Ruby>{REGION_LABELS[r]}</Ruby></Chip>
            ))}
          </ChipRow>
          <ChipRow label={FILTER_TEXT.habitat}>
            <Chip on={filter.habitat === 'all'} onClick={() => setFilter(f => ({ ...f, habitat: 'all' }))}><Ruby>{FILTER_TEXT.all}</Ruby></Chip>
            {HABITAT_GROUPS.map(g => (
              <Chip key={g.id} on={filter.habitat === g.id} onClick={() => setFilter(f => ({ ...f, habitat: g.id }))}><Ruby>{g.label}</Ruby></Chip>
            ))}
            <span className="shrink-0 w-px self-stretch my-2 bg-washi/15" aria-hidden="true" />
            <Chip on={filter.found === 'found'} onClick={() => setFilter(f => ({ ...f, found: f.found === 'found' ? 'all' : 'found' }))}><Ruby>{FILTER_TEXT.found}</Ruby></Chip>
            <Chip on={filter.found === 'yet'} onClick={() => setFilter(f => ({ ...f, found: f.found === 'yet' ? 'all' : 'yet' }))}><Ruby>{FILTER_TEXT.yet}</Ruby></Chip>
          </ChipRow>
          {/* 魚の絵の描き方（設定と同じ。ゲーム中の絵もすべて変わる） */}
          <ChipRow label="魚の絵">
            {FISH_ART_PREFS.map(p => (
              <Chip key={p} on={fishArt === p} onClick={() => setFishArt(p)}><Ruby>{FISH_ART_LABELS[p]}</Ruby></Chip>
            ))}
          </ChipRow>
        </div>

        {/* 魚一覧 */}
        <div className="p-3 sm:p-4 space-y-6">
          {filtered.length === 0 && (
            <div className="text-center py-10">
              <p className="text-sm text-washi/55 mb-3"><Ruby>{FILTER_TEXT.none}</Ruby></p>
              <Button onClick={() => { setFilter(NO_FILTER); setQuery(''); }} variant="secondary" size="sm" className="min-h-[44px]"><Ruby>{FILTER_TEXT.reset}</Ruby></Button>
            </div>
          )}
          {RARITY_ORDER.map(rarity => {
            const fishOfRarity = filtered.filter(f => f.rarity === rarity);
            if (fishOfRarity.length === 0) return null;
            return (
              <section key={rarity} className="fd-cv">
                <h3 className={`ink-underline inline-flex items-baseline gap-1.5 font-mincho text-sm font-bold mb-3 ${RARITY_COLORS[rarity]}`}>
                  {RARITY_NAMES[rarity]}
                  <span className="text-xs text-washi/45 tabular-nums">
                    ({fishOfRarity.filter(f => encyclopedia[f.id]).length}/{fishOfRarity.length})
                  </span>
                </h3>
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10">
                  {fishOfRarity.map(fish => (
                    <FishCard
                      key={fish.id}
                      fish={fish}
                      caught={!!encyclopedia[fish.id]}
                      isNew={initEnc ? (!!encyclopedia[fish.id] && !initEnc[fish.id]) : false}
                      onClick={() => setSelectedFish(fish)}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </div>

      {/* 詳細モーダル */}
      {selectedFish && (
        <FishDetail
          fish={selectedFish}
          caught={!!encyclopedia[selectedFish.id]}
          onClose={() => setSelectedFish(null)}
        />
      )}
    </div>
  );
}
