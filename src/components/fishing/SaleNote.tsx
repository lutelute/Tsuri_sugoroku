// 釣果の売値の内訳（まちづくりの魚市場）。釣果の画面に差し込む小さな部品。
// 釣り旅では何も出さない。ストアから自分で読むので props は見た目の調整だけ。
//   1行目: 魚市場での売値の合計と内訳（賑わい・漁場・物価）
//   2行目: 大物で町おこしが起きたとき
//   3行目: 7月の釣り大会の途中経過
import { useShallow } from 'zustand/react/shallow';
import { useGameStore } from '../../store/useGameStore';
import { NODE_MAP } from '../../data/boardNodes';
import { FISH_MARKET, fishPriceParts, priceBreakdownText } from '../../game/fishMarket';
import DerbyLine from '../city/DerbyLine';
import Icon from '../shared/Icon';
import Ruby from '../shared/Ruby';

export default function SaleNote({ className = '' }: { className?: string }) {
  const { sale, city, turn, players, seat } = useGameStore(
    useShallow(s => ({
      sale: s.fishingState?.sale,
      city: s.city,
      turn: s.turn,
      players: s.players,
      seat: s.currentPlayerIndex,
    })),
  );
  const nodeId = players[seat]?.currentNode ?? '';
  if (!sale || !city) return null;

  const breakdown = priceBreakdownText(fishPriceParts(city, nodeId, turn));

  return (
    <div className={`tk-sale rounded-lg bg-ai-950/50 border border-kin-500/25 px-3 py-2 text-left space-y-1 ${className}`} data-guide="fish-sale">
      <p className="text-sm text-washi flex items-center gap-1.5 flex-wrap">
        <Icon name="coin" size={15} className="text-kin-300 shrink-0" />
        <span className="font-mincho"><Ruby>魚市場</Ruby></span>
        <span className="text-emerald-300 font-bold tabular-nums">¥{sale.total.toLocaleString()}</span>
        {breakdown && <span className="text-[11px] text-washi/60"><Ruby>{breakdown}</Ruby></span>}
      </p>
      {sale.boom && (
        <p className="text-xs text-kin-200 flex items-center gap-1.5">
          <span className="seal px-1.5 py-0.5 rounded font-mincho text-[10px] font-bold leading-none shrink-0"><Ruby>町おこし</Ruby></span>
          <span><Ruby>{NODE_MAP.get(nodeId)?.name ?? ''}</Ruby><Ruby>に</Ruby><span className="tabular-nums">{FISH_MARKET.boomMonths}</span><Ruby>か月の特需</Ruby></span>
        </p>
      )}
      <DerbyLine compact />
    </div>
  );
}
