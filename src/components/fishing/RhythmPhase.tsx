import { useState, useEffect, useEffectEvent, useRef } from 'react';
import type { Fish, FishRarity, PlayerEquipment } from '../../game/types';
import { getEffectiveLevel } from '../../game/fishing';
import type { FailReason } from './miniGameMeta';
import { HEAD_START_PROGRESS } from './reelSim';
import { useFinish } from './useFinish';
import { buzz, HAPTIC } from './haptics';
import { playHit, playTap } from '../../utils/sound';
import { Ripple } from './FishingScene';
import MiniGameIntro from './MiniGameIntro';
import FinishFlash from './FinishFlash';
import Ruby from '../shared/Ruby';

// ===== 難易度（ミニゲーム係） =====
/** 玉の数 */
const NOTE_COUNT: Record<FishRarity, number> = { common: 8, uncommon: 9, rare: 10, legendary: 12, mythical: 14 };
/** 玉がレーン上端から金の線まで落ちる時間（ms）。リールが良いと遅く（易しく）なる */
const FALL_MS: Record<FishRarity, number> = { common: 2300, uncommon: 2150, rare: 2000, legendary: 1850, mythical: 1700 };
const FALL_PER_REEL_LEVEL = 100;
/** 玉の間隔（ms）と、半分の間隔（連打）になる確率 */
const INTERVAL_MS = 850;
const DOUBLE_CHANCE: Record<FishRarity, number> = { common: 0, uncommon: 0.1, rare: 0.2, legendary: 0.3, mythical: 0.35 };
/** 判定幅（ms）: 竿（strike）で広がる */
const PERFECT_MS = 75;
const PERFECT_PER_ROD_LEVEL = 15;
const GOOD_MS = 170;
const GOOD_PER_ROD_LEVEL = 20;
/** タップがこの範囲（good幅×倍率）の玉だけを判定する（遠い玉を空打ちで消さない） */
const CONSIDER_MUL = 1.5;
/** 全部会心で約130%。全部「よし」でもコンボ込みで届く（子供向け） */
const FULL_SCORE = 130;
const GOOD_RATE = 0.75;
const MISS_PENALTY = 2;
const EMPTY_TAP_PENALTY = 1;
/** 金の線の位置（レーン高さに対する割合） */
const JUDGE_Y = 0.84;

type Judge = 'perfect' | 'good' | 'miss' | 'empty';

interface Note {
  id: number;
  /** 開始からの、金の線に重なる時刻（ms） */
  hitAt: number;
  judged: boolean;
}

const JUDGE_TEXT: Record<Judge, { text: string; className: string }> = {
  perfect: { text: '会心！', className: 'text-kin-300' },
  good: { text: 'よし！', className: 'text-ai-200' },
  miss: { text: 'おしい…', className: 'text-shu-400' },
  empty: { text: '空振り', className: 'text-washi/60' },
};

interface RhythmPhaseProps {
  fish: Fish;
  equipment: PlayerEquipment;
  /** 会心の合わせのボーナス（イベントファイトでは無し） */
  headStart?: boolean;
  onSuccess: () => void;
  onFail: (reason: FailReason) => void;
}

/** 波のリズム: 落ちてくる玉が金の線に重なったらタップ。続けて当てるとコンボで寄せが増える。 */
export default function RhythmPhase({ fish, equipment, headStart = false, onSuccess, onFail }: RhythmPhaseProps) {
  const total = NOTE_COUNT[fish.rarity];

  // 装備効果: 竿=判定幅 / リール=落下が遅い / ルアー=1玉の寄せ量
  const rodLevel = getEffectiveLevel(equipment, 'strike');
  const reelLevel = getEffectiveLevel(equipment, 'reeling');
  const lureLevel = getEffectiveLevel(equipment, 'biteSpeed');
  const perfectMs = PERFECT_MS + Math.max(0, rodLevel - 1) * PERFECT_PER_ROD_LEVEL;
  const goodMs = GOOD_MS + Math.max(0, rodLevel - 1) * GOOD_PER_ROD_LEVEL;
  const fallMs = FALL_MS[fish.rarity] + Math.max(0, reelLevel - 1) * FALL_PER_REEL_LEVEL;
  const perNote = (FULL_SCORE / total) * (1 + Math.max(0, lureLevel - 1) * 0.12);

  const [started, setStarted] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [progress, setProgress] = useState(headStart ? HEAD_START_PROGRESS : 0);
  const [combo, setCombo] = useState(0);
  const [feedback, setFeedback] = useState<{ judge: Judge; id: number; gained: number } | null>(null);
  const { finished, finish, isDone } = useFinish(onSuccess, onFail);

  const notesRef = useRef<Note[]>([]);
  const startAtRef = useRef(0);
  const progressRef = useRef(headStart ? HEAD_START_PROGRESS : 0);
  const comboRef = useRef(0);
  const fbIdRef = useRef(0);

  const commitNotes = (next: Note[]) => {
    notesRef.current = next;
    setNotes(next);
  };

  /** 判定を反映（進捗・コンボ・表示） */
  const applyJudge = (judge: Judge) => {
    let gained: number;
    if (judge === 'perfect' || judge === 'good') {
      comboRef.current++;
      const comboMul = 1 + Math.min(0.3, (comboRef.current - 1) * 0.05);
      gained = Math.round(perNote * (judge === 'perfect' ? 1 : GOOD_RATE) * comboMul);
      buzz(judge === 'perfect' ? HAPTIC.hook : HAPTIC.tap);
      playHit(comboRef.current - 1, judge === 'perfect');
    } else {
      comboRef.current = 0;
      if (judge === 'empty') playTap();
      gained = -(judge === 'miss' ? MISS_PENALTY : EMPTY_TAP_PENALTY);
    }
    progressRef.current = Math.max(0, Math.min(100, progressRef.current + gained));
    setProgress(progressRef.current);
    setCombo(comboRef.current);
    setFeedback({ judge, id: ++fbIdRef.current, gained });
  };

  const onFrameJudge = useEffectEvent((judge: Judge) => applyJudge(judge));
  const onAllDone = useEffectEvent(() => {
    if (progressRef.current >= 100) finish(true);
    else finish(false, 'short');
  });

  // 開始: 譜面を作り、rAF で時間を進める
  useEffect(() => {
    if (!started) return;
    const doubleChance = DOUBLE_CHANCE[fish.rarity];
    const list: Note[] = [];
    let at = fallMs + 400;
    for (let i = 0; i < total; i++) {
      list.push({ id: i, hitAt: at, judged: false });
      at += Math.random() < doubleChance && i < total - 1 ? INTERVAL_MS / 2 : INTERVAL_MS;
    }
    notesRef.current = list;
    startAtRef.current = performance.now();

    let raf = 0;
    const loop = (now: number) => {
      if (isDone()) return;
      const t = now - startAtRef.current;
      // 線を通り過ぎた玉は見逃し
      let changed = false;
      const next = notesRef.current.map(n => {
        if (!n.judged && t - n.hitAt > goodMs) {
          changed = true;
          onFrameJudge('miss');
          return { ...n, judged: true };
        }
        return n;
      });
      if (changed) notesRef.current = next;
      setNotes(notesRef.current);
      setElapsed(t);
      if (notesRef.current.every(n => n.judged)) {
        onAllDone();
        return;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [started, fish.rarity, fallMs, total, goodMs, isDone]);

  const handleTap = (e: React.PointerEvent) => {
    e.preventDefault();
    if (!started || isDone() || startAtRef.current === 0) return;
    const t = performance.now() - startAtRef.current;
    // 金の線に一番近い未判定の玉（判定範囲内のみ）
    let target: Note | null = null;
    let bestDiff = Infinity;
    for (const n of notesRef.current) {
      if (n.judged) continue;
      const diff = Math.abs(t - n.hitAt);
      if (diff < bestDiff) {
        bestDiff = diff;
        target = n;
      }
    }
    if (!target || bestDiff > goodMs * CONSIDER_MUL) {
      applyJudge('empty');
      return;
    }
    const judge: Judge = bestDiff <= perfectMs ? 'perfect' : bestDiff <= goodMs ? 'good' : 'miss';
    const id = target.id;
    commitNotes(notesRef.current.map(n => (n.id === id ? { ...n, judged: true } : n)));
    applyJudge(judge);
  };

  const judgedCount = notes.filter(n => n.judged).length;
  const fb = feedback ? JUDGE_TEXT[feedback.judge] : null;
  // good 幅を画面上の帯の高さに換算（竿の効果が見える）
  const bandPct = (goodMs / fallMs) * JUDGE_Y * 100;

  return (
    <div className="relative w-full h-full flex flex-col items-center px-4 pb-4 pt-2 fg-touch cursor-pointer" onPointerDown={handleTap}>
      <div className="w-full max-w-md flex items-center justify-between h-12 shrink-0">
        <p className="font-mincho text-xl font-bold text-washi/90"><Ruby>波のリズム</Ruby></p>
        <span className="rounded-full px-3 py-1 text-sm tabular-nums border bg-ai-950/60 border-kin-500/30 text-washi/85">
          {judgedCount}/{total}
        </span>
      </div>

      <div className="w-full max-w-md shrink-0">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-washi/75"><Ruby>寄せ</Ruby></span>
          <span className="text-washi/50 tabular-nums">{Math.round(progress)}%</span>
        </div>
        <div className="relative h-3 rounded-full overflow-hidden bg-ai-950/70 border border-kin-500/20">
          <div className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-ai-300 to-kin-400" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="relative w-full max-w-md flex-1 min-h-[260px] mt-3 flex justify-center">
        {/* レーン */}
        <div className="relative w-28 h-full rounded-2xl overflow-hidden border border-kin-500/20 bg-gradient-to-b from-ai-700/60 to-ai-950/90">
          {/* 判定帯（竿が良いほど太い） */}
          <div className="absolute inset-x-0 bg-kin-500/15" style={{ top: `${JUDGE_Y * 100 - bandPct}%`, height: `${bandPct * 2}%` }} />
          <div className="absolute inset-x-0 h-1 bg-kin-400 shadow-[0_0_10px_rgba(241,216,147,0.7)]" style={{ top: `${JUDGE_Y * 100}%` }} />
          {/* 玉 */}
          {notes.map(n => {
            if (n.judged) return null;
            const y = JUDGE_Y * (1 - (n.hitAt - elapsed) / fallMs);
            if (y < -0.1 || y > 1.05) return null;
            const near = Math.abs(n.hitAt - elapsed) <= goodMs;
            return (
              <span
                key={n.id}
                className={`absolute left-1/2 w-9 h-9 rounded-full border-2 ${near ? 'border-kin-300 bg-shu-500' : 'border-kin-500/70 bg-shu-600/80'}`}
                style={{ top: `${y * 100}%`, transform: 'translate(-50%, -50%)', boxShadow: near ? '0 0 12px rgba(241,216,147,0.8)' : undefined }}
              />
            );
          })}
          {/* 当てた瞬間の波紋 */}
          {feedback && (feedback.judge === 'perfect' || feedback.judge === 'good') && (
            <div key={feedback.id} className="absolute left-1/2 w-0 h-0" style={{ top: `${JUDGE_Y * 100}%` }}>
              <Ripple size={feedback.judge === 'perfect' ? 110 : 80} />
            </div>
          )}
        </div>

        {/* 判定とコンボ */}
        <div className="absolute right-0 top-1/3 w-[calc(50%-4rem)] text-center pointer-events-none">
          {fb && feedback && (
            <p key={feedback.id} className={`fg-pop font-mincho text-2xl font-bold drop-shadow-[0_2px_0_rgba(10,26,44,0.9)] ${fb.className}`}>
              <Ruby>{fb.text}</Ruby>
            </p>
          )}
          {combo >= 2 && (
            <p key={`c${combo}`} className="fg-pop mt-1 text-kin-300 font-bold tabular-nums">
              {combo} <span className="text-xs">コンボ</span>
            </p>
          )}
        </div>
      </div>

      <p className="text-xs text-washi/50 mt-2 shrink-0 fg-tall-only"><Ruby>玉が線に重なったらタップ</Ruby></p>

      {!started && (
        <MiniGameIntro game="rhythm" bonusText={headStart ? `会心の合わせ: 寄せ +${HEAD_START_PROGRESS}%` : undefined} onDone={() => setStarted(true)} />
      )}
      {finished && <FinishFlash state={finished} />}
    </div>
  );
}
