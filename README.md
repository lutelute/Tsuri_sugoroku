# 釣りすごろく - 日本列島 釣り旅

日本列島を舞台にしたすごろく型釣りボードゲーム。北海道から九州まで各地を巡り、魚を釣って高スコアを目指そう。

**[>>> プレイする (GitHub Pages) <<<](https://lutelute.github.io/Tsuri_sugoroku/)**

![demo](docs/demo.gif)

## 特徴

- 日本全国8地方を巡るマップ (北海道・東北・関東・中部・近畿・中国・四国・九州)
- 多彩な魚種 (common〜mythical の5段階レアリティ)
- タイミングベースの釣りミニゲーム (アタリ合わせ → リーリング)
- 装備のアップグレード (竿・リール・ルアー各Lv1〜5)
- イベントマス・ショップ・休憩所など多様なノード
- 1〜4人対戦
- 図鑑コンプリート要素
- **ユーザー登録 & クラウド保存** — 別端末からログインしても続きが遊べる

## スクリーンショット

| タイトル | セットアップ | ゲーム画面 |
|:---:|:---:|:---:|
| ![title](docs/demo-title.png) | ![setup](docs/demo-setup.png) | ![game](docs/demo-game.png) |

## 技術スタック

- React 19 + TypeScript 5.9 + Vite 7
- Tailwind CSS v4
- Zustand 5 (状態管理)
- Firebase Authentication + Firestore (ユーザー認証・データ同期)
- Playwright (E2Eテスト)
- GitHub Actions → GitHub Pages 自動デプロイ

## Firebase 設定

### プロジェクト情報

| 項目 | 値 |
|------|-----|
| プロジェクトID | `tsuri-sugoroku` |
| Auth ドメイン | `tsuri-sugoroku.firebaseapp.com` |
| Firestore | 有効 |
| 認証方式 | メール/パスワード |

### 認証の仕組み

ユーザーは **ユーザー名 + パスワード** で登録・ログインします。内部的にはFirebase Authのメール/パスワード認証を使用し、ユーザー名を `{username}@tsuri.local` の形式で擬似メールアドレスとして登録しています。ユーザーにメールアドレスの入力は不要です。

### Firestore データ構造

```
users/{uid}/data/
  ├── profile        # { displayName, lastLoginAt }
  ├── encyclopedia   # { [fishId]: true }  — 魚図鑑
  └── saveData       # { state: GameState }  — ゲームセーブ
```

### データ同期の挙動

- **ログイン中**: localStorage と Firestore の両方に保存 (Firestoreは非同期 fire-and-forget)
- **未ログイン (ゲスト)**: localStorage のみに保存
- **ログイン時**: クラウドとローカルの図鑑データをマージ (両方のtrue値を保持)
- **セーブデータ読込**: Firestore → localStorage の順でフォールバック

### Firebase Console での設定手順

1. [Firebase Console](https://console.firebase.google.com/) でプロジェクトを開く
2. **Authentication** → Sign-in method → **メール/パスワード** を有効化
3. **Firestore Database** → データベース作成 (テストモード)
4. `src/lib/firebase.ts` の `firebaseConfig` にプロジェクトの設定値を記入

### Firestore セキュリティルール (本番用)

テストモード (30日有効) から本番へ移行する際は、以下のルールを設定:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid}/data/{doc} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
  }
}
```

## ファイル構成

```
src/
├── App.tsx                          # ルーティング + Firebase Auth 初期化
├── main.tsx                         # エントリーポイント
├── lib/
│   ├── firebase.ts                  # Firebase App / Auth / Firestore 初期化
│   └── firestore.ts                 # Firestore CRUD 関数
├── store/
│   ├── useGameStore.ts              # ゲーム状態管理 (Zustand)
│   └── useAuthStore.ts              # 認証状態管理 (Zustand)
├── game/                            # 純粋なゲームロジック (React非依存)
│   ├── types.ts                     # 型定義
│   ├── constants.ts                 # ゲーム定数
│   ├── equipment.ts                 # 装備ロジック (耐久度・修理)
│   ├── fishing.ts                   # 魚選択ロジック
│   ├── events.ts                    # イベント適用
│   ├── movement.ts                  # 経路探索
│   └── scoring.ts                   # スコア計算
├── components/
│   ├── screens/
│   │   ├── TitleScreen.tsx          # タイトル画面 (ログイン状態表示)
│   │   ├── LoginScreen.tsx          # ログイン / 新規登録画面
│   │   ├── SetupScreen.tsx          # ゲーム設定画面
│   │   ├── GameScreen.tsx           # メインゲーム画面
│   │   └── ResultScreen.tsx         # 結果発表画面
│   ├── map/                         # マップ描画
│   ├── fishing/                     # 釣りミニゲームUI
│   ├── shop/                        # 装備ショップ
│   ├── encyclopedia/                # 魚図鑑
│   ├── hud/                         # HUD表示
│   └── shared/                      # 共通コンポーネント
├── hooks/                           # カスタムフック
├── utils/
│   └── storage.ts                   # localStorage + Firestore 保存切替
└── data/                            # ゲームデータ (ノード, 魚, 装備, イベント)
```

## ローカル開発

```bash
git clone https://github.com/lutelute/Tsuri_sugoroku.git
cd Tsuri_sugoroku
npm install
npm run dev        # 開発サーバー起動
npm run build      # プロダクションビルド (tsc + vite)
npm run lint       # ESLint
```

## デプロイ

`main` ブランチにプッシュすると GitHub Actions が自動で GitHub Pages にデプロイします。

ワークフロー: `.github/workflows/deploy.yml`
