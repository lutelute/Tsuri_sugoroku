// 開発ビルドだけの確かめ用の一覧: 街並みの絵（TownScene）と建物の記号（BuildingGlyph）を、
// 町の格・特色・季節・等級・状態ごとに並べて見る。URL に ?gallery=town を付けて開く。
//   ?gallery=town&sec=panel|classes|seasons|buildings|states|grow （sec を省くと全部）
//   &town=kanazawa（季節・状態の町）  &month=4（町の格の一覧の月）  &w=360（1枚の幅 px）
// 絵を直したら scripts ではなくここを撮って目で確かめる（町の絵係）。
import { useMemo, useState } from 'react';
import { createInitialCityState, getTownInfo, computeAllStats, TOWN_CLASS_INFO, BUILDING_INFO, CITY_ECONOMY, SEASONS, MAX_BUILDING_LEVEL, isUpgradable } from '../../game/city';
import type { BuildingKind, CityState, Plot, TownStats } from '../../game/city';
import { TOWN_TRAITS } from '../../data/cityTraits';
import { PLAYER_COLORS } from '../../game/constants';
import { hash01 } from '../fx/prng';
import TownScene from '../city/TownScene';
import BuildingGlyph from '../city/BuildingGlyph';
import { BuildingArt, EmptyLotArt, VacantMarks, WarnSign } from '../city/townArt/buildings';
import { PLAIN_CTX, artBox } from '../city/townArt/art';
import type { TourismStyle } from '../city/townArt/art';
import { seedOf } from '../city/townArt/palette';

const PLAYERS = [
  { name: 'たろう', color: PLAYER_COLORS[0] },
  { name: 'はなこ', color: PLAYER_COLORS[1] },
  { name: 'じろう', color: PLAYER_COLORS[2] },
  { name: 'さくら', color: PLAYER_COLORS[3] },
];

type Spec = [BuildingKind, number, number, ('v' | 'w')?] | null;

interface TownSetup {
  plots: Spec[];
  tier?: number;
  recovery?: number;
}

/** 月（1〜12）になる巡 */
const turnOfMonth = (month: number) => ((month - 4 + 12) % 12) + 1;

function cityWith(setup: Record<string, TownSetup>): CityState {
  const c = createInitialCityState();
  const towns = { ...c.towns };
  for (const [id, s] of Object.entries(setup)) {
    const info = getTownInfo(id);
    if (!info) continue;
    const n = info.plots + (s.tier ?? 0) * CITY_ECONOMY.tierPlotBonus;
    const plots: (Plot | null)[] = Array.from({ length: n }, (_, i) => {
      const sp = s.plots[i];
      if (!sp) return null;
      return { kind: sp[0], level: sp[1], owner: sp[2], builtTurn: 1, vacant: sp[3] === 'v' ? true : undefined, lowMonths: sp[3] === 'w' ? 2 : undefined };
    });
    towns[id] = { plots, tier: s.tier, base: info.plots, recovery: s.recovery };
  }
  return { ...c, towns };
}

const ORDER: BuildingKind[] = ['com', 'res', 'tourism', 'ind', 'res', 'park', 'com', 'power', 'port', 'res', 'com'];

/** その町で建てられる建物を、ほどよく混ぜて並べる（確かめ用） */
function autoPlots(id: string, fill = 0.8, tier = 0): Spec[] {
  const info = getTownInfo(id);
  if (!info) return [];
  const seed = seedOf(id);
  const kinds = ORDER.filter(k => info.allowed.includes(k));
  const n = info.plots + tier;
  return Array.from({ length: n }, (_, i): Spec => {
    if (hash01(seed, i, 1) > fill) return null;
    const kind = kinds[i % kinds.length];
    const level = isUpgradable(kind) ? 1 + Math.floor(hash01(seed, i, 2) * MAX_BUILDING_LEVEL) : 1;
    return [kind, level, Math.floor(hash01(seed, i, 3) * 3)];
  });
}

function Cell({ title, note, w, children }: { title: string; note?: string; w: number; children: React.ReactNode }) {
  return (
    <figure className="m-0" style={{ width: w }}>
      {children}
      <figcaption className="mt-1 text-[11px] leading-snug text-washi/80">
        <span className="font-bold text-kin-300">{title}</span>
        {note && <span className="text-washi/55"> {note}</span>}
      </figcaption>
    </figure>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section data-sec={id} className="mb-8">
      <h2 className="font-mincho text-base font-bold text-kin-300 border-b border-kin-500/30 pb-1 mb-3">{title}</h2>
      <div className="flex flex-wrap gap-4">{children}</div>
    </section>
  );
}

const CLASS_TOWNS = [
  'tokyo', 'osaka', 'nagoya', 'kyoto', 'sapporo', 'yokohama', 'kobe', 'hiroshima', 'kanazawa', 'kumamoto', 'fukuoka', 'sendai',
  'akita', 'hakodate', 'beppu', 'maebashi', 'okayama', 'sakata', 'fukushima', 'kamakura', 'nikko', 'kamaishi',
  'shizuoka', 'kagoshima', 'naha', 'tottori', 'nara', 'matsumoto',
];

function townNote(id: string): string {
  const info = getTownInfo(id);
  if (!info) return '';
  const traits = info.traits.map(t => TOWN_TRAITS[t].name).join('・');
  return `${TOWN_CLASS_INFO[info.cls].name}${traits ? `／${traits}` : ''}`;
}

/** 町の画面に取り付けた様子（藍の面・見出し・絵・選んだ区画） */
function PanelMock({ id, setup, month, w }: { id: string; setup: TownSetup; month: number; w: number }) {
  const [sel, setSel] = useState<number | null>(null);
  const city = useMemo(() => cityWith({ [id]: setup }), [id, setup]);
  const info = getTownInfo(id);
  const st = useMemo(() => computeAllStats(city).get(id), [city, id]);
  if (!info || !st) return null;
  const p = sel !== null ? city.towns[id].plots[sel] : undefined;
  return (
    <div className="panel-ai rounded-2xl p-4 space-y-3" style={{ width: w }}>
      <div className="flex items-center gap-2 flex-wrap">
        <h3 className="font-mincho text-xl font-bold text-kin-300">{info.name}</h3>
        <span className="text-[11px] px-2 py-0.5 rounded-full bg-kin-500/20 border border-kin-500/35 text-kin-200">{TOWN_CLASS_INFO[info.cls].name}</span>
        <span className="text-[11px] text-washi/55">{month}月 {SEASONS[month].name}</span>
      </div>
      <TownScene city={city} nodeId={id} players={PLAYERS} turn={turnOfMonth(month)} selected={sel} onSelect={i => setSel(sel === i ? null : i)} stats={st} />
      <div className="grid grid-cols-4 gap-1.5 text-[11px]">
        <div className="bg-ai-950/40 rounded-lg px-2 py-1 border border-kin-500/15">人口<br /><b className="text-sm">{st.population}人</b></div>
        <div className="bg-ai-950/40 rounded-lg px-2 py-1 border border-kin-500/15">幸福度<br /><b className="text-sm">{st.happiness.toFixed(1)}</b></div>
        <div className="bg-ai-950/40 rounded-lg px-2 py-1 border border-kin-500/15">公害<br /><b className="text-sm">{st.pollution.toFixed(1)}</b></div>
        <div className="bg-ai-950/40 rounded-lg px-2 py-1 border border-kin-500/15">電力<br /><b className="text-sm">{st.powered ? '送電中' : 'なし'}</b></div>
      </div>
      <p className="text-xs text-washi/70 min-h-5">
        {sel === null ? '区画を押すと選べる' : p ? `区画${sel + 1}: ${BUILDING_INFO[p.kind].name} 等級${p.level}（${PLAYERS[p.owner].name}）` : `区画${sel + 1}: 空き地 → 何を建てる？`}
      </p>
    </div>
  );
}

/** 建てる・育てるを押して、せり上がりと紙吹雪を確かめる */
function GrowDemo({ w }: { w: number }) {
  const id = 'sendai';
  const [plots, setPlots] = useState<Spec[]>([['res', 1, 0], null, ['com', 1, 1], null, null, null]);
  const city = useMemo(() => cityWith({ [id]: { plots } }), [plots]);
  const step = () => {
    setPlots(prev => {
      const next = [...prev];
      const empty = next.findIndex(p => !p);
      const up = next.findIndex(p => p && isUpgradable(p[0]) && p[1] < MAX_BUILDING_LEVEL);
      if (empty >= 0 && (up < 0 || next.filter(Boolean).length % 2 === 0)) {
        const kinds: BuildingKind[] = ['ind', 'tourism', 'park', 'power'];
        next[empty] = [kinds[empty % kinds.length], 1, empty % 3];
      } else if (up >= 0) {
        const p = next[up]!;
        next[up] = [p[0], p[1] + 1, p[2]];
      }
      return next;
    });
  };
  return (
    <div style={{ width: w }} className="space-y-2">
      <TownScene city={city} nodeId={id} players={PLAYERS} turn={turnOfMonth(5)} />
      <div className="flex gap-2">
        <button data-grow="step" onClick={step} className="min-h-11 px-4 rounded-lg bg-kin-500 text-sumi font-bold cursor-pointer">建てる・育てる</button>
        <button onClick={() => setPlots([['res', 1, 0], null, ['com', 1, 1], null, null, null])} className="min-h-11 px-4 rounded-lg border border-kin-500/40 text-washi cursor-pointer">もどす</button>
      </div>
    </div>
  );
}

const KINDS: BuildingKind[] = ['res', 'com', 'ind', 'tourism', 'park', 'power', 'port'];

/** 建物の絵の一覧（大きく） */
function Catalog() {
  const cell = (key: string, label: string, body: React.ReactNode, h = 62) => (
    <figure key={key} className="m-0 text-center">
      <svg viewBox={`-30 ${-h} 60 ${h + 6}`} width={150} height={((h + 6) / 60) * 150} className="rounded-md" style={{ background: 'linear-gradient(#cfe2ea 0%, #f1ead6 72%, #cfc7b4 72%)' }}>
        {body}
      </svg>
      <figcaption className="text-[10px] text-washi/70">{label}</figcaption>
    </figure>
  );
  const out: React.ReactNode[] = [];
  for (const kind of KINDS) {
    const styles: TourismStyle[] = kind === 'tourism' ? ['pagoda', 'castle', 'ryokan'] : ['pagoda'];
    for (const style of styles) {
      const levels = isUpgradable(kind) ? [1, 2, 3] : [1];
      for (const lv of levels) {
        const ctx = { ...PLAIN_CTX, owner: PLAYER_COLORS[(lv + styles.indexOf(style)) % 4], tourism: style };
        out.push(cell(`${kind}${style}${lv}`, `${BUILDING_INFO[kind].name}${kind === 'tourism' ? `(${style})` : ''} 等級${lv}`, <BuildingArt kind={kind} level={lv} ctx={ctx} />));
      }
    }
  }
  const dark = { ...PLAIN_CTX, lit: false, owner: PLAYER_COLORS[1] };
  const snow = { ...PLAIN_CTX, snow: true, owner: PLAYER_COLORS[2], leaf: { main: '#8a7862', light: '#a8967c', dark: '#6a5a48', bare: true } };
  out.push(
    cell('empty', '空き地', <EmptyLotArt ctx={PLAIN_CTX} />),
    cell('vac', '空き家', (
      <g>
        <g style={{ filter: 'grayscale(0.9) brightness(0.85)' }}>
          <BuildingArt kind="res" level={2} ctx={{ ...PLAIN_CTX, lit: false, owner: PLAYER_COLORS[0] }} />
        </g>
        <VacantMarks ctx={PLAIN_CTX} w={artBox('res', 2).w} />
      </g>
    )),
    cell('warn', 'あと少しで空き家', (
      <g>
        <BuildingArt kind="com" level={2} ctx={{ ...PLAIN_CTX, owner: PLAYER_COLORS[0] }} />
        <WarnSign ctx={PLAIN_CTX} x={20} />
      </g>
    )),
    cell('dark1', '電気なし（商3）', <BuildingArt kind="com" level={3} ctx={dark} />),
    cell('dark2', '電気なし（住3）', <BuildingArt kind="res" level={3} ctx={dark} />),
    cell('snow1', '雪（住2）', <BuildingArt kind="res" level={2} ctx={snow} />),
    cell('snow2', '雪（観3）', <BuildingArt kind="tourism" level={3} ctx={snow} />),
    cell('snow3', '雪（公園）', <BuildingArt kind="park" level={1} ctx={snow} />),
    cell('snow4', '雪（工3）', <BuildingArt kind="ind" level={3} ctx={snow} />),
  );
  return <>{out}</>;
}

/** 小さな記号（升目・決算・案内で使う大きさ） */
function Glyphs() {
  return (
    <div className="space-y-2">
      {[26, 30, 40].map(size => (
        <div key={size} className="flex flex-wrap items-end gap-2 bg-ai-900/60 rounded-lg p-2 border border-kin-500/20">
          <span className="text-[10px] text-washi/50 w-8">{size}px</span>
          {KINDS.flatMap(kind =>
            (isUpgradable(kind) ? [1, 2, 3] : [1]).map(lv => (
              <span key={`${kind}${lv}`} className="inline-flex flex-col items-center w-11">
                <BuildingGlyph kind={kind} level={lv} size={size} />
                <span className="text-[8px] text-washi/50">{BUILDING_INFO[kind].short}{lv}</span>
              </span>
            )),
          )}
          <span className="inline-flex flex-col items-center w-11">
            <BuildingGlyph kind="res" level={2} size={size} className="grayscale opacity-60" />
            <span className="text-[8px] text-washi/50">空き家</span>
          </span>
        </div>
      ))}
    </div>
  );
}

export default function TownSceneGallery() {
  const q = new URLSearchParams(window.location.search);
  const sec = q.get('sec');
  const show = (id: string) => !sec || sec.split(',').includes(id);
  const w = Math.max(240, Math.min(560, Number(q.get('w')) || 360));
  const month = Math.max(1, Math.min(12, Number(q.get('month')) || 4));
  const town = q.get('town') || 'kanazawa';
  const towns = (q.get('towns') || '').split(',').filter(Boolean);

  const stTown = getTownInfo(town) ? town : 'kanazawa';
  const basePlots = autoPlots(stTown, 1);
  const forced = (over: Partial<TownStats>): TownStats => ({ population: 240, jobs: 200, pollution: 0, happiness: 5, powered: true, demand: { r: 0, c: 0, i: 0 }, popNear: 300, ...over });
  const one = (setup: TownSetup) => cityWith({ [stTown]: setup });
  const mine = (owner: number): Spec[] => basePlots.map(p => (p ? [p[0], p[1], owner] : (['res', 1, owner] as Spec)));

  return (
    <div className="w-full h-full overflow-y-auto bg-ai-900 text-washi p-3" data-gallery="town">
      <h1 className="font-mincho text-lg font-bold text-kin-300 mb-3">街並みの絵の一覧（開発ビルドだけ）</h1>

      {show('panel') && (
        <Section id="panel" title="町の画面に取り付けた様子">
          <PanelMock id="osaka" w={w} month={12} setup={{ plots: [['res', 3, 0], ['com', 3, 0], ['res', 3, 1], ['park', 1, 0], ['ind', 3, 0], ['power', 1, 1], null, null] }} />
          <PanelMock id="niigata" w={w} month={4} setup={{ plots: [] }} />
          <PanelMock id="morioka" w={w} month={12} setup={{ tier: 2, plots: [['com', 1, 1], ['res', 3, 1], ['park', 1, 1], ['ind', 2, 1], null, null] }} />
          <PanelMock id="tokyo" w={w} month={7} setup={{ tier: 3, plots: [['com', 3, 0], ['res', 3, 1], ['com', 2, 2], ['tourism', 3, 0], ['res', 2, 1], ['ind', 2, 2], ['park', 1, 0], ['power', 1, 1], ['com', 1, 2], ['res', 1, 0], null] }} />
        </Section>
      )}

      {show('classes') && (
        <Section id="classes" title={`町の格と特色（${month}月）`}>
          {(towns.length ? towns : CLASS_TOWNS).filter(id => getTownInfo(id)).map(id => (
            <Cell key={id} w={w} title={getTownInfo(id)!.name} note={townNote(id)}>
              <TownScene city={cityWith({ [id]: { plots: autoPlots(id) }, tokyo: { plots: id === 'tokyo' ? autoPlots(id) : [['power', 1, 0]] } })} nodeId={id} players={PLAYERS} turn={turnOfMonth(month)} stats={forced({ population: 260, happiness: 6.5, pollution: 1 })} />
            </Cell>
          ))}
        </Section>
      )}

      {show('seasons') && (
        <Section id="seasons" title={`季節（${getTownInfo(stTown)?.name}）`}>
          {[4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3].map(mo => (
            <Cell key={mo} w={w} title={`${mo}月`} note={SEASONS[mo].name}>
              <TownScene city={one({ plots: basePlots })} nodeId={stTown} players={PLAYERS} turn={turnOfMonth(mo)} stats={forced({ population: 300, happiness: 6 })} />
            </Cell>
          ))}
        </Section>
      )}

      {show('states') && (
        <Section id="states" title={`町の状態（${getTownInfo(stTown)?.name}・${month}月）`}>
          <Cell w={w} title="空き地だけ">
            <TownScene city={one({ plots: [] })} nodeId={stTown} players={PLAYERS} turn={turnOfMonth(month)} stats={forced({ population: 0, powered: false })} onSelect={() => {}} />
          </Cell>
          <Cell w={w} title="電気なし" note="窓も街灯も暗い">
            <TownScene city={one({ plots: basePlots, tier: 2 })} nodeId={stTown} players={PLAYERS} turn={turnOfMonth(month)} stats={forced({ powered: false })} />
          </Cell>
          <Cell w={w} title="電気あり・発展度 弐" note="石畳と街灯">
            <TownScene city={one({ plots: basePlots, tier: 2 })} nodeId={stTown} players={PLAYERS} turn={turnOfMonth(month)} stats={forced({})} />
          </Cell>
          <Cell w={w} title="発展度 壱" note="石畳">
            <TownScene city={one({ plots: basePlots, tier: 1 })} nodeId={stTown} players={PLAYERS} turn={turnOfMonth(month)} stats={forced({})} />
          </Cell>
          <Cell w={w} title="発展度 参" note="遠くに町並み・区画が増える">
            <TownScene city={one({ plots: autoPlots(stTown, 1, 3), tier: 3 })} nodeId={stTown} players={PLAYERS} turn={turnOfMonth(month)} stats={forced({ population: 600 })} />
          </Cell>
          <Cell w={w} title="公害 6">
            <TownScene city={one({ plots: basePlots })} nodeId={stTown} players={PLAYERS} turn={turnOfMonth(month)} stats={forced({ pollution: 6, happiness: 3 })} />
          </Cell>
          <Cell w={w} title="公害 14" note="空がくすみ煙が流れる">
            <TownScene city={one({ plots: basePlots })} nodeId={stTown} players={PLAYERS} turn={turnOfMonth(month)} stats={forced({ pollution: 14, happiness: 0.5 })} />
          </Cell>
          <Cell w={w} title="幸福度 9・人口 600" note="木と人が増える">
            <TownScene city={one({ plots: basePlots })} nodeId={stTown} players={PLAYERS} turn={turnOfMonth(month)} stats={forced({ happiness: 9, population: 600 })} />
          </Cell>
          <Cell w={w} title="幸福度 1・人口 40">
            <TownScene city={one({ plots: basePlots })} nodeId={stTown} players={PLAYERS} turn={turnOfMonth(month)} stats={forced({ happiness: 1, population: 40 })} />
          </Cell>
          <Cell w={w} title="空き家・あと少しで空き家">
            <TownScene city={one({ plots: basePlots.map((p, i) => (p && i % 3 === 0 ? [p[0], p[1], p[2], 'v'] : p && i % 3 === 1 ? [p[0], p[1], p[2], 'w'] : p)) })} nodeId={stTown} players={PLAYERS} turn={turnOfMonth(month)} stats={forced({ happiness: 2, population: 80 })} />
          </Cell>
          <Cell w={w} title="復興特需" note="足場と木槌">
            <TownScene city={one({ plots: basePlots.map((p, i) => (i === 1 ? null : p)), recovery: 5 })} nodeId={stTown} players={PLAYERS} turn={turnOfMonth(month)} stats={forced({})} />
          </Cell>
          <Cell w={w} title="町長（はなこ）" note="役場に家紋の旗">
            <TownScene city={one({ plots: basePlots.map((p, i) => (p && i < 4 ? [p[0], p[1], 1] : p)) })} nodeId={stTown} players={PLAYERS} turn={turnOfMonth(month)} stats={forced({})} />
          </Cell>
          <Cell w={w} title="独占（たろう）" note="通りいっぱいの提灯">
            <TownScene city={one({ plots: mine(0) })} nodeId={stTown} players={PLAYERS} turn={turnOfMonth(month)} stats={forced({ happiness: 7, population: 420 })} />
          </Cell>
          <Cell w={w} title="独占（はなこ）・選択中">
            <TownScene city={one({ plots: mine(1) })} nodeId={stTown} players={PLAYERS} turn={turnOfMonth(month)} stats={forced({ happiness: 7, population: 420 })} selected={2} onSelect={() => {}} />
          </Cell>
        </Section>
      )}

      {show('grow') && (
        <Section id="grow" title="建った・育った瞬間">
          <GrowDemo w={w} />
        </Section>
      )}

      {show('buildings') && (
        <>
          <Section id="buildings" title="建物の絵（種類 × 等級）">
            <Catalog />
          </Section>
          <Section id="glyphs" title="小さな記号（BuildingGlyph）">
            <Glyphs />
          </Section>
        </>
      )}
    </div>
  );
}
