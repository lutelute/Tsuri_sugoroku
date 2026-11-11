// 結果発表の番付: 順位を下から1人ずつ明かす（押せば早送り）。釣り旅・まちづくりで共通。
// いちばん上は勝者の大きな札（金屏風の地・駒・名前・紙吹雪・ファンファーレ）、2位以下は小さな札。
// 得点・総資産は数え上げ、内訳は積み上げの棒で見せる。
import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { IconName } from '../shared/Icon';
import Icon from '../shared/Icon';
import Ruby from '../shared/Ruby';
import Pawn from '../shared/Pawn';
import Stamp from '../fx/Stamp';
import Confetti from '../fx/Confetti';
import { useCountUp } from '../fx/useCountUp';
import { useReducedMotion } from '../fx/useReducedMotion';
import { playFanfare } from '../../utils/sound';
import { RESULT_TEXT } from '../title/stageText';
import { isRankShown } from './highlights';
import { useRankReveal, REVEAL_INTERVAL_MS } from './useRankReveal';

/** 内訳の1項目（棒の1区切り） */
export interface ResultPart {
  key: string;
  label: string;
  icon: IconName;
  value: number;
  color: string;
}

/** 棒には入らない数字（釣った数・人口など） */
export interface ResultStat {
  key: string;
  label: string;
  icon: IconName;
  text: string;
}

export interface ResultEntry {
  playerIndex: number;
  name: string;
  color: string;
  /** 駒の白丸の文字（席の番号か CPU の印） */
  pawnLabel: string | number;
  total: number;
  parts: ResultPart[];
  stats: ResultStat[];
}

const RANK_MARK = ['壱', '弐', '参', '肆'];

function formatTotal(v: number, unit: 'pt' | 'yen'): string {
  return unit === 'yen' ? `¥${v.toLocaleString()}` : `${v.toLocaleString()}pt`;
}

function CountUp({ value, unit, delay = 0, animate = true }: { value: number; unit: 'pt' | 'yen'; delay?: number; animate?: boolean }) {
  const shown = useCountUp(value, animate ? 1300 : 0, animate ? 0 : value, delay);
  return <span className="tabular-nums">{formatTotal(animate ? shown : value, unit)}</span>;
}

/** 内訳の積み上げ棒。幅は首位との比（差がひと目で分かる） */
function StackBar({ parts, total, max, delay = 0 }: { parts: ResultPart[]; total: number; max: number; delay?: number }) {
  const w = max > 0 ? Math.max(4, Math.round((Math.max(0, total) / max) * 100)) : 0;
  return (
    <div className="hr-bar-track" aria-hidden="true">
      <div className="hr-bar" style={{ width: `${w}%`, '--d': `${delay}ms` } as CSSProperties}>
        {parts.filter(p => p.value > 0).map(p => (
          <span key={p.key} style={{ flexGrow: p.value, backgroundColor: p.color }} />
        ))}
      </div>
    </div>
  );
}

function PartChip({ part, unit }: { part: ResultPart; unit: 'pt' | 'yen' }) {
  return (
    <span className="hr-chip">
      <span className="hr-chip-dot" style={{ backgroundColor: part.color }} />
      <Icon name={part.icon} size={13} className="shrink-0 opacity-80" />
      <span className="hr-chip-label"><Ruby>{part.label}</Ruby></span>
      <span className="hr-chip-val tabular-nums">{unit === 'yen' ? `¥${part.value.toLocaleString()}` : part.value.toLocaleString()}</span>
    </span>
  );
}

function StatChip({ stat }: { stat: ResultStat }) {
  return (
    <span className="hr-chip is-stat">
      <Icon name={stat.icon} size={13} className="shrink-0 opacity-80" />
      <span className="hr-chip-label"><Ruby>{stat.label}</Ruby></span>
      <span className="hr-chip-val tabular-nums"><Ruby>{stat.text}</Ruby></span>
    </span>
  );
}

/** 金屏風の松（飾り） */
function ByobuPine() {
  return (
    <svg className="hr-byobu-pine" viewBox="0 0 120 90" aria-hidden="true">
      <path d="M-4,92C14,70 30,62 52,58C70,55 86,46 100,30" fill="none" stroke="#5a3d1e" strokeWidth="5" strokeLinecap="round" />
      <path d="M40,62C44,50 54,44 66,42M74,52C80,40 92,36 104,36" fill="none" stroke="#5a3d1e" strokeWidth="3" strokeLinecap="round" />
      <g fill="#2f6e52" stroke="#1d4a36" strokeWidth="1.2" strokeLinejoin="round">
        <path d="M8,66c2,-12 30,-12 32,0Z" /><path d="M36,46c2,-13 34,-13 36,0Z" /><path d="M66,36c2,-12 30,-12 32,0Z" />
        <path d="M84,24c2,-11 28,-11 30,0Z" /><path d="M52,62c2,-9 24,-9 26,0Z" /><path d="M94,44c2,-9 22,-9 24,0Z" />
      </g>
      <g stroke="#1d4a36" strokeWidth="0.8" opacity="0.6">
        <path d="M14,64v-6M20,65v-8M26,65v-8M32,64v-6M44,44v-7M52,45v-9M60,45v-8M74,34v-7M82,35v-8M90,34v-6" />
      </g>
    </svg>
  );
}

interface CardProps {
  entry: ResultEntry;
  rank: number;
  max: number;
  unit: 'pt' | 'yen';
  /** まだ明かしていない（中身を伏せて、同じ大きさの伏せ札を重ねる） */
  veiled: boolean;
  /** 明かしたとき画面の中へ寄せるための参照 */
  cardRef?: (el: HTMLDivElement | null) => void;
}

function WinnerCard({ entry, max, unit, veiled, stamp, cardRef }: CardProps & { stamp: string }) {
  return (
    <div className="relative" ref={cardRef}>
      <div className={`hr-winner hr-byobu ${veiled ? 'is-veiled' : 'is-shown'}`} aria-hidden={veiled || undefined}>
        <ByobuPine />
        {!veiled && (
          <span className="hr-winner-stamp">
            <Stamp tone="shu" size={66} vertical delay={420} tilt={9}>{stamp}</Stamp>
          </span>
        )}
        <div className="hr-winner-head">
          <span className="hr-winner-pawn"><Pawn color={entry.color} label={entry.pawnLabel} size={84} gold /></span>
          <div className="min-w-0">
            <p className="hr-winner-name font-brush">{entry.name}</p>
            <p className="hr-winner-total font-mincho"><CountUp value={entry.total} unit={unit} delay={350} animate={!veiled} /></p>
          </div>
        </div>
        <StackBar parts={entry.parts} total={entry.total} max={max} delay={500} />
        <div className="hr-chips is-winner">
          {entry.parts.map(p => <PartChip key={p.key} part={p} unit={unit} />)}
        </div>
        {entry.stats.length > 0 && (
          <div className="hr-chips is-stats">
            {entry.stats.map(s => <StatChip key={s.key} stat={s} />)}
          </div>
        )}
      </div>
      {veiled && (
        <div className="hr-veil is-winner">
          <span className="hr-veil-q font-brush" aria-hidden="true">？</span>
          <span className="font-mincho tracking-[0.3em] text-sm">1<Ruby>位</Ruby>は…</span>
        </div>
      )}
    </div>
  );
}

function RankCard({ entry, rank, max, unit, veiled, cardRef }: CardProps) {
  // スマホ幅では内訳の数字をたたんでおく（棒で割合は見える）。広い画面ではいつも出す（CSS）
  const [open, setOpen] = useState(false);
  const shownParts = entry.parts.filter(p => p.value > 0);
  return (
    <div className="relative" ref={cardRef}>
      <div className={`hr-rank ${veiled ? 'is-veiled' : 'is-shown'}`} aria-hidden={veiled || undefined}>
        <div className="flex items-center gap-2 min-w-0">
          {veiled ? <span className="w-9 h-9 shrink-0" /> : <Stamp tone="ai" size={36} tilt={-6} delay={80}>{RANK_MARK[rank] ?? String(rank + 1)}</Stamp>}
          <Pawn color={entry.color} label={entry.pawnLabel} size={36} />
          <span className="font-mincho font-bold text-washi text-lg truncate">{entry.name}</span>
          <span className="ml-auto font-mincho font-extrabold text-kin-300 text-xl shrink-0">
            <CountUp value={entry.total} unit={unit} delay={150} animate={!veiled} />
          </span>
        </div>
        <StackBar parts={entry.parts} total={entry.total} max={max} delay={250} />
        <div className="flex items-center gap-2">
          <div className="hr-chips flex-1 min-w-0">
            {entry.stats.map(s => <StatChip key={s.key} stat={s} />)}
          </div>
          <button
            type="button"
            className="hr-more hr-pill"
            onClick={() => setOpen(o => !o)}
            aria-expanded={open}
            tabIndex={veiled ? -1 : undefined}
          >
            <Ruby>{RESULT_TEXT.breakdown}</Ruby>
            <Icon name="chevron" size={13} className={open ? 'rotate-180' : ''} />
          </button>
        </div>
        <div className={`hr-chips hr-rank-parts ${open ? 'is-open' : ''}`}>
          {shownParts.map(p => <PartChip key={p.key} part={p} unit={unit} />)}
        </div>
      </div>
      {veiled && (
        <div className="hr-veil">
          <span className="hr-veil-rank font-mincho">{RANK_MARK[rank] ?? rank + 1}</span>
          <span className="font-mincho tracking-[0.4em] text-washi/45">？？？</span>
        </div>
      )}
    </div>
  );
}

interface ResultBoardProps {
  /** 1位から順に並べた結果 */
  entries: ResultEntry[];
  unit: 'pt' | 'yen';
  /** 勝者の判子の文字（優勝・長者） */
  winnerStamp: string;
  /** 明かす間隔(ms)。最終決算で順位を見たあとの結果画面は短くする */
  interval?: number;
  /** 全員を明かし終えた */
  onDone?: () => void;
}

export default function ResultBoard({ entries, unit, winnerStamp, interval = REVEAL_INTERVAL_MS, onDone }: ResultBoardProps) {
  const n = entries.length;
  const { shown, done, skip } = useRankReveal(n, interval);
  const max = Math.max(1, ...entries.map(e => e.total));
  const reduced = useReducedMotion();
  const cardEls = useRef<(HTMLDivElement | null)[]>([]);

  // 明かした札が画面の外なら、見える所まで寄せる（スマホ幅で4人だと下の順位が画面の外にある）
  useEffect(() => {
    if (shown <= 0) return;
    cardEls.current[n - shown]?.scrollIntoView({ block: 'nearest', behavior: reduced ? 'auto' : 'smooth' });
  }, [shown, n, reduced]);

  // 1位が出たらファンファーレ（紙吹雪は下の Confetti）
  useEffect(() => {
    if (!done) return;
    playFanfare();
    onDone?.();
    // onDone は呼び出し側で安定している前提（毎回の再描画で呼び直さない）
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  if (n === 0) return null;
  const [winner, ...rest] = entries;

  return (
    <div className="hr-board" onPointerDown={done ? undefined : skip} data-revealing={done ? undefined : 'true'}>
      {done && <Confetti variant="kin" mode="rain" count={64} seed={winner.playerIndex * 13 + n} />}
      <div className={`hr-podium ${n === 1 ? 'is-solo' : ''}`}>
        {/* 明かすたびに中身を置き直して、判子・数え上げ・棒の伸びをはじめから流す */}
        <WinnerCard
          key={`w-${isRankShown(0, n, shown)}`}
          entry={winner} rank={0} max={max} unit={unit}
          veiled={!isRankShown(0, n, shown)} stamp={winnerStamp}
          cardRef={el => { cardEls.current[0] = el; }}
        />
        {rest.length > 0 && (
          <div className="hr-ranks">
            {rest.map((e, i) => (
              <RankCard
                key={`${e.playerIndex}-${isRankShown(i + 1, n, shown)}`}
                entry={e} rank={i + 1} max={max} unit={unit}
                veiled={!isRankShown(i + 1, n, shown)}
                cardRef={el => { cardEls.current[i + 1] = el; }}
              />
            ))}
          </div>
        )}
      </div>
      <p className={`hr-skip-hint font-mincho ${done ? 'is-done' : ''}`} aria-hidden={done || undefined}>
        <Ruby>{RESULT_TEXT.tapToSkip}</Ruby>
      </p>
    </div>
  );
}
