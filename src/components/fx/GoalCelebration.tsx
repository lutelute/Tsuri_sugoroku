import { useEffect } from 'react';
import Confetti from './Confetti';
import { playFanfare } from '../../utils/sound';
import Stamp from './Stamp';
import { finishLabel } from './nodeStyle';
import { useCountUp } from './useCountUp';
import Ruby from '../shared/Ruby';

interface GoalCelebrationProps {
  playerName: string;
  color: string;
  /** 0 = 一着 */
  order: number;
  reward: number;
  onContinue: () => void;
}

/** ゴール到達: 光条・金箔の舞い・着順の判子・賞金の数え上げ。 */
export default function GoalCelebration({ playerName, color, order, reward, onContinue }: GoalCelebrationProps) {
  const shown = useCountUp(reward, 1200, 0, 700);
  useEffect(() => {
    playFanfare();
  }, []);
  const first = order === 0;
  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-ai-950/70 backdrop-blur-sm cursor-pointer"
      onClick={onContinue}
      role="dialog"
      aria-label="ゴール"
    >
      <Confetti variant={first ? 'kin' : 'festive'} count={first ? 70 : 48} seed={order + 7} />
      <div className="relative text-center px-6">
        <div className="fx-rays is-hold" />
        <div className="relative">
          <p className="font-mincho text-sm tracking-[0.4em] text-kin-300/85 animate-ink-rise">
            <span style={{ color }} className="font-bold">{playerName}</span>
          </p>
          {/* 影は親に付ける（入場アニメが filter を使うため） */}
          <div style={{ filter: 'drop-shadow(0 4px 14px rgba(0,0,0,0.6))' }}>
            <h3 className="font-brush text-7xl sm:text-8xl leading-none kinpaku animate-ink-rise mt-2" style={{ animationDelay: '0.1s' }}>
              <Ruby>ゴール</Ruby>
            </h3>
          </div>
          <div className="flex justify-center mt-4">
            <Stamp tone={first ? 'kin' : 'shu'} size={78} vertical delay={450} tilt={-12}>{finishLabel(order)}</Stamp>
          </div>
          <p className="mt-5 font-mincho text-washi/80 text-sm"><Ruby>賞金</Ruby></p>
          <p className="font-mincho text-4xl font-bold text-kin-300 tabular-nums" style={{ textShadow: '0 2px 0 #0a1a2c' }}>
            ¥{shown.toLocaleString()}
          </p>
          <button type="button" className="mt-6 text-xs text-washi/55 fx-fade-in cursor-pointer px-3 py-1 rounded-full border border-kin-500/30" style={{ animationDelay: '1.6s' }}>
            <Ruby>タップでつづける</Ruby>
          </button>
        </div>
      </div>
    </div>
  );
}
