import { useState, useEffect } from 'react';
import { loadAllUsers } from '../../lib/firestore';
import type { UserInfo } from '../../game/types';
import Button from '../shared/Button';

interface UserListOverlayProps {
  onClose: () => void;
}

export default function UserListOverlay({ onClose }: UserListOverlayProps) {
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAllUsers()
      .then(list => {
        // 最終ログイン日時で降順ソート
        list.sort((a, b) => {
          if (!a.lastLoginAt) return 1;
          if (!b.lastLoginAt) return -1;
          return b.lastLoginAt.localeCompare(a.lastLoginAt);
        });
        setUsers(list);
      })
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-b from-slate-900 to-slate-950 overflow-y-auto">
      {/* ヘッダー */}
      <div className="sticky top-0 bg-black/50 backdrop-blur-sm px-4 py-3 z-10">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">👥 登録ユーザー</h2>
          <div className="flex items-center gap-3">
            <span className="text-sm text-white/60">{users.length}人</span>
            <Button onClick={onClose} variant="secondary" size="sm">閉じる</Button>
          </div>
        </div>
      </div>

      {/* ユーザー一覧 */}
      <div className="p-4">
        {loading ? (
          <p className="text-center text-white/40 py-8">読み込み中...</p>
        ) : users.length === 0 ? (
          <p className="text-center text-white/40 py-8">登録ユーザーがいません</p>
        ) : (
          <div className="space-y-2">
            {users.map((user) => (
              <div
                key={user.uid}
                className="rounded-xl p-3 bg-white/5 border border-white/10 flex items-center gap-3"
              >
                <div className="w-8 h-8 rounded-full bg-cyan-600/30 flex items-center justify-center text-sm">
                  {user.displayName.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-bold truncate block">{user.displayName}</span>
                  {user.lastLoginAt && (
                    <span className="text-xs text-white/40">
                      最終ログイン: {new Date(user.lastLoginAt).toLocaleDateString('ja-JP')}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
