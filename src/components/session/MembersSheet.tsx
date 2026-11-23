// 「なかま」の画面: 対局の途中から仲間を増やす・まだ登録していない人をアカウントにつなぐ（つないだら外せない＝入れ替えなし）。
// 中身の決まりは game/midGame.ts、アカウントの確かめと作成は lib/accountLink.ts。
import { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useGameStore } from '../../store/useGameStore';
import { useAuthStore } from '../../store/useAuthStore';
import { canAddPlayer, linkRefusal } from '../../game/midGame';
import { PLAYER_DEFAULT_NAMES } from '../../game/constants';
import { createAccount, verifyAccount } from '../../lib/accountLink';
import { loadUserEncyclopedia } from '../../lib/firestore';
import { personaOf } from '../../data/cpuPersonas';
import type { Player } from '../../game/types';
import BottomSheet from '../fx/BottomSheet';
import Pawn from '../shared/Pawn';
import Icon from '../shared/Icon';
import Ruby from '../shared/Ruby';
import { SheetButton } from './QuitSheet';
import { ACCOUNT_TEXT, MEMBERS_TEXT } from './sessionText';

export default function MembersSheet({ onClose }: { onClose: () => void }) {
  const { players, gameOver, isCity, currentPlayerIndex } = useGameStore(useShallow(s => ({
    players: s.players, gameOver: s.gameOver, isCity: s.settings.mode === 'city', currentPlayerIndex: s.currentPlayerIndex,
  })));
  const addLatePlayer = useGameStore(s => s.addLatePlayer);
  const [linking, setLinking] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const canAdd = canAddPlayer({ players, gameOver });

  const startAdd = () => {
    setLinking(null);
    setMessage(null);
    setAdding(true);
  };
  const onAdded = (name: string) => {
    setAdding(false);
    setMessage(MEMBERS_TEXT.added(name));
  };

  return (
    <BottomSheet label={MEMBERS_TEXT.title} onClose={onClose}>
      <h3 className="font-brush text-3xl leading-tight text-[#2a2118] text-center mt-1"><Ruby>{MEMBERS_TEXT.title}</Ruby></h3>
      <p className="text-xs text-[#4a3a28] text-center mt-1 mb-3 leading-relaxed"><Ruby>{MEMBERS_TEXT.lead}</Ruby></p>

      {message && (
        <p role="status" className="mb-2 rounded-xl bg-[#2f9e6e]/15 border border-[#2f9e6e]/40 px-3 py-2 text-sm font-mincho font-bold text-[#1d5e42] text-center">
          <Ruby>{message}</Ruby>
        </p>
      )}

      <ul className="flex flex-col gap-2">
        {players.map((p, i) => (
          <li key={p.id} className="rounded-2xl border-2 bg-[#fffaf0] px-3 py-2" style={{ borderColor: `${p.color}aa` }}>
            <div className="flex items-center gap-2.5 min-h-11">
              <Pawn color={p.color} label={personaOf(p)?.mark ?? i + 1} size={34} />
              <div className="min-w-0 flex-1">
                <p className="font-mincho font-bold text-[#2a2118] truncate">
                  <Ruby>{p.name}</Ruby>
                  {i === currentPlayerIndex && <span className="ml-1.5 text-[10px] text-[#9a6f24] font-normal"><Ruby>いまの番</Ruby></span>}
                </p>
                <MemberBadges player={p} />
              </div>
              {!p.isCpu && !p.uid && linking !== i && (
                <button
                  type="button"
                  onClick={() => { setAdding(false); setMessage(null); setLinking(i); }}
                  className="shrink-0 min-h-11 rounded-xl border-2 border-[#9a6f24] bg-[#f3e4bd] px-3 font-mincho font-bold text-sm text-[#2a2118] cursor-pointer hover:bg-[#f7ecd0] active:scale-95 transition flex items-center gap-1"
                >
                  <Icon name="login" size={16} /><Ruby>{MEMBERS_TEXT.register}</Ruby>
                </button>
              )}
            </div>
            {linking === i && (
              <AccountForm
                index={i}
                isCity={isCity}
                onCancel={() => setLinking(null)}
                onDone={name => { setLinking(null); setMessage(ACCOUNT_TEXT.done(name)); }}
              />
            )}
          </li>
        ))}
      </ul>

      {adding ? (
        <AddForm players={players} isCity={isCity} onCancel={() => setAdding(false)} onAdd={name => { if (addLatePlayer(name)) onAdded(useGameStore.getState().players.at(-1)?.name ?? name); }} />
      ) : canAdd ? (
        <button
          type="button"
          onClick={startAdd}
          className="mt-2.5 w-full min-h-12 rounded-2xl border-2 border-dashed border-[#9a6f24]/70 bg-[#fffaf0]/70 font-mincho font-bold text-[#2a2118] cursor-pointer hover:bg-white active:scale-[0.98] transition flex items-center justify-center gap-1.5"
        >
          <span className="text-xl leading-none text-[#9a6f24]" aria-hidden="true">＋</span><Ruby>{MEMBERS_TEXT.add}</Ruby>
        </button>
      ) : (
        !gameOver && <p className="mt-2.5 text-xs text-[#4a3a28] text-center"><Ruby>{MEMBERS_TEXT.full}</Ruby></p>
      )}

      <p className="mt-2 text-[11px] text-[#4a3a28]/80 text-center"><Ruby>{MEMBERS_TEXT.noSwap}</Ruby></p>
      <SheetButton onClick={onClose}>{MEMBERS_TEXT.close}</SheetButton>
    </BottomSheet>
  );
}

function MemberBadges({ player }: { player: Player }) {
  const chip = 'inline-flex items-center gap-0.5 rounded-full px-1.5 py-px text-[10px] leading-4 border';
  return (
    <p className="flex flex-wrap gap-1 mt-0.5">
      {player.isCpu ? (
        <span className={`${chip} border-[#4a3a28]/40 text-[#4a3a28]`}>{MEMBERS_TEXT.cpu}</span>
      ) : player.uid ? (
        <span className={`${chip} border-[#2e5e8c]/50 bg-[#2e5e8c]/10 text-[#24496e]`}><Icon name="check" size={11} /><Ruby>{MEMBERS_TEXT.linked}</Ruby></span>
      ) : (
        <span className={`${chip} border-[#4a3a28]/30 text-[#4a3a28]/80`}><Ruby>{MEMBERS_TEXT.notLinked}</Ruby></span>
      )}
      {player.joinedTurn != null && (
        <span className={`${chip} border-[#9a6f24]/50 bg-[#f3e4bd] text-[#6b4c14]`}><Ruby>{MEMBERS_TEXT.lateTag}</Ruby></span>
      )}
    </p>
  );
}

const inputCls = 'w-full min-h-11 rounded-xl border-2 border-[#9a6f24]/50 bg-white px-3 text-base text-[#2a2118] font-mincho focus:outline-none focus:border-[#9a6f24]';

function AddForm({ players, isCity, onCancel, onAdd }: { players: Player[]; isCity: boolean; onCancel: () => void; onAdd: (name: string) => void }) {
  const [name, setName] = useState(PLAYER_DEFAULT_NAMES[players.length] ?? '');
  const last = players[players.length - 1]?.name ?? '';
  return (
    <form
      className="mt-2.5 rounded-2xl border-2 border-[#9a6f24]/70 bg-[#fffaf0] p-3"
      onSubmit={e => { e.preventDefault(); onAdd(name); }}
    >
      <label className="block text-xs font-bold text-[#4a3a28] mb-1" htmlFor="late-player-name"><Ruby>{MEMBERS_TEXT.addName}</Ruby></label>
      <input id="late-player-name" className={inputCls} value={name} maxLength={12} onChange={e => setName(e.target.value)} autoComplete="off" />
      <p className="text-[11px] text-[#4a3a28] mt-1.5 leading-relaxed">
        <Ruby>{isCity ? MEMBERS_TEXT.addNoteCity(last) : MEMBERS_TEXT.addNoteFishing(last)}</Ruby>
      </p>
      <div className="grid grid-cols-2 gap-2 mt-2.5">
        <button type="button" onClick={onCancel} className="min-h-11 rounded-xl border border-[#9a6f24]/40 bg-[#2a2118]/5 text-sm text-[#2a2118] font-mincho cursor-pointer hover:bg-[#2a2118]/10">
          <Ruby>{ACCOUNT_TEXT.cancel}</Ruby>
        </button>
        <button type="submit" className="min-h-11 rounded-xl border-2 border-[#9a6f24] bg-[#d9a93a] font-mincho font-bold text-[#2a2118] cursor-pointer hover:bg-[#e3b84d] active:scale-95 transition">
          <Ruby>{MEMBERS_TEXT.addSubmit}</Ruby>
        </button>
      </div>
    </form>
  );
}

function AccountForm({ index, isCity, onCancel, onDone }: { index: number; isCity: boolean; onCancel: () => void; onDone: (name: string) => void }) {
  const linkPlayerAccount = useGameStore(s => s.linkPlayerAccount);
  const [mode, setMode] = useState<'have' | 'new'>('have');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      // アカウントの図鑑の読み書きはログインが要る（Firestore のルール）。未ログインならゲストで入っておく
      const auth = useAuthStore.getState();
      if (!auth.user) await auth.signInGuest().catch(() => false);
      const result = mode === 'have' ? await verifyAccount(username, password) : await createAccount(username, password);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      const players = useGameStore.getState().players;
      const refusal = linkRefusal(players, index, result.account.uid);
      if (refusal === 'duplicate') {
        const other = players.find(p => p.uid === result.account.uid);
        setError(ACCOUNT_TEXT.duplicate(other?.name ?? ''));
        return;
      }
      const enc = mode === 'have' ? await loadUserEncyclopedia(result.account.uid).catch(() => ({})) : {};
      if (!linkPlayerAccount(index, result.account, enc)) {
        setError(ACCOUNT_TEXT.failed);
        return;
      }
      onDone(result.account.displayName);
    } finally {
      setBusy(false);
    }
  };

  const tab = (m: 'have' | 'new', label: string) => (
    <button
      type="button"
      role="tab"
      aria-selected={mode === m}
      onClick={() => { setMode(m); setError(null); }}
      className={`flex-1 min-h-10 rounded-lg text-sm font-mincho font-bold cursor-pointer transition ${mode === m ? 'bg-[#2e5e8c] text-[#fffaf0] shadow' : 'text-[#2a2118] hover:bg-[#2a2118]/5'}`}
    >
      <Ruby>{label}</Ruby>
    </button>
  );

  return (
    <form className="mt-2 border-t border-[#9a6f24]/30 pt-2.5" onSubmit={e => { e.preventDefault(); void submit(); }}>
      <div role="tablist" className="flex gap-1 rounded-xl bg-[#2a2118]/5 p-1 mb-2.5">
        {tab('have', ACCOUNT_TEXT.haveAccount)}
        {tab('new', ACCOUNT_TEXT.newAccount)}
      </div>
      <label className="block text-xs font-bold text-[#4a3a28] mb-1" htmlFor={`acct-name-${index}`}><Ruby>{ACCOUNT_TEXT.username}</Ruby></label>
      <input
        id={`acct-name-${index}`}
        className={inputCls}
        value={username}
        onChange={e => setUsername(e.target.value)}
        autoComplete="username"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
      />
      <label className="block text-xs font-bold text-[#4a3a28] mt-2 mb-1" htmlFor={`acct-pass-${index}`}>
        <Ruby>{mode === 'new' ? ACCOUNT_TEXT.passwordNew : ACCOUNT_TEXT.password}</Ruby>
      </label>
      <input
        id={`acct-pass-${index}`}
        type="password"
        className={inputCls}
        value={password}
        onChange={e => setPassword(e.target.value)}
        autoComplete={mode === 'new' ? 'new-password' : 'current-password'}
      />
      <p className="text-[11px] text-[#4a3a28] mt-2 leading-relaxed"><Ruby>{isCity ? ACCOUNT_TEXT.noteCity : ACCOUNT_TEXT.noteFishing}</Ruby></p>
      {error && <p role="alert" className="mt-2 text-sm font-bold text-[#b8321e]"><Ruby>{error}</Ruby></p>}
      <div className="grid grid-cols-2 gap-2 mt-2.5">
        <button type="button" onClick={onCancel} className="min-h-11 rounded-xl border border-[#9a6f24]/40 bg-[#2a2118]/5 text-sm text-[#2a2118] font-mincho cursor-pointer hover:bg-[#2a2118]/10">
          <Ruby>{ACCOUNT_TEXT.cancel}</Ruby>
        </button>
        <button
          type="submit"
          disabled={busy || !username.trim() || !password}
          className="min-h-11 rounded-xl border-2 border-[#24496e] bg-[#2e5e8c] font-mincho font-bold text-[#fffaf0] cursor-pointer hover:bg-[#24496e] active:scale-95 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Ruby>{busy ? ACCOUNT_TEXT.busy : mode === 'new' ? ACCOUNT_TEXT.submitCreate : ACCOUNT_TEXT.submitLink}</Ruby>
        </button>
      </div>
    </form>
  );
}
