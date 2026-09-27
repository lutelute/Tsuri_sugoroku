// まちづくり: 月末の市政レポート（収支・人口・発展/衰退・災害・ニュース）
// 瓦版の紙面のように、行が順に刷り上がり、収入と人口が数え上がる。
import { useEffect } from 'react';
import type { CSSProperties } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useGameStore } from '../../store/useGameStore';
import { calendarLabel, BUILDING_INFO, getTownInfo } from '../../game/city';
import type { CityPlayerReport } from '../../game/city';
import type { Player } from '../../game/types';
import Button from '../shared/Button';
import Ruby from '../shared/Ruby';
import Stamp from '../fx/Stamp';
import ScreenFlash from '../fx/ScreenFlash';
import { useCountUp } from '../fx/useCountUp';
import { playBad, playCardFlip } from '../../utils/sound';

const ROW_STAGGER_MS = 140;

function ReportRow({ r, player, index, top }: { r: CityPlayerReport; player: Player | undefined; index: number; top: boolean }) {
  const d = 250 + index * ROW_STAGGER_MS;
  const income = useCountUp(r.income, 900, 0, d);
  const pop = useCountUp(r.population, 900, Math.max(0, r.population - r.populationDelta), d);
  return (
    <div
      className="fx-rise relative grid grid-cols-[1fr_auto_auto_auto_auto] gap-x-2.5 items-center border-b border-[#e0d0ac] py-1.5 text-sm text-[#2a2118]"
      style={{ '--d': `${d}ms` } as CSSProperties}
    >
      <span className="flex items-center min-w-0">
        <span className="inline-block w-2.5 h-2.5 rounded-full mr-1.5 shrink-0" style={{ backgroundColor: player?.color }} />
        <span className="font-bold font-mincho truncate">{player?.name}</span>
        {top && (
          <span
            className="fx-stamp ml-1.5 shrink-0 rounded px-1.5 py-0.5 text-[11px]"
            style={{ animationDelay: `${d + 700}ms`, rotate: '-8deg', borderWidth: 2 }}
          >
            <Ruby>稼ぎ頭</Ruby>
          </span>
        )}
      </span>
      <span className="text-right tabular-nums text-[#1f6b3a] font-bold">+¥{income.toLocaleString()}</span>
      <span className="text-right tabular-nums text-[#a92e1d] text-xs">{r.upkeep ? `−¥${r.upkeep.toLocaleString()}` : '—'}</span>
      <span className="text-right tabular-nums">
        {pop.toLocaleString()}
        {r.populationDelta !== 0 && (
          <span className={`text-[10px] ml-0.5 ${r.populationDelta > 0 ? 'text-[#1f6b3a]' : 'text-[#a92e1d]'}`}>
            ({r.populationDelta > 0 ? '+' : ''}{r.populationDelta})
          </span>
        )}
      </span>
      <span className="text-right text-[12px] min-w-[3.2em]">
        {r.grown > 0 && (
          <span className="fx-pop font-bold text-[#1f6b3a]" style={{ '--d': `${d + 500}ms`, textShadow: '0 0 8px rgba(47,158,110,0.45)' } as CSSProperties}>
            ▲{r.grown}
          </span>
        )}
        {r.declined > 0 && (
          <span className="fx-pop text-[#a92e1d] ml-1" style={{ '--d': `${d + 600}ms` } as CSSProperties}>▼{r.declined}</span>
        )}
        {(r.vacated ?? 0) > 0 && (
          <span className="fx-pop text-[#6b5a44] ml-1" title="空き家になった建物（訪れて直せる）" style={{ '--d': `${d + 650}ms` } as CSSProperties}>空{r.vacated}</span>
        )}
        {r.grown === 0 && r.declined === 0 && !(r.vacated ?? 0) && <span className="text-[#9a8a70]">—</span>}
      </span>
    </div>
  );
}

export default function CityReportOverlay() {
  const { report, players, ack, turn, maxTurns } = useGameStore(
    useShallow(s => ({ report: s.cityReport, players: s.players, ack: s.acknowledgeCityReport, turn: s.turn, maxTurns: s.settings.maxTurns })),
  );
  // 市政だよりが届く紙の音。被害が出た月は少し遅れて凶の音
  const damaged = !!report?.disasters.some(d => d.damages.length > 0);
  useEffect(() => {
    if (!report) return;
    playCardFlip();
    if (!damaged) return;
    const t = window.setTimeout(playBad, 700);
    return () => clearTimeout(t);
  }, [report, damaged]);

  if (!report) return null;
  const cal = calendarLabel(report.turn);
  const next = calendarLabel(turn);
  const left = maxTurns > 0 ? maxTurns - turn + 1 : null;
  const nets = report.players.map(r => r.income - r.upkeep);
  const best = Math.max(...nets);
  const topIndex = best > 0 && nets.filter(n => n === best).length === 1 ? nets.indexOf(best) : -1;
  const hasDisaster = report.disasters.some(d => d.damages.length > 0);
  const afterRows = 250 + report.players.length * ROW_STAGGER_MS;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      {hasDisaster && <ScreenFlash color="#e34a33" opacity={0.25} />}
      <div className="washi-card animate-bounce-in rounded-2xl p-5 w-[92%] max-w-md max-h-[90vh] overflow-y-auto">
        {/* 紙面の題字 */}
        <div className="relative text-center mb-3 pb-2 border-b-2 border-double border-[#9a6f24]/50">
          <p className="text-[11px] tracking-[0.3em] text-[#7a5a2a]"><Ruby>市政だより</Ruby></p>
          <h3 className="font-brush text-3xl text-[#2a2118] leading-tight">
            {cal.year}<Ruby>年目</Ruby> {cal.month}<Ruby>月の決算</Ruby>
          </h3>
          {left !== null && (
            <p className="text-xs text-[#6b5a44] mt-0.5">
              <Ruby>次は</Ruby>{next.year}<Ruby>年目</Ruby>{next.month}<Ruby>月</Ruby>・<Ruby>残り</Ruby><span className="tabular-nums">{left}</span><Ruby>か月</Ruby>
            </p>
          )}
          <span className="absolute -right-1 -top-1">
            <Stamp tone="shu" size={40} delay={180} tilt={10}>決算</Stamp>
          </span>
        </div>

        <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-x-2.5 text-[11px] text-[#6b5a44] border-b border-[#c9b48a] pb-1">
          <span><Ruby>名前</Ruby></span>
          <span className="text-right"><Ruby>収入</Ruby></span>
          <span className="text-right"><Ruby>維持費</Ruby></span>
          <span className="text-right"><Ruby>人口</Ruby></span>
          <span className="text-right min-w-[3.2em]"><Ruby>発展</Ruby></span>
        </div>
        <div className="mb-3">
          {report.players.map((r, i) => (
            <ReportRow key={i} r={r} player={players[i]} index={i} top={i === topIndex} />
          ))}
        </div>

        {report.disasters.map((d, i) => (
          <div key={i} className="fx-rise mb-2" style={{ '--d': `${afterRows + i * 120}ms` } as CSSProperties}>
          <div
            className={`rounded-lg bg-[#a92e1d]/10 border border-[#a92e1d]/30 p-2 ${d.damages.length > 0 ? 'fx-shake' : ''}`}
            style={{ animationDelay: `${afterRows + i * 120 + 250}ms` }}
          >
            <p className="text-sm font-bold text-[#a92e1d] font-mincho">⚠ <Ruby>{d.title}</Ruby>（<Ruby>{d.area}</Ruby>）</p>
            {d.damages.length === 0 ? (
              <p className="text-xs text-[#6b5a44]"><Ruby>幸い被害はなかった</Ruby></p>
            ) : (
              <ul className="text-[11px] text-[#4a3a28] max-h-24 overflow-y-auto">
                {d.damages.map((x, j) => (
                  <li key={j}>
                    <span className="inline-block w-2 h-2 rounded-full mr-1" style={{ backgroundColor: players[x.owner]?.color }} />
                    <Ruby>{getTownInfo(x.nodeId)?.name ?? x.nodeId}</Ruby>の<Ruby>{BUILDING_INFO[x.kind].name}</Ruby>が{x.destroyed ? '全壊' : '損壊'}
                  </li>
                ))}
              </ul>
            )}
          </div>
          </div>
        ))}

        {report.headlines.length > 0 && (
          <ul className="mb-3 text-xs text-[#4a3a28] space-y-0.5">
            {report.headlines.map((h, i) => (
              <li key={i} className="fx-rise" style={{ '--d': `${afterRows + 200 + i * 90}ms` } as CSSProperties}>📰 <Ruby>{h}</Ruby></li>
            ))}
          </ul>
        )}

        <Button onClick={ack} variant="primary" size="md" className="w-full"><Ruby>次の月へ</Ruby></Button>
      </div>
    </div>
  );
}
