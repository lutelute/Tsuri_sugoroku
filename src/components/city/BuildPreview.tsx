// 見込み札（損得係）: 建てる前に「月にいくら入り、何か月で元が取れるか」を見せる部品。
// 計算は game/cityAdvice.ts（CPU の工事選びと同じ）、文は adviceText.ts。町の画面（CityOverlay）に取り付ける。
//  - BuildOptions      空き地に建てる物の一覧（見込み・判定の印・おすすめ・理由）
//  - PlotActionPreview 再開発・買収の見込みの1行
//  - TownNeedsLine     「この町に足りないもの：電気・公園」
//  - EarnedChip        建てた直後の小さな札「来月から 月に +¥212」
import { useMemo } from 'react';
import type { BuildingKind, CityState } from '../../game/city';
import { BUILDING_INFO } from '../../game/city';
import { previewBuild, previewUpgrade, previewAcquire, townNeeds } from '../../game/cityAdvice';
import type { ActionPreview, AdviceVerdict, BuildPreview } from '../../game/cityAdvice';
import {
  VERDICT_LABEL, VERDICT_LEGEND, NEED_LABEL, gainText, paybackText, earnedText, reasonText, supportText, badReason, goodReason,
} from './adviceText';
import BuildingGlyph from './BuildingGlyph';
import Icon from '../shared/Icon';
import Ruby from '../shared/Ruby';

const VERDICT_COLOR: Record<AdviceVerdict, string> = {
  best: '#f1d893',
  good: '#6ee7b7',
  slow: '#d8c79e',
  never: '#ef6a52',
  support: '#7fa9cd',
};

/** 判定の印（◎○△×・支え）。文字ではなく線で描く（端末の書体で形が変わらないように） */
export function VerdictMark({ verdict, size = 20 }: { verdict: AdviceVerdict; size?: number }) {
  const c = VERDICT_COLOR[verdict];
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" className="shrink-0" role="img" aria-label={VERDICT_LABEL[verdict]}>
      {verdict === 'best' && (
        <>
          <circle cx="10" cy="10" r="8" fill="none" stroke={c} strokeWidth="2" />
          <circle cx="10" cy="10" r="4" fill="none" stroke={c} strokeWidth="2" />
        </>
      )}
      {verdict === 'good' && <circle cx="10" cy="10" r="7.5" fill="none" stroke={c} strokeWidth="2.2" />}
      {verdict === 'slow' && <path d="M10 3 L17.5 16.5 H2.5 Z" fill="none" stroke={c} strokeWidth="2" strokeLinejoin="round" />}
      {verdict === 'never' && <path d="M4 4 L16 16 M16 4 L4 16" fill="none" stroke={c} strokeWidth="2.4" strokeLinecap="round" />}
      {verdict === 'support' && (
        <path d="M10 16.5 C4 12.5 2.5 9.5 2.5 7.2 C2.5 4.9 4.3 3.5 6.2 3.5 C7.8 3.5 9.2 4.4 10 5.8 C10.8 4.4 12.2 3.5 13.8 3.5 C15.7 3.5 17.5 4.9 17.5 7.2 C17.5 9.5 16 12.5 10 16.5 Z" fill="none" stroke={c} strokeWidth="1.8" strokeLinejoin="round" />
      )}
    </svg>
  );
}

/** 育ちやすさ（芽の数 0〜3） */
function GrowthPips({ level }: { level: number }) {
  return (
    <span className="inline-flex items-center gap-px shrink-0" role="img" aria-label={`育ちやすさ ${level}/3`}>
      {[1, 2, 3].map(i => (
        <svg key={i} width="9" height="10" viewBox="0 0 9 10" aria-hidden="true">
          <path d="M4.5 9.5 V4.5 M4.5 5 C4.5 2.6 2.8 1.2 0.8 1.2 C0.8 3.4 2.2 5 4.5 5 Z M4.5 6 C4.5 4.2 6 3 8.2 3 C8.2 4.9 6.8 6 4.5 6 Z" fill={i <= level ? '#6ee7b7' : 'none'} stroke={i <= level ? '#6ee7b7' : 'rgba(244,236,216,0.28)'} strokeWidth="0.9" strokeLinejoin="round" strokeLinecap="round" />
        </svg>
      ))}
    </span>
  );
}

function RecommendBadge() {
  return (
    <span className="ad-rec inline-flex items-center rounded-full bg-kin-400 px-1.5 py-px text-[10px] font-bold leading-tight text-[#3a2a0e] whitespace-nowrap">
      おすすめ
    </span>
  );
}

/** 良い方の理由の小さな金の札（独占が完成・町長になれる） */
function GoodReasonBadge({ preview }: { preview: Pick<ActionPreview, 'reasons'> }) {
  const r = goodReason(preview);
  if (!r) return null;
  return (
    <span className="inline-flex items-center rounded-full border border-kin-400/70 bg-kin-500/20 px-1.5 py-px text-[10px] font-bold leading-tight text-kin-300 whitespace-nowrap">
      <Ruby>{reasonText(r)}</Ruby>
    </span>
  );
}

interface BuildOptionsProps {
  city: CityState;
  nodeId: string;
  plotIndex: number;
  playerIndex: number;
  money: number;
  turn: number;
  /** 残りの月数（△と×の境目） */
  monthsLeft: number;
  /** 工事の回数が残っているか */
  canAct: boolean;
  /** 復興特需の割引き（割。なければ 0） */
  discountTenths: number;
  /** gain は建てた後に増える月収（建てた直後の札に使う） */
  onBuild: (kind: BuildingKind, gain: number) => void;
}

/** 空き地に建てる物の一覧。スマホは1列、広い画面は2列 */
export function BuildOptions({ city, nodeId, plotIndex, playerIndex, money, turn, monthsLeft, canAct, discountTenths, onBuild }: BuildOptionsProps) {
  const previews = useMemo(
    () => previewBuild(city, nodeId, plotIndex, playerIndex, money, turn, monthsLeft),
    [city, nodeId, plotIndex, playerIndex, money, turn, monthsLeft],
  );
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
        {previews.map(p => <BuildOption key={p.kind} p={p} canAct={canAct} discountTenths={discountTenths} onBuild={onBuild} />)}
      </div>
      <ul className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[10px] text-washi/55" aria-label="印の見かた">
        {VERDICT_LEGEND.map(l => (
          <li key={l.verdict} className="inline-flex items-center gap-1">
            <VerdictMark verdict={l.verdict} size={11} />
            <Ruby>{l.text}</Ruby>
          </li>
        ))}
        <li className="inline-flex items-center gap-1">
          <GrowthPips level={3} />
          <Ruby>育ちやすさ</Ruby>
        </li>
      </ul>
    </>
  );
}

function BuildOption({ p, canAct, discountTenths, onBuild }: { p: BuildPreview; canAct: boolean; discountTenths: number; onBuild: (kind: BuildingKind, gain: number) => void }) {
  const info = BUILDING_INFO[p.kind];
  const disabled = !!p.blocked || !canAct;
  // お金が足りないだけなら見込みは見せる。町の決まりで建てられない物は理由だけ
  const moneyOnly = p.blocked === 'お金が足りない';
  const showPreview = !p.blocked || moneyOnly;
  const bad = badReason(p);
  const isSupport = p.verdict === 'support';
  return (
    <button
      disabled={disabled}
      onClick={() => onBuild(p.kind, p.gain)}
      title={p.blocked ?? info.desc}
      className={`min-h-11 flex items-center gap-2 text-left rounded-lg border px-2 py-1.5 transition cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${
        p.recommended ? 'border-kin-300 bg-kin-500/15 hover:bg-kin-500/25' : 'border-kin-500/25 bg-ai-800/60 hover:bg-ai-700/70'
      }`}
    >
      <BuildingGlyph kind={p.kind} size={28} className="shrink-0" />
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline gap-x-1.5 flex-wrap text-xs font-bold text-washi font-mincho">
          <span><Ruby>{info.name}</Ruby></span>
          <span className="text-kin-300 tabular-nums">¥{p.cost.toLocaleString()}</span>
          {discountTenths > 0 && <span className="text-[10px] font-normal text-emerald-300">{discountTenths}<Ruby>割引き</Ruby></span>}
        </span>
        {showPreview ? (
          <span className="flex items-center gap-x-2 gap-y-0 flex-wrap text-[11px] leading-snug">
            <span className={`font-bold tabular-nums whitespace-nowrap ${p.gain > 0 ? 'text-emerald-300' : isSupport ? 'text-washi/75' : 'text-shu-400'}`}>
              <Ruby>{gainText(p.gain)}</Ruby>
            </span>
            <span className="text-washi/80 whitespace-nowrap"><Ruby>{isSupport ? supportText(p.kind) : paybackText(p.payback, p.verdict)}</Ruby></span>
            {p.growth > 0 && <GrowthPips level={p.growth} />}
          </span>
        ) : null}
        <span className="flex items-center gap-x-1.5 gap-y-0.5 flex-wrap text-[10px] leading-snug">
          {p.blocked ? (
            <span className="text-shu-400"><Ruby>{p.blocked}</Ruby></span>
          ) : bad ? (
            <span className="text-shu-400"><Ruby>{reasonText(bad, p.kind)}</Ruby></span>
          ) : (
            <>
              <GoodReasonBadge preview={p} />
              {!goodReason(p) && <span className="text-washi/50"><Ruby>{info.desc}</Ruby></span>}
            </>
          )}
        </span>
      </span>
      {showPreview && (
        <span className="shrink-0 flex flex-col items-center gap-1">
          <VerdictMark verdict={p.verdict} />
          {p.recommended && <RecommendBadge />}
        </span>
      )}
    </button>
  );
}

interface PlotActionPreviewProps {
  city: CityState;
  nodeId: string;
  plotIndex: number;
  playerIndex: number;
  mode: 'upgrade' | 'acquire';
  monthsLeft: number;
}

/** 再開発・買収のボタンの上に出す見込みの1行（「月に +¥190」「13か月で元が取れる」） */
export function PlotActionPreview({ city, nodeId, plotIndex, playerIndex, mode, monthsLeft }: PlotActionPreviewProps) {
  const p = useMemo(
    () => (mode === 'upgrade' ? previewUpgrade(city, nodeId, plotIndex, playerIndex, monthsLeft) : previewAcquire(city, nodeId, plotIndex, playerIndex, monthsLeft)),
    [city, nodeId, plotIndex, playerIndex, mode, monthsLeft],
  );
  if (!p) return null;
  return (
    <p className="flex items-center gap-x-2 gap-y-0.5 flex-wrap text-[11px] leading-snug" data-guide="action-preview">
      <VerdictMark verdict={p.verdict} size={16} />
      <span className={`font-bold tabular-nums whitespace-nowrap ${p.gain > 0 ? 'text-emerald-300' : 'text-shu-400'}`}><Ruby>{gainText(p.gain)}</Ruby></span>
      <span className="text-washi/80 whitespace-nowrap"><Ruby>{paybackText(p.payback, p.verdict)}</Ruby></span>
      <GoodReasonBadge preview={p} />
    </p>
  );
}

/** 町の状態の下に出す1行: 「この町に足りないもの：電気・公園」。足りないものがなければ何も出さない */
export function TownNeedsLine({ city, nodeId }: { city: CityState; nodeId: string }) {
  const needs = useMemo(() => townNeeds(city, nodeId), [city, nodeId]);
  if (!needs.length) return null;
  return (
    <p className="flex items-center gap-x-1.5 gap-y-1 flex-wrap text-[11px] text-washi/70" data-guide="town-needs">
      <span><Ruby>この町に足りないもの</Ruby>：</span>
      {needs.map(n => (
        <span key={n} className="rounded-full border border-shu-400/45 bg-shu-700/25 px-2 py-px font-bold text-washi whitespace-nowrap">
          <Ruby>{NEED_LABEL[n]}</Ruby>
        </span>
      ))}
    </p>
  );
}

export interface EarnedNote {
  /** 月収の増え方 */
  gain: number;
  /** 建てた物（公園・発電所は「支え」の文にする）。再開発・買収は null */
  kind: BuildingKind | null;
  /** 買収された CPU のひとこと（名前とせりふ） */
  quote?: { name: string; color: string; line: string };
  seq: number;
}

/** 建てた直後に数秒だけ出す小さな札（動きは出るときの1回だけ） */
export function EarnedChip({ note }: { note: EarnedNote }) {
  const support = note.gain <= 0 && (note.kind === 'park' || note.kind === 'power');
  return (
    <div key={note.seq} role="status" className="fx-rise flex flex-col items-center gap-1 rounded-lg border border-emerald-400/45 bg-emerald-800/25 px-3 py-1.5 text-center">
      <p className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-200">
        <Icon name="coin" size={15} />
        <span className="tabular-nums">
          <Ruby>{support && note.kind ? `${supportText(note.kind)}（${gainText(note.gain)}）` : earnedText(note.gain)}</Ruby>
        </span>
      </p>
      {note.quote && (
        <p className="text-[11px] text-washi/80">
          <span className="font-bold" style={{ color: note.quote.color }}><Ruby>{note.quote.name}</Ruby></span>
          <Ruby>{`「${note.quote.line}」`}</Ruby>
        </p>
      )}
    </div>
  );
}
