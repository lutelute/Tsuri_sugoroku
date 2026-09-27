// まちづくり: 町の区画パネル。建設・再開発・買収と、寄り道（釣り/釣具店/祭り/湯治）への入口。
import { useEffect, useMemo, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useGameStore } from '../../store/useGameStore';
import { NODE_MAP } from '../../data/boardNodes';
import {
  getTownInfo, computeAllStats, plotIncome, poweredTownsWithBuildings, buildCost, upgradeCost, acquireCost, renovateCost,
  isUpgradable, canBuild, monopolyOwner, effectiveLandValue, BUILDING_INFO, TOWN_CLASS_INFO, MAX_BUILDING_LEVEL,
  CITY_ACTIONS_PER_VISIT, CITY_ECONOMY, TIER_LABEL, calendarLabel,
} from '../../game/city';
import type { BuildingKind, TownStats } from '../../game/city';
import BuildingGlyph from './BuildingGlyph';
import CardPlayBar from './CardPlayBar';
import { CardIcon } from './CardHand';
import CardShop from './CardShop';
import SpecialtyCard from './SpecialtyCard';
import { hasCardShop } from '../../game/cityCards';
import Button from '../shared/Button';
import Icon from '../shared/Icon';
import Ruby from '../shared/Ruby';
import { playBuild, playStamp } from '../../utils/sound';
import { useReducedMotion } from '../fx/useReducedMotion';

/** 祭りの提灯の小さな印（絵文字の代わり） */
function LanternIcon({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true" className="shrink-0">
      <rect x="5.5" y="1" width="5" height="1.6" rx="0.5" fill="#1a1510" />
      <ellipse cx="8" cy="8" rx="5.2" ry="5.4" fill="#e34a33" />
      <path d="M3.4 6.4h9.2M3 8.2h10M3.4 10h9.2" stroke="#a92e1d" strokeWidth="0.6" />
      <rect x="5.5" y="13.2" width="5" height="1.6" rx="0.5" fill="#1a1510" />
    </svg>
  );
}

function DemandBar({ label, value }: { label: string; value: number }) {
  const v = Math.max(-2, Math.min(2, value));
  const h = Math.abs(v) / 2; // 0..1
  const pos = v >= 0;
  return (
    <div className="flex flex-col items-center gap-0.5" title={`${label}の需要 ${value > 0 ? '+' : ''}${value}`}>
      <div className="relative w-3 h-10 bg-ai-950/60 rounded-sm border border-kin-500/20 overflow-hidden">
        <div className="absolute left-0 right-0 top-1/2 h-px bg-washi/30" />
        <div
          className={`absolute left-0 right-0 ${pos ? 'bg-emerald-400' : 'bg-shu-500'}`}
          style={pos ? { bottom: '50%', height: `${h * 50}%` } : { top: '50%', height: `${h * 50}%` }}
        />
      </div>
      <span className="text-[10px] text-washi/70 font-mincho">{label}</span>
    </div>
  );
}

function Stat({ label, value, tone = 'text-washi' }: { label: string; value: React.ReactNode; tone?: string }) {
  return (
    <div className="bg-ai-950/40 rounded-lg px-2 py-1 border border-kin-500/15 min-w-0">
      <div className="text-[10px] text-washi/50 leading-tight"><Ruby>{label}</Ruby></div>
      <div className={`text-sm font-bold tabular-nums leading-tight ${tone}`}>{value}</div>
    </div>
  );
}

export default function CityOverlay() {
  const { city, players, currentPlayerIndex, cityActionsThisTurn, cityBonusActions, capitalDoneThisTurn, cityBuild, cityUpgrade, cityAcquire, cityRenovate, setTurnPhase } = useGameStore(
    useShallow(s => ({
      city: s.city,
      players: s.players,
      currentPlayerIndex: s.currentPlayerIndex,
      cityActionsThisTurn: s.cityActionsThisTurn,
      cityBonusActions: s.cityBonusActions,
      capitalDoneThisTurn: s.capitalDoneThisTurn,
      cityBuild: s.cityBuild,
      cityUpgrade: s.cityUpgrade,
      cityAcquire: s.cityAcquire,
      cityRenovate: s.cityRenovate,
      setTurnPhase: s.setTurnPhase,
    })),
  );
  const [selected, setSelected] = useState<number | null>(null);
  const [showShop, setShowShop] = useState(false);
  const buyCityCard = useGameStore(s => s.buyCityCard);
  const cityBuySpecialty = useGameStore(s => s.cityBuySpecialty);
  const turn = useGameStore(s => s.turn);
  const handSize = useGameStore(s => s.cityCards?.hands[s.currentPlayerIndex]?.length ?? 0);
  const [error, setError] = useState<string | null>(null);
  const reduced = useReducedMotion();
  const actionRef = useRef<HTMLDivElement>(null);

  // 区画を選んだら、建てる/再開発の操作が見える位置まで寄せる（スマホでは区画の下が画面外になりやすい）
  useEffect(() => {
    if (selected === null) return;
    actionRef.current?.scrollIntoView({ block: 'nearest', behavior: reduced ? 'auto' : 'smooth' });
  }, [selected, reduced]);

  const player = players[currentPlayerIndex];
  const nodeId = player?.currentNode ?? '';
  const node = NODE_MAP.get(nodeId);
  const info = getTownInfo(nodeId);
  const stats = useMemo(() => (city ? computeAllStats(city) : null), [city]);
  if (!city || !info || !node || !stats) return null;

  const town = city.towns[nodeId];
  const st: TownStats = stats.get(nodeId)!;
  const actionsMax = CITY_ACTIONS_PER_VISIT + cityBonusActions;
  const actionsLeft = actionsMax - cityActionsThisTurn;
  const mono = monopolyOwner(town);
  const sel = selected !== null ? town.plots[selected] : undefined;
  const tier = town.tier ?? 0;
  const land = effectiveLandValue(nodeId, town);
  const inspected = (city.inspections ?? []).some(x => x.nodeId === nodeId && x.playerIndex === currentPlayerIndex);

  const act = (fn: () => string | null, onDone?: () => void) => {
    const err = fn();
    setError(err);
    if (!err) {
      setSelected(null);
      onDone?.();
    }
  };

  const incomeOf = (idx: number) => {
    const p = town.plots[idx];
    if (!p) return 0;
    return plotIncome(p, nodeId, st, p.kind === 'power' ? poweredTownsWithBuildings(city, nodeId) : 0);
  };

  const isFishing = node.type === 'fishing' || node.type === 'fishing_special';
  const hasShop = node.type === 'shop' || !!node.shopTier;
  const isCapital = node.type === 'capital' && !!node.capitalEventId;
  const isRest = node.type === 'rest';

  return (
    <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-black/55 backdrop-blur-[2px]">
      {/* 本文だけをスクロールし、「町を出る」は下に固定（スマホの縦・横どちらでも常に押せる） */}
      <div className="panel-ai fx-rise rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[94dvh] sm:max-h-[90dvh] flex flex-col overflow-hidden relative">
        <button
          onClick={() => setTurnPhase('action_choice')}
          aria-label="閉じる"
          className="absolute top-2 right-2 z-10 w-10 h-10 flex items-center justify-center bg-ai-800/70 border border-kin-500/30 rounded-full text-washi/70 hover:text-washi transition cursor-pointer"
        >
          <Icon name="close" size={16} />
        </button>
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-5 space-y-3">

        {/* 見出し */}
        <div className="pr-11">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-mincho text-xl font-bold text-kin-300"><Ruby>{info.name}</Ruby></h3>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-kin-500/20 border border-kin-500/35 text-kin-200">
              <Ruby>{TOWN_CLASS_INFO[info.cls].name}</Ruby>
            </span>
            {tier > 0 && (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-shu-600/30 border border-shu-400/50 text-shu-100 font-mincho" title="人口が増えると発展度が上がり、区画と地価が増える">
                <Ruby>発展度</Ruby> {TIER_LABEL[tier]}
              </span>
            )}
            <span className="text-[11px] text-washi/55" title="建設費と資産価値に効く（発展度・幸福度・公害で変わる）">
              <Ruby>地価</Ruby> ×{land.toFixed(2)}
              {Math.abs(land - info.landValue) >= 0.01 && (
                <span className={land > info.landValue ? 'text-emerald-300' : 'text-shu-400'}> {land > info.landValue ? '▲' : '▼'}</span>
              )}
            </span>
            {mono !== null && (
              <span className="text-[11px] px-2 py-0.5 rounded-full border" style={{ borderColor: players[mono]?.color, color: players[mono]?.color }}>
                {players[mono]?.name}<Ruby>の独占</Ruby>（<Ruby>収入</Ruby>{CITY_ECONOMY.monopolyMul}<Ruby>倍</Ruby>）
              </span>
            )}
            {inspected && (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-700/30 border border-emerald-400/40 text-emerald-200" title="次の月末、この町のあなたの建物は発展しやすい">
                <Ruby>視察済み</Ruby>
              </span>
            )}
          </div>
          <p className="text-[11px] text-washi/50 mt-0.5"><Ruby>{node.description ?? ''}</Ruby></p>
        </div>

        {/* 名産（県庁のみ。他のマスでは何も出ない） */}
        <SpecialtyCard
          nodeId={nodeId}
          owners={city.specialties ?? {}}
          players={players}
          currentPlayerIndex={currentPlayerIndex}
          money={player.money}
          month={calendarLabel(turn).month}
          onBuy={() => act(() => cityBuySpecialty())}
          disabled={actionsLeft <= 0}
        />

        {/* 町の状態 */}
        <div className="flex gap-2 items-stretch">
          <div className="grid grid-cols-2 min-[420px]:grid-cols-4 gap-1.5 flex-1">
            <Stat label="人口" value={`${st.population.toLocaleString()}人`} />
            <Stat label="幸福度" value={st.happiness.toFixed(1)} tone={st.happiness >= 6 ? 'text-emerald-300' : st.happiness >= 3 ? 'text-washi' : 'text-shu-400'} />
            <Stat label="公害" value={st.pollution.toFixed(1)} tone={st.pollution >= 4 ? 'text-shu-400' : 'text-washi'} />
            <Stat label="電力" value={st.powered ? '送電中' : 'なし'} tone={st.powered ? 'text-kin-300' : 'text-shu-400'} />
          </div>
          <div className="flex gap-1.5 bg-ai-950/40 rounded-lg px-2 py-1 border border-kin-500/15" aria-label="需要">
            <DemandBar label="住" value={st.demand.r} />
            <DemandBar label="商" value={st.demand.c} />
            <DemandBar label="工" value={st.demand.i} />
          </div>
        </div>

        {/* 区画 */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-washi/60"><Ruby>区画</Ruby>（<Ruby>タップで選択</Ruby>）</span>
            <span className={`text-xs ${actionsLeft > 0 ? 'text-kin-300' : 'text-washi/40'}`}>
              <Ruby>工事</Ruby> <span className="tabular-nums">{actionsLeft}</span>/<span className="tabular-nums">{actionsMax}</span> <Ruby>回</Ruby>
            </span>
          </div>
          <div className="grid grid-cols-4 gap-1.5" data-guide="plots">
            {town.plots.map((p, i) => {
              const owner = p ? players[p.owner] : null;
              const isSel = selected === i;
              return (
                <button
                  key={i}
                  data-guide={p ? undefined : 'plot-empty'}
                  onClick={() => { setSelected(isSel ? null : i); setError(null); }}
                  className={`relative h-[74px] rounded-lg border transition cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                    isSel ? 'ring-2 ring-kin-300 bg-ai-600/60' : 'bg-ai-900/50 hover:bg-ai-700/60'
                  }`}
                  style={{ borderColor: owner ? owner.color : 'rgba(212,168,67,0.2)' }}
                >
                  {p ? (
                    <>
                      {p.vacant && <span className="absolute inset-0 rounded-lg bg-ai-950/55" aria-hidden="true" />}
                      {p.vacant && (
                        <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 z-10 text-[9px] px-1.5 rounded bg-washi/85 text-sumi font-bold"><Ruby>空き家</Ruby></span>
                      )}
                      {!p.vacant && (p.lowMonths ?? 0) > 0 && (
                        <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 z-10 text-[8.5px] px-1 rounded bg-shu-600/85 text-white whitespace-nowrap" title="需要が低い状態が続くと空き家になる。訪れる（視察）とリセットされる">
                          <Ruby>あと</Ruby>{CITY_ECONOMY.vacancyMonths - (p.lowMonths ?? 0)}<Ruby>か月で空き家</Ruby>
                        </span>
                      )}
                      <BuildingGlyph kind={p.kind} level={p.level} size={30} className={p.vacant ? 'grayscale opacity-60' : ''} />
                      <span className="text-[10px] text-washi/85 font-mincho leading-none"><Ruby>{BUILDING_INFO[p.kind].name}</Ruby></span>
                      {isUpgradable(p.kind) && (
                        <span className="text-[9px] text-kin-300 leading-none tracking-tighter">
                          {'★'.repeat(p.level)}{'☆'.repeat(MAX_BUILDING_LEVEL - p.level)}
                        </span>
                      )}
                      <span className="absolute top-0.5 left-1 w-2 h-2 rounded-full" style={{ backgroundColor: owner?.color }} />
                      <span className={`absolute top-0.5 right-1 text-[9px] tabular-nums ${incomeOf(i) >= 0 ? 'text-emerald-300/90' : 'text-shu-400'}`}>
                        {incomeOf(i) >= 0 ? '+' : ''}{incomeOf(i)}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="text-washi/25 text-2xl leading-none">＋</span>
                      <span className="text-[10px] text-washi/40"><Ruby>空き地</Ruby></span>
                    </>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* 選択中の区画の操作 */}
        {selected !== null && sel === null && (
          <div ref={actionRef} data-guide="build-options" className="fx-rise space-y-1.5 scroll-mb-3">
            <p className="text-xs text-washi/60"><Ruby>何を建てる？</Ruby>（<Ruby>所持金</Ruby> ¥{player.money.toLocaleString()}）</p>
            <div className="grid grid-cols-2 gap-1.5">
              {info.allowed.map((k: BuildingKind) => {
                const cost = buildCost(k, nodeId, town);
                const why = canBuild(city, nodeId, k, selected, player.money);
                const disabled = !!why || actionsLeft <= 0;
                return (
                  <button
                    key={k}
                    disabled={disabled}
                    onClick={() => act(() => cityBuild(selected, k), playBuild)}
                    title={why ?? BUILDING_INFO[k].desc}
                    className="min-h-11 flex items-center gap-2 text-left rounded-lg border border-kin-500/25 bg-ai-800/60 hover:bg-ai-700/70 px-2 py-1.5 transition cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed"
                  >
                    <BuildingGlyph kind={k} size={26} className="shrink-0" />
                    <span className="min-w-0">
                      <span className="block text-xs font-bold text-washi font-mincho"><Ruby>{BUILDING_INFO[k].name}</Ruby> <span className="text-kin-300 tabular-nums">¥{cost.toLocaleString()}</span></span>
                      <span className="block text-[10px] text-washi/55 leading-snug"><Ruby>{BUILDING_INFO[k].desc}</Ruby></span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {selected !== null && sel && (
          <div ref={actionRef} className="fx-rise rounded-lg border border-kin-500/25 bg-ai-900/50 p-2.5 space-y-1.5 scroll-mb-3">
            <div className="flex items-center gap-2">
              <BuildingGlyph kind={sel.kind} level={sel.level} size={32} />
              <div className="min-w-0">
                <p className="text-sm font-bold font-mincho text-washi">
                  <Ruby>{BUILDING_INFO[sel.kind].name}</Ruby>
                  {isUpgradable(sel.kind) && <span className="text-kin-300 text-xs ml-1"><Ruby>等級</Ruby>{sel.level}</span>}
                  <span className="text-xs ml-2" style={{ color: players[sel.owner]?.color }}>{players[sel.owner]?.name}</span>
                </p>
                <p className="text-[11px] text-washi/55"><Ruby>{BUILDING_INFO[sel.kind].desc}</Ruby></p>
                <p className="text-[11px] text-washi/70"><Ruby>今月の見込み</Ruby>: <span className="tabular-nums">{incomeOf(selected) >= 0 ? '+' : ''}¥{incomeOf(selected).toLocaleString()}</span></p>
              </div>
            </div>
            {sel.owner === currentPlayerIndex && sel.vacant ? (
              <Button
                onClick={() => act(() => cityRenovate(selected), playBuild)}
                variant="gold"
                size="sm"
                className="w-full min-h-11"
                disabled={actionsLeft <= 0 || player.money < renovateCost(sel, nodeId, town)}
              >
                <Ruby>空き家を直して入居者を呼び戻す</Ruby> ¥{renovateCost(sel, nodeId, town).toLocaleString()}
              </Button>
            ) : sel.owner === currentPlayerIndex ? (
              isUpgradable(sel.kind) && sel.level < MAX_BUILDING_LEVEL ? (
                <Button
                  onClick={() => act(() => cityUpgrade(selected), playBuild)}
                  variant="primary"
                  size="sm"
                  className="w-full min-h-11"
                  disabled={actionsLeft <= 0 || player.money < upgradeCost(sel, nodeId, town)}
                >
                  <Ruby>再開発して等級を上げる</Ruby> ¥{upgradeCost(sel, nodeId, town).toLocaleString()}
                </Button>
              ) : (
                <p className="text-[11px] text-washi/45 text-center">
                  <Ruby>{isUpgradable(sel.kind) ? '最高等級です' : 'この建物は再開発できません'}</Ruby>
                </p>
              )
            ) : (
              <Button
                onClick={() => act(() => cityAcquire(selected), playStamp)}
                variant="danger"
                size="sm"
                className="w-full min-h-11"
                disabled={actionsLeft <= 0 || player.money < acquireCost(sel, nodeId, town)}
              >
                <Ruby>買収する</Ruby> ¥{acquireCost(sel, nodeId, town).toLocaleString()}（<Ruby>代金は持ち主へ</Ruby>）
              </Button>
            )}
          </div>
        )}

        {error && <p className="fx-rise text-xs text-shu-200 text-center bg-shu-700/25 border border-shu-500/40 rounded-lg px-3 py-1.5" role="alert"><Ruby>{error}</Ruby></p>}

        {/* カード: 町で使える札（工事券・誘致・地上げ）と売り場 */}
        <CardPlayBar timing="in_town" compact />
        {hasCardShop(nodeId) && (
          <Button onClick={() => setShowShop(true)} variant="secondary" size="sm" className="w-full min-h-11">
            <span className="inline-flex items-center gap-1.5"><CardIcon size={16} /><Ruby>カード売り場</Ruby></span>
          </Button>
        )}
        {showShop && (
          <CardShop
            money={player.money}
            handSize={handSize}
            onBuy={id => { const err = buyCityCard(id); if (err) setError(err); }}
            onClose={() => setShowShop(false)}
          />
        )}

        {/* 寄り道 */}
        {(isFishing || hasShop || isCapital || isRest) && (
          <div className="grid grid-cols-2 gap-1.5 pt-1">
            {isFishing && (
              <Button onClick={() => setTurnPhase('fishing_choice')} variant="secondary" size="sm" className="min-h-11">
                <span className="inline-flex items-center gap-1.5"><Icon name="rod" size={15} /><Ruby>釣りをする</Ruby></span>
              </Button>
            )}
            {hasShop && (
              <Button onClick={() => setTurnPhase('shop')} variant="secondary" size="sm" className="min-h-11">
                <span className="inline-flex items-center gap-1.5"><Icon name="cart" size={15} /><Ruby>釣具店</Ruby></span>
              </Button>
            )}
            {isCapital && !capitalDoneThisTurn && (
              <Button onClick={() => setTurnPhase('capital_event')} variant="secondary" size="sm" className="min-h-11">
                <span className="inline-flex items-center gap-1.5"><LanternIcon /><Ruby>祭りに参加</Ruby></span>
              </Button>
            )}
            {isRest && (
              <Button onClick={() => setTurnPhase('rest')} variant="secondary" size="sm" className="min-h-11">
                <span className="inline-flex items-center gap-1.5"><Icon name="repair" size={15} /><Ruby>湯治（装備修理）</Ruby></span>
              </Button>
            )}
          </div>
        )}

        </div>

        {/* 下に固定: 工事の残りと「町を出る」。町を出るとそのまま手番を終える（行動選択の確認を挟まない）。
            右上の × は行動選択に戻る逃げ道（地図を見てから町を開き直せる） */}
        <div className="shrink-0 flex items-center gap-3 border-t border-kin-500/25 bg-ai-950/70 px-4 pt-2.5 pb-[max(10px,env(safe-area-inset-bottom))]">
          <span data-guide="actions-left" className={`shrink-0 text-xs font-mincho ${actionsLeft > 0 ? 'text-kin-300' : 'text-washi/45'}`}>
            <Ruby>工事</Ruby> <span className="tabular-nums text-sm font-bold">{actionsLeft}</span>/<span className="tabular-nums">{actionsMax}</span>
          </span>
          <Button onClick={() => setTurnPhase('turn_end')} variant="gold" size="md" className="flex-1 min-h-11 font-mincho tracking-widest">
            <Ruby>町を出る</Ruby>
            <span className="text-xs tracking-normal opacity-80 ml-1">（<Ruby>手番を終える</Ruby>）</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
