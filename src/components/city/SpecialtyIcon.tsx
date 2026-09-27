// 名産の小さな SVG 絵（地図やパネルで使う）。24x24 viewBox。
// 地図の <svg> に直接入れるときは <SpecialtyShapes icon=… /> を <g transform> で包んで使う。
import type { SpecialtyIcon as SpecialtyIconKind } from '../../data/citySpecialties';
import { CITY_SPECIALTIES } from '../../data/citySpecialties';

// 和モダンの色（index.css の @theme と揃える）
const INK = '#1c140c';
const WASHI = '#fbf6e8';
const WASHI2 = '#e9dcc0';
const KIN = '#d4a843';
const KIN_LIGHT = '#f1d893';
const KIN_DARK = '#b8862f';
const SHU = '#c63a26';
const SHU_LIGHT = '#ef6a52';
const SHU_DARK = '#a92e1d';
const AI = '#15314f';
const AI_LIGHT = '#7fa9cd';
const LEAF = '#4f9d5d';
const LEAF_LIGHT = '#5fae55';
const WOOD = '#6b4b2a';

const URCHIN_SPIKES = Array.from({ length: 14 }, (_, i) => {
  const a = (i / 14) * Math.PI * 2;
  return { x1: 12 + Math.cos(a) * 6, y1: 13.5 + Math.sin(a) * 6, x2: 12 + Math.cos(a) * 9.6, y2: 13.5 + Math.sin(a) * 9.6 };
});

export function SpecialtyShapes({ icon }: { icon: SpecialtyIconKind }) {
  switch (icon) {
    case 'beer':
      // 泡の立つジョッキ
      return (
        <g>
          <path d="M16 10h2.4a2.6 2.6 0 0 1 0 5.2H16" fill="none" stroke={INK} strokeWidth="2.4" />
          <path d="M16 10h2.4a2.6 2.6 0 0 1 0 5.2H16" fill="none" stroke={KIN} strokeWidth="1.1" />
          <rect x="5" y="8" width="11" height="13" rx="1.2" fill="#e0a93a" stroke={INK} strokeWidth="1" />
          <path d="M8 12v6M11.5 12v6" stroke={WASHI} strokeWidth="1" opacity="0.55" strokeLinecap="round" />
          <path d="M4.6 8.6c-.3-1.8 1.5-3 3-2.5.7-1.6 3-1.9 4.1-.7 1.5-.7 3.6.2 3.8 2 .2 1-.3 1.5-.9 1.6H5.4c-.5 0-.8-.2-.8-.4Z" fill={WASHI} stroke={INK} strokeWidth="0.9" strokeLinejoin="round" />
        </g>
      );
    case 'robata':
      // 炭火の炉端で焼く魚
      return (
        <g>
          <rect x="3" y="15" width="18" height="5.5" rx="1" fill={WOOD} stroke={INK} strokeWidth="1" />
          <path d="M4.2 15.4h15.6" stroke={SHU_LIGHT} strokeWidth="1.4" />
          <path d="M3 13.3h18" stroke={INK} strokeWidth="0.8" />
          <path d="M7.5 15c-.9-1.1-.2-2.1.5-2.6 0 .9.8 1.1.9 2.6ZM15 15c-.9-1.1-.2-2.1.5-2.6 0 .9.8 1.1.9 2.6Z" fill={SHU_LIGHT} />
          <path d="M2.5 10.8 21.5 8.2" stroke={KIN_DARK} strokeWidth="1" strokeLinecap="round" />
          <path d="M5 10.5c2-2.4 7-3 10.5-1.4l2.8-1.8-.5 3.2.9 3-2.9-1.4C12.6 14 7.4 13.4 5 10.5Z" fill={AI_LIGHT} stroke={INK} strokeWidth="0.9" strokeLinejoin="round" />
          <circle cx="7.3" cy="10.3" r="0.7" fill={INK} />
        </g>
      );
    case 'apple':
      return (
        <g>
          <path d="M12 7.5c-1.6-1.4-5.5-1.4-6.6 2.2-1.1 3.6 1 8.8 3.8 9.8 1.2.4 1.9-.2 2.8-.2s1.6.6 2.8.2c2.8-1 4.9-6.2 3.8-9.8C17.5 6.1 13.6 6.1 12 7.5Z" fill={SHU} stroke={INK} strokeWidth="1" strokeLinejoin="round" />
          <path d="M12 7.5c0-2 .6-3.4 1.6-4.3" stroke={WOOD} strokeWidth="1.3" strokeLinecap="round" fill="none" />
          <path d="M13 5c1.2-1.8 3.6-2 4.8-1.2-.8 1.8-2.8 2.4-4.8 1.2Z" fill={LEAF_LIGHT} stroke={INK} strokeWidth="0.8" strokeLinejoin="round" />
          <path d="M8 10.5c.4-1 1.2-1.6 2-1.8" stroke={WASHI} strokeWidth="1" opacity="0.7" strokeLinecap="round" fill="none" />
        </g>
      );
    case 'urchin':
      // とげの殻と、中の橙色の身
      return (
        <g>
          {URCHIN_SPIKES.map((s, i) => (
            <line key={i} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} stroke="#3b2a4a" strokeWidth="1.1" strokeLinecap="round" />
          ))}
          <circle cx="12" cy="13.5" r="6.6" fill="#3b2a4a" stroke={INK} strokeWidth="1" />
          <ellipse cx="12" cy="12.6" rx="4.4" ry="3.4" fill="#2a1d36" />
          <path d="M8.6 12.8c0-1.8.9-2.8 1.7-2.8s1.2 1.2 1 2.8c-.2 1.3-.7 1.9-1.3 1.9s-1.4-.6-1.4-1.9ZM11.2 12.4c0-1.9.9-3 1.6-3s1.3 1.2 1.1 3c-.2 1.4-.7 2-1.3 2s-1.4-.6-1.4-2ZM13.8 13c0-1.6.8-2.5 1.5-2.5s1 1 .9 2.5c-.1 1.1-.6 1.7-1.1 1.7s-1.3-.5-1.3-1.7Z" fill="#f0a030" stroke="#9a5a12" strokeWidth="0.5" />
        </g>
      );
    case 'gyutan':
      // 皿に並ぶ厚切りの牛たん
      return (
        <g>
          <ellipse cx="12" cy="16.2" rx="9.8" ry="4.2" fill={WASHI} stroke={INK} strokeWidth="1" />
          <path d="M4.6 15.4c-.2-2.2 1.8-4 4-3.9 1.8.1 2.6 1.4 2 2.8-.7 1.5-2.8 2.4-4.4 2.2-.9-.1-1.5-.5-1.6-1.1Z" fill="#b5654a" stroke={INK} strokeWidth="0.9" />
          <path d="M9.6 14.2c-.2-2.3 1.9-4.2 4.2-4.1 1.9.1 2.7 1.5 2.1 3-.7 1.6-2.9 2.5-4.6 2.3-1-.1-1.6-.6-1.7-1.2Z" fill="#c2735a" stroke={INK} strokeWidth="0.9" />
          <path d="M14.4 15.8c-.2-2.1 1.7-3.8 3.8-3.7 1.7.1 2.4 1.3 1.9 2.6-.6 1.4-2.6 2.3-4.1 2.1-.9-.1-1.5-.5-1.6-1Z" fill="#b5654a" stroke={INK} strokeWidth="0.9" />
          <path d="M6.6 13.2l1.8 1.6M11.6 11.6l2.2 1.8M16.4 13.4l1.8 1.5" stroke="#5a2e1a" strokeWidth="0.8" strokeLinecap="round" />
          <path d="M18.8 18.4c.8-.6 1.8-.6 2.2-.2" stroke={LEAF_LIGHT} strokeWidth="1.1" strokeLinecap="round" fill="none" />
        </g>
      );
    case 'sake':
      // 菰樽（こもだる）
      return (
        <g>
          <rect x="5" y="6.5" width="14" height="14" rx="2" fill={WASHI2} stroke={INK} strokeWidth="1" />
          <ellipse cx="12" cy="6.5" rx="7" ry="2" fill="#d8c79e" stroke={INK} strokeWidth="1" />
          <path d="M5 9.8h14M5 17.4h14" stroke={WOOD} strokeWidth="1.3" />
          <path d="M7.5 9.8v7.6M16.5 9.8v7.6" stroke={WOOD} strokeWidth="0.7" opacity="0.6" />
          <rect x="9" y="10.6" width="6" height="6" fill={WASHI} stroke={SHU} strokeWidth="0.9" />
          <circle cx="12" cy="13.6" r="1.9" fill={SHU} />
          <circle cx="12" cy="13.6" r="0.8" fill={WASHI} />
        </g>
      );
    case 'sushi':
      // 下駄に並ぶ握り二貫
      return (
        <g>
          <rect x="2.5" y="17" width="19" height="3" rx="0.8" fill={KIN_DARK} stroke={INK} strokeWidth="0.9" />
          <path d="M5 20v1.5M19 20v1.5" stroke={INK} strokeWidth="1.2" />
          <rect x="3.8" y="12.6" width="7.6" height="4.4" rx="2" fill={WASHI} stroke={INK} strokeWidth="0.9" />
          <path d="M3.3 13.2c.6-2.4 2.8-3.5 4.4-3.5s3.8 1 4.3 3.2c-1.6.7-7.1.9-8.7.3Z" fill="#e34a33" stroke={INK} strokeWidth="0.9" strokeLinejoin="round" />
          <path d="M5.6 11.4l1.4 1.3M8.2 10.9l1.4 1.5" stroke={WASHI} strokeWidth="0.7" opacity="0.8" />
          <rect x="12.6" y="12.6" width="7.6" height="4.4" rx="2" fill={WASHI} stroke={INK} strokeWidth="0.9" />
          <path d="M12.1 13.2c.6-2.4 2.8-3.5 4.4-3.5s3.8 1 4.3 3.2c-1.6.7-7.1.9-8.7.3Z" fill="#f0c048" stroke={INK} strokeWidth="0.9" strokeLinejoin="round" />
          <rect x="15.6" y="9.9" width="1.8" height="7.1" fill={AI} stroke={INK} strokeWidth="0.6" />
        </g>
      );
    case 'shumai':
      // 蒸籠の焼売と湯気
      return (
        <g>
          <path d="M9 6.2c-1-1 .8-1.8 0-3.2M15 6.2c-1-1 .8-1.8 0-3.2" stroke={WASHI} strokeWidth="1" strokeLinecap="round" fill="none" opacity="0.8" />
          <path d="M3 14h18v4.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5Z" fill="#c99a5e" stroke={INK} strokeWidth="1" />
          <path d="M3 16.6h18" stroke={WOOD} strokeWidth="0.8" />
          <path d="M4.6 14c0-2.6 1.4-4.2 3-4.2s3 1.6 3 4.2Z" fill={WASHI2} stroke={INK} strokeWidth="0.9" />
          <path d="M9 14c0-2.8 1.4-4.5 3-4.5s3 1.7 3 4.5Z" fill={WASHI} stroke={INK} strokeWidth="0.9" />
          <path d="M13.4 14c0-2.6 1.4-4.2 3-4.2s3 1.6 3 4.2Z" fill={WASHI2} stroke={INK} strokeWidth="0.9" />
          <circle cx="7.6" cy="10" r="0.9" fill={LEAF_LIGHT} stroke={INK} strokeWidth="0.4" />
          <circle cx="12" cy="9.5" r="0.9" fill={LEAF_LIGHT} stroke={INK} strokeWidth="0.4" />
          <circle cx="16.4" cy="10" r="0.9" fill={LEAF_LIGHT} stroke={INK} strokeWidth="0.4" />
        </g>
      );
    case 'goldleaf':
      // 重なる金箔と輝き
      return (
        <g>
          <rect x="3.5" y="8" width="12" height="12" transform="rotate(-8 9.5 14)" fill={KIN_DARK} stroke={INK} strokeWidth="1" />
          <rect x="7.5" y="4.5" width="12" height="12" transform="rotate(6 13.5 10.5)" fill={KIN} stroke={INK} strokeWidth="1" />
          <path d="M9.5 6.2l8.6.9-3.8 3.6-5.2-.5Z" fill={KIN_LIGHT} opacity="0.85" />
          <path d="M19.2 15.4l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7Z" fill={WASHI} stroke={INK} strokeWidth="0.6" strokeLinejoin="round" />
          <circle cx="5" cy="5.5" r="0.9" fill={KIN_LIGHT} />
        </g>
      );
    case 'eel':
      // 重箱のうなぎの蒲焼き
      return (
        <g>
          <rect x="2.5" y="8.5" width="19" height="12" rx="1.3" fill={SHU_DARK} stroke={INK} strokeWidth="1" />
          <rect x="4" y="10" width="16" height="9" rx="0.6" fill={WASHI} />
          <rect x="4.6" y="10.6" width="7.2" height="7.8" rx="1" fill="#8a4a1f" stroke={INK} strokeWidth="0.8" />
          <rect x="12.2" y="10.6" width="7.2" height="7.8" rx="1" fill="#9a5424" stroke={INK} strokeWidth="0.8" />
          <path d="M5.6 12.6h5.2M5.6 15h5.2M13.2 12.6h5.2M13.2 15h5.2" stroke="#4a240c" strokeWidth="0.8" strokeLinecap="round" />
          <path d="M17 6.5c1.2-1.6 3.4-1.8 4.4-.9-.8 1.6-2.8 2-4.4.9Z" fill={LEAF_LIGHT} stroke={INK} strokeWidth="0.7" />
          <path d="M6 7.5l7-2.5M6.6 8.5l7-2.5" stroke={KIN_DARK} strokeWidth="0.9" strokeLinecap="round" />
        </g>
      );
    case 'weave':
      // 巻いた西陣織の反物
      return (
        <g>
          <path d="M3 7h14v11H3Z" fill={SHU} stroke={INK} strokeWidth="1" />
          <path d="M3 9.6h14M3 15.4h14" stroke={KIN} strokeWidth="1.4" />
          <path d="M5.2 12.5l1.3-1.3 1.3 1.3-1.3 1.3ZM9.2 12.5l1.3-1.3 1.3 1.3-1.3 1.3ZM13.2 12.5l1.3-1.3 1.3 1.3-1.3 1.3Z" fill={KIN_LIGHT} stroke={INK} strokeWidth="0.4" />
          <path d="M3 18v3h9.5L11 18Z" fill={AI} stroke={INK} strokeWidth="0.9" strokeLinejoin="round" />
          <path d="M4.5 19.5h5.5" stroke={KIN} strokeWidth="0.8" />
          <ellipse cx="17" cy="12.5" rx="2.6" ry="5.5" fill={SHU_DARK} stroke={INK} strokeWidth="1" />
          <ellipse cx="17" cy="12.5" rx="1.5" ry="3.4" fill="none" stroke={KIN} strokeWidth="0.7" />
          <ellipse cx="17" cy="12.5" rx="0.6" ry="1.4" fill={INK} opacity="0.6" />
        </g>
      );
    case 'takoyaki':
      // 舟皿のたこ焼きと爪楊枝
      return (
        <g>
          <path d="M16.8 3.5 15 11.5" stroke={KIN_DARK} strokeWidth="1" strokeLinecap="round" />
          <path d="M2.5 14h19l-2.6 5.6H5.1Z" fill="#d8c79e" stroke={INK} strokeWidth="1" strokeLinejoin="round" />
          <circle cx="7.4" cy="12.6" r="3.3" fill="#c98a3e" stroke={INK} strokeWidth="0.9" />
          <circle cx="16.6" cy="12.6" r="3.3" fill="#c98a3e" stroke={INK} strokeWidth="0.9" />
          <circle cx="12" cy="11.6" r="3.5" fill="#d0943f" stroke={INK} strokeWidth="0.9" />
          <path d="M4.6 11.8c.8-1.8 4.8-1.8 5.6 0M8.8 10.6c.8-2 5.6-2 6.4 0M13.8 11.8c.8-1.8 4.8-1.8 5.6 0" fill="none" stroke="#5a2e10" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M9.6 10.2l1 .8 1-.8 1 .8 1-.8 1 .8" fill="none" stroke={WASHI} strokeWidth="0.6" />
          <circle cx="6.6" cy="11.4" r="0.4" fill={LEAF} />
          <circle cx="12.6" cy="9.8" r="0.4" fill={LEAF} />
          <circle cx="17.4" cy="11.4" r="0.4" fill={LEAF} />
        </g>
      );
    case 'oyster':
      // 殻を開いた牡蠣
      return (
        <g>
          <path d="M3.8 12.2c0-5 4.2-8.6 9.2-8.1 5 .4 8 4.4 7.2 9.1-.8 4.6-5 7.6-9.6 7.1-4-.5-6.8-3.7-6.8-8.1Z" fill="#8f8a80" stroke={INK} strokeWidth="1" />
          <path d="M5.2 9c.8-1.4 1.8-2.4 3.2-3.2M4.6 14.6c.6 1.8 1.8 3.2 3.4 4M17 5.6c1.4.9 2.4 2.2 2.8 3.8M18.6 16.2c-.8 1.4-2 2.4-3.4 3" stroke="#5f5a52" strokeWidth="0.8" strokeLinecap="round" fill="none" />
          <path d="M7 12.2c0-3 2.6-5.4 5.8-5.1 3 .3 5 2.8 4.5 5.8-.5 2.8-3.1 4.7-6 4.4-2.6-.3-4.3-2.4-4.3-5.1Z" fill={WASHI} stroke={INK} strokeWidth="0.8" />
          <path d="M9 12.6c.3-2 2-3.2 3.8-3 1.8.2 2.9 1.7 2.6 3.4-.3 1.8-2 2.9-3.7 2.7-1.7-.2-2.9-1.5-2.7-3.1Z" fill="#d8c79e" stroke="#8a7a64" strokeWidth="0.7" />
          <path d="M10.4 11.6c.6-.8 1.6-1.1 2.4-.9" stroke={WASHI} strokeWidth="0.8" strokeLinecap="round" fill="none" />
        </g>
      );
    case 'fugu':
      // ふく（とらふぐ）
      return (
        <g>
          <path d="M18.2 12.6 22 9.4v6.4Z" fill="#5f5e50" stroke={INK} strokeWidth="0.9" strokeLinejoin="round" />
          <ellipse cx="11" cy="12.6" rx="7.6" ry="6.6" fill={WASHI2} stroke={INK} strokeWidth="1" />
          <path d="M3.5 11.6C4.3 7.8 7.4 6 11 6s6.8 1.8 7.6 5.6c-2.2 1.3-12.9 1.3-15.1 0Z" fill="#5f5e50" stroke={INK} strokeWidth="0.8" />
          <circle cx="9" cy="8.6" r="0.5" fill={WASHI} />
          <circle cx="12.4" cy="8" r="0.5" fill={WASHI} />
          <circle cx="15.2" cy="9.2" r="0.5" fill={WASHI} />
          <circle cx="7" cy="11.2" r="1.4" fill={WASHI} stroke={INK} strokeWidth="0.7" />
          <circle cx="6.8" cy="11.2" r="0.65" fill={INK} />
          <ellipse cx="12.8" cy="13.6" rx="1.7" ry="1.3" fill={INK} />
          <path d="M10 14.6c.8.6 1.2 1.4 1 2.4" stroke={INK} strokeWidth="0.8" fill="none" strokeLinecap="round" />
          <path d="M3.6 13.8h1.2" stroke={INK} strokeWidth="0.9" strokeLinecap="round" />
        </g>
      );
    case 'katsuo':
      // 藁の炎であぶる鰹
      return (
        <g>
          <path d="M4.5 21c-1.2-1.6-.4-3 .6-3.8 0 1.2 1 1.4 1.4 2.4.4-1.4 1.4-2 2-2.8.4 1.6 1.8 2.2 1.4 4.2Z" fill={SHU_LIGHT} />
          <path d="M12 21c-1.2-1.6-.4-3 .6-3.8 0 1.2 1 1.4 1.4 2.4.4-1.4 1.4-2 2-2.8.4 1.6 1.8 2.2 1.4 4.2Z" fill={SHU_LIGHT} />
          <path d="M6 20.6c-.3-.8 0-1.4.5-1.8M13.5 20.6c-.3-.8 0-1.4.5-1.8" stroke={KIN_LIGHT} strokeWidth="0.8" strokeLinecap="round" fill="none" />
          <path d="M2.5 11c3-3.6 9-4.6 14-2.6l3.6-2.4-.9 4.6.9 4.4-3.6-2.4c-5 2-11 1-14-1.6Z" fill={AI_LIGHT} stroke={INK} strokeWidth="1" strokeLinejoin="round" />
          <path d="M3.4 10.2c3-2.5 8.4-3.3 12.9-1.6-3.8.6-9 .9-12.9 1.6Z" fill={AI} />
          <path d="M7 12.3h7.2M8 13.5h5.6" stroke={AI} strokeWidth="0.7" opacity="0.75" strokeLinecap="round" />
          <circle cx="5.2" cy="10.6" r="0.7" fill={INK} />
        </g>
      );
    case 'mikan':
      return (
        <g>
          <circle cx="12" cy="13.5" r="7.5" fill="#f08a2b" stroke={INK} strokeWidth="1" />
          <path d="M12 6.2V4.8" stroke={WOOD} strokeWidth="1.2" strokeLinecap="round" />
          <path d="M12.4 5.6c1-2 3.6-2.6 5-1.6-.9 1.8-3 2.6-5 1.6Z" fill={LEAF} stroke={INK} strokeWidth="0.8" strokeLinejoin="round" />
          <circle cx="12" cy="6.4" r="1" fill={LEAF} />
          <path d="M8 10.4c.6-1.3 1.6-2 2.7-2.3" stroke={WASHI} strokeWidth="1" opacity="0.7" strokeLinecap="round" fill="none" />
          <circle cx="14.6" cy="12" r="0.35" fill="#c0601a" />
          <circle cx="10.4" cy="15.6" r="0.35" fill="#c0601a" />
          <circle cx="15.2" cy="16.4" r="0.35" fill="#c0601a" />
        </g>
      );
    case 'udon':
      // 丼のうどんと箸
      return (
        <g>
          <path d="M11.5 2.6l7 3.6M12.6 1.8l7 3.6" stroke={KIN_DARK} strokeWidth="1" strokeLinecap="round" />
          <path d="M14 11.6c-.6-2 .6-3.6 0-5.4M15.4 11.6c-.6-2 .6-3.6 0-5.4" stroke={WASHI} strokeWidth="1.2" strokeLinecap="round" fill="none" />
          <path d="M3 12h18c0 4.6-3.8 8-9 8s-9-3.4-9-8Z" fill={SHU_DARK} stroke={INK} strokeWidth="1" />
          <path d="M9 20.2h6" stroke={INK} strokeWidth="1.4" strokeLinecap="round" />
          <ellipse cx="12" cy="12" rx="9" ry="2.3" fill="#e9c98a" stroke={INK} strokeWidth="0.9" />
          <path d="M5.5 12.2c1-.6 2-.6 3 0s2 .6 3 0 2-.6 3 0 2 .6 3 0" stroke={WASHI} strokeWidth="0.9" fill="none" />
          <circle cx="7.8" cy="11.6" r="1.1" fill={WASHI} stroke={SHU_LIGHT} strokeWidth="0.6" />
          <circle cx="16.6" cy="11.4" r="0.45" fill={LEAF_LIGHT} />
          <circle cx="17.8" cy="12.3" r="0.45" fill={LEAF_LIGHT} />
        </g>
      );
    case 'mentaiko':
      // 笹の葉に明太子ふた腹
      return (
        <g>
          <ellipse cx="12" cy="17" rx="9.8" ry="3.6" fill={WASHI} stroke={INK} strokeWidth="1" />
          <path d="M3.4 17c4-3.4 13.2-3.4 17.2 0-4 2.2-13.2 2.2-17.2 0Z" fill={LEAF_LIGHT} stroke={INK} strokeWidth="0.8" />
          <path d="M5 15.8c-.6-2.2 1.2-4 3.6-4.2 3-.3 6.4.4 8.6 1.6 1.6.9 1.2 2.6-.6 3-3 .7-7.6.8-10 .4-.9-.2-1.4-.4-1.6-.8Z" fill="#e0534a" stroke={INK} strokeWidth="0.9" />
          <path d="M6.4 12.2c-.4-2 1.2-3.6 3.4-3.8 2.8-.2 5.8.4 7.8 1.5 1.4.8 1 2.3-.6 2.7-2.8.6-6.9.7-9.2.3-.8-.1-1.2-.4-1.4-.7Z" fill={SHU} stroke={INK} strokeWidth="0.9" />
          <path d="M8.4 10.6h.1M11 10.2h.1M13.6 10.6h.1M9.2 14.2h.1M12 14.4h.1M14.8 14.2h.1" stroke={SHU_LIGHT} strokeWidth="1.1" strokeLinecap="round" />
        </g>
      );
    case 'castella':
      // 切り分けたカステラ
      return (
        <g>
          <path d="M4 10l4-3h12l-4 3Z" fill="#8a4a1f" stroke={INK} strokeWidth="0.9" strokeLinejoin="round" />
          <path d="M16 10l4-3v9.2l-4 3Z" fill={KIN} stroke={INK} strokeWidth="0.9" strokeLinejoin="round" />
          <rect x="4" y="10" width="12" height="9.2" fill={KIN_LIGHT} stroke={INK} strokeWidth="1" />
          <rect x="4" y="10" width="12" height="1.6" fill="#8a4a1f" />
          <path d="M4.5 18.4h11" stroke="#8a4a1f" strokeWidth="1.1" />
          <path d="M6.5 14h.1M9.5 15.2h.1M12.5 13.6h.1M14 16h.1" stroke={KIN_DARK} strokeWidth="0.9" strokeLinecap="round" />
          <path d="M2.5 20.6h19" stroke={INK} strokeWidth="0.8" opacity="0.5" />
        </g>
      );
    case 'watermelon':
      // 切ったすいか
      return (
        <g>
          <path d="M2.5 9.5h19a9.5 9.5 0 0 1-19 0Z" fill="#2f7d3a" stroke={INK} strokeWidth="1" />
          <path d="M3.9 9.5h16.2a8.1 8.1 0 0 1-16.2 0Z" fill={WASHI} />
          <path d="M4.8 9.5h14.4a7.2 7.2 0 0 1-14.4 0Z" fill="#e34a33" />
          <path d="M2.5 9.5h19" stroke={INK} strokeWidth="1" />
          <ellipse cx="8.4" cy="11.8" rx="0.5" ry="0.8" fill={INK} />
          <ellipse cx="12" cy="13.4" rx="0.5" ry="0.8" fill={INK} />
          <ellipse cx="15.6" cy="11.8" rx="0.5" ry="0.8" fill={INK} />
          <ellipse cx="10.2" cy="15.4" rx="0.5" ry="0.8" fill={INK} />
          <ellipse cx="13.8" cy="15.4" rx="0.5" ry="0.8" fill={INK} />
        </g>
      );
    case 'pork':
      // 黒豚の顔
      return (
        <g>
          <path d="M5.4 7.6 4.2 3l4.6 2.4Z" fill="#2a2320" stroke={INK} strokeWidth="0.9" strokeLinejoin="round" />
          <path d="M18.6 7.6 19.8 3l-4.6 2.4Z" fill="#2a2320" stroke={INK} strokeWidth="0.9" strokeLinejoin="round" />
          <ellipse cx="12" cy="12.8" rx="8" ry="7" fill="#2a2320" stroke={INK} strokeWidth="1" />
          <path d="M6.4 9.4c1-1.4 2.4-2.2 3.8-2.4" stroke="#5a4a44" strokeWidth="0.9" strokeLinecap="round" fill="none" />
          <ellipse cx="12" cy="15.2" rx="3.4" ry="2.4" fill="#e39a9a" stroke={INK} strokeWidth="0.8" />
          <ellipse cx="10.8" cy="15.2" rx="0.6" ry="0.9" fill="#7a3a3a" />
          <ellipse cx="13.2" cy="15.2" rx="0.6" ry="0.9" fill="#7a3a3a" />
          <circle cx="8.8" cy="11.4" r="0.95" fill={WASHI} />
          <circle cx="15.2" cy="11.4" r="0.95" fill={WASHI} />
        </g>
      );
    case 'mango':
      return (
        <g>
          <path d="M8.5 6.8 7.6 4.6" stroke={WOOD} strokeWidth="1.2" strokeLinecap="round" />
          <path d="M7.8 4.8C6 3 3.2 3.2 2.4 4.6c1.6 1.6 3.8 1.4 5.4.2Z" fill={LEAF} stroke={INK} strokeWidth="0.8" strokeLinejoin="round" />
          <path d="M7 7.5c3.6-2.8 9.6-1.4 11.4 3.4 1.8 4.8-1 9.2-5.6 9.6-4.2.4-8.6-2.4-8.8-6.6-.1-2.6 1-4.8 3-6.4Z" fill="#f0a030" stroke={INK} strokeWidth="1" strokeLinejoin="round" />
          <path d="M12.6 6.6c2.8.4 5 2.4 5.8 5.2-1.8-1.6-3.8-2.6-5.8-5.2Z" fill={SHU_LIGHT} opacity="0.85" />
          <path d="M7.4 10.4c.5-1.2 1.4-2 2.4-2.4" stroke={WASHI} strokeWidth="1" opacity="0.7" strokeLinecap="round" fill="none" />
        </g>
      );
  }
}

interface SpecialtyIconProps {
  /** 絵の種類（nodeId を渡せば省略可） */
  icon?: SpecialtyIconKind;
  /** 県庁マスの nodeId（名産の表から絵を引く） */
  nodeId?: string;
  size?: number;
  className?: string;
}

export default function SpecialtyIcon({ icon, nodeId, size = 24, className = '' }: SpecialtyIconProps) {
  const kind = icon ?? (nodeId ? CITY_SPECIALTIES[nodeId]?.icon : undefined);
  if (!kind) return null;
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden="true">
      <SpecialtyShapes icon={kind} />
    </svg>
  );
}
