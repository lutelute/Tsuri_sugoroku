import { useState, useEffect } from 'react';
import { useGameStore } from '../../store/useGameStore';
import { useAuthStore } from '../../store/useAuthStore';
import { PLAYER_DEFAULT_NAMES, PLAYER_COLORS, DEFAULT_MAX_TURNS, MODE_STORAGE_KEY } from '../../game/constants';
import { loadUserEquipment, loadUserMoney, loadUserEncyclopedia } from '../../lib/firestore';
import { verifyAccount } from '../../lib/accountLink';
import type { PlayerEquipment, GameMode } from '../../game/types';
import { CITY_DEFAULT_MONTHS, CITY_INITIAL_MONEY } from '../../game/city';
import { CPU_STYLES, CPU_STYLE_LABEL } from '../../game/cpuAI';
import { cpuPersonaFor } from '../../data/cpuPersonas';
import type { CpuPersona } from '../../data/cpuPersonas';
import Button from '../shared/Button';
import Ruby from '../shared/Ruby';
import Icon from '../shared/Icon';
import Pawn from '../shared/Pawn';
import ModeCard from '../title/ModeCard';
import { CPU_TRAIT, SETUP_TEXT } from '../title/stageText';

interface LinkedUser {
  uid: string;
  displayName: string;
}

export default function SetupScreen() {
  const { setScreen, startGame } = useGameStore();
  const currentUser = useAuthStore(s => s.user);
  const isGuest = useAuthStore(s => s.isGuest);
  const signInGuest = useAuthStore(s => s.signInGuest);
  const [playerCount, setPlayerCount] = useState(1);
  const [names, setNames] = useState<string[]>([...PLAYER_DEFAULT_NAMES]);
  const [maxTurns, setMaxTurns] = useState(() => {
    try { return localStorage.getItem(MODE_STORAGE_KEY) === 'city' ? CITY_DEFAULT_MONTHS : DEFAULT_MAX_TURNS; } catch { return DEFAULT_MAX_TURNS; }
  });
  const [linkedUsers, setLinkedUsers] = useState<(LinkedUser | null)[]>([null, null, null, null]);
  const [searchInputs, setSearchInputs] = useState<string[]>(['', '', '', '']);
  const [passwordInputs, setPasswordInputs] = useState<string[]>(['', '', '', '']);
  const [searchErrors, setSearchErrors] = useState<(string | null)[]>([null, null, null, null]);
  const [searching, setSearching] = useState<boolean[]>([false, false, false, false]);

  const [starting, setStarting] = useState(false);
  // 席ごとの「アカウントをつなぐ」の欄（押したときだけ開く）
  const [accountOpen, setAccountOpen] = useState<boolean[]>([false, false, false, false]);
  const toggleAccount = (i: number) => setAccountOpen(prev => prev.map((v, k) => (k === i ? !v : v)));
  const [carryOver, setCarryOver] = useState(true); // 引き継ぎモード
  // 各席が人か CPU か（1人目は常に人）
  const [kinds, setKinds] = useState<('human' | 'cpu')[]>(['human', 'human', 'human', 'human']);
  const toggleKind = (i: number) => {
    if (i === 0) return;
    const next = [...kinds];
    next[i] = next[i] === 'cpu' ? 'human' : 'cpu';
    setKinds(next);
    if (next[i] === 'cpu') {
      // CPU の席は紐付けを外し、名前は開始時に性格名で自動設定
      const nl = [...linkedUsers];
      nl[i] = null;
      setLinkedUsers(nl);
      const nn = [...names];
      if (nn[i] === PLAYER_DEFAULT_NAMES[i]) nn[i] = '';
      setNames(nn);
    } else {
      const nn = [...names];
      if (!nn[i]) nn[i] = PLAYER_DEFAULT_NAMES[i];
      setNames(nn);
    }
  };
  const [mode, setModeState] = useState<GameMode>(() => {
    try { return localStorage.getItem(MODE_STORAGE_KEY) === 'city' ? 'city' : 'fishing'; } catch { return 'fishing'; }
  });
  const setMode = (m: GameMode) => {
    setModeState(m);
    try { localStorage.setItem(MODE_STORAGE_KEY, m); } catch { /* noop */ }
    // モードに応じた既定の長さ
    setMaxTurns(m === 'city' ? CITY_DEFAULT_MONTHS : DEFAULT_MAX_TURNS);
  };

  // ログイン中ならプレイヤー1に自動紐付け（ゲストは共有アカウントのため紐付けしない）
  useEffect(() => {
    if (currentUser && !isGuest && !linkedUsers[0]) {
      const newLinked = [...linkedUsers];
      newLinked[0] = { uid: currentUser.uid, displayName: currentUser.displayName ?? 'ユーザー' };
      setLinkedUsers(newLinked);
      const newNames = [...names];
      newNames[0] = currentUser.displayName ?? 'ユーザー';
      setNames(newNames);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  // CPU の席の人物。性格の割り当ては対局開始時（initialState.createInitialPlayers）と同じ数え方
  const seatPersonas: (CpuPersona | null)[] = (() => {
    let cpuCount = 0;
    const nthOf: Record<string, number> = {};
    return kinds.slice(0, playerCount).map(k => {
      if (k !== 'cpu') return null;
      const style = CPU_STYLES[cpuCount++ % CPU_STYLES.length];
      const nth = nthOf[style] ?? 0;
      nthOf[style] = nth + 1;
      return cpuPersonaFor(style, nth);
    });
  })();
  // 対局に渡す名前（CPU の席は人物の名前）
  const gameNames = () => names.slice(0, playerCount).map((n, i) => seatPersonas[i]?.name ?? n);

  // 紐付けユーザーが1人でもいるか
  const hasLinkedUser = linkedUsers.slice(0, playerCount).some(u => u !== null);

  const handleStart = async () => {
    setStarting(true);
    try {
      // 紐付けユーザーのデータ(users/{uid})はFirestoreルール上「認証必須」で読み書きする。
      // 未ログインのままだと紐付け相手の図鑑/装備が読み込めず保存もできないため、
      // ここでゲスト認証セッションだけ確保する（プレイヤー枠には紐付けない＝各枠は紐付けアカウントのまま）。
      if (!currentUser) {
        await signInGuest().catch(() => {});
      }

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

      if (carryOver && hasLinkedUser && mode !== 'city') {
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
            playerNames: gameNames(),
            playerUids: uids.map(u => u?.uid ?? null),
            maxTurns,
            carryOver: true,
            mode,
            playerKinds: kinds.slice(0, playerCount),
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
            playerNames: gameNames(),
            playerUids: uids.map(u => u?.uid ?? null),
            maxTurns,
            carryOver: false,
            mode,
            playerKinds: kinds.slice(0, playerCount),
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
        playerNames: gameNames(),
        playerUids: linkedUsers.slice(0, playerCount).map(u => u?.uid ?? null),
        maxTurns,
        carryOver: false,
        mode,
        playerKinds: kinds.slice(0, playerCount),
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
    const password = passwordInputs[index];
    if (!username || !password) return;

    const newSearching = [...searching];
    newSearching[index] = true;
    setSearching(newSearching);

    const newErrors = [...searchErrors];
    newErrors[index] = null;
    setSearchErrors(newErrors);

    // パスワードを確かめてから（lib/accountLink.ts。この端末のログインは変えない）、他のスロットで紐付け済みでないか見る
    const result = await verifyAccount(username, password);
    if (!result.ok) {
      newErrors[index] = result.message;
      setSearchErrors([...newErrors]);
    } else {
      const alreadyLinkedIndex = linkedUsers.findIndex((u, i) => i !== index && u?.uid === result.account.uid);
      if (alreadyLinkedIndex !== -1) {
        newErrors[index] = `既にプレイヤー${alreadyLinkedIndex + 1}に紐付け済みです`;
        setSearchErrors([...newErrors]);
      } else {
        const newLinked = [...linkedUsers];
        newLinked[index] = result.account;
        setLinkedUsers(newLinked);
        const newNames = [...names];
        newNames[index] = result.account.displayName;
        setNames(newNames);
      }
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
    if (!currentUser || isGuest) return;
    const alreadyLinked = linkedUsers.some((u, i) => i !== index && u?.uid === currentUser.uid);
    if (alreadyLinked) return;
    const newLinked = [...linkedUsers];
    newLinked[index] = { uid: currentUser.uid, displayName: currentUser.displayName ?? 'ユーザー' };
    setLinkedUsers(newLinked);
    const newNames = [...names];
    newNames[index] = currentUser.displayName ?? 'ユーザー';
    setNames(newNames);
  };

  const cityMode = mode === 'city';
  const turnOptions = cityMode ? [12, 24, 36, 48] : [50, 80, 120, 0];

  return (
    <div className="flex flex-col items-center justify-center-safe h-full px-3 sm:px-4 overflow-y-auto py-5">
      <div className="hr-setup panel-ai rounded-2xl w-full">
        <h2 className="hr-setup-title font-mincho"><span className="ink-underline"><Ruby>ゲーム設定</Ruby></span></h2>

        <div className="hr-setup-grid">
          {/* あそびかた（タイトルと同じ絵の札） */}
          <section className="hr-setup-mode">
            <h3 className="hr-label"><Ruby>あそびかた</Ruby></h3>
            <div className="grid grid-cols-2 gap-2.5">
              <ModeCard
                mode="fishing"
                title="釣り旅"
                desc={SETUP_TEXT.fishingDesc}
                ariaLabel="釣り旅をえらぶ"
                onClick={() => setMode('fishing')}
                selected={mode === 'fishing'}
                compact
              />
              <ModeCard
                mode="city"
                title="まちづくり"
                desc={SETUP_TEXT.cityDesc(CITY_INITIAL_MONEY.toLocaleString())}
                ariaLabel="まちづくりをえらぶ"
                onClick={() => setMode('city')}
                selected={mode === 'city'}
                compact
              />
            </div>
            {cityMode && (
              <p className="text-[11px] text-kin-300/85 mt-2.5 leading-relaxed">
                <Ruby>止まった町に住宅・商業・工業・発電所などを建てよう。電力・公害・幸福度のバランスで町は毎月ひとりでに発展する。目的地に一番乗りで賞金、地震や台風にも注意！</Ruby>
              </p>
            )}
          </section>

          {/* 人数と席 */}
          <section className="hr-setup-seats">
            <h3 className="hr-label"><Ruby>プレイヤー人数</Ruby></h3>
            <div className="flex gap-2 mb-3">
              {[1, 2, 3, 4].map(n => (
                <button
                  key={n}
                  onClick={() => setPlayerCount(n)}
                  aria-pressed={playerCount === n}
                  className={`hr-seg flex-1 text-lg font-bold ${playerCount === n ? 'is-on' : ''}`}
                >
                  <span className="flex justify-center gap-[3px] mb-0.5" aria-hidden="true">
                    {Array.from({ length: n }, (_, k) => (
                      <span key={k} className="w-2 h-2 rounded-full" style={{ backgroundColor: PLAYER_COLORS[k], boxShadow: '0 0 0 1px rgba(244,236,216,0.55)' }} />
                    ))}
                  </span>
                  <span>{n}<Ruby>人</Ruby></span>
                </button>
              ))}
            </div>

            <div className="space-y-2.5">
              {Array.from({ length: playerCount }, (_, i) => {
                const persona = seatPersonas[i];
                const isCpu = kinds[i] === 'cpu';
                const linked = linkedUsers[i];
                const open = !isCpu && !linked && (accountOpen[i] || !!searchErrors[i]);
                return (
                  <div key={i} className="hr-seat" style={{ '--pc': PLAYER_COLORS[i] } as React.CSSProperties}>
                    <div className="flex items-center gap-2">
                      {/* 駒（地図で動く駒と同じ色と形） */}
                      <Pawn color={PLAYER_COLORS[i]} label={persona ? persona.mark : i + 1} size={44} />

                      {isCpu && persona ? (
                        /* CPU の人物の札 */
                        <div className="flex-1 min-w-0 leading-tight">
                          <div className="flex items-baseline gap-2 min-w-0">
                            <span className="font-brush text-xl text-washi shrink-0"><Ruby>{persona.name}</Ruby></span>
                            <span className="text-[11px] text-kin-300/90 truncate"><Ruby>{persona.role}</Ruby></span>
                          </div>
                          <div className="text-[11px] text-washi/65 mt-0.5">
                            <span className="inline-block rounded-sm border border-kin-500/45 bg-kin-500/15 text-kin-300 px-1 mr-1 font-mincho"><Ruby>{CPU_STYLE_LABEL[persona.style]}</Ruby></span>
                            <Ruby>{CPU_TRAIT[persona.style]}</Ruby>
                          </div>
                        </div>
                      ) : (
                        <input
                          type="text"
                          value={names[i]}
                          onChange={(e) => updateName(i, e.target.value)}
                          placeholder={PLAYER_DEFAULT_NAMES[i]}
                          maxLength={10}
                          disabled={!!linked}
                          aria-label={`プレイヤー${i + 1}の名前`}
                          className="hr-input flex-1 min-w-0"
                        />
                      )}

                      {/* アカウントをつなぐ（人の席だけ。押したときだけ欄が開く） */}
                      {!isCpu && (
                        <button
                          onClick={() => (linked ? unlinkUser(i) : toggleAccount(i))}
                          aria-label={linked ? 'アカウントの紐付けを解除' : 'アカウントをつなぐ'}
                          aria-expanded={linked ? undefined : open}
                          title={linked ? '紐付けを解除' : 'アカウントをつなぐ（登録ユーザーの図鑑・装備を使う）'}
                          className={`hr-seat-btn ${linked ? 'is-linked' : open ? 'is-open' : ''}`}
                        >
                          <Icon name={linked ? 'check' : 'link'} size={18} />
                          <span className="text-[9px] leading-none mt-0.5">{linked ? <Ruby>解除</Ruby> : 'つなぐ'}</span>
                        </button>
                      )}

                      {i > 0 && (
                        <button
                          onClick={() => toggleKind(i)}
                          className={`hr-seat-btn is-kind ${isCpu ? 'is-cpu' : ''}`}
                          title="人とCPUを切り替え"
                        >
                          <span className="text-sm font-bold">{isCpu ? 'CPU' : <Ruby>人</Ruby>}</span>
                        </button>
                      )}
                    </div>

                    {/* 紐付け済み */}
                    {!isCpu && linked && (
                      <p className="flex items-center gap-1.5 text-xs text-kin-300 mt-1.5 pl-1">
                        <Icon name="link" size={14} className="shrink-0" />
                        <span className="truncate">{linked.displayName}（<Ruby>登録ユーザー</Ruby>）</span>
                      </p>
                    )}

                    {/* アカウントをつなぐ欄 */}
                    {open && (
                      <div className="hr-account fx-rise">
                        <p className="text-[11px] text-washi/65 mb-1.5"><Ruby>{SETUP_TEXT.accountHelp}</Ruby></p>
                        <div className="flex gap-1.5">
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
                            placeholder="ユーザー名"
                            autoComplete="off"
                            className="hr-input is-small flex-1 min-w-0"
                          />
                          <input
                            type="password"
                            value={passwordInputs[i]}
                            onChange={(e) => {
                              const newPw = [...passwordInputs];
                              newPw[i] = e.target.value;
                              setPasswordInputs(newPw);
                              const newErrors = [...searchErrors];
                              newErrors[i] = null;
                              setSearchErrors(newErrors);
                            }}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(i); }}
                            placeholder="パスワード"
                            autoComplete="off"
                            className="hr-input is-small flex-1 min-w-0"
                          />
                          <button
                            onClick={() => handleSearch(i)}
                            disabled={searching[i] || !searchInputs[i].trim() || !passwordInputs[i]}
                            className="shrink-0 min-h-11 px-3 rounded-lg text-sm font-bold text-[#3a2a0e] bg-gradient-to-b from-kin-300 to-kin-600 disabled:opacity-35 transition cursor-pointer disabled:cursor-default"
                          >
                            {searching[i] ? '...' : 'つなぐ'}
                          </button>
                        </div>
                        {currentUser && !isGuest && !linkedUsers.some(u => u?.uid === currentUser.uid) && (
                          <button
                            onClick={() => linkCurrentUser(i)}
                            className="hr-pill text-xs text-kin-300/80 hover:text-kin-300 mt-2 transition cursor-pointer"
                          >
                            <Ruby>自分のアカウントを紐付け</Ruby>
                          </button>
                        )}
                        {searchErrors[i] && (
                          <p className="text-xs text-shu-400 mt-1.5"><Ruby>{searchErrors[i]}</Ruby></p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* 引き継ぎモード */}
          {hasLinkedUser && !cityMode && (
            <section className="hr-setup-carry">
              <h3 className="hr-label"><Ruby>装備・お金の引き継ぎ</Ruby></h3>
              <div className="flex gap-2">
                <button onClick={() => setCarryOver(true)} aria-pressed={carryOver} className={`hr-seg flex-1 text-sm font-medium ${carryOver ? 'is-on' : ''}`}>
                  <Ruby>引き継ぐ</Ruby>
                </button>
                <button onClick={() => setCarryOver(false)} aria-pressed={!carryOver} className={`hr-seg flex-1 text-sm font-medium ${!carryOver ? 'is-on' : ''}`}>
                  <Ruby>引き継がない</Ruby>
                </button>
              </div>
              <p className="text-xs text-washi/50 mt-1.5">
                <Ruby>{carryOver
                  ? '前回の装備・所持金を引き継いでスタート'
                  : '全員初期装備・初期所持金で公平にスタート'
                }</Ruby>
              </p>
            </section>
          )}

          {/* ターン数設定 */}
          <section className="hr-setup-turns">
            <h3 className="hr-label"><Ruby>{cityMode ? 'あそぶ期間' : '最大ターン数'}</Ruby></h3>
            <div className="flex gap-2">
              {turnOptions.map(n => (
                <button
                  key={n}
                  onClick={() => setMaxTurns(n)}
                  aria-pressed={maxTurns === n}
                  className={`hr-seg flex-1 text-sm font-medium ${maxTurns === n ? 'is-on' : ''}`}
                >
                  {n === 0 ? <Ruby>無制限</Ruby> : cityMode ? <span>{n / 12}<Ruby>年</Ruby></span> : `${n}T`}
                </button>
              ))}
            </div>
          </section>
        </div>

        {/* ボタン */}
        <div className="flex gap-3 mt-5">
          <Button
            onClick={() => setScreen('title')}
            variant="secondary"
            className="flex-1 min-h-12"
          >
            <Ruby>戻る</Ruby>
          </Button>
          <Button
            onClick={handleStart}
            variant="gold"
            className="flex-[2] min-h-12 font-mincho tracking-widest text-lg"
            disabled={starting}
          >
            <Ruby>{starting ? '読込中...' : 'はじめる'}</Ruby>
          </Button>
        </div>
      </div>
    </div>
  );
}
