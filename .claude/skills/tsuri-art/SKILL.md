---
name: tsuri-art
description: 釣りすごろくの見た目（画面・絵・演出）を作る・直すときの型。新しい画面や札の絵を足す、「しょぼい」「絵を良くして」と言われた、iPad やスマホで崩れた、ときに使う。描き直さずに使う部品の一覧、浮世絵の描き方の型、少ない撮影で確かめる手順、よくある崩れを持つ。
---

# 釣りすごろくの絵の型

v5.0.0 で全画面を描き直したときの部品と手順をまとめたもの。**新しく描く前に、まず下の部品を使う。** 足りない所だけを、同じ型で描き足す。

## 1. 目指す水準（この絵より下げない）

撮影して見比べる手本。どれも開発ビルドの場面名（`node scripts/shots.mjs --list`）。

- タイトル `title`: 大波・はねる鯛・朝日の光条。題字は筆文字で2行。
- 釣りの場面 `fish-cast-wait-strike` `fish-mini-reeling`: 釣り場ごとの景色、笠の釣り人としなる竹竿、魚の影絵。
- 町の画面 `city-town-built`: 先頭の街並みの絵（町の格・特色・季節で変わる）。
- 釣果の札 `fish-caught`: 魚拓ふうの台紙と落款、めずらしさで金箔。
- 結果発表 `fishing-result`: 金屏風の優勝の札、下の順位から明かす。
- 貧乏神の寸劇・サイコロ・年度末の判子（v4 からある良い所）。

## 2. 描き直さずに使う部品

| 部品 | 場所 | 使い方 |
|---|---|---|
| 色の定数 | `src/components/city/townArt/palette.ts`、`src/components/event/artBase.ts` | `INK` `WASHI` `KIN` `SHU` `AI*` `LEAF` `WOOD` … 絵の色はここから取る（勝手な hex を足さない） |
| 札の絵の小道具 | `src/components/event/artKit.tsx` | `ArtDefs` `Bg(tone)` `Sea` `Hills` `Kasumi`（霞） `Puff`（雲） `Rays`（光条） `Sparkle` `Koban` `Pine` `Boat` `House` `BigFish` `SmallFish` `Splash` `Drop` `Flame` `Rocks` |
| 札の絵（内容ごと） | `src/components/event/EventArt.tsx` と `eventArtPick.ts` | 効果の種類から絵柄を選ぶ。新しい札は `eventArtPick` に足す |
| 祭り・道具・温泉 | `capital/FestivalArt.tsx`・`shop/GearArt.tsx`・`rest/OnsenScene.tsx` | 地方の祭り飾り、等級で形の変わる竿・リール・ルアー、露天風呂 |
| 魚 | `src/components/shared/FishIllustration.tsx`・`shared/fishArt/` | `fishId` で300種。`silhouette` で影絵（藍の色は CSS で付ける）、`framed` で図鑑の台紙用。形は `fishArt/forms.ts` の型、魚ごとの模様と色は `src/data/fishForms.ts`。一覧は `?gallery=fish` |
| 釣りの舞台 | `src/components/fishing/scene/`（`FishingStage` `Backdrops` `Angler` `Gauges` `sceneSpec`） | 景色はマスから `sceneSpec` が選ぶ（土台6・名所6・空4・季節4） |
| 街並みと建物 | `src/components/city/TownScene.tsx`・`townArt/`・`BuildingGlyph.tsx` | 建物は種類×等級で別の絵。小さな記号も同じ絵を縮めて使う |
| 地図の町の姿 | `src/components/map/townMarks.tsx`・置き場所 `townPlacement.ts` | 地名・マスにかぶらない所へ逃がす |
| 判子・紙吹雪・数え上げ | `src/components/fx/`（`Stamp` `Confetti` `useCountUp` `ScreenFlash` `BottomSheet`） | 達成・優勝・称号はまず判子 |
| 駒・家紋・名産・貧乏神 | `shared/Pawn.tsx`・`city/MayorCrest.tsx`・`city/SpecialtyIcon.tsx`・`city/BinboFigure.tsx` | |
| 線画のアイコン | `src/components/shared/Icon.tsx` | 絵文字の代わり。**絵文字は使わない** |

## 3. 描き方の型（浮世絵の調子）

- **平たい色面＋墨の輪郭**。輪郭は `INK`、太さは見た目で 1.5〜2px。ぼかしで形を作らない。
- **奥行きは3枚**: 遠景（薄く・彩度を落とす）、中景（主役）、近景（暗い影や縁）。霞（`Kasumi`）を層の間に挟む。
- **空と水は藍のグラデーション**。波は青海波の地紋＋北斎の波頭（巻いた波と白い粒）。
- **金は差し色**（光条・縁・判の金箔）。**朱は判子と大事な一点だけ**。和紙の面（`WASHI`）の上の字は墨（`#2a2118`）。
- **画面ごとに主役の絵を1つ**。字だけの画面を作らない。絵は小箱に押し込まず大きく使う（iPad・PC では広げる）。
- **状態は絵に出す**: 電気→窓が灯る、公害→空がくすむ・煙、持ち主→のれん・旗の色、めずらしさ→後光と金箔の量。
- 実在の目印（富士・城・塔）は様式化して描いてよい。企業のロゴや他作品のキャラクターは描かない。

## 4. 動き

- 動かすのは `transform` と `opacity` だけ。CSS の `@keyframes` で書く（地図の SVG に後から入れる SMIL は動かない）。
- **一度きりが基本**（建った・育った・達成した瞬間）。常に動かすのは波・湯けむり・煙など主役の数個まで。地図は動かさない。
- 大きな SVG は止まった絵にして `memo`。動く粒は上に重ねた別の要素に置く。
- `useReducedMotion`（`src/components/fx/useReducedMotion.ts`）では止める。
- 大きな `blur`・`feTurbulence` を動かさない（和紙の質感は小さな模様を1回描いて敷く）。動く絵の上に `backdrop-filter` を重ねない。

## 5. 文字・色・ファイル名の決まり

- 漢字のある文は `Ruby` で包む。ふりがな辞書（`src/data/furigana.ts`）は**最長一致**: 短い語を足すと長い語が切れる（「3割」で「3割引き」、「次の月」で「次の月末」が切れた）。数字と「回・月」は1つの文字列にまとめる（`あと${n}回`）。足したら `npx vitest run src/components/guide`。単漢字の 金・来・回・光・先 は登録しない。
- 色のクラスは `src/index.css` の `@theme` にあるものだけ（無いクラスは黙って効かない）。
- CSS は `index.css` の末尾に自分のブロック（接頭辞を決める）。
- **大文字小文字だけが違うファイル名を作らない**（`Foo.tsx` と `foo.ts`。macOS では同じファイルになり CI で壊れる）。
- 案内が指す `data-guide` を消さない（`guideRules.test.ts` が見ている）。押せる物は高さ 44px 以上。

## 6. 確かめ方（安い順。上から試す）

1. **確かめ用の一覧に先に置く**。開発ビルドで `?gallery=town`（街並み）・`?gallery=art`（札・道具・祭り・温泉）。新しい絵は一覧に足してから画面に付ける。1枚の撮影で全部の絵柄が見える。
2. **前の絵を控える**: 描き直す前に、その場面の今の絵を `<作業場所>/before/` に撮っておく（後で撮り直すと前の絵が消える）。
3. **場面を絞って撮る**:
   ```
   NODE_ENV=development npx vite build --mode development --outDir <tmp>/dist
   NODE_ENV=development npx vite preview --outDir <tmp>/dist --port 5340 --strictPort   # preview にも NODE_ENV が要る
   node scripts/shots.mjs --url http://localhost:5340 --out <tmp>/shots --only <場面> --size phone,ipad-land --sheets
   ```
   まず `sheets/` の一覧（4枚ずつ）を見て、気になる1〜2枚だけ原寸で見る。
4. **最後に1回だけ WebKit**（ユーザーは iPad の Safari）: `--browser webkit --size ipad,ipad-land`。ヘッドレスの WebKit は 3D のサイコロを平たく描き、`backdrop-filter` を描かない（どちらも本番では正常）。
5. 描く→撮る→見るは**1つの画面につき2周まで**。3周目が要るなら、何が足りないかを書き出してから。

## 7. よくある崩れ（直したことがあるもの）

- 中身が画面より長いと上が切れる: 外枠は `justify-center` でなく `justify-center-safe`。
- スマホ幅で下の操作が右下の丸ボタンに重なる（丸ボタンは 44px、下の操作は右に 4.5rem 空ける）。
- 題字や数字の札が語の途中で折れる（「釣りすごろ／く」「ポイン／ト」）: `whitespace-nowrap` か組み方を変える。
- 1kg 未満が「0.0kg」: `src/components/fishing/weightText.ts` を使う。
- 4人で結果・設定・最終決算が長くなる: 4人とスマホ 360px で必ず撮る。

## 8. トークンの節約

- 係（サブエージェント）は**同時に3人まで**。1人に1つの画面群。全場面の撮り直しは最後に1回だけ。
- 部品を使い回す（2章）。同じ小道具を係ごとに描き直さない。
- 大きなファイル（`FishIllustration.tsx` など）は丸ごと読まず、`grep` で関数と props だけ見る。
- 絵の確認は一覧の絵（`--sheets`）を先に。原寸はしぼって見る。
