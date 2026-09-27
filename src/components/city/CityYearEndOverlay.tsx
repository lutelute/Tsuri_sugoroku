// まちづくり: 年度末（3月）の大決算。総資産の番付を数え上げ、称号を判子で押していく。
import { useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { playFanfare } from '../../utils/sound';
import { useGameStore } from '../../store/useGameStore';
import { useCountUp } from '../fx/useCountUp';
import Stamp from '../fx/Stamp';
import Confetti from '../fx/Confetti';
import Button from '../shared/Button';
import Ruby from '../shared/Ruby';

const RANK_MARK = ['壱', '弐', '参', '肆'];

function Money({ value, delay }: { value: number; delay: number }) {
  const shown = useCountUp(value, 1100, 0, delay);
  return <span className="tabular-nums">¥{shown.toLocaleString()}</span>;
}

export default function CityYearEndOverlay() {
  const { ye, players, ack, turn, maxTurns } = useGameStore(
    useShallow(s => ({ ye: s.cityYearEnd, players: s.players, ack: s.acknowledgeCityYearEnd, turn: s.turn, maxTurns: s.settings.maxTurns })),
  );
  // 年度末の大決算は太鼓と琴で祝う
  useEffect(() => {
    if (ye) playFanfare();
  }, [ye]);

  if (!ye) return null;
  const monthsLeft = maxTurns > 0 ? maxTurns - turn + 1 : null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/65 backdrop-blur-sm">
      <Confetti variant="festive" mode="burst" count={48} seed={ye.year * 7} originY="30%" />
      <div className="washi-card rounded-2xl p-5 w-[92%] max-w-md max-h-[92vh] overflow-y-auto">
        <div className="text-center mb-3">
          <p className="text-[11px] tracking-[0.35em] text-[#7a5a2a]"><Ruby>年度末</Ruby></p>
          <h3 className="font-brush text-3xl text-[#2a2118]">
            {ye.year}<Ruby>年度</Ruby> <Ruby>大決算</Ruby>
          </h3>
          {monthsLeft !== null && (
            <p className="text-xs text-[#6b5a44] mt-0.5"><Ruby>残り</Ruby><span className="tabular-nums">{monthsLeft}</span><Ruby>か月</Ruby></p>
          )}
        </div>

        {/* 番付 */}
        <div className="space-y-1.5 mb-4">
          {ye.ranking.map((r, i) => {
            const p = players[r.playerIndex];
            return (
              <div key={r.playerIndex} className="fx-rise flex items-center gap-2 rounded-lg bg-[#2a2118]/5 border border-[#9a6f24]/25 px-2.5 py-2" style={{ '--d': `${200 + i * 250}ms` } as React.CSSProperties}>
                <span className="w-7 h-7 shrink-0 rounded-md flex items-center justify-center font-mincho font-bold text-white" style={{ background: i === 0 ? '#c63a26' : '#7a5a2a' }}>
                  {RANK_MARK[i] ?? i + 1}
                </span>
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: p?.color }} />
                <span className="font-bold font-mincho text-[#2a2118] truncate">{p?.name}</span>
                <span className="ml-auto text-right leading-tight">
                  <span className="block font-bold text-[#2a2118]"><Money value={r.assets} delay={300 + i * 250} /></span>
                  <span className={`block text-[11px] tabular-nums ${r.assetsDelta >= 0 ? 'text-[#1f6b3a]' : 'text-[#a92e1d]'}`}>
                    <Ruby>前年比</Ruby> {r.assetsDelta >= 0 ? '+' : '−'}¥{Math.abs(r.assetsDelta).toLocaleString()}
                  </span>
                </span>
              </div>
            );
          })}
        </div>

        {/* 称号 */}
        {ye.titles.length > 0 && (
          <div className="mb-4">
            <p className="text-center text-xs text-[#7a5a2a] mb-2 tracking-widest"><Ruby>今年度の称号</Ruby></p>
            <div className="grid grid-cols-2 gap-2">
              {ye.titles.map((t, i) => {
                const p = players[t.playerIndex];
                return (
                  <div key={t.id} className="fx-rise flex items-center gap-2 rounded-lg border px-2 py-1.5 bg-white/40" style={{ borderColor: p?.color, '--d': `${900 + i * 180}ms` } as React.CSSProperties}>
                    <Stamp tone={t.prize < 0 ? 'sumi' : 'shu'} size={40} delay={1000 + i * 180} tilt={-8}>{t.name}</Stamp>
                    <span className="min-w-0 leading-tight">
                      <span className="block text-xs font-bold text-[#2a2118] truncate">{p?.name}</span>
                      <span className="block text-[10px] text-[#6b5a44] truncate"><Ruby>{t.reason}</Ruby></span>
                      <span className={`block text-[11px] font-bold tabular-nums ${t.prize >= 0 ? 'text-[#1f6b3a]' : 'text-[#a92e1d]'}`}>
                        {t.prize >= 0 ? '+' : '−'}¥{Math.abs(t.prize).toLocaleString()}
                      </span>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <Button onClick={ack} variant="primary" size="md" className="w-full"><Ruby>新しい年度へ</Ruby></Button>
      </div>
    </div>
  );
}
