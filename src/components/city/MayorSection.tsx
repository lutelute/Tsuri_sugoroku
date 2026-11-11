// まちづくり: 町パネルの「町長」の欄。今の町長と条例の札、町長なら条例を決める選択肢。
import { useState } from 'react';
import type { CityState } from '../../game/city';
import type { Player } from '../../game/types';
import type { OrdinanceKind } from '../../game/mayor';
import { ORDINANCE_INFO, ORDINANCE_KINDS, ORDINANCE_ECONOMY, canEnact, mayorStanding, ordinanceContext } from '../../game/mayor';
import MayorCrest from './MayorCrest';
import OrdinanceCard, { OrdinanceIcon } from './OrdinanceCard';
import Ruby from '../shared/Ruby';

interface MayorSectionProps {
  city: CityState;
  nodeId: string;
  players: Player[];
  currentPlayerIndex: number;
  money: number;
  turn: number;
  /** 条例を決める（null は今の条例をやめる） */
  onEnact: (kind: OrdinanceKind | null) => void;
}

export default function MayorSection({ city, nodeId, players, currentPlayerIndex, money, turn, onEnact }: MayorSectionProps) {
  const [open, setOpen] = useState(false);
  const town = city.towns[nodeId];
  if (!town) return null;
  // 建物がひとつもない町では出さない（空き地だけの町に町長の話は早い）
  if (!town.plots.some(Boolean) && !town.ordinance) return null;

  const { mine, need, mayor } = mayorStanding(town, currentPlayerIndex);
  const mayorPlayer = mayor !== null ? players[mayor] : undefined;
  const isMayor = mayor === currentPlayerIndex;
  const ord = town.ordinance;
  const active = !!ordinanceContext(town);
  const byPlayer = ord ? players[ord.by] : undefined;

  return (
    <div className="rounded-lg border border-kin-500/25 bg-ai-900/50 p-2.5 space-y-2" data-guide="mayor">
      <div className="flex items-center gap-2">
        <MayorCrest size={30} color={mayorPlayer?.color ?? '#6b5a44'} vacant={!mayorPlayer} ordinanceColor={active && ord ? ORDINANCE_INFO[ord.kind].color : undefined} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-mincho font-bold text-washi">
            <Ruby>町長</Ruby>：
            {mayorPlayer ? (
              <span style={{ color: mayorPlayer.color }}>{mayorPlayer.name}</span>
            ) : (
              <span className="text-washi/60"><Ruby>いない</Ruby></span>
            )}
            {isMayor && <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full bg-kin-500/25 border border-kin-400/50 text-kin-200 align-middle"><Ruby>あなた</Ruby></span>}
          </p>
          <p className="text-[10px] text-washi/55 leading-snug">
            <Ruby>{`区画の半分より多い建物（${need}つ以上）を持つと町長。あなたは${mine}つ`}</Ruby>
            {!isMayor && mine < need && <span className="text-kin-300"><Ruby>{`（あと${need - mine}つ）`}</Ruby></span>}
          </p>
        </div>
      </div>

      {ord ? (
        <OrdinanceCard kind={ord.kind} active={active} byName={byPlayer?.name} byColor={byPlayer?.color} />
      ) : (
        <p className="text-[11px] text-washi/45"><Ruby>この町には条例が出ていない</Ruby></p>
      )}
      {ord && !active && <p className="text-[10px] text-washi/50"><Ruby>町長がいないと、条例はお休み（効き目も負担もない）</Ruby></p>}

      {isMayor && (
        open ? (
          <div className="fx-rise space-y-1.5" data-guide="ordinance-options">
            <p className="text-[11px] text-washi/60"><Ruby>条例を決める</Ruby>（<Ruby>1か月に1回まで・工事の回数は使わない</Ruby>）</p>
            <div className="grid grid-cols-1 min-[420px]:grid-cols-2 gap-1.5">
              {ORDINANCE_KINDS.map(k => {
                const why = canEnact(city, nodeId, currentPlayerIndex, k, money, turn);
                const info = ORDINANCE_INFO[k];
                return (
                  <button
                    key={k}
                    type="button"
                    disabled={!!why}
                    onClick={() => { onEnact(k); setOpen(false); }}
                    title={why ?? info.effect}
                    className="min-h-11 flex items-center gap-2 text-left rounded-lg border border-kin-500/25 bg-ai-800/60 hover:bg-ai-700/70 px-2 py-1.5 transition cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed"
                  >
                    <OrdinanceIcon kind={k} size={26} />
                    <span className="min-w-0">
                      <span className="block text-xs font-bold text-washi font-mincho"><Ruby>{info.name}</Ruby></span>
                      <span className="block text-[10px] text-washi/60 leading-snug"><Ruby>{info.effect}</Ruby></span>
                      <span className="block text-[10px] text-kin-300/85 leading-snug"><Ruby>{`負担：${info.burden}`}</Ruby></span>
                    </span>
                  </button>
                );
              })}
              {ord && (
                <button
                  type="button"
                  disabled={!!canEnact(city, nodeId, currentPlayerIndex, null, money, turn)}
                  onClick={() => { onEnact(null); setOpen(false); }}
                  className="min-h-11 rounded-lg border border-shu-500/40 bg-shu-700/20 hover:bg-shu-700/35 px-2 py-1.5 text-xs text-shu-100 font-mincho transition cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed"
                >
                  <Ruby>{`今の条例（${ORDINANCE_INFO[ord.kind].name}）をやめる`}</Ruby>
                </button>
              )}
            </div>
            {ORDINANCE_ECONOMY.enactCost > 0 && <p className="text-[10px] text-washi/50"><Ruby>{`条例を決めるのに¥${ORDINANCE_ECONOMY.enactCost.toLocaleString()}かかる`}</Ruby></p>}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="w-full min-h-11 rounded-lg border border-kin-500/40 bg-kin-500/15 hover:bg-kin-500/25 px-3 py-2 text-sm font-mincho font-bold text-kin-200 transition cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed"
            data-guide="enact-open"
          >
            <Ruby>町長として条例を決める</Ruby>
          </button>
        )
      )}
    </div>
  );
}
