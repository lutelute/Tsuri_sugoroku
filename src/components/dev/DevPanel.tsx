// 開発用チートパネル。import.meta.env.DEV のときだけ表示される。
// 図鑑コンプリート / 装備MAX / お金カンスト / セーブデータ削除を一発で行う。

import { useState } from 'react';
import { FISH_DATABASE } from '../../data/fishDatabase';
import { BOARD_NODES } from '../../data/boardNodes';
import { useAuthStore } from '../../store/useAuthStore';
import { useGameStore } from '../../store/useGameStore';
import { saveEncyclopedia, clearGameState } from '../../utils/storage';
import { saveUserEncyclopedia, saveUserEquipment, saveUserMoney, resetUserEncyclopedia } from '../../lib/firestore';
import { createEquipmentItem } from '../../game/equipment';
import type { PlayerEquipment } from '../../game/types';

const CHEAT_MONEY = 999_999;

function buildMaxEquipment(): PlayerEquipment {
  const rod = createEquipmentItem('rod', 5);
  const reel = createEquipmentItem('reel', 5);
  const lure = createEquipmentItem('lure', 5);
  return {
    equipped: { rod: rod.id, reel: reel.id, lure: lure.id },
    inventory: [rod, reel, lure],
  };
}

export default function DevPanel() {
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [showWarp, setShowWarp] = useState(false);
  const user = useAuthStore(s => s.user);
  const screen = useGameStore(s => s.screen);
  const warpCurrentPlayerTo = useGameStore(s => s.warpCurrentPlayerTo);
  const capitalNodes = BOARD_NODES.filter(n => n.type === 'capital');

  const flash = (m: string) => {
    setMsg(m);
    setTimeout(() => setMsg(null), 1800);
  };

  const completeEncyclopedia = async () => {
    const all = Object.fromEntries(FISH_DATABASE.map(f => [f.id, true]));
    if (user) {
      await saveUserEncyclopedia(user.uid, all).catch(() => {});
      flash(`図鑑コンプリート（クラウド）: ${FISH_DATABASE.length}種`);
    } else {
      saveEncyclopedia(all);
      flash(`図鑑コンプリート（ローカル）: ${FISH_DATABASE.length}種`);
    }
  };

  const resetEncyclopedia = async () => {
    if (user) {
      await resetUserEncyclopedia(user.uid).catch(() => {});
      flash('図鑑をリセット（クラウド）');
    } else {
      saveEncyclopedia({});
      flash('図鑑をリセット（ローカル）');
    }
  };

  const giveMoney = async () => {
    if (!user) { flash('お金カンストはログイン時のみ'); return; }
    await saveUserMoney(user.uid, CHEAT_MONEY).catch(() => {});
    flash(`お金を ¥${CHEAT_MONEY.toLocaleString()} に設定`);
  };

  const maxEquipment = async () => {
    if (!user) { flash('装備MAXはログイン時のみ'); return; }
    await saveUserEquipment(user.uid, buildMaxEquipment()).catch(() => {});
    flash('装備を全てLv5に設定');
  };

  const clearSave = () => {
    clearGameState();
    flash('中断中のセーブデータを削除');
  };

  const warpTo = (nodeId: string, nodeName: string) => {
    warpCurrentPlayerTo(nodeId);
    setShowWarp(false);
    flash(`${nodeName} へワープしました`);
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed left-3 bottom-3 z-50 text-[10px] px-2 py-1 rounded-full bg-shu-700/70 hover:bg-shu-600/80 border border-shu-400/40 text-washi/95 font-mincho tracking-wider cursor-pointer shadow-lg"
        title="開発用チートパネル（DEVビルドのみ）"
      >
        DEV
      </button>
    );
  }

  return (
    <div className="fixed left-3 bottom-3 z-50 w-72 panel-ai rounded-xl border border-shu-500/40 shadow-2xl p-3 text-xs">
      <div className="flex items-center justify-between mb-2">
        <span className="font-mincho text-shu-300 font-bold">DEV チート</span>
        <button
          onClick={() => setOpen(false)}
          className="text-washi/55 hover:text-washi cursor-pointer w-6 h-6 leading-none"
          aria-label="閉じる"
        >
          ×
        </button>
      </div>
      <div className="text-[10px] text-washi/45 mb-2">
        {user ? `ログイン中: ${user.displayName ?? user.uid.slice(0, 6)}` : '未ログイン（ローカル保存のみ）'}
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        <button onClick={completeEncyclopedia} className="px-2 py-1.5 rounded-md bg-ai-700/60 hover:bg-ai-600/70 border border-kin-500/25 text-washi cursor-pointer">図鑑コンプ</button>
        <button onClick={resetEncyclopedia} className="px-2 py-1.5 rounded-md bg-ai-800/60 hover:bg-ai-700/70 border border-washi/15 text-washi/80 cursor-pointer">図鑑リセット</button>
        <button onClick={giveMoney} disabled={!user} className="px-2 py-1.5 rounded-md bg-ai-700/60 hover:bg-ai-600/70 border border-kin-500/25 text-washi cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">¥999,999</button>
        <button onClick={maxEquipment} disabled={!user} className="px-2 py-1.5 rounded-md bg-ai-700/60 hover:bg-ai-600/70 border border-kin-500/25 text-washi cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">装備Lv5</button>
        <button
          onClick={() => setShowWarp(v => !v)}
          disabled={screen !== 'game'}
          className="col-span-2 px-2 py-1.5 rounded-md bg-purple-800/60 hover:bg-purple-700/70 border border-purple-500/30 text-purple-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {showWarp ? '▲ 県ワープを閉じる' : '▼ 県メインイベントへワープ'}
        </button>
        {showWarp && (
          <div className="col-span-2 max-h-48 overflow-y-auto rounded-md bg-ai-900/50 border border-purple-500/20 p-1.5 space-y-1">
            {capitalNodes.map(n => (
              <button
                key={n.id}
                onClick={() => warpTo(n.id, n.name)}
                className="w-full text-left px-2 py-1 rounded bg-ai-800/40 hover:bg-purple-700/40 border border-transparent hover:border-purple-400/40 text-washi/85 text-[11px] cursor-pointer transition"
              >
                {n.name} <span className="text-washi/40 text-[9px]">({n.region})</span>
              </button>
            ))}
          </div>
        )}
        <button onClick={clearSave} className="col-span-2 px-2 py-1.5 rounded-md bg-shu-800/50 hover:bg-shu-700/60 border border-shu-500/30 text-shu-200 cursor-pointer">中断セーブ削除</button>
      </div>
      {msg && (
        <div className="mt-2 text-[10px] text-kin-300 bg-ai-900/60 border border-kin-500/20 rounded px-2 py-1">
          {msg}
        </div>
      )}
    </div>
  );
}
