// 釣り大会（7月）の途中経過の1行。7月でなければ何も出さない。ストアから自分で読む。
// 町の帯（TownFishBand）・釣果の画面（SaleNote）・上部の季節の札の下の欄で同じ部品を使う。
import { useShallow } from 'zustand/react/shallow';
import { useGameStore } from '../../store/useGameStore';
import { derbyStandings } from '../../game/fishMarket';
import Ruby from '../shared/Ruby';

interface DerbyLineProps {
  className?: string;
  /** 短い形（上部の帯の下の欄など、幅が狭い所）。賞金の説明を省く */
  compact?: boolean;
}

export default function DerbyLine({ className = '', compact = false }: DerbyLineProps) {
  const { city, turn, players, seat } = useGameStore(
    useShallow(s => ({ city: s.city, turn: s.turn, players: s.players, seat: s.currentPlayerIndex })),
  );
  if (!city) return null;
  const derby = derbyStandings(city, turn, players.length);
  if (!derby) return null;
  const mine = derby.totals[seat] ?? 0;
  const leading = derby.leaders.includes(seat);
  const rival = !leading && derby.leaders.length ? players[derby.leaders[0]] : null;

  return (
    <p className={`tk-derby text-xs text-washi/85 leading-relaxed ${className}`} data-guide="fish-derby">
      <span className="inline-block mr-1.5 px-1.5 py-0.5 rounded bg-shu-600/85 text-washi font-mincho font-bold text-[11px] leading-none align-middle"><Ruby>釣り大会</Ruby></span>
      {!compact && (
        <span className="inline-block whitespace-nowrap mr-2">
          <Ruby>水揚げ1位に</Ruby> <span className="tabular-nums text-kin-300 font-bold">¥{derby.prize.toLocaleString()}</span>
        </span>
      )}
      <span className="inline-block whitespace-nowrap mr-1">
        <Ruby>今月の水揚げ</Ruby> <span className="tabular-nums text-kin-300 font-bold">¥{mine.toLocaleString()}</span>
      </span>
      <span className="inline-block whitespace-nowrap">
        {leading
          ? <span className="text-emerald-300 font-bold">（<Ruby>いま1位</Ruby>）</span>
          : rival
            ? <span className="text-washi/60">（<Ruby>1位</Ruby> {rival.name} <span className="tabular-nums">¥{derby.top.toLocaleString()}</span>）</span>
            : <span className="text-washi/60">（<Ruby>まだ誰も釣っていない</Ruby>）</span>}
      </span>
    </p>
  );
}
