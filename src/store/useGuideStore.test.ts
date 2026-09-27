import { describe, it, expect } from 'vitest';
import { parseSeen, useGuideStore } from './useGuideStore';

describe('案内の記録', () => {
  it('壊れた保存データは空とみなす', () => {
    expect(parseSeen(null)).toEqual([]);
    expect(parseSeen('')).toEqual([]);
    expect(parseSeen('{oops')).toEqual([]);
    expect(parseSeen('{"a":1}')).toEqual([]);
    expect(parseSeen('["roll",3,"path"]')).toEqual(['roll', 'path']);
  });

  it('localStorage が使えなくても、見た案内を覚えてはじめから出せる', () => {
    const st = useGuideStore.getState();
    st.resetSeen();
    st.markSeen('roll');
    st.markSeen('roll');
    expect(useGuideStore.getState().seen).toEqual(['roll']);
    st.setActive('path');
    st.setEnabled(false);
    expect(useGuideStore.getState().enabled).toBe(false);
    expect(useGuideStore.getState().activeId).toBeNull();
    st.setEnabled(true);
    st.resetSeen();
    expect(useGuideStore.getState().seen).toEqual([]);
  });
});
