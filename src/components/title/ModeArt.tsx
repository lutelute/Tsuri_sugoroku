// 遊び方の札の絵（タイトルと設定画面で共通）。
// 釣り旅: 小舟の釣り人が竿をあおり、しなった竿の先で魚がはねる。まちづくり: 家・店・蔵・城・ビル・工場が1軒ずつ建つ。
// 動きは CSS アニメ（index.css の「晴れ舞台係」）。どちらも数秒で止まる（常時ループにしない）。
// 動きを減らす設定では、でき上がりの絵で止まる。

const INK = '#1a1510';
const FOAM = '#f4ecd8';

export type ModeArtKind = 'fishing' | 'city';

function FishingArt() {
  return (
    <svg viewBox="0 0 200 132" className="hr-art" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="hr-fa-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0c1f33" />
          <stop offset="0.5" stopColor="#2e5e8c" />
          <stop offset="0.86" stopColor="#e79a78" />
          <stop offset="1" stopColor="#f1d893" />
        </linearGradient>
        <linearGradient id="hr-fa-sea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3a6a94" />
          <stop offset="1" stopColor="#102a44" />
        </linearGradient>
        <linearGradient id="hr-fa-fish" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#c63a26" />
          <stop offset="0.6" stopColor="#ef6a52" />
          <stop offset="1" stopColor="#fbe3d2" />
        </linearGradient>
      </defs>
      <rect width="200" height="86" fill="url(#hr-fa-sky)" />
      {/* 朝日と照り返し */}
      <circle cx="112" cy="86" r="38" fill="#ef6a52" opacity="0.22" />
      <circle cx="112" cy="86" r="26" fill="#e34a33" />
      {/* 遠くの山なみ */}
      <path d="M0,86V74C12,66 24,69 36,75C46,65 56,63 64,72C72,79 80,83 88,86Z" fill="#15314f" opacity="0.9" />
      <path d="M170,86C178,78 188,76 200,80V86Z" fill="#15314f" opacity="0.8" />
      <rect y="86" width="200" height="46" fill="url(#hr-fa-sea)" />
      <path d="M92,91h40M99,96.5h26M104,102h16" stroke="#f29a80" strokeOpacity="0.75" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M0,95q9,-5 18,0t18,0t18,0t18,0t18,0" fill="none" stroke="#a9c8e2" strokeOpacity="0.5" strokeWidth="1.2" />

      {/* 竿・糸・魚（釣り人の手もとを軸にあおる） */}
      <g className="hr-rod">
        <path d="M54,96C80,58 116,34 154,42" fill="none" stroke={INK} strokeWidth="4.2" strokeLinecap="round" />
        <path d="M54,96C80,58 116,34 154,42" fill="none" stroke="#d4a843" strokeWidth="2.6" strokeLinecap="round" />
        <path d="M112,43C128,36 144,37 154,42" fill="none" stroke="#f7e7b8" strokeWidth="1.3" strokeLinecap="round" />
        <path d="M154,42 156,78" fill="none" stroke={FOAM} strokeWidth="0.9" />
        <g className="hr-catch">
          {/* 糸の先で身をよじる魚（頭が上） */}
          <g transform="translate(156 78) scale(1.3) translate(-156 -78)">
            <path d="M156,78C166,82 170,94 164,106C160,112 154,113 150,110C156,104 158,96 154,88C152,84 153,80 156,78Z" fill="url(#hr-fa-fish)" stroke={INK} strokeWidth="1.1" strokeLinejoin="round" />
            <path d="M151,110 142,116 150,119 154,126 158,113Z" fill="#c63a26" stroke={INK} strokeWidth="1" strokeLinejoin="round" />
            <path d="M166,90 174,88 169,97Z" fill="#c63a26" stroke={INK} strokeWidth="0.9" strokeLinejoin="round" />
            <circle cx="159.5" cy="84" r="1.5" fill={INK} />
          </g>
        </g>
      </g>

      {/* 小舟と釣り人 */}
      <path d="M2,104C18,118 66,118 90,102L83,98H9Z" fill="#9a6f24" stroke={INK} strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M10,104C28,111 62,111 82,103" fill="none" stroke="#e6c266" strokeOpacity="0.7" strokeWidth="1" />
      <path d="M34,104C32,90 38,82 46,83C55,84 59,92 58,104Z" fill="#f4ecd8" stroke={INK} strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M35,97h23" stroke="#24496e" strokeWidth="2.6" />
      <path d="M49,89 57,95" stroke={INK} strokeWidth="4.4" strokeLinecap="round" />
      <path d="M49,89 57,95" stroke="#f4ecd8" strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="46" cy="79.5" r="4.6" fill="#f7d9b8" stroke={INK} strokeWidth="1.2" />
      <path d="M30,77 46,63 62,77Z" fill="#e6c266" stroke={INK} strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M38,70h16M34,74h24" stroke="#9a6f24" strokeWidth="0.8" />

      {/* 水しぶきの輪 */}
      <ellipse className="hr-ring" cx="157" cy="101" rx="15" ry="3.6" fill="none" stroke={FOAM} strokeWidth="1.4" />
      <g className="hr-drops" fill={FOAM}>
        <circle cx="146" cy="93" r="1.5" /><circle cx="168" cy="92" r="1.3" /><circle cx="151" cy="86" r="1.1" /><circle cx="164" cy="85" r="1" />
      </g>
      {/* 手前の波（魚の下半分をかくす） */}
      <path d="M0,104q12,-7 25,0t25,0t25,0t25,0t25,0t25,0t25,0t25,0V132H0Z" fill="#1b3a5b" />
      <path d="M0,104q12,-7 25,0t25,0t25,0t25,0t25,0t25,0t25,0t25,0" fill="none" stroke={FOAM} strokeOpacity="0.85" strokeWidth="1.6" />
      <path d="M8,116q10,-5 20,0M60,120q10,-5 20,0M118,115q10,-5 20,0M164,121q10,-5 20,0" fill="none" stroke="#7fa9cd" strokeOpacity="0.6" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

/** 建つ順（--i）つきの建物の入れ物 */
function Bld({ i, children }: { i: number; children: React.ReactNode }) {
  return <g className="hr-bld" style={{ '--i': i } as React.CSSProperties}>{children}</g>;
}

function CityArt() {
  return (
    <svg viewBox="0 0 200 132" className="hr-art" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="hr-ca-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f1d893" />
          <stop offset="0.55" stopColor="#f7ecd0" />
          <stop offset="1" stopColor="#f4ecd8" />
        </linearGradient>
        <linearGradient id="hr-ca-river" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2e5e8c" />
          <stop offset="1" stopColor="#15314f" />
        </linearGradient>
      </defs>
      <rect width="200" height="132" fill="url(#hr-ca-sky)" />
      {/* 金の雲（源氏雲） */}
      <g fill="#e6c266" opacity="0.75">
        <path d="M-8,10h62a6,6 0 0 1 0,12h-22a5,5 0 0 0 0,10h-40Z" />
        <path d="M208,6h-70a5.5,5.5 0 0 0 0,11h26a5,5 0 0 1 0,10h44Z" />
        <path d="M78,26h40a4.5,4.5 0 0 1 0,9h-40a4.5,4.5 0 0 1 0,-9Z" opacity="0.7" />
      </g>
      <circle cx="170" cy="40" r="13" fill="#e34a33" />
      {/* 遠くの山 */}
      <path d="M0,104V86C16,74 30,76 44,88C56,74 70,72 84,84C100,90 118,96 132,104Z" fill="#9fbf9a" opacity="0.55" />
      <path d="M96,104C120,82 150,80 200,92V104Z" fill="#9fbf9a" opacity="0.4" />

      {/* 民家 */}
      <Bld i={0}>
        <rect x="9" y="85" width="24" height="19" fill="#fbf6e8" stroke={INK} strokeWidth="1.2" />
        <path d="M5,87 21,72 37,87Z" fill="#24496e" stroke={INK} strokeWidth="1.2" strokeLinejoin="round" />
        <rect x="17" y="93" width="8" height="11" fill="#9a6f24" stroke={INK} strokeWidth="0.9" />
        <path d="M11,90h4v4h-4zM27,90h4v4h-4z" fill="#7fa9cd" stroke={INK} strokeWidth="0.7" />
      </Bld>
      {/* 商店（のれん） */}
      <Bld i={1}>
        <rect x="41" y="80" width="26" height="24" fill="#f4ecd8" stroke={INK} strokeWidth="1.2" />
        <path d="M37,81h34l-4,-8h-26Z" fill="#c63a26" stroke={INK} strokeWidth="1.2" strokeLinejoin="round" />
        <rect x="44" y="86" width="20" height="8" fill="#24496e" stroke={INK} strokeWidth="0.8" />
        <path d="M49,86v8M54,86v8M59,86v8" stroke="#f4ecd8" strokeWidth="0.8" />
        <circle cx="54" cy="77" r="2.3" fill="#f1d893" stroke={INK} strokeWidth="0.7" />
      </Bld>
      {/* 蔵 */}
      <Bld i={2}>
        <rect x="74" y="76" width="20" height="28" fill="#fbf6e8" stroke={INK} strokeWidth="1.2" />
        <path d="M70,78 84,63 98,78Z" fill="#2a231c" stroke={INK} strokeWidth="1.2" strokeLinejoin="round" />
        <rect x="74" y="95" width="20" height="9" fill="#2a231c" />
        <path d="M74,98l4,-3 4,3 4,-3 4,3 4,-3M74,102l4,-3 4,3 4,-3 4,3 4,-3" fill="none" stroke="#fbf6e8" strokeWidth="0.7" />
        <rect x="81" y="82" width="6" height="6" fill="#2a231c" stroke={INK} strokeWidth="0.7" />
      </Bld>
      {/* 城（いちばん最後に建つ） */}
      <Bld i={6}>
        <path d="M100,104 105,86h28l5,18Z" fill="#8a7a64" stroke={INK} strokeWidth="1.2" strokeLinejoin="round" />
        <path d="M104,92h30M102,98h34M110,86v6M122,86v6M116,92v6M128,92v6M108,98v6M120,98v6M132,98v6" stroke={INK} strokeOpacity="0.45" strokeWidth="0.6" />
        <rect x="106" y="70" width="26" height="16" fill="#fbf6e8" stroke={INK} strokeWidth="1.2" />
        <path d="M98,73C104,70 110,66 119,58C128,66 134,70 140,73C132,74 106,74 98,73Z" fill="#24496e" stroke={INK} strokeWidth="1.2" strokeLinejoin="round" />
        <rect x="110" y="48" width="18" height="12" fill="#fbf6e8" stroke={INK} strokeWidth="1.2" />
        <path d="M103,51C109,48 113,44 119,37C125,44 129,48 135,51C128,52 110,52 103,51Z" fill="#24496e" stroke={INK} strokeWidth="1.2" strokeLinejoin="round" />
        <path d="M113,53h3v4h-3zM122,53h3v4h-3zM110,76h4v5h-4zM124,76h4v5h-4z" fill="#2a231c" />
        <path d="M115,38l-3,-4 4,1M123,38l3,-4-4,1" fill="none" stroke="#d4a843" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </Bld>
      {/* ビル */}
      <Bld i={3}>
        <rect x="143" y="54" width="18" height="50" fill="#4a7faf" stroke={INK} strokeWidth="1.2" />
        <path d="M147,60h3M154,60h3M147,67h3M154,67h3M147,74h3M154,74h3M147,81h3M154,81h3M147,88h3M154,88h3M147,95h3M154,95h3" stroke="#fbf0c8" strokeWidth="2.2" />
        <path d="M143,54h18" stroke="#f1d893" strokeWidth="1.6" />
      </Bld>
      {/* 工場と煙突 */}
      <Bld i={4}>
        <rect x="186" y="66" width="6" height="26" fill="#a0806a" stroke={INK} strokeWidth="1" />
        <path d="M164,104V89l8,5v-5l8,5v-5l8,5h8v10Z" fill="#8a7a64" stroke={INK} strokeWidth="1.2" strokeLinejoin="round" />
        <path d="M168,98h4M178,98h4M188,98h4" stroke="#fbf0c8" strokeWidth="2" />
        <circle cx="190" cy="60" r="3.4" fill="#d8c79e" opacity="0.9" />
        <circle cx="194" cy="52" r="4.6" fill="#d8c79e" opacity="0.6" />
      </Bld>
      {/* 松 */}
      <Bld i={5}>
        <path d="M68.5,104v-9" stroke="#6b4a2a" strokeWidth="2" />
        <path d="M62,97c0,-6 13,-6 13,0Z M64,92c0,-5 9,-5 9,0Z" fill="#2f9e6e" stroke={INK} strokeWidth="0.9" strokeLinejoin="round" />
      </Bld>

      {/* 地面・川・太鼓橋 */}
      <rect y="104" width="200" height="9" fill="#c9b386" />
      <path d="M0,104h200" stroke={INK} strokeWidth="1.2" />
      <rect y="113" width="200" height="19" fill="url(#hr-ca-river)" />
      <path d="M6,120q8,-4 16,0t16,0M150,119q8,-4 16,0t16,0M84,127q8,-4 16,0t16,0" fill="none" stroke="#f1d893" strokeOpacity="0.7" strokeWidth="1.1" strokeLinecap="round" />
      <path d="M62,118C82,104 118,104 138,118" fill="none" stroke={INK} strokeWidth="6.4" strokeLinecap="round" />
      <path d="M62,118C82,104 118,104 138,118" fill="none" stroke="#e34a33" strokeWidth="4.2" strokeLinecap="round" />
      <path d="M72,112v8M86,108v9M100,107v9M114,108v9M128,112v8" stroke="#a92e1d" strokeWidth="1.5" />
    </svg>
  );
}

/** 遊び方の絵。key を変えて置き直すと、動きがはじめからもう一度流れる */
export default function ModeArt({ mode }: { mode: ModeArtKind }) {
  return mode === 'city' ? <CityArt /> : <FishingArt />;
}
