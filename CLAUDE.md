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
| `city.ts` | まちづくりモード（区画・建設/再開発/買収・RCI需要・電力・公害・月末シミュレーション・災害・目的地・まちイベント） |

### `src/data/` — 静的データ
| ファイル | 内容 |
|---------|------|
| `fishDatabase.ts` | 魚300種のデータ（276種にWikipedia URL付き） |
| `boardNodes.ts` | ボードのノード定義（日本全国の釣りスポット） |
| `boardEdges.ts` | ノード間の接続定義 |
| `japanGeo.ts` | 自動生成: 都道府県ポリゴン・海岸線・県境（`scripts/build-japan-geo.mjs`） |
| `realisticData_nodes.ts` | 日本列島盤のマス。座標は `scripts/relayout-nodes.mjs` が実在地の緯度経度から生成 |
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

## v2.0.0 リニューアル記録（2026-05-30）

「Opus 4.8 ならどう作るか」を起点にした和モダン全面刷新＋機能改修。詳細は `CHANGELOG.md` 参照。

### デザイン（和モダン・浮世絵）
- テーマ: 藍×朱×金×和紙トークン（`index.css @theme`）、青海波背景、和フォント（毛筆/明朝/ゴシック、`index.html` で読込）
- 魚イラスト(`FishIllustration.tsx`)を有機的な造形に再設計（背びれ/二又尾びれ/胸びれ/陰影グラデ/うろこ/レア度オーラ）
- 地図(`JapanMap`/`MapNode`/`MapEdge`/`PlayerToken` + 新規 `map/landmass.ts`): 日本列島の陸地シルエット・金の海路・方位・地方名・漢字記号のマス・地図ピン型の駒
- 統一SVGアイコン集（新規 `shared/Icon.tsx`）で絵文字を置換。共通UI＋全オーバーレイを統一

### 重要な運用上の前提
- **Firestore セキュリティルールは `firestore.rules` をデプロイ済み前提**（usernames/profiles 公開読み取り、users/* は認証必須、rankings 検証）。未デプロイ/ロックだと検索・番付・引き継ぎ・図鑑同期が permission-denied で全滅する。`firebase.json` 同梱。
- **ゲストは認証セッション専用＋ローカル保存**（`storage.getUid()` が isGuest 時 null）。新規ゲストは usernames/profiles に載せない。
- **未ログインでも紐付けプレイ可**: `SetupScreen.handleStart` が未ログイン時に `signInGuest()` で認証セッションを確保（users/* の読み書きに必須なため）。
- **マルチプレイ引き継ぎ**: 1セッションから複数uidの users/* に書き込むため、ルールの users 書き込みは所有者限定にできない（`signedIn`）。

### テスト
- Vitest + `src/**/*.test.ts`（純粋ロジックのみ、tsconfig.app から除外）。`npm test` / `npm run typecheck`。
- 乱数は `utils/random.ts` の `setRandomSource`/`mulberry32` で決定論化可能。
- CI(`.github/workflows/deploy.yml`)は check(typecheck/lint/test)→build→deploy。lint は既存 react-hooks 警告のため当面 `continue-on-error`。

### ロールバック
旧本番は commit `d718428`（タグ `pre-wamodern-renovation`）。`git reset --hard d718428 && git push --force-with-lease origin main`。


## v4.0.0 地図刷新 + まちづくりモード（2026-09-27）

詳細は `CHANGELOG.md`。

### 地図（`src/components/map/`）
- 座標系: `x = 84 + (lon - 127.7) * 67.6`, `y = 1445 - (lat - 26.2) * 79.4`（`mapTheme.projectLatLon`）。地形・マス・スクリプトすべてこの式で一致させる。
- 地形は `MapTerrain.tsx`（静的・memo）。データは `src/data/japanGeo.ts`（生成物・直接編集しない）。再生成: `node scripts/build-japan-geo.mjs [japan.topojson]`。出典表記（地球地図日本・国土地理院）を地図下に表示している。
- マス座標の再計算: `node scripts/relayout-nodes.mjs`（LATLON 表 → 投影 → 陸地に留める → 最小間隔31の反発 → 中継マスは中点）。マスを足したら LATLON に緯度経度を追加する。
- カメラ `useMapCamera.ts`: 操作中は viewBox 属性を直接更新（React 再描画なし）。ズーム段階は svg の `data-lod`（far/mid/near）→ `index.css` の `.lbl-*` / `.lod-*` で出し分け。
- 地名ラベル `labelLayout.ts`: 重なり回避で LOD ごとのずらし量を事前計算し、CSS 変数（--nx/--mx/--fx…）+ transform で適用。**`LABEL_FONT` と index.css のフォントサイズは一致させること。**
- ジグザグ盤・島ホップ盤は `LegacyTerrain.tsx`（凸包表示）を使う。

### まちづくりモード
- `settings.mode === 'city'`。状態は `GameState.city`（`CityState`）。1巡=1か月、`nextPlayer` でラウンドが進むと `simulateRound` → `turnPhase: 'city_report'`。
- 町マス到着は `executeCityNodeAction`（ストア末尾）。町パネル `turnPhase: 'city'`（`components/city/CityOverlay.tsx`）。祭り・釣り・店・湯治は町パネルから寄り道し、終われば行動選択/町パネルへ戻る。
- 1訪問の工事は `CITY_ACTIONS_PER_VISIT`(2) 回。引き継ぎ（Firestore の装備・お金保存）はまちづくりでは行わない。ランキング登録もしない。
- 経済バランスは `city.test.ts` と、一時的な試算テスト（`simulateRound` を36回回す）で確認して調整した。

### 開発時の注意
- リポジトリが iCloud 同期下（~/Documents）にあり、`node_modules` が退避（dataless）されると cat/grep/vite が固まる。`npm ci` で復旧する。
- 同じ理由でファイル変更イベントが遅れて届き、Vite 開発サーバーが遅れて再起動・再読み込みすることがある。ブラウザ確認が不安定なときは `NODE_ENV=development npx vite build --mode development --outDir <tmp>` を静的配信すると安定する（DevPanel も使える）。


## v4.1.0 係（エージェント）分担での作り込み（2026-09-27）

ユーザーの「まだまだしょぼい」「難易度調整係やミニゲーム係がいないと全体把握できない」を受け、役割別のサブエージェント（難易度調整係・ミニゲーム係・演出係・まちづくり企画係）で監査→実装し、リーダーが統合した。詳細は `CHANGELOG.md`。

### 追加された主なモジュール
- `src/game/cpuAI.ts` + `components/cpu/CpuDriver.tsx`: CPU 対戦相手（堅実/独占/目的地）。CpuDriver は App に取り付け、手番の段階ごとに1手ずつ実行。CPU の釣りは `cpuFish`（確率判定）で、ミニゲームは遊ばない。CPU の図鑑はローカル保存しない。
- `src/game/cityAwards.ts` + `components/city/CityYearEndOverlay.tsx`: 3月の年度末大決算と称号（賞金/罰金）。年度は4月始まり（12巡目=1年度3月）。
- `city.ts` の空き家（`vacant`/`lowMonths`・`renovate`）、視察（`recordInspection`・`inspections`）、発展度（`TownState.tier/land/base`・`effectiveLandValue`）。独占は「もとの区画数（base）以上を1人で所有」。独占中の町は発展しても区画が増えない（囲い込み）。
- 経済の数値はすべて `CITY_ECONOMY`（難易度調整係が `balance.city.sim.test.ts` で計測・調整）。釣り旅は `balance.fishing.sim.test.ts`。数値を変えたらこの2つのシミュレーションテストを必ず通す。
- 釣りミニゲーム: `components/fishing/reelSim.ts`（やり取りの純粋シミュレーション・RARITY_DIFFICULTY）、`strike.ts`（合わせ判定）、`reelBots.ts`（公平性テスト用ボット）。
- 演出: `components/fx/*`（3Dサイコロ・判子・紙吹雪・数え上げ等）。CSS は index.css 末尾の係ごとのブロック（演出係 `fx-`、ミニゲーム係 `fg-`）。

### ルールの変更点
- まちづくり: ゴール賞金は1人1回の着順制（ストアの `cityGoalClaims`）。移動カードでゴールしても上がらない。村マスは必ずまちの出来事、中継マスは道中イベント。平凡な月の決算は全画面を出さず上部のお知らせ。
- 釣り旅: 県庁の祭りの後に釣具店へ寄れる（shopTier があれば）。最初のゴールから `GOAL_CLOSE_ROUNDS`(10) 巡で締め切り（`firstFinishTurn`）。

### ふりがな
- 単漢字の金・来・回・光・先は誤読の元なので登録しない（熟語で登録）。新しい語を出すときは `furigana.ts` に熟語で足す。

## v4.2.0 まちづくり第2弾：桃鉄の遊び（2026-09-27）

カード係・名産係・貧乏神係・難易度調整係が桃鉄の核を足し、リーダーがストアと画面に統合した。詳細は `CHANGELOG.md`。

### 追加された主なモジュール
- `src/game/cityCards.ts`: カード（急行/特急/ぶっとび/牛歩/地上げ/工事券/保険/誘致）。使うのは `playCard`（`use〜` という名前は react-hooks の lint に引っかかるので付けない）。手札は `MAX_HAND`(4)、売り場は `CARD_SHOP_CLASSES`（大都市・商都）。UI は `components/city/CardHand/CardPlayBar/CardShop.tsx`。
- `src/data/citySpecialties.ts` + `src/game/citySpecialties.ts`: 22県庁の名産（物件）。経済は `SPECIALTY_ECONOMY`。地方独占で収入2倍・称号「○○の顔役」（`cityAwards.ts` の kaoyaku）。UI は `SpecialtyCard/SpecialtyIcon.tsx`、地図は `CityLayer.tsx` の `SpecialtyMarks`。
- `src/game/binbo.ts`: 貧乏神（`CityState.binbo`）。目的地の一番乗りで一番遠い人に `attachOnDestination`、移動時に `transferOnMove`（ストアの `binboAfterMove(path)` を全ての移動経路で呼ぶこと）、月末に `tickMonth`→`binboMischief`。数値は `BINBO`。UI は `BinboFigure/BinboOverlay/BinboAttachToast.tsx`。
- `city.ts`: 季節（`SEASONS`/`seasonOf`）、町の利用料（`visitorFees`）、目的地の特需（`startBoom`・`CityState.booms`）、年度で上がる目的地賞金（`destinationYearMul`）。
- `pathfinding.getReachableNodes(start, steps, stopNodes)`: 目的地は途中で止まれる（通り抜けも可）。

### 実装上の注意
- GameScreen の直下に並ぶお知らせは key に接頭辞を付ける（`toast-${seq}` と `binbo-${seq}`）。同じ seq で key が衝突すると React が DOM を複製する。
- 貧乏神のお知らせは瓦版が消えてから出す（重なり防止）。
- 数値を変えたら `balance.city.sim.test.ts` を必ず通す（名産・利用料・目的地・貧乏神も含めて計測している）。
- DevPanel: カード配布 / 貧乏神（あと1か月で大貧乏神）/ 貧乏神の悪さ（その場で月末の悪さ）/ 目的地へワープ。

## v4.3.0 遊び方・モーションガイド・テンポ（2026-09-27）

案内役・テンポ係・演出係の分担。詳細は `CHANGELOG.md`。ユーザーは「文章より動いて教える」案内を望んでいる。

### 案内（`src/components/guide/`）
- `guideRules.ts`: どの場面で何を指すか（`GUIDES`・`pickGuide`・`stillValid`）。案内の対象は各画面の `data-guide="..."` 属性。**属性を消すと `guideRules.test.ts` が落ちる**（案内先が画面にあることを確かめている）。
- `GuideLayer.tsx`（GameScreen に取り付け）: 指差し・輪・吹き出し。押すか場面が進むと見たものとして `useGuideStore.markSeen`（localStorage `tsuri_guide_seen`）。対象が下の固定帯の裏やスクロール外なら `guideDom.revealGuideTarget` で寄せる。閉じる判定は pointerdown なので、スクリプトの `click()` では閉じない。
- `GuideMapLayer.tsx`（JapanMap に取り付け）: 地図の座標で道の光・駒の輪・目的地への矢印。viewBox の直書きに追従し、再描画しない。
- `HowToPlayOverlay.tsx` + `howToPages.ts` + `HowToDiagrams.tsx`: 遊び方の画面。数値は定数から読む。文字の漢字がすべてふりがなで読めることをテストしている（新しい文を足したら `furigana.ts` に熟語で読みを足す）。
- 新しい機能を足すときは、初めての場面の案内と遊び方のページも一緒に用意する。

### テンポ（`src/game/tempo.ts`）
- 時間の数字（`MOVE_STEP_MS` など）と、お知らせの順番待ち・月末の出し分け・行動選択の自動終了の判定は `tempo.ts` の純粋関数。CPU の速さは `useSettingsStore.cpuSpeed` と `useTempoScale(isCpuTurn)`（人の手番は常に等倍）。
- CPU の1手は `components/cpu/cpuStep.ts`（CpuDriver は呼ぶだけ）。貧乏神の悪さの画面が出ている間は CPU を止めて覆いを外す。
- お知らせはストアの順番待ちに積む（`cityToast` を直接上書きしない）。見出しは「名前：〜」の形。
- `src/store/tempo.flow.test.ts` が本物のストアと CPU で1局を最後まで進め、固まらないこと・月末の全画面が月1回未満・人の1手番の操作が6回未満であることを確かめる。流れを変えたら必ず通す。

### 演出
- 下から出る画面は `fx/BottomSheet.tsx`。地図の SVG に後から差し込む SMIL は文書の時計で始まるので動かないことがある。地図の動きは CSS アニメで作る。
- 貧乏神の人形は `map/useDisplayedBinbo.ts` で表示だけ遅らせる（ストアはすぐ移る）。
