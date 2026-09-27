import { useEffect, useState } from 'react';
import { useCountUp } from './useCountUp';
import { playCoinGain, playCoinLoss } from '../../utils/sound';

/** 増減のときに鳴らす音: both=増減とも / gain=増えたときだけ / none=鳴らさない */
export type MoneySound = 'both' | 'gain' | 'none';

export interface MoneyPop {
  id: number;
  delta: number;
}

/**
 * 所持金の変化を検知して「+¥1,200」のポップと数え上げ表示を作る。
 * ストアは変えず、表示側で前回値と比べるだけ。
 * hold=true の間（オーバーレイで隠れている等）は変化をため、解除したときにまとめて見せる。
 * initialFrom を渡すと、初回表示でその値からの差分をポップする（例: 休憩所の +¥500）。
 */
export function useMoneyDelta(value: number, hold = false, initialFrom?: number, sound: MoneySound = 'both') {
  const [base, setBase] = useState(initialFrom ?? value);
  const [pops, setPops] = useState<MoneyPop[]>([]);
  const [seq, setSeq] = useState(0);

  // 描画中に前回値と比べて状態を調整する（React 推奨の「props 変化に合わせた state 調整」）
  if (!hold && value !== base) {
    const id = seq + 1;
    const delta = value - base;
    setBase(value);
    setSeq(id);
    setPops(ps => [...ps.slice(-2), { id, delta }]);
  }

  const shown = useCountUp(hold ? base : value, 850, initialFrom);
  const removePop = (id: number) => setPops(ps => ps.filter(p => p.id !== id));
  const last = pops.length > 0 ? pops[pops.length - 1] : null;

  // ポップが出たら「チャリン」（同時に複数出ても sound 側で間引かれる）
  const lastId = last?.id ?? 0;
  const lastDelta = last?.delta ?? 0;
  useEffect(() => {
    if (lastId === 0 || sound === 'none') return;
    if (lastDelta > 0) playCoinGain();
    else if (lastDelta < 0 && sound === 'both') playCoinLoss();
  }, [lastId, lastDelta, sound]);

  return { shown, pops, removePop, last };
}
