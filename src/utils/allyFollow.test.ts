import { describe, expect, it } from 'vitest';
import {
  allyDesiredPosition,
  allyFollowOffset,
  applyAllySeparation,
  recallToward,
  shouldRecall,
} from '@/utils/allyFollow';

describe('allyFollowOffset (T285)', () => {
  it('places a single ally behind the player', () => {
    const o = allyFollowOffset(0, 1, 72);
    expect(o.x).toBeCloseTo(0, 5);
    expect(o.y).toBeCloseTo(-72, 5);
  });

  it('spaces three allies evenly on a circle', () => {
    const r = 100;
    const a = allyFollowOffset(0, 3, r);
    const b = allyFollowOffset(1, 3, r);
    const c = allyFollowOffset(2, 3, r);
    const dist = (p: { x: number; y: number }, q: { x: number; y: number }) =>
      Math.hypot(p.x - q.x, p.y - q.y);
    // Chord length for 120° on radius R is R * √3
    const chord = r * Math.sqrt(3);
    expect(dist(a, b)).toBeCloseTo(chord, 5);
    expect(dist(b, c)).toBeCloseTo(chord, 5);
    expect(dist(c, a)).toBeCloseTo(chord, 5);
  });

  it('desired position is player + offset', () => {
    const p = allyDesiredPosition(2000, 2000, 0, 1, 72);
    expect(p.x).toBeCloseTo(2000, 5);
    expect(p.y).toBeCloseTo(1928, 5);
  });

  it('separation pushes overlapping allies apart', () => {
    const pos = { x: 10, y: 0 };
    applyAllySeparation(pos, [{ x: 0, y: 0 }], 36, 48);
    expect(pos.x).toBeGreaterThan(10);
  });

  it('recall triggers beyond distance', () => {
    expect(shouldRecall(500 * 500, 420)).toBe(true);
    expect(shouldRecall(100 * 100, 420)).toBe(false);
  });

  it('recallToward snaps when requested', () => {
    const p = recallToward(0, 0, 50, 50, true);
    expect(p).toEqual({ x: 50, y: 50 });
  });
});
