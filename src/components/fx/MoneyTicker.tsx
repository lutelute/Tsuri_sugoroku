import { useMoneyDelta } from './useMoneyDelta';
import type { MoneySound } from './useMoneyDelta';

interface MoneyTickerProps {
  value: number;
  /** true の間は変化をため、解除したときにポップする */
  hold?: boolean;
  /** 初回表示でこの値から数え上げ、差分をポップする */
  initialFrom?: number;
  className?: string;
  popClassName?: string;
  sound?: MoneySound;
}

/** 所持金表示: 増減すると数字が数え上がり、「+¥1,200」が浮かんで消える。 */
export default function MoneyTicker({ value, hold = false, initialFrom, className = '', popClassName = 'text-sm', sound = 'both' }: MoneyTickerProps) {
  const { shown, pops, removePop } = useMoneyDelta(value, hold, initialFrom, sound);
  return (
    <span className={`relative inline-flex items-baseline ${className}`}>
      <span className="tabular-nums">¥{shown.toLocaleString()}</span>
      <span className="sr-only" aria-live="polite">
        {pops.length > 0 ? `${pops[pops.length - 1].delta > 0 ? '増えた' : '減った'} ${Math.abs(pops[pops.length - 1].delta)}円` : ''}
      </span>
      {pops.map(p => (
        <span
          key={p.id}
          aria-hidden="true"
          className={`fx-money-pop ${p.delta > 0 ? 'is-gain' : 'is-loss'} ${popClassName}`}
          onAnimationEnd={() => removePop(p.id)}
        >
          {p.delta > 0 ? '+' : '−'}¥{Math.abs(p.delta).toLocaleString()}
        </span>
      ))}
    </span>
  );
}
