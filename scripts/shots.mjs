#!/usr/bin/env node
// 画面の撮影スクリプト（見た目の確かめ・美術の監査用）。
//
// 使い方:
//   1) 開発ビルドを作って配信する（window.__tsuri と DevPanel が要るので開発ビルド）
//        NODE_ENV=development npx vite build --mode development --outDir <tmp>/dist
//        NODE_ENV=development npx vite preview --outDir <tmp>/dist --port 5311 --strictPort
//   2) 撮る
//        node scripts/shots.mjs --url http://localhost:5311 --out <出力先> [--only 場面,場面] [--size phone|desktop|ipad|ipad-land|both|all]
//
//   --only   場面名（前方一致でもよい。例: --only city- でまちづくりを全部）
//   --size   phone = 390x844（2倍）/ desktop = 1280x800 / ipad = 834x1194（2倍・縦）/ ipad-land = 1194x834（2倍・横）
//            both = phone,desktop（既定）/ all = 4つ全部 / カンマ区切りで好きな組（例: --size ipad,ipad-land）
//            iPad の寸法は、--only を付けなければ主な場面（SCENES の main: true）だけ撮る
//   --list   場面の一覧を出して終わる
//   --sheets 撮ったあと、何枚かを1枚に並べた一覧（<out>/sheets/）も作る
//   --sheets-only  撮らずに、いまある絵から一覧だけ作り直す
//   --furigana off  ふりがなを切って撮る（既定は画面の初期値どおり ON）
//   --show-dev      左下の DEV ボタンを隠さない
//   --headed        ブラウザを表示して撮る
//
// 出力: <out>/<size>/<番号>-<場面>[--<小分け>].png と <out>/manifest.json（撮れた絵・飛ばした場面と理由）。
// 絵はリポジトリに置かない（--out は必ずリポジトリの外へ）。
//
// しくみ:
//   - 場面ごとに新しいブラウザの文脈（localStorage が空）で開き、タイトルで「ガイド OFF」にしてから始める。
//   - 状態は window.__tsuri（開発ビルドだけ出ている useGameStore）のアクションで作る。
//     startGame / warpCurrentPlayerTo / devCityCheat / cityBuild など。localStorage に種はまかない。
//   - 場面を足すときは SCENES に { name, desc, run } を足す。run(t) の中で t.shot('小分け名') を呼ぶと1枚撮れる。
//     出せない場面は t.skip('理由') を投げると、飛ばした理由が manifest に残る。

import { chromium, webkit } from 'playwright';
import { mkdir, writeFile, readFile, readdir, unlink } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

// ===== 引数 =====

function parseArgs(argv) {
  const a = { url: 'http://localhost:5311', out: '', only: null, size: 'both', list: false, sheets: false, furigana: 'default', showDev: false, headed: false, browser: 'chromium' };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    const next = () => argv[++i];
    if (k === '--url') a.url = next();
    else if (k === '--out') a.out = next();
    else if (k === '--only') a.only = next().split(',').map(s => s.trim()).filter(Boolean);
    else if (k === '--size') a.size = next();
    else if (k === '--list') a.list = true;
    else if (k === '--sheets') a.sheets = true;
    else if (k === '--sheets-only') { a.sheets = true; a.sheetsOnly = true; }
    else if (k === '--furigana') a.furigana = next();
    else if (k === '--show-dev') a.showDev = true;
    else if (k === '--headed') a.headed = true;
    else if (k === '--browser') a.browser = next();
    else if (k === '--help' || k === '-h') a.help = true;
    else throw new Error(`知らない引数: ${k}`);
  }
  return a;
}

const SIZES = {
  phone: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  desktop: { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 },
  // iPad（Safari で遊ぶ人向けの寸法。ブラウザは chromium のまま。WebKit のヘッドレスは立体のサイコロが平たく写る）
  ipad: { viewport: { width: 834, height: 1194 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  'ipad-land': { viewport: { width: 1194, height: 834 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
};

/** --size の読み方: 名前1つ / カンマ区切り / both（phone,desktop）/ all（4つ全部） */
function resolveSizes(spec) {
  const names = spec === 'both' ? ['phone', 'desktop'] : spec === 'all' ? Object.keys(SIZES) : spec.split(',').map(x => x.trim()).filter(Boolean);
  for (const n of names) if (!SIZES[n]) throw new Error(`--size は ${Object.keys(SIZES).join(' / ')} / both / all（${n} は不明）`);
  return names;
}

/** 一覧（sheets）の並べ方: 1枚に何枚・何列・1枚ぶんの大きさ（CSS px。絵は等倍に縮めて並べる） */
const SHEET_LAYOUT = {
  phone: { per: 4, cols: 4, cellW: 390, cellH: 844 },
  desktop: { per: 4, cols: 2, cellW: 640, cellH: 400 },
  ipad: { per: 2, cols: 2, cellW: 834, cellH: 1194 },
  'ipad-land': { per: 2, cols: 1, cellW: 1194, cellH: 834 },
};

class Skip extends Error {}

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ===== 撮影の道具箱 =====

class Toolkit {
  constructor({ page, sizeName, outDir, scene, index, args, records }) {
    this.page = page;
    this.sizeName = sizeName;
    this.outDir = outDir;
    this.scene = scene;
    this.index = index;
    this.args = args;
    this.records = records;
    this.isPhone = sizeName === 'phone';
    this.seq = 0;
  }

  skip(reason) { throw new Skip(reason); }
  wait(ms) { return this.page.waitForTimeout(ms); }

  /** タイトルを開いて、撮影向けに整える（ガイドを切る・DEV ボタンを隠す・フォントを待つ） */
  async boot({ guide = false } = {}) {
    const { page, args } = this;
    await page.goto(args.url, { waitUntil: 'load' });
    await page.waitForFunction(() => !!window.__tsuri, null, { timeout: 15000 }).catch(() => {
      throw new Error('window.__tsuri が無い。開発ビルド（--mode development）を配信しているか確かめる');
    });
    if (!args.showDev) {
      await page.addStyleTag({ content: 'button[title^="開発用チートパネル"]{visibility:hidden!important}' });
    }
    await page.evaluate(() => document.fonts.ready.then(() => true)).catch(() => {});
    // ガイド（指差しの案内）は絵を隠すので基本は切る。タイトルの「ガイド ON/OFF」を押して切り替える
    const guideOn = await this.textOf('ガイド').then(s => /ON/.test(s ?? ''));
    if (guideOn !== guide) await this.clickText('ガイド');
    if (args.furigana === 'off' || args.furigana === 'on') {
      const on = await this.textOf('ふりがな').then(s => /ON/.test(s ?? ''));
      if (on !== (args.furigana === 'on')) await this.clickText('ふりがな');
    }
    await this.wait(300);
  }

  /** ストア（window.__tsuri）に対して関数を実行する。fn は (store, arg) を受け取る */
  store(fn, arg) {
    return this.page.evaluate(([src, a]) => {
      const f = new Function(`return (${src})`)();
      return f(window.__tsuri, a);
    }, [fn.toString(), arg]);
  }

  /** ストアの値を1つ読む */
  get(key) { return this.page.evaluate(k => window.__tsuri.getState()[k], key); }

  /** ストアのアクションを呼ぶ（返り値を返す） */
  act(name, ...params) {
    return this.page.evaluate(([n, p]) => {
      const fn = window.__tsuri.getState()[n];
      if (typeof fn !== 'function') throw new Error(`ストアに ${n} が無い`);
      return fn(...p);
    }, [name, params]);
  }

  hasAction(name) { return this.page.evaluate(n => typeof window.__tsuri.getState()[n] === 'function', name); }

  /** ストアの状態を直接書く（撮影の舞台づくり用。お金・手番・段階など） */
  set(partial) { return this.page.evaluate(p => window.__tsuri.setState(p), partial); }

  /** ふりがな（rt）を除いた文字で、見えているボタンを探して押す。押せたら true */
  async clickText(text, { nth = 0, within = null, tags = 'button,[role=button],[role=tab],a' } = {}) {
    const found = await this.page.evaluate(([text, nth, within, tags]) => {
      const strip = el => { const c = el.cloneNode(true); c.querySelectorAll('rt,rp').forEach(n => n.remove()); return (c.textContent ?? '').replace(/\s+/g, ''); };
      const root = within ? document.querySelector(within) : document;
      if (!root) return false;
      const want = text.replace(/\s+/g, '');
      const els = [...root.querySelectorAll(tags)].filter(el => el.getClientRects().length > 0 && !el.disabled && strip(el).includes(want));
      // いちばん内側（文字数の少ないもの）を優先する
      els.sort((a, b) => strip(a).length - strip(b).length);
      const hit = els[nth];
      if (!hit) return false;
      document.querySelectorAll('[data-shot-target]').forEach(e => e.removeAttribute('data-shot-target'));
      hit.setAttribute('data-shot-target', '1');
      return true;
    }, [text, nth, within, tags]);
    if (!found) return false;
    const loc = this.page.locator('[data-shot-target="1"]').first();
    await loc.scrollIntoViewIfNeeded().catch(() => {});
    await loc.click({ timeout: 4000 }).catch(async () => { await loc.click({ force: true, timeout: 2000 }).catch(() => {}); });
    await this.page.evaluate(() => document.querySelectorAll('[data-shot-target]').forEach(e => e.removeAttribute('data-shot-target')));
    return true;
  }

  /** ふりがなを除いた文字を返す（その文字を含む最初のボタン） */
  textOf(text) {
    return this.page.evaluate(text => {
      const strip = el => { const c = el.cloneNode(true); c.querySelectorAll('rt,rp').forEach(n => n.remove()); return (c.textContent ?? '').replace(/\s+/g, ''); };
      const el = [...document.querySelectorAll('button')].find(b => b.getClientRects().length > 0 && strip(b).includes(text));
      return el ? strip(el) : null;
    }, text);
  }

  /** aria-label が前方一致する、見えている要素を押す */
  async clickLabel(prefix, { nth = 0 } = {}) {
    const loc = this.page.locator(`[aria-label^="${prefix}"]:visible`).nth(nth);
    if (!(await loc.count())) return false;
    await loc.click({ timeout: 4000 }).catch(async () => { await loc.click({ force: true, timeout: 2000 }).catch(() => {}); });
    return true;
  }

  /** CSS セレクタで押す */
  async clickSel(sel, { nth = 0, force = false } = {}) {
    const loc = this.page.locator(sel).nth(nth);
    if (!(await loc.count())) return false;
    await loc.click({ timeout: 4000, force }).catch(async () => { await loc.click({ force: true, timeout: 2000 }).catch(() => {}); });
    return true;
  }

  /** 画面の割合の位置を押す（釣りのタップなど） */
  async tap(fx = 0.5, fy = 0.6) {
    const vp = this.page.viewportSize();
    await this.page.mouse.click(vp.width * fx, vp.height * fy);
  }

  /** 押しっぱなしにする / 離す（長押しのミニゲーム用） */
  async press(fx = 0.5, fy = 0.6) {
    const vp = this.page.viewportSize();
    await this.page.mouse.move(vp.width * fx, vp.height * fy);
    await this.page.mouse.down();
  }
  release() { return this.page.mouse.up(); }

  /** セレクタの要素が見える位置までスクロールする。無ければ false */
  async reveal(sel, { block = 'center' } = {}) {
    return this.page.evaluate(([sel, block]) => {
      const el = document.querySelector(sel);
      if (!el) return false;
      el.scrollIntoView({ block, behavior: 'instant' });
      return true;
    }, [sel, block]);
  }

  has(sel) { return this.page.locator(sel).count().then(n => n > 0); }

  /** いちばん上に重なっている、縦にスクロールできる要素を動かす（pos: 'top' | 'bottom' | 0〜1） */
  scroll(pos = 'bottom') {
    return this.page.evaluate(pos => {
      const all = [...document.querySelectorAll('*')].filter(el => {
        const cs = getComputedStyle(el);
        return (cs.overflowY === 'auto' || cs.overflowY === 'scroll') && el.scrollHeight > el.clientHeight + 8 && el.getClientRects().length > 0;
      });
      if (!all.length) return false;
      // 画面の真ん中にある要素の祖先を優先（重なりのいちばん上）
      const mid = document.elementFromPoint(innerWidth / 2, innerHeight / 2);
      const el = all.filter(e => e.contains(mid)).pop() ?? all[all.length - 1];
      const max = el.scrollHeight - el.clientHeight;
      el.scrollTop = pos === 'top' ? 0 : pos === 'bottom' ? max : max * pos;
      return true;
    }, pos);
  }

  /** 1枚撮る。sub は小分けの名前（同じ場面で何枚か撮るとき） */
  async shot(sub = '', { settle = 350, note = '' } = {}) {
    if (settle) await this.wait(settle);
    this.seq++;
    // 場面の番号-場面名--場面の中の順番-小分け名（一覧で撮った順に並ぶ）
    const base = `${String(this.index + 1).padStart(2, '0')}-${this.scene.name}--${this.seq}${sub ? `-${sub}` : ''}.png`;
    const file = path.join(this.outDir, this.sizeName, base);
    await this.page.screenshot({ path: file });
    this.records.shots.push({ size: this.sizeName, scene: this.scene.name, sub, file, desc: this.scene.desc, note });
    return file;
  }

  // ----- 対局の舞台づくり -----

  /** 新しい対局を始める（設定画面を通さず、ストアの startGame を直に呼ぶ。Firebase には触らない） */
  async startGame({ mode = 'fishing', names = ['たろう', 'はなこ', 'じろう', 'さくら'], kinds = null, maxTurns = null } = {}) {
    const settings = {
      playerCount: names.length,
      playerNames: names,
      playerUids: names.map(() => null),
      maxTurns: maxTurns ?? (mode === 'city' ? 36 : 30),
      carryOver: false,
      mode,
      playerKinds: kinds ?? names.map(() => 'human'),
    };
    await this.page.evaluate(s => window.__tsuri.getState().startGame(s), settings);
    await this.page.waitForSelector('svg.map-svg', { timeout: 15000 });
    // 「〇〇の番」の帯が通りすぎ、カメラが駒へ寄るのを待つ
    await this.wait(2300);
  }

  /** 手番の人を好きなマスへ飛ばし、段階を指定する（省くと行動選択）。到着の演出は挟まない */
  warp(nodeId, phase = 'action_choice') {
    return this.store((s, [nodeId, phase]) => {
      s.getState().warpCurrentPlayerTo(nodeId);
      if (s.getState().players[s.getState().currentPlayerIndex].currentNode !== nodeId) throw new Error(`マス ${nodeId} が無い`);
      s.setState({ turnPhase: phase });
    }, [nodeId, phase]);
  }

  /** 手番の人を飛ばして、そのマスの処理（executeNodeAction）をすぐ実行する */
  warpAndAct(nodeId) {
    return this.store((s, nodeId) => {
      s.getState().warpCurrentPlayerTo(nodeId);
      s.getState().executeNodeAction();
      return s.getState().turnPhase;
    }, nodeId);
  }

  /** 出ているお知らせ（瓦版・貧乏神）と順番待ちを消す */
  clearNotices() { return this.set({ cityToast: null, cityBinboToast: null, noticeQueue: [] }); }

  /** 地図のズーム: all（日本全体）/ here（現在地）/ near（現在地に寄って最大の LOD まで拡大）/ in N / out N */
  async map(kind, n = 1) {
    if (kind === 'all') { await this.clickLabel('日本全体を表示'); await this.wait(800); }
    else if (kind === 'here') { await this.clickLabel('現在地へ'); await this.wait(800); }
    else if (kind === 'in') { for (let i = 0; i < n; i++) { await this.clickLabel('拡大'); await this.wait(350); } }
    else if (kind === 'out') { for (let i = 0; i < n; i++) { await this.clickLabel('縮小'); await this.wait(350); } }
    else if (kind === 'near') {
      // 現在地に寄せて、拡大できるところまで拡大する（スマホ幅は約1.8倍、PC 幅は2.6倍が上限）
      await this.clickLabel('現在地へ'); await this.wait(700);
      for (let i = 0; i < 5; i++) { await this.clickLabel('拡大'); await this.wait(330); }
    }
    await this.wait(300);
  }

  lod() { return this.page.evaluate(() => document.querySelector('svg.map-svg')?.getAttribute('data-lod') ?? null); }

  /**
   * 釣り旅: みんなに魚を釣らせておく（魚籠・図鑑・結果画面を埋める）。
   * startFishing で魚を決め、catchFish で釣果にする（ミニゲームは通さない）。
   */
  seedCatches(perPlayer = 12) {
    return this.store((s, perPlayer) => {
      const g = () => s.getState();
      const spots = ['hakodate', 'akita', 'choshi', 'numazu', 'fukui', 'toba', 'wakayama', 'shimanto', 'amakusa', 'yakushima', 'hamamatsu', 'aoshima'];
      const n = g().players.length;
      const keep = { idx: g().currentPlayerIndex, nodes: g().players.map(p => p.currentNode) };
      for (let pi = 0; pi < n; pi++) {
        s.setState({ currentPlayerIndex: pi });
        for (let i = 0; i < perPlayer; i++) {
          g().warpCurrentPlayerTo(spots[(i + pi * 3) % spots.length]);
          s.setState({ nodeActionsThisTurn: 0 }); // 1手番3回までの釣りの枠を戻す（枠が埋まると startFishing が始まらない）
          g().startFishing((i + pi) % 3 === 2); // 3回に1回は船釣り（レア以上）
          const f = g().fishingState?.targetFish;
          if (!f) continue;
          const p = g().players[pi];
          g().catchFish({ fishId: f.id, caughtAt: p.currentNode, turn: 1 + (i % 9), size: Math.round((0.6 + ((i * 37 + pi * 11) % 110) / 100) * 100) / 100 });
          s.setState({ fishingState: null });
        }
      }
      s.setState({
        currentPlayerIndex: keep.idx,
        players: g().players.map((p, i) => ({ ...p, currentNode: keep.nodes[i] })),
        turnPhase: 'idle', nodeActionsThisTurn: 0, fishingState: null,
      });
      return g().players.map(p => p.caughtFish.length);
    }, perPlayer);
  }

  /**
   * まちづくり: 町に建物を建て、月末処理を months 回まわして育てる。
   * 建てるのは cityBuild、育てるのは devCityCheat('simulate')（DevPanel の「月末処理」と同じ）。
   * density は建物のある町の割合（0〜1）。建てた町の6つに1つは1人で全区画（独占・町長）。
   * 鉄道と町長の機能があるビルドなら、線路も何本か敷く。
   */
  growCity({ months = 18, density = 0.55, specialties = true } = {}) {
    return this.store((s, { months, density, specialties }) => {
      const g = () => s.getState();
      const n = g().players.length;
      const fund = pi => { s.setState({ currentPlayerIndex: pi }); while (g().players[pi].money < 40000) g().devCityCheat('money'); };
      for (let pi = 0; pi < n; pi++) fund(pi);
      const towns = Object.keys(g().city.towns);
      const ORDER = ['res', 'com', 'res', 'park', 'ind', 'power', 'tourism', 'port'];
      let built = 0;
      let nth = 0;
      const monopolies = [];
      towns.forEach((id, ti) => {
        // 大きな町は必ず、ほかは density の割合で建てる
        const big = ['tokyo', 'osaka', 'nagoya', 'sendai', 'fukuoka', 'sapporo', 'kyoto', 'hiroshima'].includes(id);
        if (!big && ((ti * 37) % 100) / 100 >= density) return;
        nth++;
        const main = ti % n;
        const sub = (ti * 7 + 1) % n;
        const plots = g().city.towns[id].plots.length;
        const mono = !big && nth % 6 === 0;
        const fill = mono ? plots : Math.max(1, Math.ceil(plots * 0.65));
        for (let i = 0; i < fill; i++) {
          const owner = mono ? main : (i % 3 === 2 ? sub : main);
          fund(owner);
          g().warpCurrentPlayerTo(id);
          s.setState({ cityActionsThisTurn: 0, turnPhase: 'idle' });
          for (const k of [ORDER[(i + ti) % ORDER.length], ...ORDER]) {
            if (g().cityBuild(i, k) === null) { built++; break; }
          }
        }
        if (mono) monopolies.push(id);
      });
      // 名産: 北海道（札幌・釧路・函館）は1人目に集めて地方独占を作り、ほかは1つおきに配る
      let bought = 0;
      if (specialties) {
        towns.forEach((id, ti) => {
          const hokkaido = ['sapporo', 'kushiro', 'hakodate'].includes(id);
          if (!hokkaido && ti % 2 === 1) return;
          const owner = hokkaido ? 0 : ti % n;
          fund(owner);
          g().warpCurrentPlayerTo(id);
          s.setState({ cityActionsThisTurn: 0, turnPhase: 'city' });
          if (g().cityBuySpecialty() === null) bought++;
        });
      }
      // 鉄道（ある場合だけ）: 大きな町のまわりに、町ごとに違う人の線路を敷く
      let railTowns = 0;
      if (typeof g().cityLayRail === 'function') {
        ['tokyo', 'osaka', 'nagoya', 'sendai', 'fukuoka', 'hiroshima'].forEach((id, k) => {
          if (!g().city.towns[id]) return;
          s.setState({ currentPlayerIndex: k % n });
          g().warpCurrentPlayerTo(id);
          g().devCityCheat('rail');
          railTowns++;
        });
      }
      // 手持ちのお金を、ふつうの対局らしい額に戻してから月を進める
      s.setState({ players: g().players.map((p, i) => ({ ...p, money: [9000, 14000, 6000, 11000][i % 4] })) });
      for (let m = 0; m < months; m++) {
        g().devCityCheat('simulate');
        s.setState({ turn: g().turn + 1, turnPhase: 'idle', cityReport: null });
      }
      // 駒を見栄えのする場所へ戻す
      const home = ['tokyo', 'osaka', 'sendai', 'fukuoka'];
      s.setState({
        currentPlayerIndex: 0,
        players: g().players.map((p, i) => ({ ...p, currentNode: home[i % home.length] })),
        turnPhase: 'idle', cityActionsThisTurn: 0, cityBonusActions: 0, lastMove: null,
        cityToast: null, cityBinboToast: null, noticeQueue: [], cityBinboEvent: null, cityReport: null,
      });
      const count = Object.values(g().city.towns).reduce((a, tw) => a + tw.plots.filter(Boolean).length, 0);
      return { built, standing: count, bought, monopolies, railTowns, towns: towns.length, turn: g().turn, money: g().players.map(p => p.money) };
    }, { months, density, specialties });
  }
}

// ===== 場面 =====
// name は英小文字とハイフン。釣り旅は fishing- / fish-、まちづくりは city- で始める（--only の前方一致で絞れる）。

const SCENES = [
  // ---------- 共通 ----------
  {
    name: 'title', desc: 'タイトル画面',
    main: true,
    async run(t) {
      await t.wait(1900); // 筆文字・朱印・「新」の判子が出そろうまで
      await t.shot();
    },
  },
  {
    name: 'setup-fishing', desc: '設定画面（釣り旅）',
    main: true,
    async run(t) {
      if (!(await t.clickLabel('釣り旅であそぶ'))) t.skip('タイトルに「釣り旅であそぶ」が無い');
      await t.wait(700);
      await t.shot('1人');
      await t.clickText('4人');
      await t.wait(300);
      await t.shot('4人-上');
      await t.scroll('bottom');
      await t.shot('4人-下');
    },
  },
  {
    name: 'setup-city', desc: '設定画面（まちづくり）',
    main: true,
    async run(t) {
      if (!(await t.clickLabel('まちづくりであそぶ'))) t.skip('タイトルに「まちづくりであそぶ」が無い');
      await t.wait(700);
      await t.shot('1人');
      await t.clickText('3人');
      await t.wait(200);
      // 3人目を CPU にする（席の「人」の札を押すと CPU に切り替わる。文字が「人」だけのボタンのうち最後）
      const seats = await t.page.evaluate(() => {
        const strip = el => { const c = el.cloneNode(true); c.querySelectorAll('rt,rp').forEach(n => n.remove()); return (c.textContent ?? '').replace(/\s+/g, ''); };
        const btns = [...document.querySelectorAll('button')].filter(b => b.getClientRects().length > 0 && strip(b) === '人');
        btns.forEach((b, i) => b.setAttribute('data-shot-seat', String(i)));
        return btns.length;
      });
      if (seats > 0) await t.clickSel(`[data-shot-seat="${seats - 1}"]`);
      await t.wait(300);
      await t.shot('3人-上');
      await t.scroll('bottom');
      await t.shot('3人-下');
    },
  },
  {
    name: 'howto', desc: '遊び方の画面',
    async run(t) {
      if (!(await t.clickText('遊び方'))) t.skip('タイトルに「遊び方」が無い');
      await t.page.waitForSelector('[role="dialog"][aria-label="遊び方"]', { timeout: 8000 });
      await t.wait(1600);
      await t.shot('釣り旅-1');
      await t.clickLabel('3ページ目');
      await t.wait(1800);
      await t.shot('釣り旅-3');
      await t.clickSel('[role="tab"]', { nth: 1 });
      await t.wait(1800);
      await t.shot('まちづくり-1');
      await t.clickLabel('2ページ目');
      await t.wait(1800);
      await t.shot('まちづくり-2');
      await t.clickLabel('7ページ目');
      await t.wait(1800);
      await t.shot('まちづくり-7');
    },
  },
  {
    name: 'login', desc: 'ログイン画面',
    async run(t) {
      await t.act('setScreen', 'login');
      await t.wait(900);
      await t.shot();
    },
  },

  // ---------- 釣り旅 ----------
  {
    name: 'fishing-map', desc: '釣り旅の地図',
    main: true,
    async run(t) {
      await t.startGame({ mode: 'fishing' });
      await t.shot('はじめ', { note: '対局のはじめ。駒へ寄った既定の見え方' });
      await t.map('all');
      await t.shot('全体');
      // 駒を本州にばらして、にぎやかな所を撮る
      await t.store(s => {
        const at = ['tokyo', 'nagoya', 'kanazawa', 'sendai'];
        s.setState({ players: s.getState().players.map((p, i) => ({ ...p, currentNode: at[i] ?? p.currentNode })) });
      });
      await t.map('here');
      await t.shot('中');
      await t.map('near');
      await t.shot('寄り');
    },
  },
  {
    name: 'fishing-turn-banner', desc: '手番の帯（〇〇の番）',
    async run(t) {
      await t.startGame({ mode: 'fishing' });
      await t.set({ currentPlayerIndex: 1, turn: 2 });
      await t.wait(420);
      await t.shot('', { settle: 0 });
    },
  },
  {
    name: 'fishing-dice', desc: 'サイコロ演出',
    main: true,
    async run(t) {
      await t.startGame({ mode: 'fishing' });
      await t.act('setTurnPhase', 'roulette');
      await t.wait(750);
      await t.shot('転がり中', { settle: 0 });
      await t.page.waitForSelector('.fx-rays', { timeout: 6000 }).catch(() => {});
      await t.wait(380);
      await t.shot('出目', { settle: 0 });
    },
  },
  {
    name: 'fishing-fork', desc: '分かれ道（行き先えらび）',
    main: true,
    async run(t) {
      await t.startGame({ mode: 'fishing' });
      const found = await t.store(s => {
        const g = () => s.getState();
        for (const from of ['sendai', 'tokyo', 'nagoya', 'osaka', 'kanazawa', 'hiroshima', 'fukuoka', 'sapporo']) {
          for (const n of [6, 5, 4]) {
            g().warpCurrentPlayerTo(from);
            s.setState({ turnPhase: 'idle', lastMove: null });
            g().rollDice(n);
            if (g().turnPhase === 'path_selection' && g().reachableNodes.length >= 3) return { from, n, paths: g().reachableNodes.length };
          }
        }
        return null;
      });
      if (!found) t.skip('3つ以上に分かれるマスが見つからなかった');
      await t.wait(1500);
      await t.shot('地図', { note: `${found.from} から ${found.n} マス・${found.paths} 通り` });
      await t.clickSel('[data-guide="path-list"]');
      await t.wait(400);
      await t.shot('一覧');
      // 1つ選んで、駒が進むところと到着の巻物（1マス 190ms で進み、着いてから 900ms でマスの処理に入る）
      await t.clickSel('[data-guide="path-list"]');
      const t0 = Date.now();
      await t.act('selectPath', 0);
      await t.wait(330);
      await t.shot('移動中', { settle: 0 });
      await t.wait(Math.max(0, found.n * 190 + 330 - (Date.now() - t0)));
      await t.shot('到着', { settle: 0 });
    },
  },
  {
    name: 'fishing-choice', desc: '釣り方を選ぶ画面（釣り場の札・仕掛け・船釣り）',
    async run(t) {
      await t.startGame({ mode: 'fishing' });
      await t.store(s => s.setState({ players: s.getState().players.map(p => ({ ...p, money: 24000 })) }));
      await t.warp('choshi', 'fishing_choice');
      await t.wait(800);
      await t.shot('上');
      if (await t.scroll('bottom')) await t.shot('下');
    },
  },
  {
    name: 'fish-cast-wait-strike', desc: '釣り: 投げる → 待つ → 当たり → 合わせ',
    async run(t) {
      await t.startGame({ mode: 'fishing', names: ['たろう'] });
      await t.warp('hakodate', 'fishing_choice');
      await t.act('startFishing', false);
      await t.wait(650);
      await t.shot('投げる', { settle: 0 });
      await t.wait(1500);
      await t.shot('待つ', { settle: 0 });
      // 当たりを起こす（ストアの hasBite。本来は時間で来る）。輪が縮みきるまでの時間はレア度で決まる
      const period = await t.store(s => ({ common: 2000, uncommon: 1900, rare: 1800, legendary: 1700, mythical: 1600 })[s.getState().fishingState.targetFish.rarity] ?? 2000);
      const t0 = Date.now();
      await t.act('updateFishingState', { hasBite: true });
      await t.wait(period * 0.28);
      await t.shot('当たり', { settle: 0 });
      // 輪が金の帯に重なる真ん中（周期の半分）で合わせる
      await t.wait(Math.max(0, period * 0.5 - (Date.now() - t0) - 30));
      await t.tap(0.5, 0.62);
      await t.wait(420);
      await t.shot('合わせ', { settle: 0 });
      // そのまま、くじで決まったミニゲームの説明まで
      await t.wait(1500);
      await t.shot('合わせの後', { settle: 0 });
    },
  },
  {
    name: 'fish-strike-miss', desc: '釣り: 合わせの失敗（早すぎ）',
    async run(t) {
      await t.startGame({ mode: 'fishing', names: ['たろう'] });
      await t.warp('hakodate', 'fishing_choice');
      await t.act('startFishing', false);
      await t.wait(1750);
      await t.act('updateFishingState', { hasBite: true });
      await t.wait(200);
      await t.tap(0.5, 0.62);
      await t.wait(500);
      await t.shot('', { settle: 0 });
    },
  },
  ...['reeling', 'target', 'reaction', 'rhythm'].map(game => ({
    name: `fish-mini-${game}`, desc: `釣りのミニゲーム（${{ reeling: 'やり取り・リーリング', target: '的当て', reaction: '早合わせ', rhythm: 'リズム' }[game]}）`,
    main: game === 'reeling',
    async run(t) {
      await t.startGame({ mode: 'fishing', names: ['たろう'] });
      await t.warp('choshi', 'fishing_choice');
      await t.act('startFishing', false);
      await t.wait(1700); // 投げ終わって「待つ」に入るまで
      await t.act('updateFishingState', { phase: 'reeling', miniGame: game, strikeSuccess: true });
      await t.wait(900);
      await t.shot('説明', { settle: 0 });
      await t.wait(1700);
      if (game === 'reeling') {
        // 長押しで巻く: 押しっぱなしにして、糸の張りと寄せが動いたところを撮る
        await t.press(0.5, 0.7);
        await t.wait(1300);
        await t.shot('巻いている', { settle: 0 });
        await t.wait(1500);
        await t.shot('巻きつづける', { settle: 0 });
        await t.release();
        await t.wait(700);
        await t.shot('休む', { settle: 0 });
      } else {
        // 少し遊んでから撮る（真ん中あたりを何度か押す）
        for (let i = 0; i < 6; i++) { await t.tap(0.5, 0.66); await t.wait(160); }
        await t.shot('遊び中', { settle: 0 });
        for (let i = 0; i < 8; i++) { await t.tap(0.5, 0.66); await t.wait(170); }
        await t.shot('遊び中2', { settle: 0 });
      }
    },
  })),
  {
    name: 'fish-caught', desc: '釣果のモーダル',
    main: true,
    async run(t) {
      await t.startGame({ mode: 'fishing', names: ['たろう'] });
      await t.warp('hakodate', 'fishing_choice');
      // 魚を決めて釣りを始める（wantRare なら船釣りで何度か引き直して、いちばん珍しい魚にする）
      const begin = (boat, wantRare) => t.store((s, [boat, wantRare]) => {
        const g = () => s.getState();
        const rank = { common: 0, uncommon: 1, rare: 2, legendary: 3, mythical: 4 };
        let best = null;
        s.setState({ nodeActionsThisTurn: 0 });
        for (let i = 0; i < (wantRare ? 250 : 1); i++) {
          g().startFishing(boat);
          const f = g().fishingState?.targetFish;
          if (!f) throw new Error('startFishing で釣りが始まらなかった');
          if (!best || rank[f.rarity] > rank[best.rarity]) best = f;
          if (rank[best.rarity] >= 3) break;
        }
        g().updateFishingState({ targetFish: best });
        return { name: best.name, rarity: best.rarity };
      }, [boat, wantRare]);
      // 釣り上げたことにする（投げる演出のタイマーが「待つ」に戻すので、それが済んでから呼ぶ）
      const land = (size, bonus) => t.store((s, [size, bonus]) => {
        const g = () => s.getState();
        const f = g().fishingState.targetFish;
        const p = g().players[g().currentPlayerIndex];
        const c = { fishId: f.id, caughtAt: p.currentNode, turn: g().turn, size };
        g().updateFishingState({ caughtSize: size });
        g().catchFish(c, bonus ? [{ ...c, size: 0.9 }, { ...c, size: 1.1 }] : undefined);
      }, [size, bonus]);

      const a = await begin(false, false);
      await t.wait(1750);
      await land(1.12, false);
      await t.wait(700);
      await t.shot('ふつう-出はじめ', { settle: 0, note: `${a.name}（${a.rarity}）` });
      await t.wait(1600);
      await t.shot('ふつう', { note: `${a.name}（${a.rarity}）` });
      await t.act('endFishing');
      await t.wait(300);

      const b = await begin(true, true);
      await t.wait(1750);
      await land(1.72, true);
      await t.wait(2600);
      await t.shot('大物と大漁', { note: `${b.name}（${b.rarity}）・サイズ1.72・大漁2匹` });
      await t.scroll('bottom');
      await t.shot('大物と大漁-下');
      await t.act('endFishing');
      await t.wait(300);

      await t.set({ nodeActionsThisTurn: 0 });
      await t.act('startFishing', false);
      await t.wait(1750);
      await t.act('failFishing');
      await t.wait(1500);
      await t.shot('逃げられた');
    },
  },
  {
    name: 'fishing-action-choice', desc: '釣りのあとの行動選択（もう一度釣る / 終了）',
    async run(t) {
      await t.startGame({ mode: 'fishing' });
      await t.warp('hakodate', 'action_choice');
      await t.set({ nodeActionsThisTurn: 1 });
      await t.wait(1000);
      await t.shot();
    },
  },
  {
    name: 'fishing-shop', desc: '釣具店',
    async run(t) {
      await t.startGame({ mode: 'fishing' });
      await t.store(s => s.setState({ players: s.getState().players.map(p => ({ ...p, money: 28000 })) }));
      const phase = await t.warpAndAct('okayama');
      if (phase !== 'shop') t.skip(`岡山で店が開かなかった（${phase}）`);
      await t.wait(900);
      await t.shot('上');
      await t.scroll('bottom');
      await t.shot('下');
    },
  },
  {
    name: 'fishing-event', desc: 'イベント札',
    async run(t) {
      await t.startGame({ mode: 'fishing' });
      for (const [node, label] of [['fukushima', '吉'], ['tottori', '凶'], ['nikko', '籤']]) {
        const phase = await t.warpAndAct(node);
        if (phase !== 'event') continue;
        await t.wait(180);
        await t.shot(`${label}-伏せた札`, { settle: 0 });
        // 伏せた札は押してめくる（しばらく待つとひとりでにめくれる場合もある）
        await t.clickLabel('札をめくる');
        await t.wait(1300);
        await t.shot(`${label}-めくった`);
        if ((await t.clickText('イベント発動')) || (await t.clickText('ファイト開始'))) {
          await t.wait(1500);
          await t.shot(`${label}-発動`);
        }
        await t.set({ currentEvent: null, turnPhase: 'idle' });
        await t.wait(400);
      }
    },
  },
  {
    name: 'fishing-capital', desc: '県庁の祭り',
    async run(t) {
      await t.startGame({ mode: 'fishing' });
      await t.store(s => s.setState({ players: s.getState().players.map(p => ({ ...p, money: 20000 })) }));
      const phase = await t.warpAndAct('sendai');
      if (phase !== 'capital_event') t.skip(`仙台で祭りが開かなかった（${phase}）`);
      await t.wait(1200);
      await t.shot('選ぶ');
      await t.scroll('bottom');
      await t.shot('選ぶ-下');
      await t.clickSel('[data-guide="festival"] button', { nth: 0 });
      await t.wait(1500);
      await t.shot('結果');
    },
  },
  {
    name: 'fishing-rest', desc: '休憩所（温泉）',
    async run(t) {
      await t.startGame({ mode: 'fishing' });
      const phase = await t.warpAndAct('beppu');
      if (phase !== 'rest') t.skip(`別府で休憩所が開かなかった（${phase}）`);
      await t.wait(1000);
      await t.shot();
    },
  },
  {
    name: 'fishing-inventory', desc: '道具箱',
    async run(t) {
      await t.startGame({ mode: 'fishing' });
      if (!(await t.clickLabel('道具箱を開く'))) t.skip('道具箱のボタンが無い');
      await t.wait(800);
      await t.shot();
    },
  },
  {
    name: 'fishing-creel', desc: '釣果バッグ（魚籠）',
    async run(t) {
      await t.startGame({ mode: 'fishing' });
      await t.seedCatches(14);
      if (!(await t.clickLabel('魚籠を開く'))) t.skip('魚籠のボタンが無い');
      await t.wait(900);
      await t.shot('上');
      await t.scroll('bottom');
      await t.shot('下');
      if (await t.clickText('みんな')) {
        await t.wait(700);
        await t.scroll('top');
        await t.shot('みんな');
      }
    },
  },
  {
    name: 'fishing-encyclopedia', desc: '図鑑の一覧と魚の詳細',
    async run(t) {
      await t.startGame({ mode: 'fishing' });
      await t.seedCatches(30);
      if (!(await t.clickLabel('魚図鑑を開く'))) t.skip('図鑑のボタンが無い');
      await t.wait(1000);
      await t.shot('一覧-上');
      await t.scroll(0.45);
      await t.shot('一覧-中');
      // 釣った魚のカードを1枚開く
      const fishId = await t.store(s => { const st = s.getState(); return Object.keys(st.encyclopedias[st.currentPlayerIndex])[0] ?? null; });
      await t.scroll('top');
      const opened = await t.page.evaluate(() => {
        // 釣った魚の札は data-fish-card="caught"。付いていない古いビルドでは、5列の一覧から「???」でない札を探す
        const hit = document.querySelector('[data-fish-card="caught"]')
          ?? [...document.querySelectorAll('.grid.grid-cols-5 > *')].find(c => !/[？?]/.test(c.textContent ?? '') && c.querySelector('svg'));
        if (!hit) return false;
        document.querySelectorAll('[data-shot-target]').forEach(e => e.removeAttribute('data-shot-target'));
        hit.setAttribute('data-shot-target', '1');
        return true;
      });
      if (opened) {
        await t.page.locator('[data-shot-target="1"]').first().click({ timeout: 3000 }).catch(() => {});
        await t.wait(900);
        await t.shot('詳細', { note: fishId ?? '' });
      }
    },
  },
  {
    name: 'fishing-goal', desc: 'ゴールの祝い',
    async run(t) {
      await t.startGame({ mode: 'fishing' });
      await t.warpAndAct('goal');
      await t.wait(1500);
      await t.shot('', { settle: 0 });
    },
  },
  {
    name: 'fishing-result', desc: '結果画面（釣り旅）',
    main: true,
    async run(t) {
      await t.startGame({ mode: 'fishing' });
      await t.seedCatches(16);
      await t.store(s => {
        const ps = s.getState().players.map((p, i) => ({ ...p, hasFinished: i < 2, finishOrder: i < 2 ? i : null, money: 4000 + i * 3700 }));
        s.setState({ players: ps });
        s.getState().endGame();
      });
      await t.wait(3200);
      await t.shot('上');
      await t.scroll(0.5);
      await t.shot('中');
      await t.scroll('bottom');
      await t.shot('下');
    },
  },
  {
    name: 'fishing-node-info', desc: 'マスの情報（地図のマスをタップ）',
    async run(t) {
      await t.startGame({ mode: 'fishing' });
      await t.warp('tokyo', 'idle');
      await t.map('here');
      await t.wait(1400);
      if (!(await t.clickSel('[data-node-id="choshi"]', { force: true }))) t.skip('地図に銚子のマスが無い');
      await t.wait(700);
      await t.shot();
    },
  },
  {
    name: 'guide-fishing', desc: '案内（モーションガイド）: 釣り旅のはじめ',
    guide: true,
    async run(t) {
      await t.startGame({ mode: 'fishing', names: ['たろう'] });
      await t.wait(1600);
      await t.shot('サイコロ');
    },
  },

  // ---------- まちづくり ----------
  {
    name: 'city-map-start', desc: 'まちづくりの地図（はじめ・建物なし）',
    async run(t) {
      await t.startGame({ mode: 'city' });
      await t.shot('はじめ');
      await t.map('all');
      await t.shot('全体');
    },
  },
  {
    name: 'city-map-grown', desc: 'まちづくりの地図（建物が育った状態・中盤）',
    main: true,
    async run(t) {
      await t.startGame({ mode: 'city' });
      const r = await t.growCity({ months: 20 });
      await t.wait(1900);
      await t.map('all');
      await t.shot('引き', { note: `建っている建物${r.standing}・名産${r.bought}・${r.turn}巡目` });
      await t.map('here');
      await t.shot('中-東京');
      await t.map('near');
      await t.shot('寄り-東京');
      await t.set({ currentPlayerIndex: 1 });
      await t.wait(1900);
      await t.map('here');
      await t.shot('中-大阪');
      await t.map('near');
      await t.shot('寄り-大阪');
      await t.store(s => s.setState({ players: s.getState().players.map((p, i) => (i === 1 ? { ...p, currentNode: 'sapporo' } : p)) }));
      await t.map('here');
      await t.wait(600);
      await t.shot('中-北海道');
      await t.map('near');
      await t.shot('寄り-札幌');
    },
  },
  {
    name: 'city-map-dense', desc: 'まちづくりの地図（終盤・ほとんどの町に建物）',
    async run(t) {
      await t.startGame({ mode: 'city' });
      const r = await t.growCity({ months: 32, density: 0.92 });
      await t.wait(1900);
      await t.map('all');
      await t.shot('引き', { note: `建っている建物${r.standing}・${r.turn}巡目` });
      await t.map('here');
      await t.shot('中-東京');
      await t.map('near');
      await t.shot('寄り-東京');
      await t.set({ currentPlayerIndex: 3 });
      await t.wait(1900);
      await t.map('here');
      await t.shot('中-九州');
      await t.map('near');
      await t.shot('寄り-福岡');
    },
  },
  {
    name: 'city-town-empty', desc: '町の画面（空き地だけ）',
    async run(t) {
      await t.startGame({ mode: 'city' });
      await t.warp('niigata', 'city');
      await t.wait(1000);
      await t.shot('上');
      await t.clickSel('[data-guide="plot-empty"]', { nth: 0 });
      await t.wait(700);
      await t.shot('建てる物を選ぶ');
      await t.scroll('bottom');
      await t.shot('下');
    },
  },
  {
    name: 'city-town-built', desc: '町の画面（建物あり）',
    main: true,
    async run(t) {
      await t.startGame({ mode: 'city' });
      await t.growCity({ months: 20 });
      // 2人以上の建物が混ざっている町を探す
      const town = await t.store(s => {
        const st = s.getState();
        const mixed = Object.entries(st.city.towns).filter(([, tw]) => {
          const owners = new Set(tw.plots.filter(Boolean).map(p => p.owner));
          return owners.size >= 2 && owners.has(0) && tw.plots.length >= 5;
        }).sort((a, b) => b[1].plots.length - a[1].plots.length);
        return mixed[0]?.[0] ?? null;
      });
      await t.warp(town ?? 'tokyo', 'city');
      await t.wait(1100);
      await t.shot('上', { note: town ?? 'tokyo' });
      // 自分の建物を選ぶ（再開発）→ 他人の建物を選ぶ（買収）
      const pick = who => t.page.evaluate(who => {
        const st = window.__tsuri.getState();
        const plots = st.city.towns[st.players[st.currentPlayerIndex].currentNode].plots;
        const i = plots.findIndex(p => p && (who === 'mine' ? p.owner === st.currentPlayerIndex : p.owner !== st.currentPlayerIndex));
        const btn = document.querySelectorAll('[data-guide="plots"] > button')[i];
        if (!btn) return false;
        btn.click();
        return true;
      }, who);
      if (await pick('mine')) { await t.wait(700); await t.shot('自分の建物'); }
      if (await pick('other')) { await t.wait(700); await t.shot('他人の建物'); }
      await t.scroll('bottom');
      await t.shot('下');
    },
  },
  {
    name: 'city-town-monopoly', desc: '町の画面（独占）',
    async run(t) {
      await t.startGame({ mode: 'city' });
      const r = await t.growCity({ months: 20 });
      const town = await t.store((s, list) => {
        const st = s.getState();
        // 育てたあとも1人で持っている町
        return list.find(id => {
          const ps = st.city.towns[id].plots.filter(Boolean);
          return ps.length >= 3 && new Set(ps.map(p => p.owner)).size === 1;
        }) ?? null;
      }, r.monopolies);
      if (!town) t.skip('独占の町を作れなかった');
      const owner = await t.store((s, id) => s.getState().city.towns[id].plots.find(Boolean).owner, town);
      await t.set({ currentPlayerIndex: owner });
      await t.warp(town, 'city');
      await t.wait(1100);
      await t.shot('上', { note: town });
      await t.scroll('bottom');
      await t.shot('下');
    },
  },
  {
    name: 'city-cards', desc: 'カードの手札と売り場',
    async run(t) {
      await t.startGame({ mode: 'city' });
      await t.act('devCityCheat', 'cards');
      await t.act('devCityCheat', 'money');
      await t.wait(600);
      await t.shot('手札（振る前）');
      await t.clickSel('[data-guide="hand"] [role="listitem"], [data-guide="hand"] button', { nth: 0 });
      await t.wait(700);
      await t.shot('手札-1枚選ぶ');
      await t.warp('tokyo', 'city');
      await t.wait(1000);
      await t.scroll('bottom');
      await t.shot('町で使える札');
      if (await t.clickText('カード売り場')) {
        await t.wait(900);
        await t.shot('売り場');
      }
    },
  },
  {
    name: 'city-specialty', desc: '名産',
    async run(t) {
      await t.startGame({ mode: 'city' });
      await t.act('devCityCheat', 'money');
      await t.warp('sendai', 'city');
      await t.wait(1100);
      await t.shot('買う前');
      const err = await t.act('cityBuySpecialty');
      await t.wait(1200);
      await t.shot('買った後', { note: err ?? '' });
      await t.clearNotices();
      await t.warp('sendai', 'idle');
      await t.wait(1700);
      await t.map('near');
      await t.shot('地図の印');
    },
  },
  {
    name: 'city-mayor', desc: '町長と条例（機能のあるビルドだけ）',
    main: true,
    async run(t) {
      await t.startGame({ mode: 'city' });
      if (!(await t.hasAction('cityEnact'))) t.skip('このビルドのストアに cityEnact（条例）が無い');
      await t.act('devCityCheat', 'money');
      await t.warp('niigata', 'city');
      await t.act('devCityCheat', 'mayor'); // 今いる町の空き区画を自分の住宅で埋めて町長になる
      await t.wait(1100);
      await t.shot('町の画面-上');
      if (!(await t.reveal('[data-guide="mayor"]'))) t.skip('町の画面に町長の欄（data-guide="mayor"）が無い');
      await t.shot('町長の欄');
      if (await t.clickSel('[data-guide="enact-open"]')) {
        await t.wait(600);
        await t.reveal('[data-guide="ordinance-options"]');
        await t.shot('条例を選ぶ');
        await t.clickSel('[data-guide="ordinance-options"] button', { nth: 0 });
        await t.wait(1400);
        await t.reveal('[data-guide="mayor"]');
        await t.shot('条例を決めた後');
      }
      await t.clearNotices();
      await t.warp('niigata', 'idle');
      await t.wait(1700);
      await t.map('near');
      await t.shot('地図の町長の印');
    },
  },
  {
    name: 'city-rail', desc: '鉄道（機能のあるビルドだけ）',
    async run(t) {
      await t.startGame({ mode: 'city' });
      if (!(await t.hasAction('cityLayRail'))) t.skip('このビルドのストアに cityLayRail（鉄道）が無い');
      await t.act('devCityCheat', 'money');
      await t.warp('tokyo', 'city');
      await t.wait(1000);
      if (await t.reveal('[data-guide="rail-build"]')) {
        await t.shot('町の画面-線路の欄');
        // 欄を開いて（折りたたみ）、行き先の一覧 → 1本敷く
        await t.clickSel('[data-guide="rail-build"] button', { nth: 0 });
        await t.wait(700);
        await t.reveal('[data-guide="rail-build"]');
        await t.shot('町の画面-行き先の一覧');
        // 自分の建物がある町でだけ敷けるので、先に1軒建てておく
        await t.store(s => { for (const k of ['res', 'com', 'park']) if (s.getState().cityBuild(0, k) === null) break; s.setState({ cityActionsThisTurn: 0 }); });
        if (await t.clickText('敷く', { within: '[data-guide="rail-build"]' })) {
          await t.wait(1300);
          await t.reveal('[data-guide="rail-build"]');
          await t.shot('町の画面-敷いた後');
        }
      }
      await t.clearNotices();
      // 東京と名古屋・大阪のまわりに線路を敷いて、地図で見る
      await t.store(s => {
        const g = () => s.getState();
        ['tokyo', 'nagoya', 'osaka', 'sendai'].forEach((id, k) => {
          s.setState({ currentPlayerIndex: k % g().players.length });
          g().warpCurrentPlayerTo(id);
          g().devCityCheat('rail');
        });
        s.setState({ currentPlayerIndex: 0, turnPhase: 'idle', cityToast: null, noticeQueue: [] });
        g().warpCurrentPlayerTo('tokyo');
        s.setState({ turnPhase: 'idle' });
      });
      await t.wait(1900);
      await t.map('here');
      await t.shot('地図-中');
      await t.map('near');
      await t.shot('地図-寄り');
    },
  },
  {
    name: 'city-recovery', desc: '災害の札 → 復興特需（町の画面の札・割引き・地図の木槌）',
    async run(t) {
      await t.startGame({ mode: 'city' });
      await t.growCity({ months: 6 });
      await t.warp('tokyo', 'idle');
      await t.act('devCityCheat', 'quake');
      await t.wait(900);
      await t.shot('災害の札-伏せた札');
      if (!(await t.clickText('カードをめくる'))) await t.clickSel('[data-guide="city-event"] button', { nth: 0 });
      await t.wait(1900);
      await t.shot('災害の札-被害');
      await t.act('acknowledgeCityEvent');
      await t.clearNotices();
      // 復興特需になった町（recovery が残っている町）を探す。空き区画のある町を優先する
      const town = await t.store(s => {
        const towns = Object.entries(s.getState().city.towns).filter(([, tw]) => (tw.recovery ?? 0) > 0);
        const withEmpty = towns.find(([, tw]) => tw.plots.some(p => !p));
        return (withEmpty ?? towns[0])?.[0] ?? null;
      });
      if (!town) t.skip('地震のあと、復興特需の町ができなかった（このビルドに復興特需が無いか、被害が出なかった）');
      await t.act('devCityCheat', 'money');
      await t.warp(town, 'city');
      await t.wait(1100);
      await t.shot('町の画面-復興特需の札', { note: town });
      if (await t.clickSel('[data-guide="plot-empty"]', { nth: 0 })) {
        await t.wait(700);
        await t.shot('町の画面-割引きの値段');
      }
      await t.warp(town, 'idle');
      await t.wait(1800);
      await t.map('here');
      await t.shot('地図の木槌-中');
      await t.map('near');
      await t.shot('地図の木槌-寄り');
    },
  },
  {
    name: 'city-report', desc: '月末の決算',
    main: true,
    async run(t) {
      await t.startGame({ mode: 'city' });
      await t.growCity({ months: 14 });
      await t.act('devCityCheat', 'simulate');
      await t.wait(2200);
      await t.shot('上');
      await t.scroll('bottom');
      await t.shot('下');
    },
  },
  {
    name: 'city-yearend', desc: '年度末の大決算',
    main: true,
    async run(t) {
      await t.startGame({ mode: 'city' });
      await t.growCity({ months: 11 });
      await t.act('devCityCheat', 'yearend');
      await t.wait(1200);
      await t.shot('途中', { settle: 0 });
      await t.wait(3500);
      await t.shot('上');
      await t.scroll('bottom');
      await t.shot('下');
    },
  },
  {
    name: 'city-binbo', desc: '貧乏神（地図の人形・寸劇・お知らせ）',
    async run(t) {
      await t.startGame({ mode: 'city' });
      await t.growCity({ months: 8 });
      await t.act('devCityCheat', 'binbo');
      await t.wait(1900);
      await t.map('near');
      await t.shot('地図の人形');
      await t.act('devCityCheat', 'binboAct');
      await t.wait(600);
      await t.shot('寸劇-企み', { settle: 0 });
      await t.wait(2400);
      await t.shot('寸劇-悪さ');
      await t.act('acknowledgeBinboEvent');
      // 大貧乏神
      await t.store(s => s.setState({ city: { ...s.getState().city, binbo: { playerIndex: s.getState().currentPlayerIndex, months: 13 } } }));
      await t.wait(900);
      await t.shot('地図の人形-大貧乏神');
      await t.act('devCityCheat', 'binboAct');
      await t.wait(3000);
      await t.shot('寸劇-大貧乏神');
    },
  },
  {
    name: 'city-destination', desc: '目的地に一番乗り（旗・瓦版・貧乏神がとりつく）',
    async run(t) {
      await t.startGame({ mode: 'city' });
      await t.map('all');
      await t.shot('目的地の旗-引き');
      await t.clickLabel('目的地を見る');
      await t.wait(1100);
      await t.shot('目的地の旗-寄り');
      await t.act('devCityCheat', 'dest');
      await t.wait(500);
      await t.shot('到着の巻物', { settle: 0 });
      await t.wait(1100);
      await t.shot('瓦版-一番乗り', { settle: 0 });
      await t.wait(2600);
      await t.shot('瓦版-つづき');
      await t.wait(3600);
      await t.shot('お知らせの後');
    },
  },
  {
    name: 'city-event', desc: 'まちの出来事（災害・良い出来事）',
    async run(t) {
      await t.startGame({ mode: 'city' });
      await t.growCity({ months: 10 });
      for (const [kind, label] of [['quake', '地震'], ['kaiju', '大王イカ']]) {
        await t.warp('tokyo', 'idle');
        await t.act('devCityCheat', kind);
        await t.wait(900);
        if (label === '地震') await t.shot(`${label}-裏`);
        if (!(await t.clickText('カードをめくる'))) await t.clickSel('[data-guide="city-event"] button', { nth: 0 });
        await t.wait(1900);
        await t.shot(`${label}-表`);
        await t.act('acknowledgeCityEvent');
        await t.set({ turnPhase: 'idle' });
        await t.wait(400);
      }
      await t.clearNotices();
      await t.map('here');
      await t.shot('災害の後の地図');
      const phase = await t.warpAndAct('nara');
      if (phase === 'city_event') {
        await t.wait(900);
        if (!(await t.clickText('カードをめくる'))) await t.clickSel('[data-guide="city-event"] button', { nth: 0 });
        await t.wait(1700);
        await t.shot('良い出来事-表');
      }
    },
  },
  {
    name: 'city-datamap', desc: 'データマップ各種',
    async run(t) {
      await t.startGame({ mode: 'city' });
      await t.growCity({ months: 20 });
      await t.wait(1900);
      await t.map('here');
      await t.map('out', 1);
      for (let i = 0; i < 10; i++) {
        if (!(await t.clickLabel('データマップ切替'))) t.skip('データマップのボタンが無い');
        await t.wait(700);
        const label = await t.page.evaluate(() => {
          const btn = document.querySelector('[aria-label^="データマップ切替"]');
          const chip = btn?.parentElement?.querySelector('span');
          if (!chip) return null;
          const c = chip.cloneNode(true);
          c.querySelectorAll('rt,rp').forEach(n => n.remove());
          return c.textContent.trim();
        });
        if (!label) break;
        await t.shot(`${i + 1}-${label}`);
      }
      // 全体でも1枚（人口）
      await t.clickLabel('データマップ切替');
      await t.map('all');
      await t.shot('全体-人口');
    },
  },
  {
    name: 'city-cpu-turn', desc: 'CPU の手番（まちづくり）',
    async run(t) {
      await t.startGame({ mode: 'city', names: ['たろう', '', ''], kinds: ['human', 'cpu', 'cpu'] });
      await t.growCity({ months: 6 });
      await t.set({ currentPlayerIndex: 1, turnPhase: 'idle' });
      await t.wait(900);
      await t.shot('1', { settle: 0 });
      await t.wait(2200);
      await t.shot('2', { settle: 0 });
      await t.wait(2600);
      await t.shot('3', { settle: 0 });
    },
  },
  {
    name: 'city-result', desc: '結果画面（まちづくり）',
    main: true,
    async run(t) {
      await t.startGame({ mode: 'city' });
      await t.growCity({ months: 24 });
      // 年度末の称号を2年ぶん記録してから終える
      await t.store(s => {
        const g = () => s.getState();
        g().devCityCheat('yearend');
        const ye = g().cityYearEnd;
        if (ye?.titles) s.setState({ cityTitleHistory: [{ year: 1, titles: ye.titles }, { year: 2, titles: ye.titles }] });
        s.setState({ cityYearEnd: null, turnPhase: 'idle' });
        g().endGame();
      });
      await t.wait(3200);
      await t.shot('上');
      await t.scroll(0.5);
      await t.shot('中');
      await t.scroll('bottom');
      await t.shot('下');
    },
  },
  {
    name: 'guide-city', desc: '案内（モーションガイド）: まちづくりのはじめと町の画面',
    guide: true,
    async run(t) {
      await t.startGame({ mode: 'city', names: ['たろう', 'はなこ'] });
      await t.wait(1600);
      await t.shot('はじめ');
      await t.warp('niigata', 'city');
      await t.wait(2200);
      await t.shot('町の画面');
    },
  },
];

// ===== 実行 =====

function pickScenes(only) {
  if (!only) return SCENES.map((s, i) => ({ s, i }));
  const picked = SCENES.map((s, i) => ({ s, i })).filter(({ s }) => only.some(o => s.name === o || s.name.startsWith(o)));
  const unknown = only.filter(o => !SCENES.some(s => s.name === o || s.name.startsWith(o)));
  if (unknown.length) throw new Error(`知らない場面: ${unknown.join(', ')}（--list で一覧）`);
  return picked;
}

async function runSize(browser, sizeName, scenes, args, records) {
  for (const { s: scene, i: index } of scenes) {
    const context = await browser.newContext({ ...SIZES[sizeName], locale: 'ja-JP', timezoneId: 'Asia/Tokyo' });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(String(e.message ?? e).slice(0, 300)));
    const t = new Toolkit({ page, sizeName, outDir: args.out, scene, index, args, records });
    const started = Date.now();
    // この場面の前回の絵を消す（このスクリプトが付けた「番号-場面名--…png」だけ。場面を足して番号がずれた古い絵も消す）
    const own = new RegExp(`^\\d+-${scene.name}--.*\\.png$`);
    const dir = path.join(args.out, sizeName);
    for (const f of await readdir(dir).catch(() => [])) {
      if (own.test(f)) await unlink(path.join(dir, f)).catch(() => {});
    }
    try {
      await t.boot({ guide: !!scene.guide });
      await scene.run(t);
      const n = t.seq;
      console.log(`  [${sizeName}] ${scene.name}: ${n}枚 (${((Date.now() - started) / 1000).toFixed(1)}s)${errors.length ? `  ※ページのエラー ${errors.length}件` : ''}`);
    } catch (e) {
      const reason = e instanceof Skip ? e.message : `失敗: ${String(e.message ?? e).split('\n')[0].slice(0, 240)}`;
      records.skipped.push({ size: sizeName, scene: scene.name, reason });
      console.log(`  [${sizeName}] ${scene.name}: 飛ばした — ${reason}`);
      if (!(e instanceof Skip)) await t.shot('失敗時', { settle: 0 }).catch(() => {});
    }
    if (errors.length) records.pageErrors.push({ size: sizeName, scene: scene.name, errors: [...new Set(errors)].slice(0, 5) });
    await context.close();
  }
}

/** 撮った絵を何枚かずつ1枚に並べる（ざっと見渡す用） */
async function buildSheets(browser, args, sizeNames) {
  const dir = path.join(args.out, 'sheets');
  await mkdir(dir, { recursive: true });
  // 前回の一覧を消す（このスクリプトが作った <大きさ>-NN.png と作業用の html だけ）
  for (const f of await readdir(dir).catch(() => [])) {
    if (sizeNames.some(n => f.startsWith(`${n}-`) && f.endsWith('.png')) || /^_.*\.html$/.test(f)) await unlink(path.join(dir, f)).catch(() => {});
  }
  const made = [];
  for (const sizeName of sizeNames) {
    const src = path.join(args.out, sizeName);
    const files = (await readdir(src).catch(() => [])).filter(f => f.endsWith('.png')).sort();
    if (!files.length) continue;
    const { per, cols, cellW, cellH } = SHEET_LAYOUT[sizeName];
    const context = await browser.newContext({ viewport: { width: cols * cellW, height: Math.ceil(per / cols) * (cellH + 22) }, deviceScaleFactor: 1 });
    const page = await context.newPage();
    for (let i = 0; i < files.length; i += per) {
      const group = files.slice(i, i + per);
      const html = `<!doctype html><meta charset="utf-8"><body style="margin:0;background:#111;display:grid;grid-template-columns:repeat(${cols},${cellW}px);font:12px/22px system-ui;color:#eee">${group.map(f => `<div style="width:${cellW}px"><div style="height:22px;padding:0 6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;background:#222">${f.replace(/\.png$/, '')}</div><img src="${pathToFileURL(path.join(src, f)).href}" style="display:block;width:${cellW}px;height:${cellH}px;object-fit:cover;object-position:top"></div>`).join('')}</body>`;
      const tmp = path.join(dir, `_${sizeName}.html`);
      await writeFile(tmp, html);
      await page.goto(pathToFileURL(tmp).href, { waitUntil: 'load' });
      const out = path.join(dir, `${sizeName}-${String(i / per + 1).padStart(2, '0')}.png`);
      await page.screenshot({ path: out });
      made.push(out);
    }
    await unlink(path.join(dir, `_${sizeName}.html`)).catch(() => {});
    await context.close();
  }
  return made;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log('使い方: node scripts/shots.mjs --url http://localhost:5311 --out <出力先> [--only 場面,場面] [--size phone|desktop|ipad|ipad-land|both|all] [--sheets] [--sheets-only] [--furigana off] [--show-dev] [--headed] [--browser chromium|webkit] [--list]');
    return;
  }
  if (args.list) {
    for (const s of SCENES) console.log(`${s.name.padEnd(26)} ${s.desc}`);
    return;
  }
  if (!args.out) throw new Error('--out <出力先> が要る（リポジトリの外の場所を指定する）');
  args.out = path.resolve(args.out);
  const sizeNames = resolveSizes(args.size);
  // iPad の寸法は、--only を付けなければ主な場面（main: true）だけ撮る
  const scenesFor = n => (args.only || !n.startsWith('ipad') ? pickScenes(args.only) : pickScenes(null).filter(({ s }) => s.main));
  const scenes = pickScenes(args.only);
  for (const n of sizeNames) await mkdir(path.join(args.out, n), { recursive: true });

  if (args.sheetsOnly) {
    const b = await chromium.launch({ headless: true });
    try {
      const sheets = await buildSheets(b, args, sizeNames);
      console.log(`一覧: ${sheets.length}枚 → ${path.join(args.out, 'sheets')}`);
    } finally {
      await b.close();
    }
    return;
  }

  // --browser webkit: iPad の Safari に近い見え方の確認用（ヘッドレスの WebKit は立体のサイコロを平たく描く）
  const engine = args.browser === 'webkit' ? webkit : chromium;
  const browser = await engine.launch({ headless: !args.headed });
  const records = { shots: [], skipped: [], pageErrors: [] };
  console.log(`撮影: ${sizeNames.map(n => `${n} ${scenesFor(n).length}場面`).join('・')} → ${args.out}`);
  try {
    // 大きさを2つずつ並行して撮る（場面は順番に。3つ以上を同時に動かすと合わせのタイミングがずれやすい）
    for (let i = 0; i < sizeNames.length; i += 2) {
      await Promise.all(sizeNames.slice(i, i + 2).map(n => runSize(browser, n, scenesFor(n), args, records)));
    }

    // manifest: 今回撮らなかった場面の記録は残す
    const manifestPath = path.join(args.out, 'manifest.json');
    let prev = { shots: [], skipped: [], pageErrors: [] };
    try { prev = JSON.parse(await readFile(manifestPath, 'utf8')); } catch { /* はじめて */ }
    const redone = new Set(sizeNames.flatMap(n => scenesFor(n).map(({ s }) => `${n}|${s.name}`)));
    const keep = list => (list ?? []).filter(x => !redone.has(`${x.size}|${x.scene}`));
    const byFile = (a, b) => a.file.localeCompare(b.file);
    const manifest = {
      url: args.url,
      updatedAt: new Date().toISOString(),
      shots: [...keep(prev.shots), ...records.shots].sort(byFile),
      skipped: [...keep(prev.skipped), ...records.skipped],
      pageErrors: [...keep(prev.pageErrors), ...records.pageErrors],
    };
    await writeFile(manifestPath, JSON.stringify(manifest, null, 2));

    let sheets = [];
    if (args.sheets) sheets = await buildSheets(browser, args, sizeNames);

    console.log(`\n撮れた絵: ${records.shots.length}枚 / 飛ばした場面: ${records.skipped.length}件${sheets.length ? ` / 一覧: ${sheets.length}枚` : ''}`);
    for (const k of records.skipped) console.log(`  飛ばした [${k.size}] ${k.scene}: ${k.reason}`);
    for (const k of records.pageErrors) console.log(`  ページのエラー [${k.size}] ${k.scene}: ${k.errors[0]}`);
    console.log(`manifest: ${manifestPath}`);
  } finally {
    await browser.close();
  }
}

main().catch(e => {
  console.error(e.message ?? e);
  process.exit(1);
});
