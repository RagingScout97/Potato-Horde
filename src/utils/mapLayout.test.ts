import { describe, expect, it } from 'vitest';
import { MapConfig } from '@/data/mapLayouts';
import {
  aabbOverlap,
  borderWalls,
  generateMapStamps,
  kitePillars,
  segmentHitsAabb,
  unstickFromAabb,
} from '@/utils/mapLayout';

describe('mapLayout (Phase 13)', () => {
  it('border walls cover four edges (T308)', () => {
    const walls = borderWalls(4000, 4000, 48);
    expect(walls).toHaveLength(4);
    expect(walls.every((w) => w.kind === 'border')).toBe(true);
  });

  it('kite pillars are four corners around center (T303)', () => {
    const p = kitePillars(2000, 2000, 420, 72);
    expect(p).toHaveLength(4);
    expect(p.map((x) => x.kind)).toEqual(['pillar', 'pillar', 'pillar', 'pillar']);
  });

  it('same seed yields identical stamps (T306)', () => {
    const a = generateMapStamps({
      arenaW: 4000,
      arenaH: 4000,
      centerX: 2000,
      centerY: 2000,
      seed: 42,
      chapterId: 1,
    });
    const b = generateMapStamps({
      arenaW: 4000,
      arenaH: 4000,
      centerX: 2000,
      centerY: 2000,
      seed: 42,
      chapterId: 1,
    });
    expect(a).toEqual(b);
  });

  it('keeps center safe radius clear of non-border stamps (T304)', () => {
    const stamps = generateMapStamps({
      arenaW: 4000,
      arenaH: 4000,
      centerX: 2000,
      centerY: 2000,
      seed: 7,
      chapterId: 1,
    });
    const cx = 2000;
    const cy = 2000;
    const r = MapConfig.safeRadius;
    for (const s of stamps) {
      if (s.kind === 'border') continue;
      const dx = Math.max(Math.abs(s.x - cx) - s.w / 2, 0);
      const dy = Math.max(Math.abs(s.y - cy) - s.h / 2, 0);
      expect(dx * dx + dy * dy).toBeGreaterThanOrEqual(r * r - 1);
    }
  });

  it('unstick pushes out of overlap (T310)', () => {
    const p = unstickFromAabb(100, 100, 36, 100, 100, 72, 72, 28);
    expect(Math.hypot(p.x - 100, p.y - 100)).toBeGreaterThan(10);
  });

  it('aabb + LoS helpers work', () => {
    expect(aabbOverlap(0, 0, 10, 10, 8, 0, 10, 10)).toBe(true);
    expect(segmentHitsAabb(0, 0, 100, 0, 50, 0, 20, 20)).toBe(true);
    expect(segmentHitsAabb(0, 0, 10, 0, 50, 50, 20, 20)).toBe(false);
  });
});
