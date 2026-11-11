import { describe, it, expect } from 'vitest';
import { pickScene, seasonOfMonth, DEFAULT_SCENE } from './sceneSpec';
import { BOARD_NODES, NODE_MAP } from '../../../data/boardNodes';

const at = (id: string) => NODE_MAP.get(id)!;

describe('釣り場の絵えらび', () => {
  it('海・川・湖・名所・南の島で絵が変わる', () => {
    expect(pickScene({ node: at('hakodate') })).toMatchObject({ base: 'north', water: 'sea' });
    expect(pickScene({ node: at('chichibu') })).toMatchObject({ base: 'valley', water: 'river' });
    expect(pickScene({ node: at('matsue') })).toMatchObject({ base: 'lake', water: 'lake' });
    expect(pickScene({ node: at('numazu') })).toMatchObject({ base: 'coast', landmark: 'fuji' });
    expect(pickScene({ node: at('hiroshima') })).toMatchObject({ base: 'coast', landmark: 'torii' });
    expect(pickScene({ node: at('kagoshima') })).toMatchObject({ landmark: 'volcano' });
    expect(pickScene({ node: at('iwakuni') })).toMatchObject({ base: 'valley', landmark: 'bridge' });
    expect(pickScene({ node: at('amami') })).toMatchObject({ base: 'south', water: 'south' });
    expect(pickScene({ node: at('choshi') })).toMatchObject({ base: 'coast', landmark: 'lighthouse' });
  });

  it('船釣りは沖の絵になる（富士だけは沖からも見える）', () => {
    expect(pickScene({ node: at('choshi'), boat: true })).toMatchObject({ base: 'open', landmark: 'none' });
    expect(pickScene({ node: at('numazu'), boat: true })).toMatchObject({ base: 'open', landmark: 'fuji' });
    expect(pickScene({ node: at('naha'), boat: true })).toMatchObject({ base: 'open', water: 'south' });
  });

  it('釣り旅は巡と釣った回数で時刻が進む', () => {
    const skies = [1, 2, 3, 4, 5, 6].map(turn => pickScene({ node: at('akita'), turn }).sky);
    expect(skies).toEqual(['dawn', 'day', 'day', 'dusk', 'night', 'dawn']);
    // 同じ手番で釣り直すと、次の時刻の空になる
    expect(pickScene({ node: at('akita'), turn: 1, actions: 1 }).sky).toBe('day');
    expect(pickScene({ node: at('akita'), turn: 1 }).season).toBeNull();
  });

  it('まちづくりは月で季節が決まる', () => {
    expect(seasonOfMonth(4)).toBe('spring');
    expect(seasonOfMonth(7)).toBe('summer');
    expect(seasonOfMonth(10)).toBe('autumn');
    expect(seasonOfMonth(1)).toBe('winter');
    expect(pickScene({ node: at('akita'), mode: 'city', turn: 1, month: 4 })).toMatchObject({ season: 'spring', sky: 'dawn' });
    expect(pickScene({ node: at('akita'), mode: 'city', turn: 10, month: 1 }).season).toBe('winter');
  });

  it('どのマスでも絵が決まる（場所が無くても落ちない）', () => {
    for (const node of BOARD_NODES) {
      const s = pickScene({ node, turn: 3 });
      expect(s.base).toBeTruthy();
      expect(s.sky).toBeTruthy();
    }
    expect(pickScene({})).toMatchObject({ base: DEFAULT_SCENE.base, water: 'sea' });
  });
});
