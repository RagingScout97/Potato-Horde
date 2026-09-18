import { describe, expect, it } from 'vitest';
import { aimVector, findNearestInRange, type TargetPoint } from './targeting';

describe('findNearestInRange', () => {
  const origin = { x: 0, y: 0 };

  it('returns null when no targets', () => {
    expect(findNearestInRange(0, 0, 100, [])).toBeNull();
  });

  it('returns nearest within range', () => {
    const targets: TargetPoint[] = [
      { id: 'far', x: 80, y: 0 },
      { id: 'near', x: 40, y: 0 },
      { id: 'oob', x: 200, y: 0 },
    ];
    const hit = findNearestInRange(origin.x, origin.y, 100, targets);
    expect(hit?.id).toBe('near');
  });

  it('ignores dead targets', () => {
    const targets: TargetPoint[] = [
      { id: 'dead', x: 10, y: 0, alive: false },
      { id: 'live', x: 50, y: 0, alive: true },
    ];
    expect(findNearestInRange(0, 0, 100, targets)?.id).toBe('live');
  });

  it('includes offscreen-in-range targets', () => {
    // "Camera" would exclude this visually, but range alone matters (T074)
    const targets: TargetPoint[] = [{ id: 'off', x: 90, y: 0, alive: true }];
    expect(findNearestInRange(0, 0, 100, targets)?.id).toBe('off');
  });

  it('returns null when all out of range', () => {
    const targets: TargetPoint[] = [{ id: 'far', x: 150, y: 0 }];
    expect(findNearestInRange(0, 0, 100, targets)).toBeNull();
  });
});

describe('aimVector', () => {
  it('returns unit vector toward target', () => {
    const v = aimVector(0, 0, 3, 4);
    expect(v.x).toBeCloseTo(0.6, 5);
    expect(v.y).toBeCloseTo(0.8, 5);
  });

  it('returns zero when coincident', () => {
    expect(aimVector(1, 1, 1, 1)).toEqual({ x: 0, y: 0 });
  });
});
