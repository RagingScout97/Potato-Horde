import { describe, expect, it } from 'vitest';
import { applyArmor, armorMitigation } from '@/utils/armor';

describe('armor formula (T241)', () => {
  it('0 armor = full damage', () => {
    expect(armorMitigation(0)).toBe(1);
    expect(applyArmor(100, 0)).toBe(100);
  });

  it('100 armor halves damage', () => {
    expect(armorMitigation(100)).toBeCloseTo(0.5, 5);
    expect(applyArmor(100, 100)).toBeCloseTo(50, 5);
  });

  it('guards NaN / negative', () => {
    expect(applyArmor(NaN, 10)).toBe(0);
    expect(applyArmor(-5, 10)).toBe(0);
  });
});
