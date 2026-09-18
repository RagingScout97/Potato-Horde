/**
 * Uniform-grid spatial hash for nearest queries (T463).
 */

import { distanceSq, type TargetPoint } from '@/utils/targeting';

export class SpatialHash {
  private readonly cellSize: number;
  private readonly buckets = new Map<string, TargetPoint[]>();

  constructor(cellSize = 128) {
    this.cellSize = cellSize;
  }

  clear(): void {
    this.buckets.clear();
  }

  private key(cx: number, cy: number): string {
    return `${cx},${cy}`;
  }

  private cell(x: number, y: number): { cx: number; cy: number } {
    return {
      cx: Math.floor(x / this.cellSize),
      cy: Math.floor(y / this.cellSize),
    };
  }

  insert(t: TargetPoint): void {
    if (t.alive === false) return;
    if (!Number.isFinite(t.x) || !Number.isFinite(t.y)) return;
    const { cx, cy } = this.cell(t.x, t.y);
    const k = this.key(cx, cy);
    let list = this.buckets.get(k);
    if (!list) {
      list = [];
      this.buckets.set(k, list);
    }
    list.push(t);
  }

  rebuild(targets: readonly TargetPoint[]): void {
    this.clear();
    for (const t of targets) this.insert(t);
  }

  /**
   * Nearest in range using neighboring cells. Falls back to full scan if empty.
   */
  findNearest(
    originX: number,
    originY: number,
    range: number,
  ): TargetPoint | null {
    if (!Number.isFinite(originX) || !Number.isFinite(originY)) return null;
    const rangeSq = range * range;
    const { cx, cy } = this.cell(originX, originY);
    const cellSpan = Math.max(1, Math.ceil(range / this.cellSize));
    let best: TargetPoint | null = null;
    let bestDist = Infinity;

    for (let dy = -cellSpan; dy <= cellSpan; dy++) {
      for (let dx = -cellSpan; dx <= cellSpan; dx++) {
        const list = this.buckets.get(this.key(cx + dx, cy + dy));
        if (!list) continue;
        for (const t of list) {
          if (t.alive === false) continue;
          const d = distanceSq(originX, originY, t.x, t.y);
          if (d <= rangeSq && d < bestDist) {
            bestDist = d;
            best = t;
          }
        }
      }
    }
    return best;
  }
}

/** Prefer spatial hash when many targets; else linear (T463). */
export function findNearestHybrid(
  originX: number,
  originY: number,
  range: number,
  targets: readonly TargetPoint[],
  hash?: SpatialHash,
  hashThreshold = 24,
): TargetPoint | null {
  if (targets.length === 0) return null;
  if (hash && targets.length >= hashThreshold) {
    hash.rebuild(targets);
    return hash.findNearest(originX, originY, range);
  }
  // inline linear to avoid circular import churn
  const rangeSq = range * range;
  let best: TargetPoint | null = null;
  let bestDist = Infinity;
  for (const t of targets) {
    if (t.alive === false) continue;
    const d = distanceSq(originX, originY, t.x, t.y);
    if (d <= rangeSq && d < bestDist) {
      bestDist = d;
      best = t;
    }
  }
  return best;
}
