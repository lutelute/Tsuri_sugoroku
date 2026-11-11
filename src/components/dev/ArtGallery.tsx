// 開発ビルドだけの確かめ用の一覧: 札の絵・まちの出来事の絵・道具の絵・祭りの絵・温泉の絵を並べて見る。
// URL に ?gallery=art を付けて開く。
//   ?gallery=art&sec=events|city|gear|festival|onsen （sec を省くと全部）  &w=300（1枚の幅 px）
// 絵を直したら、ここを撮って目で確かめる（札の絵係）。
import { EVENT_CARDS } from '../../data/eventCards';
import { CITY_EVENT_CARDS } from '../../game/city';
import { CAPITAL_EVENTS } from '../../data/capitalEvents';
import { EQUIPMENT_DATA } from '../../data/equipmentData';
import type { EquipmentType } from '../../game/types';
import { eventArtFor, cityEventArtFor } from '../event/eventArtPick';
import type { EventArtSpec } from '../event/eventArtPick';
import EventArt from '../event/EventArt';
import GearArt, { GearTile } from '../shop/GearArt';
import OnsenScene from '../rest/OnsenScene';
import FestivalArt, { ChoiceArt } from '../capital/FestivalArt';
import { festivalArtFor } from '../capital/festivalArtPick';

const params = new URLSearchParams(window.location.search);
const SEC = params.get('sec');
const W = Number(params.get('w')) || 300;

const show = (name: string) => !SEC || SEC === name;

interface Group { spec: EventArtSpec; tone: 'good' | 'bad' | 'random'; names: string[] }

function groupFishing(): Group[] {
  const map = new Map<string, Group>();
  for (const c of EVENT_CARDS) {
    const spec = eventArtFor(c);
    const key = `${spec.kind}/${spec.variant ?? ''}`;
    const g = map.get(key);
    if (g) g.names.push(c.name);
    else map.set(key, { spec, tone: c.type, names: [c.name] });
  }
  return [...map.values()];
}

function Heading({ children }: { children: string }) {
  return <h2 className="font-mincho text-kin-300 text-lg mt-6 mb-3 border-b border-kin-500/30 pb-1">{children}</h2>;
}

export default function ArtGallery() {
  const groups = groupFishing();
  const types: EquipmentType[] = ['rod', 'reel', 'lure'];
  return (
    <div className="w-full h-full overflow-y-auto bg-ai-900 text-washi p-4">
      <h1 className="font-brush text-2xl text-kin-300">札の絵の一覧</h1>
      <p className="text-xs text-washi/60">?gallery=art&amp;sec=events|city|gear|festival|onsen &amp;w=300</p>

      {show('events') && (
        <section>
          <Heading>{`イベントの札（${groups.length} 通りの絵 / ${EVENT_CARDS.length} 枚）`}</Heading>
          <div className="flex flex-wrap gap-3">
            {groups.map(g => (
              <figure key={`${g.spec.kind}/${g.spec.variant ?? ''}`} style={{ width: W }}>
                <EventArt spec={g.spec} tone={g.tone} />
                <figcaption className="text-[11px] text-washi/75 mt-1 leading-snug">
                  <span className="text-kin-300">{g.spec.kind}{g.spec.variant ? ` / ${g.spec.variant}` : ''}</span>
                  {' '}（{g.names.length}）{g.names.slice(0, 4).join('・')}{g.names.length > 4 ? '…' : ''}
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}

      {show('city') && (
        <section>
          <Heading>{`まちの出来事（${CITY_EVENT_CARDS.length} 枚）`}</Heading>
          <div className="flex flex-wrap gap-3">
            {CITY_EVENT_CARDS.map(c => {
              const spec = cityEventArtFor(c);
              return (
                <figure key={c.id} style={{ width: W }}>
                  <EventArt spec={spec} tone={c.type} />
                  <figcaption className="text-[11px] text-washi/75 mt-1">
                    <span className="text-kin-300">{spec.kind}{spec.variant ? ` / ${spec.variant}` : ''}</span> {c.name}
                  </figcaption>
                </figure>
              );
            })}
          </div>
        </section>
      )}

      {show('gear') && (
        <section>
          <Heading>道具（竿・リール・ルアー × Lv1〜5）</Heading>
          {types.map(t => (
            <div key={t} className="flex flex-wrap gap-3 mb-3">
              {[1, 2, 3, 4, 5].map(lv => (
                <figure key={lv} className="text-center">
                  <GearTile type={t} level={lv} size={128} />
                  <figcaption className="text-[11px] text-washi/75 mt-1">{EQUIPMENT_DATA.find(e => e.type === t && e.level === lv)?.name}</figcaption>
                </figure>
              ))}
            </div>
          ))}
          <div className="flex flex-wrap gap-2 items-center">
            {types.flatMap(t => [1, 2, 3, 4, 5].map(lv => <GearTile key={`${t}${lv}`} type={t} level={lv} size={56} />))}
            <GearTile type="rod" level={3} size={56} broken />
            <GearTile type="reel" level={2} size={56} active />
          </div>
          <div className="flex flex-wrap gap-2 items-center mt-3 washi-card rounded-xl p-3">
            {types.flatMap(t => [1, 2, 3, 4, 5].map(lv => <GearArt key={`${t}${lv}`} type={t} level={lv} size={44} />))}
          </div>
        </section>
      )}

      {show('festival') && (
        <section>
          <Heading>{`県庁の祭り（${Object.keys(CAPITAL_EVENTS).length} か所）`}</Heading>
          <div className="flex flex-wrap gap-3">
            {Object.values(CAPITAL_EVENTS).map(ev => (
              <figure key={ev.id} style={{ width: W + 60 }}>
                <div className="rounded-xl overflow-hidden border border-kin-500/40">
                  <FestivalArt kind={festivalArtFor(ev.id)} />
                </div>
                <figcaption className="text-[11px] text-washi/75 mt-1">
                  <span className="text-kin-300">{festivalArtFor(ev.id)}</span> {ev.title}（{ev.id}）
                </figcaption>
              </figure>
            ))}
          </div>
          <div className="flex flex-wrap gap-3 mt-4 items-center">
            {(['feast', 'special_fishing', 'lore_event', 'money', 'extra_turn'] as const).map(k => (
              <figure key={k} className="text-center">
                <ChoiceArt kind={k} size={96} />
                <figcaption className="text-[11px] text-washi/75 mt-1">{k}</figcaption>
              </figure>
            ))}
            {(['feast', 'special_fishing', 'lore_event', 'money', 'extra_turn'] as const).map(k => <ChoiceArt key={k} kind={k} size={52} />)}
          </div>
        </section>
      )}

      {show('onsen') && (
        <section>
          <Heading>温泉</Heading>
          <div className="flex flex-wrap gap-4">
            <div style={{ width: 340 }} className="rounded-xl overflow-hidden border border-kin-500/40"><OnsenScene /></div>
            <div style={{ width: 720 }} className="rounded-xl overflow-hidden border border-kin-500/40"><OnsenScene /></div>
          </div>
        </section>
      )}
    </div>
  );
}
