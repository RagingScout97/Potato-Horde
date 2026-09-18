import { describe, expect, it } from 'vitest';
import { bossEnrageThreshold } from '@/utils/bossMath';

describe('boss phase thresholds (T261)', () => {
  it('enrages at or under 30%', () => {
    expect(bossEnrageThreshold(300, 1000)).toBe(true);
    expect(bossEnrageThreshold(299, 1000)).toBe(true);
    expect(bossEnrageThreshold(301, 1000)).toBe(false);
  });
});
