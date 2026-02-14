import { useState } from 'react';
import { useGameStore } from '../../store/useGameStore';
import { useAuthStore } from '../../store/useAuthStore';
import { PLAYER_DEFAULT_NAMES, PLAYER_COLORS, DEFAULT_MAX_TURNS } from '../../game/constants';
import { lookupUserByUsername, loadUserEquipment, loadUserMoney, loadUserEncyclopedia } from '../../lib/firestore';
import type { PlayerEquipment } from '../../game/types';
import Button from '../shared/Button';

interface LinkedUser {
  uid: string;
  displayName: string;
}

export default function SetupScreen() {
  const { setScreen, startGame } = useGameStore();
  const currentUser = useAuthStore(s => s.user);
  const [playerCount, setPlayerCount] = useState(1);
  const [names, setNames] = useState<string[]>([...PLAYER_DEFAULT_NAMES]);
  const [maxTurns, setMaxTurns] = useState(DEFAULT_MAX_TURNS);
  const [linkedUsers, setLinkedUsers] = useState<(LinkedUser | null)[]>([null, null, null, null]);
  const [searchInputs, setSearchInputs] = useState<string[]>(['', '', '', '']);
  const [searchErrors, setSearchErrors] = useState<(string | null)[]>([null, null, null, null]);
  const [searching, setSearching] = useState<boolean[]>([false, false, false, false]);

  const [starting, setStarting] = useState(false);
  const [carryOver, setCarryOver] = useState(true); // 引き継ぎモード

  // 紐付けユーザーが1人でもいるか
  const hasLinkedUser = linkedUsers.slice(0, playerCount).some(u => u !== null);

  const handleStart = async () => {
    setStarting(true);
    try {
      const uids = linkedUsers.slice(0, playerCount);

      // 全プレイヤーの図鑑をFirestoreからロード（引き継ぎモードに関係なく常にロード）
      const savedEncyclopedias: (Record<string, boolean> | null)[] = [];
      for (const u of uids) {
        if (u) {
          const enc = await loadUserEncyclopedia(u.uid).catch(() => null);
          savedEncyclopedias.push(enc);
        } else {
          savedEncyclopedias.push(null);
        }
      }

      if (carryOver && hasLinkedUser) {
        // 引き継ぎモード: Firestoreから装備とお金を読み込み
        const savedEquipments: (PlayerEquipment | null)[] = [];
        const savedMoneys: (number | null)[] = [];
        for (const u of uids) {
          if (u) {
            const [eq, money] = await Promise.all([
              loadUserEquipment(u.uid).catch(() => null),
              loadUserMoney(u.uid).catch(() => null),
            ]);
            savedEquipments.push(eq as PlayerEquipment | null);
            savedMoneys.push(money);
          } else {
            savedEquipments.push(null);
            savedMoneys.push(null);
          }
        }
        startGame(
          {
            playerCount,
            playerNames: names.slice(0, playerCount),
            playerUids: uids.map(u => u?.uid ?? null),
            maxTurns,
            carryOver: true,
          },
          savedEquipments,
          savedMoneys,
          savedEncyclopedias,
        );
      } else {
        // 引き継ぎなし: 全員初期装備・初期所持金（Firestoreのデータは保護）
        startGame(
          {
            playerCount,
            playerNames: names.slice(0, playerCount),
            playerUids: uids.map(u => u?.uid ?? null),
            maxTurns,
            carryOver: false,
          },
          undefined,
          undefined,
          savedEncyclopedias,
        );
      }
    } catch {
      // 失敗してもデフォルト値で開始
      startGame({
        playerCount,
        playerNames: names.slice(0, playerCount),
        playerUids: linkedUsers.slice(0, playerCount).map(u => u?.uid ?? null),
        maxTurns,
        carryOver: false,
      });
    } finally {
      setStarting(false);
    }
  };

  const updateName = (index: number, name: string) => {
    const newNames = [...names];
    newNames[index] = name;
    setNames(newNames);
  };

  const handleSearch = async (index: number) => {
    const username = searchInputs[index].trim();
    if (!username) return;

    const newSearching = [...searching];
    newSearching[index] = true;
    setSearching(newSearching);

    const newErrors = [...searchErrors];
    newErrors[index] = null;
    setSearchErrors(newErrors);

    try {
      const result = await lookupUserByUsername(username);
      if (!result) {
        newErrors[index] = 'ユーザーが見つかりません';
        setSearchErrors([...newErrors]);
      } else {
        // 既に他のスロットで紐付け済みか確認
        const alreadyLinked = linkedUsers.some((u, i) => i !== index && u?.uid === result.uid);
        if (alreadyLinked) {
          newErrors[index] = '既に他のプレイヤーに紐付けされています';
          setSearchErrors([...newErrors]);
        } else {
          const newLinked = [...linkedUsers];
          newLinked[index] = result;
          setLinkedUsers(newLinked);
          // 名前も自動設定
          const newNames = [...names];
          newNames[index] = result.displayName;
          setNames(newNames);
        }
      }
    } catch {
      newErrors[index] = '検索に失敗しました';
      setSearchErrors([...newErrors]);
    }

    newSearching[index] = false;
    setSearching([...newSearching]);
  };

  const unlinkUser = (index: number) => {
    const newLinked = [...linkedUsers];
    newLinked[index] = null;
    setLinkedUsers(newLinked);
    const newErrors = [...searchErrors];
    newErrors[index] = null;
    setSearchErrors(newErrors);
  };

  // ログイン中ユーザーをプレイヤー1に自動紐付け
  const linkCurrentUser = (index: number) => {
    if (!currentUser) return;
    const alreadyLinked = linkedUsers.some((u, i) => i !== index && u?.uid === currentUser.uid);
    if (alreadyLinked) return;
    const newLinked = [...linkedUsers];
    newLinked[index] = { uid: currentUser.uid, displayName: currentUser.displayName ?? 'ユーザー' };
    setLinkedUsers(newLinked);
    const newNames = [...names];
    newNames[index] = currentUser.displayName ?? 'ユーザー';
    setNames(newNames);
  };

  return (
    <div className="flex flex-col items-center justify-center h-full px-4 overflow-y-auto py-6">
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 sm:p-8 w-full max-w-md">
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

        {/* プレイヤー設定 */}
        <div className="mb-6 space-y-4">
          {Array.from({ length: playerCount }, (_, i) => (
            <div key={i} className="bg-white/5 rounded-xl p-3 border border-white/10">
              <div className="flex items-center gap-3 mb-2">
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
                  disabled={!!linkedUsers[i]}
                  className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-white/30 outline-none focus:border-blue-400 transition disabled:opacity-60"
                />
              </div>

              {/* ユーザー紐付け */}
              {linkedUsers[i] ? (
                <div className="flex items-center justify-between text-xs mt-1">
                  <span className="text-cyan-300">
                    🔗 {linkedUsers[i]!.displayName}（登録ユーザー）
                  </span>
                  <button
                    onClick={() => unlinkUser(i)}
                    className="text-white/40 hover:text-red-400 transition cursor-pointer"
                  >
                    解除
                  </button>
                </div>
              ) : (
                <div className="mt-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={searchInputs[i]}
                      onChange={(e) => {
                        const newInputs = [...searchInputs];
                        newInputs[i] = e.target.value;
                        setSearchInputs(newInputs);
                        const newErrors = [...searchErrors];
                        newErrors[i] = null;
                        setSearchErrors(newErrors);
                      }}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(i); }}
                      placeholder="登録ユーザー名で検索"
                      className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white placeholder-white/20 outline-none focus:border-cyan-400 transition"
                    />
                    <button
                      onClick={() => handleSearch(i)}
                      disabled={searching[i] || !searchInputs[i].trim()}
                      className="text-xs bg-cyan-600/50 hover:bg-cyan-600/80 disabled:opacity-30 px-3 py-1.5 rounded-lg transition cursor-pointer disabled:cursor-default"
                    >
                      {searching[i] ? '...' : '検索'}
                    </button>
                  </div>
                  {currentUser && !linkedUsers.some(u => u?.uid === currentUser.uid) && (
                    <button
                      onClick={() => linkCurrentUser(i)}
                      className="text-xs text-cyan-300/60 hover:text-cyan-300 mt-1.5 transition cursor-pointer"
                    >
                      自分のアカウントを紐付け
                    </button>
                  )}
                  {searchErrors[i] && (
                    <p className="text-xs text-red-400 mt-1">{searchErrors[i]}</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* 引き継ぎモード */}
        {hasLinkedUser && (
          <div className="mb-6">
            <label className="block text-sm text-white/60 mb-2">装備・お金の引き継ぎ</label>
            <div className="flex gap-2">
              <button
                onClick={() => setCarryOver(true)}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer
                  ${carryOver
                    ? 'bg-emerald-600 text-white shadow-lg'
                    : 'bg-white/10 text-white/60 hover:bg-white/20'
                  }`}
              >
                引き継ぐ
              </button>
              <button
                onClick={() => setCarryOver(false)}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer
                  ${!carryOver
                    ? 'bg-orange-600 text-white shadow-lg'
                    : 'bg-white/10 text-white/60 hover:bg-white/20'
                  }`}
              >
                引き継がない
              </button>
            </div>
            <p className="text-xs text-white/40 mt-1.5">
              {carryOver
                ? '前回の装備・所持金を引き継いでスタート'
                : '全員初期装備・初期所持金で公平にスタート'
              }
            </p>
          </div>
        )}

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
            disabled={starting}
          >
            {starting ? '読込中...' : 'はじめる'}
          </Button>
        </div>
      </div>
    </div>
  );
}
