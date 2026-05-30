// 和モダンの統一SVGアイコン集（絵文字に依存しない）。
// 24x24 viewBox・currentColor基調の線アイコン。size と className で調整する。

export type IconName =
  | 'home' | 'tacklebox' | 'creel' | 'book' | 'trophy' | 'users'
  | 'dice' | 'boat' | 'coin' | 'fish' | 'rod' | 'reel' | 'lure'
  | 'close' | 'info' | 'repair' | 'merge' | 'cart' | 'login';

interface IconProps {
  name: IconName;
  size?: number;
  className?: string;
  strokeWidth?: number;
}

const S = 'currentColor';

const PATHS: Record<IconName, (sw: number) => React.ReactNode> = {
  home: () => (
    <>
      <path d="M4 11.5 12 4l8 7.5" fill="none" stroke={S} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 10.5V20h12v-9.5" fill="none" stroke={S} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 20v-5h4v5" fill="none" stroke={S} strokeWidth="1.5" strokeLinejoin="round" />
    </>
  ),
  tacklebox: () => (
    <>
      <rect x="3.5" y="8" width="17" height="11" rx="1.6" fill="none" stroke={S} strokeWidth="1.7" />
      <path d="M8 8V6.4A1.4 1.4 0 0 1 9.4 5h5.2A1.4 1.4 0 0 1 16 6.4V8" fill="none" stroke={S} strokeWidth="1.6" strokeLinecap="round" />
      <path d="M3.5 12.5h17" fill="none" stroke={S} strokeWidth="1.4" />
      <path d="M10.5 11h3v3h-3z" fill={S} opacity="0.85" />
    </>
  ),
  creel: () => (
    <>
      <path d="M5 9h14l-1.3 9.2a1.6 1.6 0 0 1-1.6 1.4H7.9a1.6 1.6 0 0 1-1.6-1.4Z" fill="none" stroke={S} strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M8 9c0-2.5 1.8-4 4-4s4 1.5 4 4" fill="none" stroke={S} strokeWidth="1.6" strokeLinecap="round" />
      <path d="M7 12.5h10M7.6 16h8.8" fill="none" stroke={S} strokeWidth="1.2" opacity="0.7" />
    </>
  ),
  book: () => (
    <>
      <path d="M5 4.5h9.5A2.5 2.5 0 0 1 17 7v12.5H7.5A2.5 2.5 0 0 1 5 17Z" fill="none" stroke={S} strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M17 7h2v12.5h-1.5" fill="none" stroke={S} strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M8 8.5h6M8 11.5h6" fill="none" stroke={S} strokeWidth="1.3" strokeLinecap="round" opacity="0.8" />
    </>
  ),
  trophy: () => (
    <>
      <path d="M7 4.5h10v3.5a5 5 0 0 1-10 0Z" fill="none" stroke={S} strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M7 5.5H4.2v1.8A3 3 0 0 0 7 10.2M17 5.5h2.8v1.8a3 3 0 0 1-2.8 2.9" fill="none" stroke={S} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M12 13v3.5M8.5 19.5h7M9.5 16.5h5l.5 3h-6Z" fill="none" stroke={S} strokeWidth="1.6" strokeLinejoin="round" />
    </>
  ),
  users: () => (
    <>
      <circle cx="9" cy="8.5" r="3" fill="none" stroke={S} strokeWidth="1.6" />
      <path d="M3.5 19c0-3.3 2.5-5.5 5.5-5.5s5.5 2.2 5.5 5.5" fill="none" stroke={S} strokeWidth="1.6" strokeLinecap="round" />
      <path d="M15.5 6.2a3 3 0 0 1 0 5.6M16.5 13.8c2.4.6 4 2.6 4 5.2" fill="none" stroke={S} strokeWidth="1.5" strokeLinecap="round" opacity="0.85" />
    </>
  ),
  dice: () => (
    <>
      <rect x="4.5" y="4.5" width="15" height="15" rx="3" fill="none" stroke={S} strokeWidth="1.7" />
      <circle cx="9" cy="9" r="1.3" fill={S} />
      <circle cx="15" cy="9" r="1.3" fill={S} />
      <circle cx="12" cy="12" r="1.3" fill={S} />
      <circle cx="9" cy="15" r="1.3" fill={S} />
      <circle cx="15" cy="15" r="1.3" fill={S} />
    </>
  ),
  boat: () => (
    <>
      <path d="M3.5 14h17l-2.2 4.2a2 2 0 0 1-1.8 1.1H7.5a2 2 0 0 1-1.8-1.1Z" fill="none" stroke={S} strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M12 13.5V5l5 5.5Z" fill={S} opacity="0.85" />
      <path d="M10 13.5V7" fill="none" stroke={S} strokeWidth="1.5" strokeLinecap="round" />
    </>
  ),
  coin: () => (
    <>
      <ellipse cx="12" cy="12" rx="8" ry="8" fill="none" stroke={S} strokeWidth="1.7" />
      <path d="M12 7.5v9M9 10.5h6M9 13.5h6" fill="none" stroke={S} strokeWidth="1.5" strokeLinecap="round" />
    </>
  ),
  fish: () => (
    <>
      <path d="M4 12c3-4.5 9-5 12-2.5L20 6l-1 6 1 6-4-3.5C13 17 7 16.5 4 12Z" fill="none" stroke={S} strokeWidth="1.6" strokeLinejoin="round" />
      <circle cx="8.5" cy="11" r="1" fill={S} />
    </>
  ),
  rod: () => (
    <>
      <path d="M4 20 18 5" fill="none" stroke={S} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M18 5l1.5-1.5M14 8.5l5 2.5-2 .5" fill="none" stroke={S} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  reel: () => (
    <>
      <circle cx="12" cy="12" r="7.5" fill="none" stroke={S} strokeWidth="1.7" />
      <circle cx="12" cy="12" r="2" fill={S} />
      <path d="M12 4.5v3M12 16.5v3M4.5 12h3M16.5 12h3" fill="none" stroke={S} strokeWidth="1.4" strokeLinecap="round" />
    </>
  ),
  lure: () => (
    <>
      <ellipse cx="11" cy="9" rx="4" ry="5.5" fill="none" stroke={S} strokeWidth="1.6" />
      <path d="M11 14.5 13 18M13 18l-2 1 .5-2.2M13 18l2-.6" fill="none" stroke={S} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 7.5l4 3" fill="none" stroke={S} strokeWidth="1.2" opacity="0.7" />
    </>
  ),
  close: () => (
    <path d="M6 6l12 12M18 6 6 18" fill="none" stroke={S} strokeWidth="1.9" strokeLinecap="round" />
  ),
  info: () => (
    <>
      <circle cx="12" cy="12" r="8.5" fill="none" stroke={S} strokeWidth="1.6" />
      <path d="M12 11v5" fill="none" stroke={S} strokeWidth="1.7" strokeLinecap="round" />
      <circle cx="12" cy="8" r="1.1" fill={S} />
    </>
  ),
  repair: () => (
    <path d="M14.7 6.3a3.5 3.5 0 0 0-4.6 4.6l-5.4 5.4a1.6 1.6 0 0 0 2.3 2.3l5.4-5.4a3.5 3.5 0 0 0 4.6-4.6l-2 2-1.8-.5-.5-1.8Z" fill="none" stroke={S} strokeWidth="1.6" strokeLinejoin="round" />
  ),
  merge: () => (
    <>
      <path d="M5 5c4 0 4 7 7 7s3-7 7-7" fill="none" stroke={S} strokeWidth="1.7" strokeLinecap="round" />
      <path d="M12 12v6" fill="none" stroke={S} strokeWidth="1.7" strokeLinecap="round" />
      <path d="M9.5 15.5 12 18l2.5-2.5" fill="none" stroke={S} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  cart: () => (
    <>
      <path d="M3.5 5h2l2 10.5h9.5" fill="none" stroke={S} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7 8h12l-1.4 6H8.3" fill="none" stroke={S} strokeWidth="1.6" strokeLinejoin="round" />
      <circle cx="9" cy="18.5" r="1.4" fill={S} />
      <circle cx="16" cy="18.5" r="1.4" fill={S} />
    </>
  ),
  login: () => (
    <>
      <path d="M11 4.5H6.5A1.5 1.5 0 0 0 5 6v12a1.5 1.5 0 0 0 1.5 1.5H11" fill="none" stroke={S} strokeWidth="1.7" strokeLinecap="round" />
      <path d="M14 8.5 17.5 12 14 15.5M9 12h8.5" fill="none" stroke={S} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
};

export default function Icon({ name, size = 24, className = '', strokeWidth = 1.7 }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name](strokeWidth)}
    </svg>
  );
}
