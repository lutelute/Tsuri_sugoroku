// 地図の海の飾り（止まった絵）: 帆かけ舟と波頭の印を少し。動かさない。
// MapTerrain の海のすぐ上（陸・道・マスの下）に置く。陸にかかった分は陸の塗りに隠れる。
// 置き場所は緯度経度。海路・地方名・海の名前を避けて選んである（足すときは地図を撮って確かめる）。
import { memo } from 'react';
import { projectLatLon } from './mapTheme';

// 帆かけ舟 [緯度, 経度, 大きさ, 向き(1=右へ / -1=左へ)]
const BOATS: [number, number, number, 1 | -1][] = [
  [45.0, 139.6, 0.9, 1], // 日本海・利尻の西
  [41.2, 137.6, 1.1, -1], // 日本海の沖
  [38.3, 135.9, 0.95, 1],
  [37.5, 132.0, 0.9, -1], // 隠岐の北
  [41.9, 146.6, 1, -1], // 太平洋・釧路の沖
  [38.0, 145.6, 1.05, 1], // 三陸の沖
  [33.3, 142.9, 0.9, -1], // 房総のはるか沖
  [32.4, 138.0, 1.1, 1], // 熊野灘の沖
  [31.2, 134.3, 0.9, -1], // 土佐の沖
  [29.7, 132.4, 1, 1], // 日向灘の南
  [31.5, 127.9, 0.95, 1], // 東シナ海
  [27.3, 130.6, 0.9, -1], // 奄美の東
];

// 波頭 [緯度, 経度, 大きさ]
const CRESTS: [number, number, number][] = [
  [44.6, 139.6, 1], [43.3, 138.2, 0.8], [40.2, 138.6, 1.1], [39.3, 136.8, 0.8], [37.6, 136.0, 0.9],
  [38.9, 134.2, 1], [36.3, 134.4, 0.8], [35.9, 131.2, 0.9], [34.9, 129.6, 0.8],
  [43.9, 147.6, 0.9], [40.6, 144.9, 1], [39.6, 146.2, 0.8], [36.7, 143.6, 1.1], [35.9, 145.0, 0.8],
  [33.6, 141.5, 0.9], [32.6, 139.2, 0.8], [33.2, 136.1, 0.8], [31.6, 136.2, 1], [30.6, 135.2, 0.8],
  [31.9, 133.2, 0.9], [30.2, 130.4, 0.8], [29.2, 128.4, 1], [30.8, 126.6, 0.9], [28.2, 126.9, 0.8],
  [26.2, 129.4, 0.9], [25.6, 127.2, 0.8], [45.9, 143.6, 0.8],
];

function SeaDecorImpl() {
  return (
    <g aria-hidden="true">
      <defs>
        {/* 帆かけ舟（右向き）。原点は舟の中心・水面 */}
        <symbol id="sea-boat" viewBox="-10 -14 20 18" overflow="visible">
          <path d="M-8.4 -1.2Q0 1.6 9 -2.4L6.6 2.6H-6Z" fill="#6b4b2a" stroke="#1a130c" strokeWidth="0.7" strokeLinejoin="round" />
          <path d="M-7 -0.2Q0 2 7.6 -1" fill="none" stroke="#d8c79e" strokeWidth="0.6" />
          <path d="M0.2 -1V-13.4" stroke="#1a130c" strokeWidth="0.7" />
          <path d="M-5.4 -12.2Q0.4 -13.4 5.8 -12.2L5 -3.4Q0.2 -2.2 -4.6 -3.4Z" fill="#f4ecd8" stroke="#1a130c" strokeWidth="0.6" strokeLinejoin="round" />
          <path d="M-5 -8.4Q0.3 -9.4 5.4 -8.4" fill="none" stroke="#24496e" strokeWidth="1.4" />
          <path d="M-10.6 2.9q2.6 -1.6 5.2 0M4.6 3q2.6 -1.6 5.2 0" fill="none" stroke="#e6f2ff" strokeWidth="0.7" strokeLinecap="round" opacity="0.7" />
        </symbol>
        {/* 波頭（北斎の波のかぎ爪を小さく） */}
        <symbol id="sea-crest" viewBox="-9 -6 18 9" overflow="visible">
          <path d="M-8 1.6Q-3.6 -4.6 1.6 -2.6Q0 -2 -0.4 -0.6Q2.4 -1.8 4.2 0.2M3 1.8Q5.6 -1.2 8.4 0.6" fill="none" stroke="#e6f2ff" strokeWidth="0.9" strokeLinecap="round" strokeLinejoin="round" />
        </symbol>
      </defs>
      <g opacity={0.3}>
        {CRESTS.map(([lat, lon, s], i) => {
          const p = projectLatLon(lat, lon);
          return <use key={i} href="#sea-crest" x={p.x - 9 * s} y={p.y - 6 * s} width={18 * s} height={9 * s} />;
        })}
      </g>
      <g opacity={0.85}>
        {BOATS.map(([lat, lon, s, dir], i) => {
          const p = projectLatLon(lat, lon);
          return (
            <g key={i} transform={`translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) scale(${dir * s} ${s})`}>
              <use href="#sea-boat" x={-10} y={-14} width={20} height={18} />
            </g>
          );
        })}
      </g>
    </g>
  );
}

const SeaDecor = memo(SeaDecorImpl);
export default SeaDecor;
