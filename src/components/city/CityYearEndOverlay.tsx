// まちづくり: 年度末（3月）の大決算。総資産の番付を数え上げ、称号を判子で押していく。
import { useEffect } from 'react';
import type { CSSProperties } from 'react';
import type { CityTitle } from '../../game/cityAwards';
import { useShallow } from 'zustand/react/shallow';
import { playFanfare } from '../../utils/sound';
import { useGameStore } from '../../store/useGameStore';
import { useCountUp } from '../fx/useCountUp';
import Stamp from '../fx/Stamp';
import Confetti from '../fx/Confetti';
import Button from '../shared/Button';
import Ruby from '../shared/Ruby';

const RANK_MARK = ['壱', '弐', '参', '肆'];

/** 称号ごとの判子の一文字（「九州・沖縄の顔役」のような長い称号も判子が読めるように） */
const TITLE_GLYPH: Record<CityTitle['id'], string> = {
  choja: '長',
  jinko: '人',
  denryoku: '電',
  kanko: '観',
  dokusen: '独',
  kogai: '公',
  kaoyaku: '顔',
};

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
      {/* 本文だけスクロールし、「新しい年度へ」は下に固定 */}
      <div className="washi-card animate-bounce-in rounded-2xl w-[94%] max-w-md max-h-[92dvh] flex flex-col overflow-hidden">
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-5">
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
        <div className="space-y-1.5 mb-4" data-guide="city-yearend">
          {ye.ranking.map((r, i) => {
            const p = players[r.playerIndex];
            return (
              <div key={r.playerIndex} className="fx-rise flex items-center gap-2 rounded-lg bg-[#2a2118]/5 border border-[#9a6f24]/25 px-2.5 py-2" style={{ '--d': `${200 + i * 250}ms` } as CSSProperties}>
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
            <div className="grid grid-cols-1 min-[380px]:grid-cols-2 gap-2">
              {ye.titles.map((t, i) => {
                const p = players[t.playerIndex];
                return (
                  <div key={`${t.id}-${t.name}`} className="fx-rise flex items-center gap-2 rounded-lg border px-2 py-1.5 bg-white/40 min-w-0" style={{ borderColor: p?.color, '--d': `${900 + i * 180}ms` } as CSSProperties}>
                    <Stamp tone={t.prize < 0 ? 'sumi' : t.prize === 0 ? 'kin' : 'shu'} size={40} delay={1000 + i * 180} tilt={-8}>{TITLE_GLYPH[t.id] ?? t.name.slice(0, 1)}</Stamp>
                    <span className="min-w-0 flex-1 leading-tight">
                      <span className="block font-brush text-[15px] text-[#2a2118] leading-snug"><Ruby>{t.name}</Ruby></span>
                      <span className="flex items-center gap-1 text-xs font-bold text-[#2a2118] min-w-0">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p?.color }} />
                        <span className="truncate">{p?.name}</span>
                      </span>
                      <span className="block text-[10px] text-[#6b5a44]"><Ruby>{t.reason}</Ruby></span>
                      {t.prize === 0 ? (
                        <span className="mt-0.5 inline-block rounded-sm border border-kin-600/50 bg-kin-300/30 px-1.5 text-[11px] font-bold text-[#7a5a2a] font-mincho" title="賞金はない。番付の名誉だけ">
                          <Ruby>名誉</Ruby>
                        </span>
                      ) : (
                        <span className={`block text-[11px] font-bold tabular-nums ${t.prize > 0 ? 'text-[#1f6b3a]' : 'text-[#a92e1d]'}`}>
                          {t.prize > 0 ? '+' : '−'}¥{Math.abs(t.prize).toLocaleString()}
                        </span>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        </div>
        <div className="shrink-0 border-t border-[#9a6f24]/25 px-4 pt-2.5 pb-[max(12px,env(safe-area-inset-bottom))]">
          <Button onClick={ack} variant="primary" size="md" className="w-full min-h-11 font-mincho tracking-widest"><Ruby>新しい年度へ</Ruby></Button>
        </div>
      </div>
    </div>
  );
}
