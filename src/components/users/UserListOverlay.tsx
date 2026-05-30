import { useState, useEffect } from 'react';
import { loadAllUsers } from '../../lib/firestore';
import type { UserInfo } from '../../game/types';
import Icon from '../shared/Icon';

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
    <div className="fixed inset-0 z-50 bg-gradient-to-b from-ai-900 to-ai-950 overflow-y-auto">
      {/* ヘッダー */}
      <div className="sticky top-0 panel-ai backdrop-blur-sm px-4 py-3 z-10 rounded-none border-x-0 border-t-0">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-mincho text-kin-300 ink-underline flex items-center gap-2">
            <Icon name="users" size={22} className="text-kin-300" />
            釣り人一覧
          </h2>
          <div className="flex items-center gap-3">
            <span className="text-sm text-ai-200 tabular-nums">{users.length}人</span>
            <button
              onClick={onClose}
              aria-label="閉じる"
              className="w-9 h-9 flex items-center justify-center rounded-full bg-ai-800/60 border border-kin-500/30 text-washi hover:bg-ai-700/60 transition-colors"
            >
              <Icon name="close" size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* ユーザー一覧 */}
      <div className="p-4">
        {loading ? (
          <p className="text-center text-washi/40 py-8 font-mincho">読み込み中...</p>
        ) : users.length === 0 ? (
          <p className="text-center text-washi/40 py-8 font-mincho">登録ユーザーがいません</p>
        ) : (
          <div className="space-y-2">
            {users.map((user) => (
              <div
                key={user.uid}
                className="panel-ai p-3 flex items-center gap-3"
              >
                <div className="w-9 h-9 rounded-full bg-kin-500/20 border border-kin-500/30 text-kin-300 flex items-center justify-center text-sm font-mincho">
                  {user.displayName.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-mincho text-washi truncate block">{user.displayName}</span>
                  {user.lastLoginAt && (
                    <span className="text-xs text-ai-300 tabular-nums">
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
