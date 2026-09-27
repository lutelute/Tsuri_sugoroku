import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useGameStore } from '../../store/useGameStore';
import { calculateScore } from '../../game/scoring';
import { cityScore } from '../../game/city';
import { getEquippedLevel } from '../../game/equipment';
import Icon from '../shared/Icon';
import Ruby from '../shared/Ruby';

// 画面下のプレイヤー欄（コンパクト版）。釣りモードは現在の得点、まちづくりモードは総資産と人口を表示。
export default function AllPlayersBar() {
  const { players, currentPlayerIndex, encyclopedias, city } = useGameStore(
    useShallow(s => ({ players: s.players, currentPlayerIndex: s.currentPlayerIndex, encyclopedias: s.encyclopedias, city: s.city })),
  );

  const scores = useMemo(
    () => players.map((p, i) => (city ? null : calculateScore(p, encyclopedias[i] ?? {}).total)),
    [players, encyclopedias, city],
  );
  const citySc = useMemo(() => (city ? players.map((p, i) => cityScore(city, i, p.money)) : null), [players, city]);

  return (
    <div className="flex gap-1.5 px-2 py-1.5 overflow-x-auto">
      {players.map((p, i) => {
        const active = i === currentPlayerIndex;
        return (
          <div
            key={p.id}
            className={`min-w-[150px] flex-1 rounded-lg px-2.5 py-1.5 border transition-all ${active ? 'bg-ai-700/70 shadow-lg' : 'bg-ai-900/45 opacity-75'}`}
            style={{ borderColor: active ? p.color : 'rgba(212,168,67,0.15)' }}
          >
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full shrink-0 ring-1 ring-white/30" style={{ backgroundColor: p.color }} />
              <span className="font-bold font-mincho text-[13px] truncate text-washi">{p.name}</span>
              {p.hasFinished && <span className="seal text-[8px] w-4 h-4 rounded-[3px] leading-none"><Ruby>着</Ruby></span>}
              <span className="ml-auto text-[12px] text-kin-300 tabular-nums flex items-center gap-0.5"><Icon name="coin" size={12} />¥{p.money.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-2.5 text-[11px] text-washi/70 mt-0.5">
              {citySc ? (
                <>
                  <span title="総資産（所持金＋建物）"><Ruby>総資産</Ruby> <b className="text-washi tabular-nums">¥{citySc[i].assets.toLocaleString()}</b></span>
                  <span title="人口"><Ruby>人口</Ruby> <b className="text-emerald-300 tabular-nums">{citySc[i].population.toLocaleString()}</b></span>
                  <span title="建物の数" className="text-washi/50">🏠{citySc[i].buildings}</span>
                </>
              ) : (
                <>
                  <span className="flex items-center gap-0.5"><Icon name="fish" size={12} className="text-ai-200" />{p.caughtFish.length}</span>
                  <span className="flex items-center gap-0.5" title="現在の得点"><Icon name="trophy" size={12} className="text-kin-300" /><b className="text-washi tabular-nums">{(scores[i] ?? 0).toLocaleString()}</b>pt</span>
                </>
              )}
              {active && (
                <span className="ml-auto flex items-center gap-1.5 text-washi/60" title="装着中の装備レベル（竿/リール/ルアー）">
                  <span className="flex items-center"><Icon name="rod" size={11} />{getEquippedLevel(p.equipment, 'rod') || '×'}</span>
                  <span className="flex items-center"><Icon name="reel" size={11} />{getEquippedLevel(p.equipment, 'reel') || '×'}</span>
                  <span className="flex items-center"><Icon name="lure" size={11} />{getEquippedLevel(p.equipment, 'lure') || '×'}</span>
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
