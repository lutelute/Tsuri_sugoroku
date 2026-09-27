// まちづくり: 月末の市政レポート（収支・人口・発展/衰退・災害・ニュース）
import { useShallow } from 'zustand/react/shallow';
import { useGameStore } from '../../store/useGameStore';
import { calendarLabel, BUILDING_INFO, getTownInfo } from '../../game/city';
import Button from '../shared/Button';
import Ruby from '../shared/Ruby';

export default function CityReportOverlay() {
  const { report, players, ack, turn, maxTurns } = useGameStore(
    useShallow(s => ({ report: s.cityReport, players: s.players, ack: s.acknowledgeCityReport, turn: s.turn, maxTurns: s.settings.maxTurns })),
  );
  if (!report) return null;
  const cal = calendarLabel(report.turn);
  const next = calendarLabel(turn);
  const left = maxTurns > 0 ? maxTurns - turn + 1 : null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="washi-card rounded-2xl p-5 w-[92%] max-w-md max-h-[90vh] overflow-y-auto">
        <div className="text-center mb-3">
          <p className="text-[11px] tracking-[0.3em] text-[#7a5a2a]"><Ruby>市政だより</Ruby></p>
          <h3 className="font-mincho text-2xl font-bold text-[#2a2118]">
            {cal.year}<Ruby>年目</Ruby> {cal.month}<Ruby>月の決算</Ruby>
          </h3>
          {left !== null && (
            <p className="text-xs text-[#6b5a44] mt-0.5">
              <Ruby>次は</Ruby>{next.year}<Ruby>年目</Ruby>{next.month}<Ruby>月</Ruby>・<Ruby>残り</Ruby><span className="tabular-nums">{left}</span><Ruby>か月</Ruby>
            </p>
          )}
        </div>

        <table className="w-full text-sm mb-3">
          <thead>
            <tr className="text-[11px] text-[#6b5a44] border-b border-[#c9b48a]">
              <th className="text-left font-normal py-1"><Ruby>名前</Ruby></th>
              <th className="text-right font-normal"><Ruby>収入</Ruby></th>
              <th className="text-right font-normal"><Ruby>維持費</Ruby></th>
              <th className="text-right font-normal"><Ruby>人口</Ruby></th>
              <th className="text-right font-normal"><Ruby>発展</Ruby></th>
            </tr>
          </thead>
          <tbody>
            {report.players.map((r, i) => (
              <tr key={i} className="border-b border-[#e0d0ac] text-[#2a2118]">
                <td className="py-1.5">
                  <span className="inline-block w-2.5 h-2.5 rounded-full mr-1.5 align-middle" style={{ backgroundColor: players[i]?.color }} />
                  <span className="font-bold font-mincho">{players[i]?.name}</span>
                </td>
                <td className="text-right tabular-nums text-[#1f6b3a]">+¥{r.income.toLocaleString()}</td>
                <td className="text-right tabular-nums text-[#a92e1d]">{r.upkeep ? `−¥${r.upkeep.toLocaleString()}` : '—'}</td>
                <td className="text-right tabular-nums">
                  {r.population.toLocaleString()}
                  {r.populationDelta !== 0 && (
                    <span className={`text-[10px] ml-0.5 ${r.populationDelta > 0 ? 'text-[#1f6b3a]' : 'text-[#a92e1d]'}`}>
                      ({r.populationDelta > 0 ? '+' : ''}{r.populationDelta})
                    </span>
                  )}
                </td>
                <td className="text-right text-[11px]">
                  {r.grown > 0 && <span className="text-[#1f6b3a]">▲{r.grown}</span>}
                  {r.declined > 0 && <span className="text-[#a92e1d] ml-1">▼{r.declined}</span>}
                  {r.grown === 0 && r.declined === 0 && <span className="text-[#9a8a70]">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {report.disasters.map((d, i) => (
          <div key={i} className="mb-2 rounded-lg bg-[#a92e1d]/10 border border-[#a92e1d]/30 p-2">
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
        ))}

        {report.headlines.length > 0 && (
          <ul className="mb-3 text-xs text-[#4a3a28] space-y-0.5">
            {report.headlines.map((h, i) => (
              <li key={i}>📰 <Ruby>{h}</Ruby></li>
            ))}
          </ul>
        )}

        <Button onClick={ack} variant="primary" size="md" className="w-full"><Ruby>次の月へ</Ruby></Button>
      </div>
    </div>
  );
}
