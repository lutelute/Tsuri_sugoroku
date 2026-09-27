import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

// ブラウザの AudioContext の代わりに、呼び出しの妥当性だけを確かめる偽物を使う。
// 本物のブラウザで例外になる使い方（指数ランプで 0 以下へ、負の時刻）はここでも例外にする。
function checkTime(t: number) {
  if (!Number.isFinite(t) || t < 0) throw new RangeError(`bad time ${t}`);
}

class FakeParam {
  value = 0;
  setValueAtTime(v: number, t: number) {
    if (!Number.isFinite(v)) throw new RangeError('bad value');
    checkTime(t);
    this.value = v;
    return this;
  }
  exponentialRampToValueAtTime(v: number, t: number) {
    if (!(v > 0)) throw new RangeError(`exponential ramp to non-positive value ${v}`);
    checkTime(t);
    this.value = v;
    return this;
  }
  linearRampToValueAtTime(v: number, t: number) {
    checkTime(t);
    this.value = v;
    return this;
  }
  setTargetAtTime(v: number, t: number) {
    checkTime(t);
    this.value = v;
    return this;
  }
}

class FakeNode {
  outputs: FakeNode[] = [];
  connect(n: FakeNode) {
    this.outputs.push(n);
    return n;
  }
  disconnect() {
    this.outputs = [];
  }
}

class FakeScheduled extends FakeNode {
  onended: (() => void) | null = null;
  started = false;
  start(t = 0) {
    checkTime(t);
    this.started = true;
  }
  stop(t = 0) {
    checkTime(t);
  }
}

class FakeOsc extends FakeScheduled {
  type = 'sine';
  frequency = new FakeParam();
  detune = new FakeParam();
}

class FakeBufferSource extends FakeScheduled {
  buffer: FakeBuffer | null = null;
}

class FakeBuffer {
  private data: Float32Array[];
  constructor(public numberOfChannels: number, public length: number, public sampleRate: number) {
    this.data = Array.from({ length: numberOfChannels }, () => new Float32Array(length));
  }
  getChannelData(ch: number) {
    return this.data[ch];
  }
}

class FakeCtx {
  static last: FakeCtx | null = null;
  state = 'running';
  currentTime = 0;
  sampleRate = 8000;
  destination = new FakeNode();
  /** 作られた音源（発振器＋雑音源）の数 */
  oscillators = 0;
  constructor() {
    FakeCtx.last = this;
  }
  createOscillator() {
    this.oscillators++;
    return new FakeOsc();
  }
  createGain() {
    return Object.assign(new FakeNode(), { gain: new FakeParam() });
  }
  createBiquadFilter() {
    return Object.assign(new FakeNode(), { type: 'lowpass', frequency: new FakeParam(), Q: new FakeParam() });
  }
  createBufferSource() {
    this.oscillators++;
    return new FakeBufferSource();
  }
  createBuffer(ch: number, len: number, sr: number) {
    return new FakeBuffer(ch, len, sr);
  }
  createConvolver() {
    return Object.assign(new FakeNode(), { buffer: null as FakeBuffer | null });
  }
  createDynamicsCompressor() {
    return Object.assign(new FakeNode(), { threshold: new FakeParam(), ratio: new FakeParam() });
  }
  resume() {
    this.state = 'running';
    return Promise.resolve();
  }
  suspend() {
    this.state = 'suspended';
    return Promise.resolve();
  }
}

type SoundModule = typeof import('./sound');
let sound: SoundModule;

beforeAll(async () => {
  // 間引きは performance.now() で測るので、それも偽の時計で進める
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date', 'performance'] });
  (globalThis as unknown as { AudioContext: unknown }).AudioContext = FakeCtx;
  sound = await import('./sound');
});

afterAll(() => {
  vi.useRealTimers();
  delete (globalThis as unknown as { AudioContext?: unknown }).AudioContext;
});

const PLAYERS: (keyof SoundModule)[] = [
  'playDiceRoll', 'playDiceLand', 'playStep', 'playArrive', 'playTurn', 'playCoinGain', 'playCoinLoss',
  'playStamp', 'playCardFlip', 'playGood', 'playBad', 'playChime', 'playMatsuri', 'playFanfare', 'playBuild',
  'playCast', 'playSplash', 'playNibble', 'playBite', 'playHook', 'playHit', 'playTap', 'playReelTick',
  'playTension', 'playCatch', 'playLineBreak', 'playMiss',
];

describe('効果音（合成）', () => {
  it('操作前（AudioContext 未作成）は何もしない', () => {
    expect(() => sound.playGood()).not.toThrow();
    expect(FakeCtx.last).toBeNull();
  });

  it('音OFFのまま操作しても AudioContext は作らず、ONにして鳴らすと作る', () => {
    sound.setSoundConfig({ enabled: false });
    sound.unlockAudio();
    expect(FakeCtx.last).toBeNull();
    sound.setSoundConfig({ enabled: true });
    sound.playChime();
    expect(FakeCtx.last).not.toBeNull();
  });

  it('解禁後はすべての音が例外なく組み立てられる', () => {
    sound.unlockAudio();
    const c = FakeCtx.last!;
    expect(c).not.toBeNull();
    for (const name of PLAYERS) {
      vi.advanceTimersByTime(2000); // 間引きの間隔をあける
      const before = c.oscillators;
      expect(() => (sound[name] as () => void)(), name).not.toThrow();
      expect(c.oscillators, name).toBeGreaterThan(before);
    }
  });

  it('同じ音の連打は間引かれる', () => {
    const c = FakeCtx.last!;
    vi.advanceTimersByTime(2000);
    sound.playStep();
    const after1 = c.oscillators;
    sound.playStep();
    expect(c.oscillators).toBe(after1);
    vi.advanceTimersByTime(100);
    sound.playStep();
    expect(c.oscillators).toBeGreaterThan(after1);
  });

  it('音OFF・音量0では鳴らさない', () => {
    const c = FakeCtx.last!;
    sound.setSoundConfig({ enabled: false });
    vi.advanceTimersByTime(2000);
    const before = c.oscillators;
    sound.playFanfare();
    expect(c.oscillators).toBe(before);
    sound.setSoundConfig({ enabled: true, volume: 0 });
    vi.advanceTimersByTime(2000);
    sound.playFanfare();
    expect(c.oscillators).toBe(before);
    sound.setSoundConfig({ volume: 0.3 });
  });

  it('しばらく鳴らないと止め、次に鳴らすとき再開する', () => {
    const c = FakeCtx.last!;
    vi.advanceTimersByTime(2000);
    sound.playChime();
    vi.advanceTimersByTime(30000);
    expect(c.state).toBe('suspended');
    sound.playChime();
    expect(c.state).toBe('running');
  });

  it('五音音階: 5 音ごとに1オクターブ上がる', () => {
    expect(sound.scaleFreq(440, [0, 2, 5, 7, 9], 5)).toBeCloseTo(880);
    expect(sound.scaleFreq(440, [0, 2, 5, 7, 9], 2)).toBeCloseTo(440 * Math.pow(2, 5 / 12));
  });
});
