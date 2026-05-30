# 変更履歴 (Changelog)

本ファイルは「釣りすごろく」の主要な変更を記録します。

## [2.0.0] - 2026-05-30 — 和モダン全面刷新 + 機能改修

「Opus 4.8 ならどう作るか」を起点にした大規模リニューアル。デザイン全面刷新、致命バグ修正、テスト基盤導入、データ/認証の不具合修正までを含む。

### 🎮 機能・バグ修正
- **致命バグ修正**: ストライク成功後に reeling 用タイマーが target/reaction/rhythm のミニゲーム中も走り、20秒で強制失敗させていた問題を修正（`miniGame` 種別でガード）。
- ターン終了のオフバイワン（最終ラウンドで後手がプレイできない）をラウンド境界判定に修正。
- `nextPlayer` の skipNextTurn フラグ多重 set による解除巻き戻りを修正（作業コピーで一括反映）。
- 移動イベント(move/move_steps)後にゴール到達が無視される問題を修正。
- 「戻る」系イベントが前進していた問題を修正（ゴール距離で方向バイアス）。
- 装備合体の耐久度上限を 60→100 に統一（新品同士で劣化しない保証）。
- `resumeGame` の `boatFishingRemaining` 復元漏れ、サイズ二重生成、イベント魚の `limitedNodes` 無視、`weightedRandom` のゼロ/負/NaN ガード 等。

### 🎨 デザイン（和モダン・浮世絵）
- テーマ刷新: 藍×朱×金×和紙のカラートークン、青海波(波文)背景、和フォント（毛筆 Yuji Syuku / 明朝 Shippori Mincho / Zen Kaku Gothic New）。
- **魚イラスト有機化（全299種）**: 背びれ・二又の尾びれ・胸びれ・えら蓋・口・自然な体型曲線・陰影グラデ・うろこ・レア度オーラ。
- **地図**: 日本列島の陸地シルエット（凸包平滑化で海岸線生成）、金の海路、方位コンパス、地方名透かし、到達ルートの金線表示。
- **双六マス**: 和紙トークン＋漢字記号（釣/名/店/吉/凶/籤/湯）、鳥居スタート/旗ゴール、地図ピン型の駒。
- **統一SVGアイコン**(`Icon.tsx`)で絵文字を置換。共通UI(Button/Modal/ProgressBar)と全オーバーレイ画面(ショップ/魚籠/インベントリ/図鑑/番付/釣り人/ログイン/釣り選択/休憩所)を和モダンに統一。

### 🔒 セキュリティ / データ
- **Firestore セキュリティルール**(`firestore.rules` + `firebase.json`)を追加・**デプロイ**。usernames/profiles は公開読み取り、書き込みは認証必須、ランキングはスコアの型/範囲検証＋他者記録の改竄/削除禁止。
  - ※ これにより、長らくロック（テストモード期限切れ）でアクセス不能だった検索・番付・引き継ぎ・図鑑同期が復活。
- ゲストを共有固定アカウントのままローカル専用に隔離（Firestore汚染・ランキング汚染を停止）。
- セッション窓のスライドで24時間操作後の突然ログアウトを防止。
- `lookupUserByUsername` 堅牢化（usernames 優先、失敗時に原因ログ）。
- **未ログインでも紐付けプレイが成立**するよう、ゲーム開始時にゲスト認証セッションを自動確保（紐付け相手のデータ読み書きに必要）。

### 🧪 テスト / ツールチェーン
- 注入可能な seedable RNG（`mulberry32`/`setRandomSource`）で純粋ロジックを決定論化。
- **Vitest 導入 + 68テスト**（random / pathfinding / equipment / fishing / events / scoring）。
- CI(GitHub Actions)に typecheck/lint/test ゲートを追加（lint は既存 react-hooks 警告のため当面 non-blocking）。

### 新規ファイル
- `src/components/shared/Icon.tsx` — 和モダン統一SVGアイコン集
- `src/components/map/landmass.ts` — 日本列島の陸地シルエット生成
- `src/utils/random.ts` — seedable RNG（既存を拡張）
- `firestore.rules` / `firebase.json` — Firestore セキュリティルール
- `vitest.config.ts` + `src/**/*.test.ts` — テスト基盤
- `CHANGELOG.md`（本ファイル）

### ロールバック
旧本番コードは commit `d718428`（タグ `pre-wamodern-renovation`）に保全。

## [1.0.0] - 2026-03 — 初期リリース
- ミニゲーム3種、イベントファイト、装備合体、図鑑NEW表示、日本全国ボード、Firebase認証/Firestore連携。
