// 釣り方を選ぶ画面: 釣り場の札（何が釣れるか）→ 仕掛け3つ（数ねらい・ふつう・大物ねらい）→ 船釣り。
// 釣り旅でもまちづくりでも同じ画面（まちづくりは札の下に魚市場の値段と漁場の状態が出る）。
import { useShallow } from 'zustand/react/shallow';
import { useGameStore, MAX_FISHING_PER_TURN } from '../../store/useGameStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { FISHING_REELING_TIME_LIMIT_MS, REEL_TIME_EXTENSION } from '../../game/constants';
import { getEquippedItem } from '../../game/equipment';
import {
  getEffectiveLevel, getStrikeGreenZone, interpolateBonus, RIGS, RIG_ORDER, rigBlockReason, canQuickCatch, QUICK_CATCH_LEVEL,
} from '../../game/fishing';
import { boatFishingCost, expectedTownFishPrice, fishPriceParts, priceBreakdownText } from '../../game/fishMarket';
import type { PlayerEquipment } from '../../game/types';
import { NODE_MAP } from '../../data/boardNodes';
import Button from '../shared/Button';
import Icon from '../shared/Icon';
import Ruby from '../shared/Ruby';
import SpotCard from './SpotCard';
import RigGlyph from './RigGlyph';
import { FisheryChip } from '../city/TownFishBand';
import { playCoinLoss } from '../../utils/sound';

/** 図鑑がまだ無いとき用（毎回新しい空の入れ物を渡すと、札の集計をやり直してしまう） */
const NO_SEEN: Record<string, boolean> = {};

export default function FishingChoiceOverlay() {
  const {
    player, startFishing, startBoatFishing, setTurnPhase, boatFishingRemaining, nodeActionsThisTurn, city, turn, seen, isCity,
  } = useGameStore(
    useShallow(s => ({
      player: s.players[s.currentPlayerIndex],
      startFishing: s.startFishing,
      startBoatFishing: s.startBoatFishing,
      setTurnPhase: s.setTurnPhase,
      boatFishingRemaining: s.boatFishingRemaining,
      nodeActionsThisTurn: s.nodeActionsThisTurn,
      city: s.city,
      turn: s.turn,
      seen: s.encyclopedias[s.currentPlayerIndex],
      isCity: s.settings.mode === 'city',
    })),
  );
  const quickCatch = useSettingsStore(s => s.quickCatch);
  const toggleQuickCatch = useSettingsStore(s => s.toggleQuickCatch);

  const nodeId = player.currentNode;
  const node = NODE_MAP.get(nodeId);
  const boatCost = boatFishingCost(isCity ? city : null, turn);
  const canAffordBoat = player.money >= boatCost;
  const slotsLeft = Math.max(0, MAX_FISHING_PER_TURN - nodeActionsThisTurn);

  const rodItem = getEquippedItem(player.equipment, 'rod');
  const reelItem = getEquippedItem(player.equipment, 'reel');
  const lureItem = getEquippedItem(player.equipment, 'lure');
  const hasRod = !!rodItem;
  const hasReel = !!reelItem;
  const hasLure = !!lureItem;

  const missingWarnings: string[] = [];
  if (!hasReel) missingWarnings.push('リールなし: 巻き上げが困難');
  if (!hasLure) missingWarnings.push('ルアーなし: 当たりが遅くコモンのみ');

  // まちづくり: 魚市場（売値の見込みと漁場の状態）
  const market = isCity && city && node ? fishPriceParts(city, nodeId, turn) : null;
  const marketPrice = market && city ? expectedTownFishPrice(city, nodeId, turn, player.equipment) : 0;
  const marketBreakdown = market ? priceBreakdownText(market) : '';

  // 雑魚は手早く: 今の道具でどこまで省けるか
  const quickCommon = canQuickCatch('common', player.equipment);
  const quickUncommon = canQuickCatch('uncommon', player.equipment);
  const quickNote = quickUncommon ? 'コモンとアンコモンは、合わせたらすぐ釣り上げる'
    : quickCommon ? 'コモンは、合わせたらすぐ釣り上げる'
      : `「巻き」が ${QUICK_CATCH_LEVEL.common} になると、小物のやり取りを省ける`;

  const close = () => setTurnPhase('action_choice');

  return (
    <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm">
      {/* 本文だけをスクロールする（スマホは下から、広い画面は中央に2列） */}
      <div className="panel-ai rounded-t-2xl sm:rounded-2xl w-full sm:w-[94%] sm:max-w-3xl max-h-[94dvh] sm:max-h-[90dvh] flex flex-col overflow-hidden relative">
        {/* 閉じる */}
        <button
          onClick={close}
          aria-label="閉じる"
          className="absolute top-2 right-2 z-10 w-10 h-10 flex items-center justify-center bg-ai-800/70 border border-kin-500/30 rounded-full text-washi/70 hover:text-washi transition cursor-pointer"
        >
          <Icon name="close" size={16} />
        </button>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-5">
          <div className="pr-11 mb-3 flex items-baseline gap-x-3 gap-y-1 flex-wrap">
            <h3 className="text-xl font-mincho text-kin-300 ink-underline"><Ruby>釣り方を選ぼう</Ruby></h3>
            <p className="text-sm text-washi/60 flex items-center gap-1">
              <Icon name="coin" size={15} className="text-kin-300" />
              <Ruby>所持金</Ruby>: <span className="tabular-nums text-kin-300">¥{player.money.toLocaleString()}</span>
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:grid sm:grid-cols-2 sm:gap-4 sm:items-start">
            {/* 左の列（スマホでは 札 → 仕掛け → 道具の力 → 設定 の順に並べ直す） */}
            <div className="contents sm:block sm:space-y-3">
              <div className="order-1">
                <SpotCard
                  nodeId={nodeId}
                  equipment={player.equipment}
                  seen={seen ?? NO_SEEN}
                  caughtFish={isCity ? undefined : player.caughtFish}
                  selectOpts={market?.fishery.select}
                  footer={market && (
                    <div className="rounded-lg bg-ai-900/60 border border-kin-500/20 px-2.5 py-1.5 space-y-0.5">
                      <p className="text-xs text-washi/90 flex items-center gap-x-2 gap-y-1 flex-wrap">
                        <span className="inline-flex items-center gap-1">
                          <Icon name="coin" size={14} className="text-kin-300" />
                          <span className="font-mincho"><Ruby>魚市場</Ruby></span>
                        </span>
                        {marketPrice > 0 && (
                          <span><Ruby>1匹</Ruby> <Ruby>約</Ruby><span className="text-emerald-300 font-bold tabular-nums text-sm">¥{marketPrice.toLocaleString()}</span></span>
                        )}
                        <span className="inline-flex items-center gap-1"><Ruby>漁場</Ruby><FisheryChip fishery={market.fishery} /></span>
                      </p>
                      {(marketBreakdown || market.fishery.note) && (
                        <p className="text-[10px] text-washi/55 leading-snug">
                          <Ruby>{[marketBreakdown, market.fishery.note].filter(Boolean).join(' ／ ')}</Ruby>
                        </p>
                      )}
                    </div>
                  )}
                />
              </div>
              {/* 道具の力（ミニゲームでの効き目が見える） */}
              {hasRod && <div className="order-3"><GearPower equipment={player.equipment} /></div>}
            </div>

            {/* 右の列: 仕掛け・船釣り・設定 */}
            <div className="contents sm:block sm:space-y-3">
              <div className="order-2 space-y-2">
                {/* 装備なし警告 */}
                {!hasRod && (
                  <div className="bg-shu-500/20 border border-shu-500/40 rounded-lg p-3 text-center">
                    <p className="text-shu-400 font-mincho font-bold text-sm flex items-center justify-center gap-1.5">
                      <Icon name="rod" size={16} /><Ruby>釣竿がありません！</Ruby>
                    </p>
                    <p className="text-shu-400/70 text-xs mt-1"><Ruby>竿がないと釣りはできません。ショップで購入しましょう。</Ruby></p>
                  </div>
                )}
                {hasRod && missingWarnings.length > 0 && (
                  <div className="bg-kin-500/15 border border-kin-500/30 rounded-lg p-2">
                    {missingWarnings.map((w, i) => (
                      <p key={i} className="text-kin-300/90 text-xs">◆ <Ruby>{w}</Ruby></p>
                    ))}
                  </div>
                )}

                {/* 船釣り続行中 */}
                {boatFishingRemaining > 0 && (
                  <button
                    onClick={() => hasRod && startBoatFishing()}
                    disabled={!hasRod}
                    className={`w-full min-h-[60px] border rounded-xl px-3 py-2 text-left transition flex items-center gap-3
                      ${hasRod
                        ? 'bg-kin-500/20 hover:bg-kin-500/30 border-kin-500/40 cursor-pointer'
                        : 'bg-ai-800/40 border-kin-500/15 opacity-40 cursor-not-allowed'
                      }`}
                  >
                    <Icon name="boat" size={30} className="text-kin-300 shrink-0" />
                    <div>
                      <p className="font-mincho font-bold text-washi"><Ruby>船釣りを続ける</Ruby>
                        <span className="text-emerald-300 ml-2 text-sm"><Ruby>無料</Ruby></span>
                      </p>
                      <p className="text-xs text-washi/60 tabular-nums"><Ruby>{`残り${boatFishingRemaining}回（レア以上の魚を狙う）`}</Ruby></p>
                    </div>
                  </button>
                )}

                {/* 仕掛けを3つから選ぶ */}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-washi/70 font-mincho"><Ruby>仕掛けを選ぶ</Ruby></span>
                  <span className="text-xs text-kin-300 inline-flex items-center gap-1.5" aria-label={`この手番の釣り あと${slotsLeft}回`}>
                    <span className="flex gap-0.5" aria-hidden="true">
                      {Array.from({ length: MAX_FISHING_PER_TURN }, (_, i) => (
                        <span key={i} className={`w-2.5 h-2.5 rounded-full border ${i < slotsLeft ? 'bg-kin-400 border-kin-300' : 'bg-ai-950/70 border-kin-500/30'}`} />
                      ))}
                    </span>
                    {/* 数字と「回」は1つの文にまとめる（別々だと「回」にふりがなが付かない） */}
                    <span className="tabular-nums font-bold"><Ruby>{`あと${slotsLeft}回`}</Ruby></span>
                  </span>
                </div>
                {RIG_ORDER.map(rig => {
                  const info = RIGS[rig];
                  const reason = rigBlockReason(rig, player.equipment, slotsLeft);
                  const ok = !reason;
                  return (
                    <button
                      key={rig}
                      onClick={() => ok && startFishing(false, rig)}
                      data-guide={rig === 'futsu' ? 'fish-normal' : `fish-rig-${rig}`}
                      disabled={!ok}
                      className={`tk-rig w-full min-h-[60px] border rounded-xl px-3 py-2 text-left transition flex items-center gap-3
                        ${ok
                          ? rig === 'oomono'
                            ? 'bg-kin-500/15 hover:bg-kin-500/25 border-kin-500/40 cursor-pointer'
                            : 'bg-ai-700/50 hover:bg-ai-600/60 border-ai-500/40 cursor-pointer'
                          : 'bg-ai-800/40 border-kin-500/15 opacity-50 cursor-not-allowed'
                        }`}
                    >
                      <RigGlyph rig={rig} />
                      <div className="min-w-0 flex-1">
                        <p className="font-mincho font-bold text-washi leading-tight">
                          <Ruby>{info.name}</Ruby>
                          <span className="ml-1.5 text-[11px] font-normal text-washi/55">（<Ruby>{info.place}</Ruby>）</span>
                        </p>
                        <p className={`text-xs leading-snug mt-0.5 ${ok ? 'text-washi/60' : 'text-shu-400'}`}><Ruby>{reason ?? info.desc}</Ruby></p>
                      </div>
                      <span className={`shrink-0 text-[11px] px-2 py-0.5 rounded-full border tabular-nums whitespace-nowrap ${info.slots > 1 ? 'border-kin-400/60 text-kin-200 bg-kin-500/15' : 'border-kin-500/25 text-washi/60'}`}>
                        <Ruby>{`${info.slots}回ぶん`}</Ruby>
                      </span>
                    </button>
                  );
                })}

                {/* 船釣り（新規購入） */}
                {boatFishingRemaining === 0 && (
                  <button
                    onClick={() => {
                      if (!hasRod || !canAffordBoat) return;
                      playCoinLoss();
                      startBoatFishing();
                    }}
                    disabled={!hasRod || !canAffordBoat}
                    className={`w-full min-h-[60px] border rounded-xl px-3 py-2 text-left transition flex items-center gap-3
                      ${hasRod && canAffordBoat
                        ? 'bg-kin-500/20 hover:bg-kin-500/30 border-kin-500/40 cursor-pointer'
                        : 'bg-ai-800/40 border-kin-500/15 opacity-40 cursor-not-allowed'
                      }`}
                  >
                    <Icon name="boat" size={30} className="text-kin-300 shrink-0" />
                    <div>
                      <p className="font-mincho font-bold text-washi"><Ruby>船釣り</Ruby>
                        <span className="text-kin-300 ml-2 text-sm tabular-nums">¥{boatCost.toLocaleString()}</span>
                      </p>
                      <p className="text-xs text-washi/60"><Ruby>沖に出て3回レア以上の魚を狙う</Ruby></p>
                    </div>
                  </button>
                )}
              </div>

              <div className="order-4 space-y-2">
                {/* 雑魚は手早く（設定） */}
                <button
                  type="button"
                  role="switch"
                  aria-checked={quickCatch}
                  onClick={toggleQuickCatch}
                  data-guide="fish-quick"
                  className="w-full min-h-11 flex items-center justify-between gap-3 rounded-lg border border-kin-500/20 bg-ai-950/40 hover:bg-ai-900/60 px-3 py-1.5 text-left cursor-pointer transition"
                >
                  <span className="min-w-0">
                    <span className="block text-xs text-washi/90 font-mincho"><Ruby>雑魚は手早く</Ruby></span>
                    <span className="block text-[10px] text-washi/50 leading-snug"><Ruby>{quickNote}</Ruby></span>
                  </span>
                  <span className={`tk-switch ${quickCatch ? 'is-on' : ''}`} aria-hidden="true">
                    <span className="tk-switch-knob" />
                  </span>
                </button>
                <Button onClick={close} variant="secondary" size="sm" className="w-full min-h-11">
                  <Ruby>やめる</Ruby>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** 実効レベル（0〜5の実数）を5つの珠で表示 */
function Pips({ level }: { level: number }) {
  return (
    <span className="flex gap-0.5" aria-label={`Lv${level.toFixed(1)}`}>
      {Array.from({ length: 5 }, (_, i) => {
        const fill = Math.max(0, Math.min(1, level - i));
        return (
          <span key={i} className="relative w-2.5 h-2.5 rounded-full bg-ai-950/70 border border-kin-500/30 overflow-hidden">
            <span className="absolute inset-y-0 left-0 bg-kin-400" style={{ width: `${fill * 100}%` }} />
          </span>
        );
      })}
    </span>
  );
}

/** 今の道具がミニゲームでどう効くか（竿=合わせ / リール=巻き・糸 / ルアー=当たり） */
function GearPower({ equipment }: { equipment: PlayerEquipment }) {
  const strike = getEffectiveLevel(equipment, 'strike');
  const reeling = getEffectiveLevel(equipment, 'reeling');
  const tolerance = getEffectiveLevel(equipment, 'tensionTolerance');
  const bite = getEffectiveLevel(equipment, 'biteSpeed');
  const zone = Math.round(getStrikeGreenZone(strike) * 100);
  const time = Math.round((FISHING_REELING_TIME_LIMIT_MS + interpolateBonus(REEL_TIME_EXTENSION, tolerance)) / 1000);
  const rows: { label: string; level: number; note: string }[] = [
    { label: '合わせ', level: strike, note: `金の帯 ${zone}%` },
    { label: '巻き', level: reeling, note: '巻く速さ' },
    { label: '糸の強さ', level: tolerance, note: `${time}秒` },
    { label: '当たり', level: bite, note: '当たりの早さ' },
  ];
  return (
    <div className="bg-ai-950/40 border border-kin-500/20 rounded-lg px-3 py-2">
      <p className="text-[11px] text-washi/50 mb-1"><Ruby>道具の力</Ruby></p>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1">
        {rows.map(r => (
          <div key={r.label} className="flex items-center justify-between gap-1">
            <span className="text-xs text-washi/80"><Ruby>{r.label}</Ruby></span>
            <Pips level={r.level} />
          </div>
        ))}
      </div>
      <p className="text-[10px] text-washi/40 mt-1 tabular-nums">
        <Ruby>{rows.map(r => r.note).filter(n => /\d/.test(n)).join(' ・ ')}</Ruby>
      </p>
    </div>
  );
}
