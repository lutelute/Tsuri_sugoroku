import { describe, it, expect } from 'vitest';
import { CAPITAL_EVENTS } from '../../data/capitalEvents';
import { FESTIVAL_EVENT_IDS, FESTIVAL_KINDS, festivalArtFor } from './festivalArtPick';

describe('祭りの飾り絵（festivalArtPick）', () => {
  it('どの県庁の祭りにも、絵柄が決めてある', () => {
    for (const id of Object.keys(CAPITAL_EVENTS)) {
      expect(FESTIVAL_EVENT_IDS, id).toContain(id);
      expect(FESTIVAL_KINDS).toContain(festivalArtFor(id));
    }
  });

  it('決めてある祭りは、どれも本当にある祭り', () => {
    for (const id of FESTIVAL_EVENT_IDS) expect(CAPITAL_EVENTS[id], id).toBeDefined();
  });

  it('描いた絵柄は、どれかの祭りで使われている', () => {
    const used = new Set(Object.keys(CAPITAL_EVENTS).map(festivalArtFor));
    for (const kind of FESTIVAL_KINDS) expect(used, kind).toContain(kind);
  });

  it('知らない祭りは花火にする', () => {
    expect(festivalArtFor('unknown_event')).toBe('hanabi');
  });
});
