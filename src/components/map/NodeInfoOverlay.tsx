// ノード属性表示モーダル。
// サイコロを振っていない時にノードをタップすると、そのマスの情報が下から出る。

import type { BoardNode } from '../../game/types';
import { getCapitalEvent } from '../../data/capitalEvents';
import Icon from '../shared/Icon';
import Ruby from '../shared/Ruby';
import { computeDistanceToGoal } from '../../utils/pathfinding';

const distanceToGoal = computeDistanceToGoal();

const NODE_TYPE_LABEL: Record<BoardNode['type'], string> = {
  start: 'スタート',
  goal: 'ゴール',
  fishing: '釣り場',
  fishing_special: '名物釣り場',
  shop: 'ショップ',
  event_good: '吉のマス',
  event_bad: '凶のマス',
  event_random: 'ランダムイベント',
  rest: '休憩所',
  route: '街道',
  capital: '県メインイベント',
};

const REGION_LABEL: Record<BoardNode['region'], string> = {
  hokkaido: '北海道', tohoku: '東北', kanto: '関東', chubu: '中部',
  kinki: '近畿', chugoku: '中国', shikoku: '四国', kyushu: '九州',
};

const ROUTE_THEME_LABEL = {
  mountain: '峠（山道）',
  sea: '海路',
  river: '河川沿い',
  town: '宿場町',
} as const;

const NODE_TYPE_COLOR: Record<BoardNode['type'], string> = {
  start: 'text-emerald-300',
  goal: 'text-shu-300',
  fishing: 'text-ai-300',
  fishing_special: 'text-purple-300',
  shop: 'text-kin-300',
  event_good: 'text-emerald-300',
  event_bad: 'text-shu-300',
  event_random: 'text-purple-300',
  rest: 'text-teal-300',
  route: 'text-washi/65',
  capital: 'text-kin-300',
};

interface NodeInfoOverlayProps {
  node: BoardNode;
  onClose: () => void;
}

export default function NodeInfoOverlay({ node, onClose }: NodeInfoOverlayProps) {
  const capitalEvent = node.capitalEventId ? getCapitalEvent(node.capitalEventId) : null;
  const dist = distanceToGoal.get(node.id);

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="panel-ai relative rounded-t-2xl border-t border-x border-kin-500/30 shadow-2xl p-5 w-full max-w-md max-h-[65vh] overflow-y-auto animate-slide-in-up"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="閉じる"
          className="absolute top-3 right-3 w-9 h-9 rounded-full bg-ai-800/60 border border-kin-500/30 text-washi/80 hover:text-washi flex items-center justify-center cursor-pointer transition"
        >
          <Icon name="close" size={18} />
        </button>

        {/* ヘッダー */}
        <div className="mb-3 pr-10">
          <div className="text-[10px] tracking-[0.4em] text-washi/45 mb-1">マスの情報</div>
          <h3 className="font-mincho text-xl font-bold text-kin-300">
            <Ruby>{node.name}</Ruby>
          </h3>
          <div className="flex gap-2 mt-1 text-xs items-center">
            <span className="text-washi/55"><Ruby>{REGION_LABEL[node.region]}</Ruby></span>
            <span className="text-washi/25">·</span>
            <span className={NODE_TYPE_COLOR[node.type]}>
              <Ruby>{NODE_TYPE_LABEL[node.type]}</Ruby>
            </span>
            {dist !== undefined && dist > 0 && (
              <>
                <span className="text-washi/25">·</span>
                <span className="text-washi/55 tabular-nums">
                  <Ruby>ゴールまで</Ruby>{dist}<Ruby>マス</Ruby>
                </span>
              </>
            )}
            {dist === 0 && (
              <>
                <span className="text-washi/25">·</span>
                <span className="text-kin-300"><Ruby>ゴール地点</Ruby></span>
              </>
            )}
          </div>
        </div>

        {/* 説明 */}
        {node.description && (
          <p className="text-sm text-washi/75 mb-3 font-mincho leading-relaxed">
            <Ruby>{node.description}</Ruby>
          </p>
        )}

        {/* 県メインイベント */}
        {capitalEvent && (
          <div className="mt-3 p-3 rounded-lg bg-ai-800/40 border border-kin-500/25">
            <div className="text-[10px] text-kin-300/80 mb-1 tracking-[0.3em]">固有イベント</div>
            <div className="font-mincho font-bold text-kin-300">
              <Ruby>{capitalEvent.title}</Ruby>
            </div>
            <div className="text-xs text-washi/65 mt-1.5">
              <Ruby>{capitalEvent.flavor}</Ruby>
            </div>
            <div className="text-[10px] text-washi/45 mt-2">
              <Ruby>選べる行動:</Ruby> {capitalEvent.choices.length}<Ruby>つ</Ruby>
            </div>
          </div>
        )}

        {/* 街道テーマ */}
        {node.type === 'route' && node.routeTheme && (
          <div className="mt-3 p-2.5 rounded-lg bg-ai-800/30 border border-kin-500/15 text-xs text-washi/65">
            <span className="text-washi/45"><Ruby>街道テーマ:</Ruby></span>
            <span className="ml-2 text-washi/85"><Ruby>{ROUTE_THEME_LABEL[node.routeTheme]}</Ruby></span>
          </div>
        )}

        {/* ショップ Tier */}
        {node.shopTier && node.type !== 'capital' && (
          <div className="mt-3 p-2.5 rounded-lg bg-ai-800/30 border border-kin-500/15 text-xs text-washi/65">
            <span className="text-washi/45"><Ruby>取扱:</Ruby></span>
            <span className="ml-2 text-kin-300 tabular-nums">Lv.{node.shopTier}<Ruby>装備まで</Ruby></span>
          </div>
        )}

        {/* マス種別の補足 */}
        {(node.type === 'fishing' || node.type === 'fishing_special') && (
          <div className="mt-3 p-2.5 rounded-lg bg-ai-800/30 border border-kin-500/15 text-xs text-washi/65">
            <Ruby>{node.type === 'fishing_special' ? '名物の魚が出やすい。1ターンに最大3回まで挑戦可能。' : '地域の魚が釣れる。1ターンに最大3回まで挑戦可能。'}</Ruby>
          </div>
        )}
        {node.type === 'rest' && (
          <div className="mt-3 p-2.5 rounded-lg bg-ai-800/30 border border-kin-500/15 text-xs text-washi/65">
            <Ruby>到着するとお金が少しもらえ、装備の修理ができる。</Ruby>
          </div>
        )}
        {node.type === 'event_good' && (
          <div className="mt-3 p-2.5 rounded-lg bg-emerald-700/15 border border-emerald-400/25 text-xs text-emerald-200/85">
            <Ruby>良いことが起こりやすいマス。</Ruby>
          </div>
        )}
        {node.type === 'event_bad' && (
          <div className="mt-3 p-2.5 rounded-lg bg-shu-700/15 border border-shu-400/25 text-xs text-shu-200/85">
            <Ruby>悪い目に遭いやすいマス。注意。</Ruby>
          </div>
        )}
        {node.type === 'event_random' && (
          <div className="mt-3 p-2.5 rounded-lg bg-purple-700/15 border border-purple-400/25 text-xs text-purple-200/85">
            <Ruby>運次第。良い事も悪い事も起こる。</Ruby>
          </div>
        )}
      </div>
    </div>
  );
}
