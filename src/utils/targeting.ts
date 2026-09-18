/** Pure targeting helpers (Vitest-friendly). */

export interface TargetPoint {
  id: string;
  x: number;
  y: number;
  alive?: boolean;
}

export function distanceSq(ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  return dx * dx + dy * dy;
}

/**
 * Nearest alive target within range (inclusive).
 * Offscreen targets are valid if within range (T074).
 */
export function findNearestInRange(
  originX: number,
  originY: number,
  range: number,
  targets: readonly TargetPoint[],
): TargetPoint | null {
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

/** Unit aim vector from origin toward target; zero if coincident. */
export function aimVector(
  originX: number,
  originY: number,
  targetX: number,
  targetY: number,
): { x: number; y: number } {
  const dx = targetX - originX;
  const dy = targetY - originY;
  const len = Math.hypot(dx, dy);
  if (len < 1e-6) return { x: 0, y: 0 };
  return { x: dx / len, y: dy / len };
}
