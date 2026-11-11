import { describe, it, expect } from 'vitest';
import { EVENT_CARDS } from '../../data/eventCards';
import { CITY_EVENT_CARDS } from '../../game/city';
import { EVENT_ART_KINDS, eventArtFor, cityEventArtFor } from './eventArtPick';

describe('札の絵柄（eventArtPick）', () => {
  it('釣り旅の札は、どれにも絵が付く', () => {
    for (const card of EVENT_CARDS) {
      const spec = eventArtFor(card);
      expect(EVENT_ART_KINDS, `${card.id}（${card.name}）`).toContain(spec.kind);
    }
  });

  it('まちの出来事の札は、どれにも絵が付く', () => {
    for (const card of CITY_EVENT_CARDS) {
      const spec = cityEventArtFor(card);
      expect(EVENT_ART_KINDS, `${card.id}（${card.name}）`).toContain(spec.kind);
    }
  });

  it('描いた絵柄は、どれかの札で使われている（使われない絵を残さない）', () => {
    const used = new Set<string>();
    for (const card of EVENT_CARDS) used.add(eventArtFor(card).kind);
    for (const card of CITY_EVENT_CARDS) used.add(cityEventArtFor(card).kind);
    for (const kind of EVENT_ART_KINDS) expect(used, kind).toContain(kind);
  });

  it('絵柄は 12 種より多く、内容に合った絵を選ぶ', () => {
    expect(EVENT_ART_KINDS.length).toBeGreaterThanOrEqual(12);
    const byId = (id: string) => eventArtFor(EVENT_CARDS.find(c => c.id === id)!);
    expect(byId('treasure')).toEqual({ kind: 'coins', variant: undefined });
    expect(byId('fine').kind).toBe('wallet');
    expect(byId('free_rod')).toEqual({ kind: 'gift', variant: 'rod' });
    expect(byId('antique_reel')).toEqual({ kind: 'gift', variant: 'reel' });
    expect(byId('rod_snap').kind).toBe('rod_break');
    expect(byId('reel_rust').kind).toBe('reel_soak');
    expect(byId('lure_lost').kind).toBe('lure_lost');
    expect(byId('storm')).toEqual({ kind: 'storm', variant: 'thunder' });
    expect(byId('typhoon')).toEqual({ kind: 'storm', variant: 'typhoon' });
    expect(byId('monkeys').kind).toBe('monkey');
    expect(byId('bear_scare').kind).toBe('bear');
    expect(byId('theft')).toEqual({ kind: 'bird', variant: 'crow_fish' });
    expect(byId('seasick').kind).toBe('rest');
    expect(byId('wind_boost').kind).toBe('dice');
    expect(byId('sardine_school').kind).toBe('tairyo');
    expect(byId('shingyo_descent')).toEqual({ kind: 'fish', variant: 'mythical' });
    expect(byId('local_guide')).toEqual({ kind: 'travel', variant: 'forward' });
    expect(byId('fog')).toEqual({ kind: 'travel', variant: 'fog' });
  });

  it('まちの災害は、災害ごとの絵になる', () => {
    const byId = (id: string) => cityEventArtFor(CITY_EVENT_CARDS.find(c => c.id === id)!);
    expect(byId('c_quake').kind).toBe('namazu');
    expect(byId('c_kaiju').kind).toBe('squid');
    expect(byId('c_fire').kind).toBe('fire');
    expect(byId('c_typhoon')).toEqual({ kind: 'storm', variant: 'typhoon' });
    expect(byId('c_boom')).toEqual({ kind: 'market', variant: 'boom' });
    expect(byId('c_recession')).toEqual({ kind: 'market', variant: 'recession' });
    expect(byId('c_free_park')).toEqual({ kind: 'house', variant: 'park' });
  });
});
