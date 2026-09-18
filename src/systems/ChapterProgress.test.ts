import { describe, expect, it } from 'vitest';
import { computeStars } from '@/systems/ChapterProgress';

describe('chapter stars (T338)', () => {
  it('returns 0 if not cleared', () => {
    expect(computeStars(false, 100, 180)).toBe(0);
  });

  it('awards 1–3 by clear time', () => {
    expect(computeStars(true, 200, 180)).toBe(1);
    expect(computeStars(true, 180, 180)).toBe(2);
    expect(computeStars(true, 140, 180)).toBe(3);
  });
});
