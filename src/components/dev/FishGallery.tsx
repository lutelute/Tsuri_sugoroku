// 開発ビルドだけの確かめ用の一覧: 図鑑の魚 300 種を描き方ごとに並べる。URL に ?gallery=fish を付けて開く。
//   &style=hanga|flat|gyotaku|classic（省くと設定の描き方） &w=150（1枚の幅 px） &from=0&to=100（並びの範囲）
//   &sil=1（影絵） &framed=1（図鑑の台紙の絵） &ids=madai,saba（魚を選ぶ）
// 絵を直したら、ここを撮って目で確かめる（tsuri-art スキルの手順）。
import { FISH_DATABASE } from '../../data/fishDatabase';
import FishIllustration from '../shared/FishIllustration';
import { resolveFishForm, FISH_ART_PREFS } from '../shared/fishArt/styles';
import type { FishArtPref } from '../shared/fishArt/styles';

const params = new URLSearchParams(window.location.search);
const STYLE = params.get('style') as FishArtPref | null;
const W = Number(params.get('w')) || 150;
const FROM = Number(params.get('from')) || 0;
const TO = Number(params.get('to')) || FISH_DATABASE.length;
const SIL = params.get('sil') === '1';
const FRAMED = params.get('framed') === '1';
const IDS = params.get('ids')?.split(',');

export default function FishGallery() {
  const list = IDS ? FISH_DATABASE.filter(f => IDS.includes(f.id)) : FISH_DATABASE.slice(FROM, TO);
  const style = STYLE && FISH_ART_PREFS.includes(STYLE) ? STYLE : undefined;
  return (
    <div style={{ background: '#efe6d2', minHeight: '100vh', padding: 12, color: '#1c140c', fontFamily: 'sans-serif' }}>
      <h1 style={{ fontSize: 16, margin: '0 0 8px' }}>魚の絵 {style ?? '（設定）'} {FROM}〜{Math.min(TO, FISH_DATABASE.length) - 1}</h1>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill, ${W}px)`, gap: 6 }}>
        {list.map((f, i) => {
          const r = resolveFishForm(f);
          const form = 'legacy' in r ? `今の絵:${r.legacy}` : r.entry.form;
          return (
            <div key={f.id} style={{ background: FRAMED ? '#f6eedb' : '#fbf6e8', border: '1px solid #cdbb93', padding: 2 }}>
              <FishIllustration fishId={f.id} width={W - 6} height={Math.round((W - 6) * 2 / 3)} silhouette={SIL} framed={FRAMED} artStyle={style} />
              <div style={{ fontSize: 10, lineHeight: 1.25, padding: '0 2px 2px' }}>
                <b>{(IDS ? 0 : FROM) + i}. {f.name}</b><br /><span style={{ color: '#6b5a43' }}>{f.id} / {form}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
