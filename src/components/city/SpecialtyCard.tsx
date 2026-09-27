// まちづくり: 名産の札（町パネルに置く）。名産は県庁と、名物で知られる町にある。名産のない町では何も出さない。
// 名産の絵・名前・価格・今月の月収（季節込み）・持ち主・地方独占の進み具合を和紙の札で見せ、買う/買収するボタンを出す。
// 売買そのものは onBuy（ストア側）で行う。ここは表示だけの部品。
import { useEffect, useState } from 'react';
import { REALISTIC_NODES } from '../../data/realisticData_nodes';
import { SPECIALTY_REGION_NAME } from '../../data/citySpecialties';
import {
  getSpecialty, ownerOf, regionOfSpecialty, regionProgress, regionalMonopolies, specialtyBuyCost, specialtyIncome,
  specialtySeasonLabel, specialtySeasonMul, specialtyTitle, specialtyValue, SPECIALTY_ECONOMY,
} from '../../game/citySpecialties';
import type { SpecialtyOwners } from '../../game/citySpecialties';
import SpecialtyIcon from './SpecialtyIcon';
import Button from '../shared/Button';
import Ruby from '../shared/Ruby';
import Stamp from '../fx/Stamp';
import Confetti from '../fx/Confetti';
import ScreenFlash from '../fx/ScreenFlash';
import { playGood } from '../../utils/sound';

interface SpecialtyCardProps {
  nodeId: string;
  owners: SpecialtyOwners;
  players: { name: string; color: string }[];
  currentPlayerIndex: number;
  money: number;
  /** 今の暦の月（1〜12）。city.ts の calendarLabel(turn).month */
  month: number;
  onBuy: () => void;
  disabled?: boolean;
}

const TOWN_NAME = new Map(REALISTIC_NODES.map(n => [n.id, n.name]));
const SUMI_SOFT = '#5b4a36';
const SUMI_FAINT = '#7a6446';

function tint(color: string, pct: number): string {
  return `color-mix(in srgb, ${color} ${pct}%, transparent)`;
}

function Cell({ label, children, sub }: { label: string; children: React.ReactNode; sub?: string }) {
  return (
    <div className="rounded-lg border border-kin-600/30 bg-[#fffaf0]/70 px-2 py-1 min-w-0">
      <div className="text-[10px] leading-tight" style={{ color: SUMI_FAINT }}><Ruby>{label}</Ruby></div>
      <div className="text-sm font-bold tabular-nums leading-tight text-sumi truncate">{children}</div>
      {sub && <div className="text-[9px] leading-tight tabular-nums" style={{ color: SUMI_FAINT }}><Ruby>{sub}</Ruby></div>}
    </div>
  );
}

export default function SpecialtyCard({ nodeId, owners, players, currentPlayerIndex, money, month, onBuy, disabled = false }: SpecialtyCardProps) {
  const sp = getSpecialty(nodeId);
  const region = regionOfSpecialty(nodeId);
  const ownerNow = sp ? ownerOf(owners, nodeId) : null;
  // 買った瞬間（持ち主が自分に替わった）だけ判子、地方独占になったら金箔も
  const [prevOwner, setPrevOwner] = useState(ownerNow);
  const [celebrate, setCelebrate] = useState<null | 'buy' | 'acquire' | 'monopoly'>(null);
  const [showRegion, setShowRegion] = useState(false);
  if (ownerNow !== prevOwner) {
    setPrevOwner(ownerNow);
    if (ownerNow === currentPlayerIndex && region !== null) {
      setCelebrate(regionProgress(owners, region).monopolist === currentPlayerIndex ? 'monopoly' : prevOwner === null ? 'buy' : 'acquire');
    }
  }
  useEffect(() => {
    if (celebrate === 'monopoly') playGood();
  }, [celebrate]);
  if (!sp || region === null) return null;

  const regionName = SPECIALTY_REGION_NAME[region];
  const title = specialtyTitle(region);
  const owner = ownerOf(owners, nodeId);
  const ownerPlayer = owner !== null ? players[owner] : undefined;
  const isMine = owner === currentPlayerIndex;
  const prog = regionProgress(owners, region);
  const monopolized = owner !== null && prog.monopolist === owner;

  const mul = specialtySeasonMul(nodeId, month);
  const peak = mul >= SPECIALTY_ECONOMY.peakMul;
  const slack = mul <= 0.8;
  const income = specialtyIncome(nodeId, month, monopolized);
  const cost = specialtyBuyCost(owners, nodeId);
  const canAfford = money >= cost;
  const wouldMonopolize = !isMine && regionalMonopolies({ ...owners, [nodeId]: currentPlayerIndex })[region] === currentPlayerIndex;
  const monopolist = prog.monopolist !== null ? players[prog.monopolist] : undefined;
  const leader = prog.leader !== null ? players[prog.leader] : undefined;

  return (
    <section data-guide="specialty" className={`washi-card rounded-xl p-3 relative overflow-hidden ${celebrate ? 'fx-rise' : ''}`} aria-label={`名産 ${sp.name}`}>
      {celebrate === 'monopoly' && <Confetti variant="kin" mode="burst" count={40} seed={nodeId.length + currentPlayerIndex} originY="35%" />}
      {celebrate === 'monopoly' && <ScreenFlash color="#fff1c4" opacity={0.35} />}
      {/* 地方独占の朱印（独占した瞬間だけ押す音を鳴らす） */}
      {monopolized && (
        <span
          className="absolute top-2 right-2"
          title={`${ownerPlayer?.name ?? ''}が${regionName}の名産を独占中（名産収入${SPECIALTY_ECONOMY.monopolyMul}倍）`}
        >
          <Stamp tone="shu" size={46} delay={celebrate === 'monopoly' ? 350 : 0} tilt={8} silent={celebrate !== 'monopoly'}>顔役</Stamp>
        </span>
      )}
      {/* 買った印 */}
      {(celebrate === 'buy' || celebrate === 'acquire') && !monopolized && (
        <span className="absolute top-2 right-2 pointer-events-none">
          <Stamp tone={celebrate === 'buy' ? 'kin' : 'shu'} size={44} delay={80} tilt={8}>{celebrate === 'buy' ? '入手' : '買収'}</Stamp>
        </span>
      )}

      {/* 見出し */}
      <div className={`flex gap-3 items-start ${monopolized || celebrate ? 'pr-12' : ''}`}>
        <div className="shrink-0 w-16 h-16 rounded-lg bg-[#fffaf0] border border-kin-600/60 shadow-inner flex items-center justify-center relative">
          <SpecialtyIcon icon={sp.icon} size={48} />
          {peak && (
            <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 text-[10px] px-1.5 rounded-full bg-shu-600 text-white font-bold whitespace-nowrap shadow">
              <Ruby>旬</Ruby>
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] px-1.5 py-px rounded-sm bg-shu-600 text-white font-mincho tracking-widest"><Ruby>名産</Ruby></span>
            <span className="text-[10px]" style={{ color: SUMI_FAINT }}><Ruby>{`${TOWN_NAME.get(nodeId) ?? ''}・${regionName}`}</Ruby></span>
          </div>
          <h4 className="font-mincho font-bold text-lg text-sumi leading-tight mt-0.5"><Ruby>{sp.name}</Ruby></h4>
          <p className="text-[11px] leading-snug mt-0.5" style={{ color: SUMI_SOFT }}><Ruby>{sp.flavor}</Ruby></p>
        </div>
      </div>

      {/* 価格・月収・持ち主 */}
      <div className="grid grid-cols-3 gap-1.5 mt-2.5">
        <Cell label={owner === null || isMine ? '価格' : '買収額'}>
          ¥{(isMine ? specialtyValue(nodeId) : cost).toLocaleString()}
        </Cell>
        <Cell label="今月の月収" sub={`季節×${mul.toFixed(1)}${monopolized ? `・独占×${SPECIALTY_ECONOMY.monopolyMul}` : ''}`}>
          <span className={peak ? 'text-emerald-700' : slack ? 'text-shu-700' : ''}>+¥{income.toLocaleString()}</span>
        </Cell>
        <Cell label="持ち主">
          {ownerPlayer ? (
            <span className="inline-flex items-center gap-1 min-w-0">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: ownerPlayer.color }} />
              <span className="truncate" style={{ color: ownerPlayer.color }}>{ownerPlayer.name}</span>
            </span>
          ) : (
            <span className="text-kin-700"><Ruby>売り出し中</Ruby></span>
          )}
        </Cell>
      </div>
      <p className="text-[10px] mt-1" style={{ color: SUMI_FAINT }}>
        <Ruby>{`旬は${specialtySeasonLabel(nodeId)}。電気はいらず、自然には育たない`}</Ruby>
      </p>

      {/* 地方独占の進み具合 */}
      <div className="mt-2 rounded-lg border border-kin-600/30 bg-[#fffaf0]/60 p-2">
        <div className="flex items-center justify-between gap-2 text-[11px]">
          <span className="font-mincho font-bold text-sumi whitespace-nowrap"><Ruby>{`${regionName}の名産`}</Ruby></span>
          {monopolist ? (
            <span className="font-bold truncate" style={{ color: monopolist.color }}>
              {monopolist.name}<Ruby>{`が「${title}」（名産収入${SPECIALTY_ECONOMY.monopolyMul}倍）`}</Ruby>
            </span>
          ) : leader ? (
            <span className="tabular-nums truncate" style={{ color: SUMI_SOFT }}>
              <Ruby>最多</Ruby> <span style={{ color: leader.color }}>{leader.name}</span> {prog.leaderCount}/{prog.total}
            </span>
          ) : (
            <span className="tabular-nums" style={{ color: SUMI_FAINT }}><Ruby>{`まだ誰も持っていない 0/${prog.total}`}</Ruby></span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-1.5">
        <div className="flex flex-1 gap-0.5 h-1.5" aria-hidden="true">
          {prog.items.map(it => (
            <span
              key={it.nodeId}
              className="flex-1 rounded-full"
              style={{ backgroundColor: it.owner !== null ? players[it.owner]?.color : 'rgba(154,111,36,0.22)' }}
            />
          ))}
        </div>
          <button
            type="button"
            onClick={() => setShowRegion(v => !v)}
            aria-expanded={showRegion}
            className="shrink-0 min-h-10 px-2.5 rounded-md border border-kin-600/40 text-[11px] font-mincho text-sumi bg-[#fffaf0] hover:bg-white cursor-pointer"
          >
            <Ruby>{showRegion ? 'とじる' : '町を見る'}</Ruby>
          </button>
        </div>
        {showRegion && (
        <ul className="fx-rise mt-1.5 flex flex-wrap gap-1">
          {prog.items.map(it => {
            const c = it.owner !== null ? players[it.owner]?.color : undefined;
            const here = it.nodeId === nodeId;
            return (
              <li
                key={it.nodeId}
                className={`flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] ${here ? 'ring-1 ring-shu-500' : ''}`}
                style={{ borderColor: c ?? 'rgba(154,111,36,0.35)', backgroundColor: c ? tint(c, 14) : 'transparent' }}
                title={`${TOWN_NAME.get(it.nodeId) ?? ''}の${getSpecialty(it.nodeId)?.name ?? ''}：${it.owner !== null ? players[it.owner]?.name ?? '' : '売り出し中'}`}
              >
                <SpecialtyIcon nodeId={it.nodeId} size={16} />
                <span className="text-sumi"><Ruby>{TOWN_NAME.get(it.nodeId) ?? ''}</Ruby></span>
                <span
                  className="w-2 h-2 rounded-full"
                  style={c ? { backgroundColor: c } : { border: '1px dashed #9a6f24' }}
                />
              </li>
            );
          })}
        </ul>
        )}
      </div>

      {/* 買う・買収する */}
      {isMine ? (
        <p className="mt-2 text-center text-[11px]" style={{ color: SUMI_SOFT }}>
          <Ruby>{monopolized ? `あなたの名産。${regionName}を独占中で収入${SPECIALTY_ECONOMY.monopolyMul}倍` : 'あなたの名産。地方の名産をすべて集めると収入が倍になる'}</Ruby>
        </p>
      ) : (
        <div className="mt-2.5">
          {wouldMonopolize && (
            <p className="text-[11px] text-shu-700 font-bold text-center mb-1">
              <Ruby>{`手に入れると「${title}」！ ${regionName}の名産収入が${SPECIALTY_ECONOMY.monopolyMul}倍`}</Ruby>
            </p>
          )}
          <Button
            onClick={onBuy}
            variant={owner === null ? 'gold' : 'danger'}
            size="sm"
            className="w-full min-h-11"
            disabled={disabled || !canAfford}
          >
            {owner === null ? (
              <><Ruby>名産を買う</Ruby> <span className="tabular-nums">¥{cost.toLocaleString()}</span></>
            ) : (
              <><Ruby>買収する</Ruby> <span className="tabular-nums">¥{cost.toLocaleString()}</span>（<Ruby>代金は持ち主へ</Ruby>）</>
            )}
          </Button>
          {!canAfford && (
            <p className="text-[10px] text-shu-700 text-center mt-1">
              <Ruby>{`お金が足りない（あと¥${(cost - money).toLocaleString()}）`}</Ruby>
            </p>
          )}
        </div>
      )}
    </section>
  );
}
