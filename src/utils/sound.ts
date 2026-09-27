// 効果音（Web Audio API で合成。音声ファイルは使わない）。
// 和の音色を小さな部品で組み立てる: 琴の爪弾き・鈴/りん・拍子木・太鼓・水音。
//
// - AudioContext は最初のユーザー操作で作る/再開する（iOS Safari の自動再生制限の対策）。
// - 操作前や音OFFのときは何もしない（例外も出さない）。
// - 同じ音が短い間隔で連打されないよう、音ごとに最小間隔で間引く。
// - しばらく鳴らなければ AudioContext を止めて電池を節約し、次に鳴らすとき再開する。
// - 設定（ON/OFF・音量）は useSettingsStore から setSoundConfig で渡される。

type Ctx = AudioContext;

interface SoundConfig {
  enabled: boolean;
  /** 0〜1 */
  volume: number;
}

let config: SoundConfig = { enabled: true, volume: 0.35 };
let ctx: Ctx | null = null;
let master: GainNode | null = null;
let reverbIn: GainNode | null = null;
let noiseBuf: AudioBuffer | null = null;
/** ユーザー操作があったか（以後は操作なしで resume してよい） */
let unlocked = false;
let idleTimer: ReturnType<typeof setTimeout> | null = null;
const lastPlayed = new Map<string, number>();

/** 無音が続いたら AudioContext を止めるまでの時間 */
const IDLE_SUSPEND_MS = 25000;
/** 音量 0〜1 を最終出力の大きさへ換算する係数 */
const MASTER_SCALE = 1.1;

/** 設定の反映（useSettingsStore から呼ぶ） */
export function setSoundConfig(next: Partial<SoundConfig>): void {
  config = { ...config, ...next };
  if (ctx && master) {
    master.gain.setTargetAtTime(config.enabled ? config.volume * MASTER_SCALE : 0, ctx.currentTime, 0.03);
  }
}

function audioCtor(): (new () => Ctx) | null {
  const g = globalThis as unknown as { AudioContext?: new () => Ctx; webkitAudioContext?: new () => Ctx };
  return g.AudioContext ?? g.webkitAudioContext ?? null;
}

/** 残響（短い和室ほどの響き）用のインパルス応答を合成する */
function makeImpulse(c: Ctx, seconds: number): AudioBuffer {
  const len = Math.floor(c.sampleRate * seconds);
  const buf = c.createBuffer(2, len, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
  }
  return buf;
}

function createGraph(): Ctx | null {
  const Ctor = audioCtor();
  if (!Ctor) return null;
  try {
    const c = new Ctor();
    const comp = c.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.ratio.value = 4;
    master = c.createGain();
    master.gain.value = config.enabled ? config.volume * MASTER_SCALE : 0;
    master.connect(comp);
    comp.connect(c.destination);

    // 残響のセンド（琴・鈴に少しだけ）
    const conv = c.createConvolver();
    conv.buffer = makeImpulse(c, 1.4);
    reverbIn = c.createGain();
    reverbIn.gain.value = 1;
    const wet = c.createGain();
    wet.gain.value = 0.5;
    reverbIn.connect(conv);
    conv.connect(wet);
    wet.connect(master);

    // ホワイトノイズ（水音・紙・打撃の成分）
    noiseBuf = c.createBuffer(1, c.sampleRate, c.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;

    ctx = c;
    return c;
  } catch {
    return null;
  }
}

/**
 * ユーザー操作の中で呼ぶ: AudioContext を作る/再開する。
 * iOS では無音を1つ鳴らすと以後の再生が確実になる。
 */
export function unlockAudio(): void {
  unlocked = true;
  // 音OFFなら作らない（ONにした操作の中で gate が作る）
  if (!config.enabled) return;
  const c = ctx ?? createGraph();
  if (!c) return;
  scheduleIdleSuspend();
  if (c.state !== 'running') {
    c.resume().catch(() => {});
    try {
      const src = c.createBufferSource();
      src.buffer = c.createBuffer(1, 1, c.sampleRate);
      src.connect(c.destination);
      src.start(0);
    } catch {
      /* 無音の再生に失敗しても続行 */
    }
  }
}

let installed = false;
/** 最初の操作で鳴らせるよう、操作イベントを見張る（何度呼んでもよい） */
export function installAudioUnlock(): void {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  const onGesture = () => {
    if (!ctx || ctx.state !== 'running') unlockAudio();
  };
  window.addEventListener('pointerdown', onGesture, { capture: true, passive: true });
  window.addEventListener('touchend', onGesture, { capture: true, passive: true });
  window.addEventListener('keydown', onGesture, { capture: true });
  // 裏に回ったら止め、戻ったら再開（操作済みなら操作なしで再開できる）
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) ctx.suspend().catch(() => {});
    else if (unlocked && config.enabled) {
      ctx.resume().catch(() => {});
      scheduleIdleSuspend();
    }
  });
}

function scheduleIdleSuspend(): void {
  if (idleTimer) clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    if (ctx && ctx.state === 'running') ctx.suspend().catch(() => {});
  }, IDLE_SUSPEND_MS);
}

/** 鳴らせる状態なら AudioContext を返す（間引き込み） */
function gate(key: string, minGapMs: number): Ctx | null {
  if (!config.enabled || config.volume <= 0) return null;
  // 一度も操作されていなければ鳴らさない（自動再生の制限に触れない）
  if (!unlocked) return null;
  // 操作後に音をONにした場合などは、ここで初めて作る
  if (!ctx && !createGraph()) return null;
  if (!ctx || !master) return null;
  const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const last = lastPlayed.get(key);
  if (last !== undefined && now - last < minGapMs) return null;
  lastPlayed.set(key, now);
  if (ctx.state !== 'running') ctx.resume().catch(() => {});
  scheduleIdleSuspend();
  return ctx;
}

// ===== 音の部品 =====

function out(c: Ctx, node: AudioNode, wet: number): void {
  node.connect(master!);
  if (wet > 0 && reverbIn) {
    const send = c.createGain();
    send.gain.value = wet;
    node.connect(send);
    send.connect(reverbIn);
  }
}

interface ToneOpts {
  /** 周波数(Hz) */
  f: number;
  /** 終わりの周波数（指定すると滑らかに変える） */
  f2?: number;
  type?: OscillatorType;
  /** 開始までの遅れ(秒) */
  t?: number;
  /** 長さ(秒) */
  dur: number;
  /** 大きさ */
  g: number;
  /** 立ち上がり(秒) */
  a?: number;
  /** 残響の量 */
  wet?: number;
  /** ローパスの始まり/終わり(Hz) */
  lp?: number;
  lp2?: number;
  detune?: number;
}

function tone(c: Ctx, o: ToneOpts): void {
  const t0 = c.currentTime + (o.t ?? 0);
  const a = o.a ?? 0.004;
  const osc = c.createOscillator();
  osc.type = o.type ?? 'sine';
  osc.frequency.setValueAtTime(o.f, t0);
  if (o.f2) osc.frequency.exponentialRampToValueAtTime(o.f2, t0 + o.dur);
  if (o.detune) osc.detune.setValueAtTime(o.detune, t0);
  const env = c.createGain();
  env.gain.setValueAtTime(0.0001, t0);
  env.gain.exponentialRampToValueAtTime(Math.max(0.0002, o.g), t0 + a);
  env.gain.exponentialRampToValueAtTime(0.0001, t0 + o.dur);
  let src: AudioNode = osc;
  if (o.lp) {
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(o.lp, t0);
    if (o.lp2) lp.frequency.exponentialRampToValueAtTime(o.lp2, t0 + o.dur);
    osc.connect(lp);
    src = lp;
  }
  src.connect(env);
  out(c, env, o.wet ?? 0);
  osc.start(t0);
  osc.stop(t0 + o.dur + 0.05);
  osc.onended = () => env.disconnect();
}

interface NoiseOpts {
  t?: number;
  dur: number;
  g: number;
  type: BiquadFilterType;
  f: number;
  f2?: number;
  q?: number;
  a?: number;
  wet?: number;
}

function noise(c: Ctx, o: NoiseOpts): void {
  if (!noiseBuf) return;
  const t0 = c.currentTime + (o.t ?? 0);
  const a = o.a ?? 0.002;
  const src = c.createBufferSource();
  src.buffer = noiseBuf;
  const filt = c.createBiquadFilter();
  filt.type = o.type;
  filt.frequency.setValueAtTime(o.f, t0);
  if (o.f2) filt.frequency.exponentialRampToValueAtTime(o.f2, t0 + o.dur);
  filt.Q.setValueAtTime(o.q ?? 1, t0);
  const env = c.createGain();
  env.gain.setValueAtTime(0.0001, t0);
  env.gain.exponentialRampToValueAtTime(Math.max(0.0002, o.g), t0 + a);
  env.gain.exponentialRampToValueAtTime(0.0001, t0 + o.dur);
  src.connect(filt);
  filt.connect(env);
  out(c, env, o.wet ?? 0);
  src.start(t0, Math.random() * 0.5);
  src.stop(t0 + o.dur + 0.05);
  src.onended = () => env.disconnect();
}

/** 琴の爪弾き（明るい立ち上がりが丸くなっていく） */
function koto(c: Ctx, f: number, t = 0, g = 0.16, dur = 1.0, wet = 0.22): void {
  tone(c, { f, type: 'triangle', t, dur, g, a: 0.003, lp: Math.min(9000, f * 8), lp2: f * 1.6, wet });
  tone(c, { f: f * 2, t, dur: dur * 0.45, g: g * 0.35, a: 0.002, wet });
  tone(c, { f: f * 3.01, t, dur: dur * 0.2, g: g * 0.14, a: 0.002, wet });
  noise(c, { t, dur: 0.025, g: g * 0.45, type: 'bandpass', f: Math.min(7000, f * 4), q: 2 });
}

/** 鈴・りん（倍音が整数倍でない金属の響き） */
function bell(c: Ctx, f: number, t = 0, g = 0.1, dur = 1.4, wet = 0.3): void {
  const partials: [number, number][] = [[1, 1], [2.76, 0.42], [5.4, 0.22], [8.93, 0.1]];
  partials.forEach(([ratio, amp], i) => {
    // 可聴域の上限を超える倍音は鳴らさない（ナイキスト付近で張り付くのを防ぐ）
    if (f * ratio > 15000) return;
    tone(c, { f: f * ratio, t, dur: dur / (1 + i * 0.7), g: g * amp, a: 0.002, wet, detune: i ? 4 : 0 });
  });
}

/** 拍子木・木の打音 */
function wood(c: Ctx, f: number, t = 0, g = 0.25): void {
  tone(c, { f, f2: f * 0.9, t, dur: 0.07, g, a: 0.001 });
  tone(c, { f: f * 2.4, t, dur: 0.035, g: g * 0.35, a: 0.001 });
  noise(c, { t, dur: 0.02, g: g * 0.5, type: 'bandpass', f: Math.min(8000, f * 2), q: 3 });
}

/** 太鼓（音程が下がる胴鳴り＋皮の響き） */
function drum(c: Ctx, t = 0, g = 0.45, f = 110): void {
  tone(c, { f, f2: f * 0.45, t, dur: 0.5, g, a: 0.003 });
  tone(c, { f: f * 1.5, f2: f * 0.7, t, dur: 0.18, g: g * 0.3, a: 0.002 });
  noise(c, { t, dur: 0.12, g: g * 0.3, type: 'lowpass', f: 500, q: 0.5 });
}

// 陽旋法（明るい五音音階: レ ミ ソ ラ シ）と陰旋法（都節: ミ ファ ラ シ ド）
const YO = [0, 2, 5, 7, 9];
const IN = [0, 1, 5, 7, 8];
const D5 = 587.33;
const E4 = 329.63;

/** 五音音階の idx 番目の音（5 つごとに1オクターブ上がる） */
export function scaleFreq(base: number, scale: readonly number[], idx: number): number {
  const i = Math.max(0, Math.floor(idx));
  const semis = scale[i % scale.length] + 12 * Math.floor(i / scale.length);
  return base * Math.pow(2, semis / 12);
}

// ===== 盤面 =====

/** サイコロが盆の上で転がる（木の打音が間遠になっていく） */
export function playDiceRoll(): void {
  const c = gate('diceRoll', 300);
  if (!c) return;
  let t = 0;
  for (let i = 0; i < 8; i++) {
    wood(c, 1100 + Math.random() * 700, t, 0.07 + Math.random() * 0.04);
    t += 0.05 + i * 0.022;
  }
}

/** サイコロが止まる「コトッ」 */
export function playDiceLand(): void {
  const c = gate('diceLand', 200);
  if (!c) return;
  wood(c, 520, 0, 0.26);
  drum(c, 0, 0.16, 170);
}

let stepCount = 0;
/** 駒が1マス進む（足音のような軽い木の音） */
export function playStep(): void {
  const c = gate('step', 70);
  if (!c) return;
  stepCount++;
  wood(c, stepCount % 2 ? 760 : 680, 0, 0.08);
}

/** マスに着く（柝「カ、カン」） */
export function playArrive(): void {
  const c = gate('arrive', 300);
  if (!c) return;
  wood(c, 1850, 0, 0.18);
  wood(c, 1700, 0.11, 0.2);
}

/** 手番のはじめ（小太鼓「ドドン」） */
export function playTurn(): void {
  const c = gate('turn', 600);
  if (!c) return;
  drum(c, 0, 0.2, 140);
  drum(c, 0.14, 0.26, 118);
}

/** お金が増える（小さな鈴が2つ） */
export function playCoinGain(): void {
  const c = gate('coinGain', 140);
  if (!c) return;
  bell(c, 2093, 0, 0.055, 0.5, 0.15);
  bell(c, 2637, 0.07, 0.055, 0.6, 0.15);
}

/** お金が減る（琴が下がる） */
export function playCoinLoss(): void {
  const c = gate('coinLoss', 140);
  if (!c) return;
  koto(c, 659.25, 0, 0.08, 0.45, 0.08);
  koto(c, 523.25, 0.09, 0.08, 0.55, 0.08);
}

/** 判子を押す「ポン」 */
export function playStamp(): void {
  const c = gate('stamp', 90);
  if (!c) return;
  tone(c, { f: 170, f2: 70, dur: 0.13, g: 0.32, a: 0.002 });
  noise(c, { dur: 0.06, g: 0.2, type: 'lowpass', f: 900, q: 0.7 });
}

/** 札をめくる・紙や布がひるがえる */
export function playCardFlip(): void {
  const c = gate('cardFlip', 150);
  if (!c) return;
  noise(c, { dur: 0.2, g: 0.1, type: 'bandpass', f: 700, f2: 3200, q: 0.8, a: 0.03 });
}

/** 吉（琴の上がる五音） */
export function playGood(): void {
  const c = gate('good', 400);
  if (!c) return;
  [0, 1, 2, 3, 5].forEach((idx, i) => koto(c, scaleFreq(D5, YO, idx), i * 0.075, 0.13, 1.0));
  bell(c, scaleFreq(D5, YO, 10), 0.38, 0.05, 1.4);
}

/** 凶（太鼓と、陰旋法で下がる琴） */
export function playBad(): void {
  const c = gate('bad', 400);
  if (!c) return;
  drum(c, 0, 0.38, 88);
  [8, 7, 6, 5].forEach((idx, i) => koto(c, scaleFreq(E4, IN, idx), 0.06 + i * 0.15, 0.1, 0.9, 0.15));
}

/** 神秘・知らせ（りん一打） */
export function playChime(): void {
  const c = gate('chime', 300);
  if (!c) return;
  bell(c, 1318.5, 0, 0.08, 1.8, 0.35);
}

/** 祭り（太鼓「ドン、ドン」＋鉦） */
export function playMatsuri(): void {
  const c = gate('matsuri', 800);
  if (!c) return;
  drum(c, 0, 0.36, 120);
  drum(c, 0.2, 0.36, 120);
  wood(c, 1600, 0.4, 0.14);
  bell(c, 1760, 0.4, 0.05, 0.5, 0.1);
}

/** ゴール・大決算（太鼓二打のあと、琴が二オクターブ駆け上がり、りんで結ぶ） */
export function playFanfare(): void {
  const c = gate('fanfare', 1500);
  if (!c) return;
  drum(c, 0, 0.42, 115);
  drum(c, 0.22, 0.46, 100);
  for (let i = 0; i <= 10; i++) koto(c, scaleFreq(D5 / 2, YO, i + 3), 0.46 + i * 0.055, 0.1, 1.1);
  bell(c, scaleFreq(D5, YO, 5), 1.1, 0.07, 2.2);
  bell(c, scaleFreq(D5, YO, 8), 1.1, 0.05, 2.0);
}

/** 建てる・直す（槌の三打と、仕上がりの鈴） */
export function playBuild(): void {
  const c = gate('build', 400);
  if (!c) return;
  wood(c, 880, 0, 0.2);
  wood(c, 880, 0.15, 0.2);
  wood(c, 980, 0.3, 0.22);
  bell(c, 1760, 0.48, 0.05, 0.9, 0.2);
}

// ===== 釣り =====

/** 竿を振る「ヒュッ」 */
export function playCast(): void {
  const c = gate('cast', 400);
  if (!c) return;
  noise(c, { dur: 0.32, g: 0.09, type: 'bandpass', f: 500, f2: 2600, q: 1.2, a: 0.06 });
}

/** 着水「ポチャン」 */
export function playSplash(): void {
  const c = gate('splash', 180);
  if (!c) return;
  tone(c, { f: 320, f2: 1100, dur: 0.07, g: 0.16, a: 0.003 });
  noise(c, { t: 0.02, dur: 0.34, g: 0.18, type: 'bandpass', f: 1800, f2: 480, q: 0.7 });
  tone(c, { f: 1500, f2: 2600, t: 0.13, dur: 0.04, g: 0.04 });
  tone(c, { f: 1300, f2: 2300, t: 0.2, dur: 0.04, g: 0.03 });
}

/** 前アタリ「ピクッ」（ごく小さく） */
export function playNibble(): void {
  const c = gate('nibble', 140);
  if (!c) return;
  tone(c, { f: 950, f2: 780, dur: 0.045, g: 0.05 });
}

/** 本アタリ（上がる合図＋鈴） */
export function playBite(): void {
  const c = gate('bite', 250);
  if (!c) return;
  tone(c, { f: 700, f2: 1500, dur: 0.08, g: 0.16 });
  bell(c, 1568, 0.06, 0.08, 0.6, 0.15);
}

/** 合わせが決まった（会心は二音） */
export function playHook(perfect = false): void {
  const c = gate('hook', 200);
  if (!c) return;
  koto(c, scaleFreq(D5, YO, 3), 0, 0.14, 0.7);
  if (perfect) {
    koto(c, scaleFreq(D5, YO, 5), 0.07, 0.14, 0.9);
    bell(c, scaleFreq(D5, YO, 10), 0.1, 0.05, 1.0);
  }
}

/** ミニゲームで当てた・拍に合った（step で音階を上がる） */
export function playHit(step = 0, strong = true): void {
  const c = gate('hit', 35);
  if (!c) return;
  koto(c, scaleFreq(D5, YO, step % 10), 0, strong ? 0.12 : 0.07, 0.55, 0.12);
}

/** 空振り・お手つき（小さな木の音） */
export function playTap(): void {
  const c = gate('tap', 45);
  if (!c) return;
  wood(c, 1300, 0, 0.06);
}

/** リールを巻く「カリッ」 */
export function playReelTick(): void {
  const c = gate('reelTick', 45);
  if (!c) return;
  noise(c, { dur: 0.016, g: 0.08, type: 'highpass', f: 3500, q: 0.7 });
  tone(c, { f: 2600, dur: 0.014, g: 0.03, a: 0.001 });
}

/** 糸が張りつめている（小さなきしみ） */
export function playTension(): void {
  const c = gate('tension', 360);
  if (!c) return;
  tone(c, { f: 1450, f2: 1330, type: 'triangle', dur: 0.08, g: 0.035, lp: 2600 });
}

/** 釣り上げた（水しぶき＋上がる琴＋鈴） */
export function playCatch(): void {
  const c = gate('catch', 600);
  if (!c) return;
  noise(c, { dur: 0.3, g: 0.16, type: 'bandpass', f: 600, f2: 2400, q: 0.8, a: 0.02 });
  [2, 3, 4, 5].forEach((idx, i) => koto(c, scaleFreq(D5, YO, idx), 0.12 + i * 0.07, 0.12, 0.9));
  bell(c, scaleFreq(D5, YO, 7), 0.42, 0.06, 1.3);
}

/** 糸が切れた「パチン」 */
export function playLineBreak(): void {
  const c = gate('lineBreak', 600);
  if (!c) return;
  noise(c, { dur: 0.05, g: 0.3, type: 'highpass', f: 2500, q: 0.8, a: 0.001 });
  tone(c, { f: 1200, f2: 180, type: 'triangle', dur: 0.3, g: 0.16, a: 0.001, lp: 3000 });
  tone(c, { f: 220, f2: 110, t: 0.1, dur: 0.5, g: 0.1 });
}

/** 逃げられた・外した（下がる音と小さな水音） */
export function playMiss(): void {
  const c = gate('miss', 400);
  if (!c) return;
  tone(c, { f: 660, f2: 280, dur: 0.4, g: 0.1 });
  noise(c, { t: 0.05, dur: 0.2, g: 0.06, type: 'bandpass', f: 1400, f2: 600, q: 0.8 });
}

// 最初の操作で鳴らせるよう、読み込み時に見張りを付ける（ブラウザのみ）
installAudioUnlock();
