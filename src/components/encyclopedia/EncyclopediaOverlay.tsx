import { useState } from 'react';
import { useGameStore } from '../../store/useGameStore';
import { FISH_DATABASE } from '../../data/fishDatabase';
import type { Fish, FishRarity } from '../../game/types';
import FishCard from './FishCard';
import FishDetail from './FishDetail';
import Button from '../shared/Button';

const RARITY_ORDER: FishRarity[] = ['common', 'uncommon', 'rare', 'legendary', 'mythical'];
const RARITY_NAMES: Record<FishRarity, string> = {
  common: 'コモン',
  uncommon: 'アンコモン',
  rare: 'レア',
  legendary: 'レジェンダリー',
  mythical: 'ミシカル',
};

interface EncyclopediaOverlayProps {
  onClose: () => void;
  standaloneEncyclopedia?: Record<string, boolean>; // タイトル画面からの表示用
  onReset?: () => void; // リセット後のコールバック
}

export default function EncyclopediaOverlay({ onClose, standaloneEncyclopedia, onReset }: EncyclopediaOverlayProps) {
  const encyclopedias = useGameStore(s => s.encyclopedias);
  const players = useGameStore(s => s.players);
  const currentPlayerIndex = useGameStore(s => s.currentPlayerIndex);
  const [viewingPlayerIndex, setViewingPlayerIndex] = useState(currentPlayerIndex);
  const [selectedFish, setSelectedFish] = useState<Fish | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetInput, setResetInput] = useState('');
  const [resetting, setResetting] = useState(false);

  const isStandalone = standaloneEncyclopedia != null;
  const encyclopedia = isStandalone ? standaloneEncyclopedia : (encyclopedias[viewingPlayerIndex] ?? {});
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
    <div className="fixed inset-0 z-50 bg-gradient-to-b from-slate-900 to-slate-950 overflow-y-auto">
      {/* リセット確認ダイアログ */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowResetConfirm(false)} />
          <div className="relative bg-gradient-to-b from-red-950 to-slate-900 rounded-2xl border border-red-500/30 shadow-2xl p-6 w-[85%] max-w-sm">
            <h3 className="text-lg font-bold text-red-400 mb-2">図鑑データをリセット</h3>
            <p className="text-sm text-white/60 mb-1">
              全ての図鑑データが削除されます。この操作は取り消せません。
            </p>
            <p className="text-sm text-white/80 mb-4">
              続行するには「<span className="text-red-400 font-bold">リセット</span>」と入力してください。
            </p>
            <input
              type="text"
              value={resetInput}
              onChange={(e) => setResetInput(e.target.value)}
              placeholder="リセット"
              className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-white/20 outline-none focus:border-red-400 transition mb-4"
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
                {resetting ? '処理中...' : '実行'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ヘッダー */}
      <div className="sticky top-0 bg-black/50 backdrop-blur-sm px-4 py-3 z-10">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">📖 図鑑</h2>
          <div className="flex items-center gap-3">
            <span className="text-sm text-white/60">
              {caughtCount}/{totalCount} ({percent}%)
            </span>
            {isStandalone && onReset && (
              <Button onClick={() => setShowResetConfirm(true)} variant="danger" size="sm">リセット</Button>
            )}
            <Button onClick={onClose} variant="secondary" size="sm">閉じる</Button>
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
                    ? 'bg-blue-600 text-white'
                    : 'bg-white/10 text-white/50 hover:bg-white/20'
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
              <h3 className="text-sm font-bold text-white/50 mb-2">
                {RARITY_NAMES[rarity]} ({fishOfRarity.filter(f => encyclopedia[f.id]).length}/{fishOfRarity.length})
              </h3>
              <div className="grid grid-cols-5 gap-2">
                {fishOfRarity.map(fish => (
                  <FishCard
                    key={fish.id}
                    fish={fish}
                    caught={!!encyclopedia[fish.id]}
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
