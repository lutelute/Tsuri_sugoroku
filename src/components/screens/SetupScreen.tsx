import { useState } from 'react';
import { useGameStore } from '../../store/useGameStore';
import { PLAYER_DEFAULT_NAMES, PLAYER_COLORS, DEFAULT_MAX_TURNS } from '../../game/constants';
import Button from '../shared/Button';

export default function SetupScreen() {
  const { setScreen, startGame } = useGameStore();
  const [playerCount, setPlayerCount] = useState(1);
  const [names, setNames] = useState<string[]>([...PLAYER_DEFAULT_NAMES]);
  const [maxTurns, setMaxTurns] = useState(DEFAULT_MAX_TURNS);

  const handleStart = () => {
    startGame({
      playerCount,
      playerNames: names.slice(0, playerCount),
      maxTurns,
    });
  };

  const updateName = (index: number, name: string) => {
    const newNames = [...names];
    newNames[index] = name;
    setNames(newNames);
  };

  return (
    <div className="flex flex-col items-center justify-center h-full px-4">
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 w-full max-w-md">
        <h2 className="text-2xl font-bold text-center mb-6">ゲーム設定</h2>

        {/* プレイヤー人数 */}
        <div className="mb-6">
          <label className="block text-sm text-white/60 mb-2">プレイヤー人数</label>
          <div className="flex gap-2">
            {[1, 2, 3, 4].map(n => (
              <button
                key={n}
                onClick={() => setPlayerCount(n)}
                className={`flex-1 py-2 rounded-lg text-lg font-bold transition-all cursor-pointer
                  ${playerCount === n
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-white/10 text-white/60 hover:bg-white/20'
                  }`}
              >
                {n}人
              </button>
            ))}
          </div>
        </div>

        {/* プレイヤー名 */}
        <div className="mb-6 space-y-3">
          {Array.from({ length: playerCount }, (_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div
                className="w-4 h-4 rounded-full shrink-0"
                style={{ backgroundColor: PLAYER_COLORS[i] }}
              />
              <input
                type="text"
                value={names[i]}
                onChange={(e) => updateName(i, e.target.value)}
                placeholder={PLAYER_DEFAULT_NAMES[i]}
                maxLength={10}
                className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-white/30 outline-none focus:border-blue-400 transition"
              />
            </div>
          ))}
        </div>

        {/* ターン数設定 */}
        <div className="mb-8">
          <label className="block text-sm text-white/60 mb-2">最大ターン数</label>
          <div className="flex gap-2">
            {[30, 50, 80, 0].map(n => (
              <button
                key={n}
                onClick={() => setMaxTurns(n)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer
                  ${maxTurns === n
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-white/10 text-white/60 hover:bg-white/20'
                  }`}
              >
                {n === 0 ? '無制限' : `${n}T`}
              </button>
            ))}
          </div>
        </div>

        {/* ボタン */}
        <div className="flex gap-3">
          <Button
            onClick={() => setScreen('title')}
            variant="secondary"
            className="flex-1"
          >
            戻る
          </Button>
          <Button
            onClick={handleStart}
            variant="gold"
            className="flex-1"
          >
            はじめる
          </Button>
        </div>
      </div>
    </div>
  );
}
