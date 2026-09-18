import { describe, expect, it } from 'vitest';
import { applyXpGain, totalXpTo, xpToNext } from './xp';

describe('XP curve (T169)', () => {
  it('xpToNext grows with level', () => {
    expect(xpToNext(1)).toBe(20);
    expect(xpToNext(2)).toBeGreaterThan(xpToNext(1));
    expect(xpToNext(10)).toBeGreaterThan(xpToNext(5));
  });

  it('totalXpTo matches sum', () => {
    expect(totalXpTo(1)).toBe(0);
    expect(totalXpTo(3)).toBe(xpToNext(1) + xpToNext(2));
  });

  it('applyXpGain can multi-level', () => {
    const r = applyXpGain(1, 0, xpToNext(1) + xpToNext(2) + 5);
    expect(r.level).toBe(3);
    expect(r.levelsGained).toBe(2);
    expect(r.xpIntoLevel).toBe(5);
  });
});
