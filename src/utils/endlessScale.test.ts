import { describe, expect, it } from 'vitest';
import {
  EndlessCaps,
  endlessDamageMult,
  endlessEliteChance,
  endlessHpMult,
  regenFactor,
} from '@/utils/endlessScale';

describe('endlessScale caps (T328)', () => {
  it('HP mult grows then caps', () => {
    expect(endlessHpMult(0)).toBeCloseTo(1, 5);
    expect(endlessHpMult(60)).toBeGreaterThan(1);
    expect(endlessHpMult(60 * 60)).toBeCloseTo(EndlessCaps.maxHpMult, 5);
    expect(endlessHpMult(60 * 120)).toBeCloseTo(EndlessCaps.maxHpMult, 5);
  });

  it('damage mult is capped below HP mult', () => {
    const late = endlessDamageMult(60 * 60);
    expect(late).toBeLessThanOrEqual(EndlessCaps.maxDamageMult);
    expect(late).toBeLessThanOrEqual(endlessHpMult(60 * 60));
  });

  it('elite chance ramps and caps', () => {
    expect(endlessEliteChance(0)).toBeCloseTo(EndlessCaps.eliteBase, 5);
    expect(endlessEliteChance(60 * 60)).toBeCloseTo(EndlessCaps.eliteCap, 5);
  });

  it('regen diminishes over time', () => {
    expect(regenFactor(0)).toBeCloseTo(1, 5);
    expect(regenFactor(600)).toBeLessThan(1);
    expect(regenFactor(600)).toBeGreaterThan(regenFactor(1200));
  });

  it('hard difficulty raises scale', () => {
    expect(endlessHpMult(120, 'hard')).toBeGreaterThan(endlessHpMult(120, 'normal'));
    expect(endlessHpMult(120, 'easy')).toBeLessThan(endlessHpMult(120, 'normal'));
  });
});
