import { useState } from 'react';
import { useGameStore } from '../../store/useGameStore';
import { FISH_DATABASE } from '../../data/fishDatabase';
import type { Fish, FishRarity } from '../../game/types';
import FishCard from './FishCard';
import FishDetail from './FishDetail';
import Button from '../shared/Button';
import Icon from '../shared/Icon';
import Ruby from '../shared/Ruby';

const RARITY_ORDER: FishRarity[] = ['common', 'uncommon', 'rare', 'legendary', 'mythical'];
const RARITY_NAMES: Record<FishRarity, string> = {
  common: 'コモン',
  uncommon: 'アンコモン',
  rare: 'レア',
  legendary: 'レジェンダリー',
  mythical: 'ミシカル',
};
// レア度色（セマンティクスを保ちつつ和モダンに調和）
const RARITY_COLORS: Record<FishRarity, string> = {
  common: 'text-washi/55',
  uncommon: 'text-emerald-300',
  rare: 'text-ai-300',
  legendary: 'text-kin-300',
  mythical: 'text-shu-400',
};

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

  const isStandalone = standaloneEncyclopedia != null;
  const encyclopedia = isStandalone ? standaloneEncyclopedia : (encyclopedias[viewingPlayerIndex] ?? {});
  const initEnc = isStandalone ? null : (initialEncyclopedias[viewingPlayerIndex] ?? null);
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
              className="flex items-center justify-center w-8 h-8 rounded-full bg-ai-800/60 border border-kin-500/30 text-washi/80 hover:text-washi hover:border-kin-500/50 transition cursor-pointer"
            >
              <Icon name="close" size={18} />
            </button>
          </div>
        </div>

        {/* プレイヤー切替タブ（ゲーム中のみ表示） */}
        {!isStandalone && players.length > 1 && (
          <div className="flex gap-1.5 mt-2">
            {players.map((p, i) => (
              <button
                key={p.id}
                onClick={() => setViewingPlayerIndex(i)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer
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

      {/* 魚一覧 */}
      <div className="p-4 space-y-6">
        {RARITY_ORDER.map(rarity => {
          const fishOfRarity = FISH_DATABASE.filter(f => f.rarity === rarity);
          return (
            <div key={rarity}>
              <h3 className={`ink-underline inline-flex items-baseline gap-1.5 font-mincho text-sm font-bold mb-3 ${RARITY_COLORS[rarity]}`}>
                {RARITY_NAMES[rarity]}
                <span className="text-xs text-washi/45 tabular-nums">
                  ({fishOfRarity.filter(f => encyclopedia[f.id]).length}/{fishOfRarity.length})
                </span>
              </h3>
              <div className="grid grid-cols-5 gap-2">
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
            </div>
          );
        })}
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
