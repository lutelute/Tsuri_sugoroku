# Tsuri Sugoroku (釣りすごろく) - プロジェクト解説

## プロジェクト概要
日本全国を巡るすごろくボードゲーム。各地で釣りをして魚を集め、スコアを競う。
- **リポジトリ**: https://github.com/lutelute/Tsuri_sugoroku
- **GitHub Pages**: https://lutelute.github.io/Tsuri_sugoroku/
- **デプロイ**: mainブランチにpushすると GitHub Actions で自動デプロイ

## 技術スタック
- React 19 + TypeScript 5.9 + Vite 7 + Tailwind CSS v4
- Zustand 5 (状態管理、シングルストア)
- Firebase Auth (Email/Password) + Cloud Firestore
- `verbatimModuleSyntax: true` — 型のみのインポートには `import type` が必須

## ビルド・開発コマンド
```bash
npm run dev          # 開発サーバー起動
npx tsc --noEmit     # TypeScript型チェック
npx vite build       # プロダクションビルド
```

## ファイル構成

### `src/game/` — ゲームロジック（React非依存の純粋関数）
| ファイル | 内容 |
|---------|------|
| `types.ts` | 全型定義（BoardNode, Fish, Player, GameState, Equipment等） |
| `constants.ts` | ゲームバランス定数（釣り・装備・スコア・ペナルティ等） |
| `fishing.ts` | 魚の選択、サイズ生成、大漁判定、バイト遅延計算 |
| `equipment.ts` | 装備管理（レベル、耐久度、修理、ダメージ、インベントリ） |
| `events.ts` | イベントカード効果の適用 |
| `movement.ts` | ボード上の移動・経路計算 |
| `scoring.ts` | 最終スコア計算（魚ポイント+ボーナス） |

### `src/data/` — 静的データ
| ファイル | 内容 |
|---------|------|
| `fishDatabase.ts` | 魚300種のデータ（276種にWikipedia URL付き） |
| `boardNodes.ts` | ボードのノード定義（日本全国の釣りスポット） |
| `boardEdges.ts` | ノード間の接続定義 |
| `equipmentData.ts` | 装備データ（竿5段階・リール5段階・ルアー5段階） |
| `eventCards.ts` | イベントカード定義（良・悪・ランダム） |

### `src/store/` — Zustand ストア
| ファイル | 内容 |
|---------|------|
| `useGameStore.ts` | メインゲーム状態。画面遷移、ターン進行、釣り、ショップ、イベント全て管理 |
| `useAuthStore.ts` | Firebase認証状態（user, loading, signIn/signUp/signOut） |

### `src/hooks/` — カスタムフック
| ファイル | 内容 |
|---------|------|
| `useFishing.ts` | 釣りミニゲームの全フェーズ制御（バイト待ち→ストライク→リーリング→結果） |
| `useRoulette.ts` | サイコロ演出 |

### `src/lib/` — 外部サービス連携
| ファイル | 内容 |
|---------|------|
| `firebase.ts` | Firebase App初期化 |
| `firestore.ts` | Firestore CRUD（プロフィール、図鑑、装備、お金、ユーザー検索） |

### `src/components/` — UIコンポーネント

#### `screens/` — 画面
- `TitleScreen.tsx` — タイトル画面（ログイン状態表示、続きから、図鑑）
- `LoginScreen.tsx` — ユーザー名+パスワードでログイン/新規登録
- `SetupScreen.tsx` — ゲーム設定（人数、名前、ユーザー紐付け、引き継ぎモード、ターン数）
- `GameScreen.tsx` — メインゲーム画面（マップ、HUD、オーバーレイ制御）
- `ResultScreen.tsx` — 結果画面（スコア詳細）

#### `fishing/` — 釣りミニゲーム
- `FishingChoiceOverlay.tsx` — 通常釣り or 船釣り選択（装備チェック含む）
- `FishingOverlay.tsx` — 釣り全体のコンテナ
- `WaitingPhase.tsx` — バイト待ちフェーズ
- `StrikingPhase.tsx` — ストライク判定（タイミングゲーム）
- `ReelingPhase.tsx` — リーリング（タップゲーム、テンション管理、制限時間）
- `FishCaughtModal.tsx` — 釣果表示（大漁ボーナス含む）

#### `encyclopedia/` — 魚図鑑
- `EncyclopediaOverlay.tsx` — 図鑑一覧（レア度別、収集率表示）
- `FishCard.tsx` — 魚カード
- `FishDetail.tsx` — 魚詳細（Wikipedia外部リンク付き）

#### その他
- `shop/ShopOverlay.tsx` — ショップ（装備購入・修理）
- `inventory/InventoryPanel.tsx` — インベントリ管理（装着・解除・修理）
- `event/EventOverlay.tsx` — イベントカード表示
- `rest/RestOverlay.tsx` — 休憩所（修理可能）
- `creel/CreelOverlay.tsx` — 釣果バッグ
- `map/JapanMap.tsx` — 日本地図ボード
- `roulette/RouletteOverlay.tsx` — サイコロ演出
- `hud/` — HUD要素（AllPlayersBar, TurnIndicator）
- `shared/` — 共通部品（Button, ProgressBar, FishIllustration, Modal）

## 主要な機能・仕様

### 画面遷移
```
title → login → title
title → setup → game → result → title
```

### ターン進行
```
idle → roulette → path_selection(分岐あり) or node_action →
  fishing_choice → fishing / shop / event / rest → action_choice → turn_end
```

### 釣りミニゲーム（5フェーズ）
1. **cast** — キャスト演出（1.5秒）
2. **waiting** — バイト待ち（ルアーレベルで短縮。ルアーなしで2.5倍遅延）
3. **strike** — ストライク判定（回転するバーの緑ゾーンにタイミングを合わせる。竿レベルで緑ゾーン拡大）
4. **reeling** — リーリング（タップで巻き上げ。テンション管理+制限時間20秒）
5. **result** — 結果表示（釣果 or 逃走）

### 装備システム
- **3種類**: 竿(rod)、リール(reel)、ルアー/エサ(lure) — 各レベル1~5
- **インベントリ制**: 複数所持可能、1つずつ装着
- **耐久度**: 釣り毎に消耗（Lv高いほど消耗少）、0で壊れて自動解除
- **修理**: ショップ・休憩所で修理可能（耐久度1ptあたり¥15）

### 装備能力（重み付きシステム）
全能力に竿・リール・ルアーが重み付きで寄与する。`getEffectiveLevel()` + `interpolateBonus()` で実数レベルから連続的にボーナスを算出。

| 能力 | 主力装備 | 効果 |
|------|---------|------|
| strike | 竿(0.6) | ストライク緑ゾーン拡大 |
| reeling | リール(0.6) | タップ効果UP |
| rareChance | ルアー(0.7) | レア魚出現率UP |
| biteSpeed | ルアー(0.7) | バイト待ち短縮 |
| sizeBonus | 竿(0.7) | 大物サイズ出現 |
| rarityBoost | 竿(0.6) | レア度全体底上げ |
| tensionTolerance | リール(0.7) | テンション上限UP |
| tairyouChance | ルアー(0.7) | 大漁（複数匹ヒット） |

### 装備なしペナルティ
- **竿なし**: 釣り不可（FishingChoiceOverlayでブロック）
- **リールなし**: タップ効果30%、テンション上昇1.8倍
- **ルアーなし**: コモンのみ、バイト待ち2.5倍

### 船釣り
- ¥10,000で船釣り可能（レア以上の魚のみ出現）
- FishingChoiceOverlayで通常/船釣りを選択

### レア度別難易度
`RARITY_DIFFICULTY` テーブル（useFishing.ts内）で、レア魚ほどテンション上昇+魚の抵抗が増し、タップ効果が減少。mythicalでも20秒あれば釣り上げ可能なバランス。

### 大漁システム
ルアーレベル依存で確率発動。1~3匹の追加魚を自動取得。

### 魚図鑑
- 300種（common 100 / uncommon 60 / rare 60 / legendary 56 / mythical 24）
- 276種にWikipedia日本語版へのリンク付き
- FishDetail画面で「詳しく見る（Wikipedia）」リンク表示

### イベントカード
- 良いイベント: お金獲得、装備アップグレード、魚ボーナス、追加ターン
- 悪いイベント: お金損失、ターンスキップ、装備ダメージ（竿折れ/リール浸水/ルアー損傷等）
- ランダムイベント: 混合効果（猿の悪戯、熊出没等の装備破壊含む）

### Firebase認証 + データ永続化
- ユーザー名+パスワードでログイン（内部的に `{username}@tsuri.local` のEmail/Password認証）
- Firestore構造:
  ```
  users/{uid}/profile     — displayName, createdAt
  users/{uid}/encyclopedia — 図鑑データ
  users/{uid}/equipment   — 装備データ（ゲーム間引き継ぎ）
  users/{uid}/money       — 所持金（ゲーム間引き継ぎ）
  usernames/{username}    — uid逆引き
  profiles/{uid}          — displayNameLower検索用
  ```
- ゲスト（未ログイン）はlocalStorageにフォールバック

### 引き継ぎモード
- SetupScreenで「引き継ぐ」/「引き継がない」を選択可能
- 引き継がない場合は全員初期装備(Lv1)+初期所持金(¥3,000)で公平スタート
- 紐付けユーザーがいる場合のみ表示

### ゴール賞金
- ゴール到達順に ¥10,000 / ¥6,000 / ¥3,000 / ¥1,000 を獲得
- 次回引き継ぎ時に反映

### スコア計算（ResultScreen）
- 魚ポイント合計
- レア度ボーナス
- 地域コンプリートボーナス
- 図鑑コンプリート率ボーナス
- 巨大魚ボーナス(サイズ1.5倍以上で+200pt)
- ゴール順位ボーナス
- 残金ボーナス(×0.5)

## 注意事項・実装パターン

- **型インポート**: `verbatimModuleSyntax: true` のため `import type { ... }` を使用
- **Firestore書き込み**: fire-and-forget パターン（`.catch(() => {})`）
- **装備レベル**: `getEffectiveLevel(equipment, ability)` で加重平均実効レベルを算出
- **ボーナス補間**: `interpolateBonus(values[], level)` でレベル別配列から連続値を補間
- **ノードアクション制限**: 釣りは1ターン最大3回まで (`MAX_FISHING_PER_TURN = 3`)
- **ゲーム保存**: ターン終了時にlocalStorageへ自動保存、ゲーム終了時にFirestoreへ装備・お金を保存
