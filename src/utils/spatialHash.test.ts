import { describe, expect, it } from 'vitest';
import { SpatialHash, findNearestHybrid } from './spatialHash';
import type { TargetPoint } from './targeting';

describe('SpatialHash', () => {
  it('finds nearest in range', () => {
    const hash = new SpatialHash(64);
    const targets: TargetPoint[] = [
      { id: 'a', x: 10, y: 0 },
      { id: 'b', x: 200, y: 0 },
      { id: 'c', x: 40, y: 0, alive: false },
    ];
    hash.rebuild(targets);
    expect(hash.findNearest(0, 0, 100)?.id).toBe('a');
    expect(hash.findNearest(0, 0, 5)).toBeNull();
  });

  it('hybrid matches linear for small sets', () => {
    const targets: TargetPoint[] = [
      { id: 'near', x: 5, y: 5 },
      { id: 'far', x: 500, y: 500 },
    ];
    const hash = new SpatialHash(128);
    expect(findNearestHybrid(0, 0, 50, targets, hash, 1)?.id).toBe('near');
    expect(findNearestHybrid(0, 0, 50, targets)?.id).toBe('near');
  });
});
