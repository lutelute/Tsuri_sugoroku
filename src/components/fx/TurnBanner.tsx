import { useEffect } from 'react';
import Ruby from '../shared/Ruby';
import { playTurn } from '../../utils/sound';

interface TurnBannerProps {
  name: string;
  color: string;
  /** 「5巡目」「2年目 4月」など */
  sub?: string;
}

/**
 * 「〇〇の番」の帯が画面を横切る（桃鉄の手番表示のような一過性の演出）。
 * 手番が始まるたびに key を変えてマウントし直す。操作は妨げない。
 */
export default function TurnBanner({ name, color, sub }: TurnBannerProps) {
  useEffect(() => {
    playTurn();
  }, []);
  return (
    <div className="fx-turn-banner" aria-hidden="true">
      <div className="fx-turn-banner-band py-2.5">
        <div className="fx-turn-banner-text flex items-center justify-center gap-3 px-6">
          <span className="w-3 h-12 rounded-sm shrink-0" style={{ background: color, boxShadow: `0 0 14px ${color}` }} />
          <div className="text-center">
            {sub && <p className="text-[11px] tracking-[0.35em] text-kin-300/80 font-mincho leading-none mb-1"><Ruby>{sub}</Ruby></p>}
            <p className="font-brush text-4xl leading-none text-washi" style={{ textShadow: `0 2px 0 #0a1a2c, 0 0 18px ${color}88` }}>
              {name}
              <span className="font-mincho text-xl text-kin-300 ml-2 align-middle"><Ruby>の番</Ruby></span>
            </p>
          </div>
          <span className="w-3 h-12 rounded-sm shrink-0" style={{ background: color, boxShadow: `0 0 14px ${color}` }} />
        </div>
      </div>
    </div>
  );
}
