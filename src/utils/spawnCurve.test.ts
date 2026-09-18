import { describe, expect, it } from 'vitest';
import {
  densityFactor,
  directorMult,
  pickWeighted,
  spawnRatePerSecond,
  typeMixByTime,
} from './spawnCurve';

describe('spawn curve (T136)', () => {
  it('spawn rate increases with time', () => {
    const a = spawnRatePerSecond(0);
    const b = spawnRatePerSecond(120);
    const c = spawnRatePerSecond(600);
    expect(b).toBeGreaterThan(a);
    expect(c).toBeGreaterThan(b);
  });

  it('density factor is monotonic early', () => {
    expect(densityFactor(60)).toBeGreaterThan(densityFactor(0));
  });

  it('type mix shifts away from pure melee', () => {
    const early = typeMixByTime(0);
    const late = typeMixByTime(300);
    expect(late.ranged).toBeGreaterThan(early.ranged);
    expect(late.blob).toBeGreaterThan(early.blob);
  });

  it('pickWeighted respects rolls', () => {
    const w = { melee: 1, ranged: 0, blob: 0 } as const;
    expect(pickWeighted(w, 0.5)).toBe('melee');
  });

  it('director eases when low HP', () => {
    expect(
      directorMult({ hpRatio: 0.2, killsLast30s: 5, expectedKills30s: 5 }),
    ).toBeLessThan(1);
  });
});
