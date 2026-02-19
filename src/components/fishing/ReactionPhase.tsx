import { useState, useEffect, useRef, useCallback } from 'react';
import type { Fish, PlayerEquipment } from '../../game/types';
import { getEffectiveLevel } from '../../game/fishing';
import ProgressBar from '../shared/ProgressBar';

const ROUNDS_REQUIRED: Record<string, number> = {
  common: 4,
  uncommon: 4,
  rare: 5,
  legendary: 6,
  mythical: 7,
};

// 反応時間の閾値（ms）— この時間内にタップすれば最大進捗
const BASE_REACTION_THRESHOLD = 600;
const PROGRESS_PER_ROUND_BASE = 26; // 1ラウンドあたりの基本進捗

interface ReactionPhaseProps {
  fish: Fish;
  equipment: PlayerEquipment;
  onSuccess: () => void;
  onFail: () => void;
}

type RoundState = 'waiting' | 'ready' | 'tapped' | 'foul';

export default function ReactionPhase({ fish, equipment, onSuccess, onFail }: ReactionPhaseProps) {
  const totalRounds = ROUNDS_REQUIRED[fish.rarity] ?? 5;

  // 装備効果
  const rodLevel = getEffectiveLevel(equipment, 'strike');
  const reelLevel = getEffectiveLevel(equipment, 'reeling');
  const lureLevel = getEffectiveLevel(equipment, 'biteSpeed');

  const reactionThreshold = BASE_REACTION_THRESHOLD + (rodLevel - 1) * 60; // 竿: 閾値緩和
  const roundReduction = Math.floor((reelLevel - 1) * 0.5); // リール: ラウンド数減少
  const progressBonus = 1 + (lureLevel - 1) * 0.12; // ルアー: 進捗ボーナス

  const effectiveRounds = Math.max(3, totalRounds - roundReduction);

  const [round, setRound] = useState(1);
  const [progress, setProgress] = useState(0);
  const [roundState, setRoundState] = useState<RoundState>('waiting');
  const [reactionTime, setReactionTime] = useState<number | null>(null);
  const [message, setMessage] = useState('');

  const readyAtRef = useRef(0);
  const timerRef = useRef<number | null>(null);
  const doneRef = useRef(false);
  const progressRef = useRef(0);

  // ラウンド開始
  const startRound = useCallback(() => {
    if (doneRef.current) return;
    setRoundState('waiting');
    setReactionTime(null);
    setMessage('');

    const delay = 1500 + Math.random() * 2500; // 1.5~4秒待ち
    timerRef.current = window.setTimeout(() => {
      if (doneRef.current) return;
      readyAtRef.current = Date.now();
      setRoundState('ready');
    }, delay);
  }, []);

  // 初回ラウンド開始
  useEffect(() => {
    startRound();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleTap = useCallback(() => {
    if (doneRef.current) return;

    if (roundState === 'waiting') {
      // お手つき！（半減ペナルティ）
      if (timerRef.current) clearTimeout(timerRef.current);
      setRoundState('foul');
      const halved = Math.floor(progressRef.current * 0.5);
      setMessage(`お手つき！進捗${halved}%に半減...`);
      progressRef.current = halved;
      setProgress(halved);

      setTimeout(() => {
        if (!doneRef.current) {
          startRound();
        }
      }, 1200);
      return;
    }

    if (roundState === 'ready') {
      const rt = Date.now() - readyAtRef.current;
      setReactionTime(rt);
      setRoundState('tapped');

      // 反応時間に応じた進捗（閾値内で最大、遅いと減少）
      const ratio = Math.max(0, 1 - (rt - 100) / reactionThreshold);
      const gained = Math.round(PROGRESS_PER_ROUND_BASE * ratio * progressBonus);
      const newProgress = Math.min(100, progressRef.current + gained);
      progressRef.current = newProgress;
      setProgress(newProgress);

      if (rt < 200) setMessage(`超速！ +${gained}%`);
      else if (rt < 400) setMessage(`速い！ +${gained}%`);
      else if (rt < 600) setMessage(`OK +${gained}%`);
      else setMessage(`遅い... +${gained}%`);

      // 次ラウンドまたは終了判定
      setTimeout(() => {
        if (doneRef.current) return;
        if (newProgress >= 100) {
          doneRef.current = true;
          onSuccess();
          return;
        }
        if (round >= effectiveRounds) {
          doneRef.current = true;
          onFail();
          return;
        }
        setRound(r => r + 1);
        startRound();
      }, 1000);
    }
  }, [roundState, round, effectiveRounds, reactionThreshold, progressBonus, startRound, onSuccess, onFail]);

  const circleColor = roundState === 'ready'
    ? 'bg-red-500 shadow-red-500/50 shadow-lg'
    : roundState === 'foul'
    ? 'bg-yellow-600'
    : 'bg-slate-700';

  return (
    <div
      className="flex flex-col items-center justify-center h-full select-none cursor-pointer"
      onClick={handleTap}
    >
      <p className="text-lg font-bold mb-2 text-white/80">早押しリアクション！</p>

      <div className="mb-3 text-sm text-white/50">
        ラウンド {round}/{effectiveRounds}
      </div>

      {/* 進捗バー */}
      <div className="w-64 mb-6">
        <ProgressBar
          value={progress}
          max={100}
          color="bg-emerald-500"
          height="h-4"
          showLabel
          label={`進捗 ${Math.round(progress)}%`}
        />
      </div>

      {/* メインボタン */}
      <div
        className={`w-40 h-40 rounded-full flex items-center justify-center transition-all duration-100 ${circleColor}`}
      >
        {roundState === 'waiting' && (
          <span className="text-3xl text-white/40">待って...</span>
        )}
        {roundState === 'ready' && (
          <span className="text-6xl text-white font-black animate-pulse">!</span>
        )}
        {roundState === 'tapped' && reactionTime != null && (
          <span className="text-xl text-white font-bold">{reactionTime}ms</span>
        )}
        {roundState === 'foul' && (
          <span className="text-3xl">💥</span>
        )}
      </div>

      {/* フィードバックメッセージ */}
      {message && (
        <p className={`text-sm font-bold mt-4 ${
          roundState === 'foul' ? 'text-yellow-400' : 'text-cyan-300'
        }`}>
          {message}
        </p>
      )}

      <p className="text-xs text-white/30 mt-6">赤く光ったら即タップ！</p>
    </div>
  );
}
