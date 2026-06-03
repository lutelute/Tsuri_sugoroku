// 県メインイベント（capital）モーダル。
// capital ノード到達時に表示され、固有選択肢を提示する。
// 1選択でターン終了。

import { useGameStore } from '../../store/useGameStore';
import { getCapitalEvent } from '../../data/capitalEvents';
import { NODE_MAP } from '../../data/boardNodes';
import { FISH_DATABASE } from '../../data/fishDatabase';
import Button from '../shared/Button';
import Icon from '../shared/Icon';
import Ruby from '../shared/Ruby';
import FishIllustration from '../shared/FishIllustration';
import type { CapitalChoice, CapitalChoiceEffect, CapitalResult } from '../../game/types';

function effectIcon(effect: CapitalChoiceEffect) {
  switch (effect.kind) {
    case 'feast': return <Icon name="creel" size={20} className="text-kin-300" />;
    case 'specialty_shop': return <Icon name="cart" size={20} className="text-ai-300" />;
    case 'special_fishing': return <Icon name="fish" size={20} className="text-shu-300" />;
    case 'lore_event': return <Icon name="info" size={20} className="text-emerald-300" />;
    case 'money': return <Icon name="coin" size={20} className="text-kin-300" />;
    case 'extra_turn': return <Icon name="dice" size={20} className="text-ai-300" />;
  }
}

function ChoiceCard({ choice, money, onPick }: { choice: CapitalChoice; money: number; onPick: () => void }) {
  const eff = choice.effect;
  let disabledReason: string | null = null;
  if (eff.kind === 'specialty_shop' && money < eff.price) disabledReason = `所持金が足りない (¥${eff.price.toLocaleString()})`;

  const fish = eff.kind === 'special_fishing' ? FISH_DATABASE.find(f => f.id === eff.fishId) : null;

  return (
    <button
      onClick={onPick}
      disabled={!!disabledReason}
      className={`w-full text-left rounded-xl border p-3 transition group flex items-start gap-3
        ${disabledReason
          ? 'border-washi/10 bg-ai-900/30 opacity-60 cursor-not-allowed'
          : 'border-kin-500/30 bg-ai-800/60 hover:bg-ai-700/70 hover:border-kin-400/60 cursor-pointer'}`}
    >
      <div className="shrink-0 mt-0.5">{effectIcon(eff)}</div>
      <div className="flex-1 min-w-0">
        <div className="font-mincho font-bold text-sm text-washi">
          <Ruby>{choice.label}</Ruby>
        </div>
        <div className="text-xs text-washi/65 mt-1 leading-snug">
          <Ruby>{choice.description}</Ruby>
        </div>
        {disabledReason && (
          <div className="text-xs text-shu-300/80 mt-1.5"><Ruby>{disabledReason}</Ruby></div>
        )}
      </div>
      {fish && (
        <div className="shrink-0">
          <FishIllustration fishId={fish.id} width={56} height={36} />
        </div>
      )}
    </button>
  );
}

function ResultView({ result, onOk }: { result: CapitalResult; onOk: () => void }) {
  const fish = result.fishId ? FISH_DATABASE.find(f => f.id === result.fishId) : null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className={`panel-ai relative rounded-2xl shadow-2xl p-6 w-[92%] max-w-md border-2 ${result.success ? 'border-kin-500/50' : 'border-shu-500/50'}`}>
        <div className="text-center mb-4">
          <div className="text-[10px] tracking-[0.4em] mb-1" style={{ color: result.success ? '#f1d893' : '#e88f7f' }}>
            {result.success ? '成功' : '失敗'}
          </div>
          <h2 className={`font-mincho text-2xl font-bold ${result.success ? 'text-kin-300' : 'text-shu-300'}`}>
            <Ruby>{result.choiceLabel}</Ruby>
          </h2>
        </div>

        {fish && result.success && (
          <div className="flex justify-center mb-3">
            <div className="washi-card rounded-2xl px-5 py-3">
              <FishIllustration fishId={fish.id} width={120} height={80} />
            </div>
          </div>
        )}

        <p className="text-center text-sm text-washi/85 font-mincho mb-4 leading-relaxed">
          <Ruby>{result.message}</Ruby>
        </p>

        {result.successChance !== undefined && (
          <div className="text-center text-[10px] text-washi/45 mb-3">
            判定確率: {Math.round(result.successChance * 100)}%
          </div>
        )}

        <Button onClick={onOk} variant={result.success ? 'gold' : 'secondary'} className="w-full">
          <Ruby>続ける</Ruby>
        </Button>
      </div>
    </div>
  );
}

export default function CapitalEventOverlay() {
  const players = useGameStore(s => s.players);
  const currentPlayerIndex = useGameStore(s => s.currentPlayerIndex);
  const applyCapitalChoice = useGameStore(s => s.applyCapitalChoice);
  const setTurnPhase = useGameStore(s => s.setTurnPhase);
  const lastCapitalResult = useGameStore(s => s.lastCapitalResult);
  const acknowledgeCapitalResult = useGameStore(s => s.acknowledgeCapitalResult);

  const player = players[currentPlayerIndex];
  const node = NODE_MAP.get(player?.currentNode || '');
  const event = node?.capitalEventId ? getCapitalEvent(node.capitalEventId) : null;

  // 結果表示モード
  if (lastCapitalResult) {
    return <ResultView result={lastCapitalResult} onOk={acknowledgeCapitalResult} />;
  }

  if (!event) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="panel-ai relative rounded-2xl border-kin-500/50 shadow-2xl p-6 w-[92%] max-w-md max-h-[88vh] overflow-y-auto">
        {/* ヘッダ */}
        <div className="text-center mb-4">
          <div className="text-[10px] tracking-[0.4em] text-kin-300/80 font-mincho mb-1">県メインイベント</div>
          <h2 className="font-brush text-3xl text-kin-300 kinpaku">
            <Ruby>{event.title}</Ruby>
          </h2>
          <div className="text-xs text-washi/55 mt-2 mb-3">
            📍 <Ruby>{node?.name ?? ''}</Ruby>
          </div>
          <p className="text-sm text-washi/75 font-mincho leading-relaxed ink-underline inline-block">
            <Ruby>{event.flavor}</Ruby>
          </p>
        </div>

        {/* 所持金表示 */}
        <div className="flex items-center justify-end gap-1.5 mb-3 text-sm text-kin-300">
          <Icon name="coin" size={16} />
          <span className="tabular-nums">¥{player?.money.toLocaleString() ?? 0}</span>
        </div>

        {/* 選択肢 */}
        <div className="space-y-2">
          {event.choices.map(c => (
            <ChoiceCard
              key={c.id}
              choice={c}
              money={player?.money ?? 0}
              onPick={() => applyCapitalChoice(c.id)}
            />
          ))}
        </div>

        {/* スキップ（イベントを見送る） */}
        <Button
          onClick={() => setTurnPhase('turn_end')}
          variant="secondary"
          className="w-full mt-4"
          size="sm"
        >
          <Ruby>見送って次へ</Ruby>
        </Button>
      </div>
    </div>
  );
}
