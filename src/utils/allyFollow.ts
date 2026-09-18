/** Pure ally follow / separation helpers (T272, T277, T279, T285). */

export interface Vec2 {
  x: number;
  y: number;
}

/**
 * Slot offset around the player (evenly spaced on a circle).
 * Index 0 at -90° (behind/above in screen space) so first ally feels natural.
 */
export function allyFollowOffset(
  index: number,
  count: number,
  radius: number,
): Vec2 {
  const n = Math.max(1, count);
  const i = ((index % n) + n) % n;
  const angle = -Math.PI / 2 + (i * (Math.PI * 2)) / n;
  return {
    x: Math.cos(angle) * radius,
    y: Math.sin(angle) * radius,
  };
}

/** Desired world position for an ally slot. */
export function allyDesiredPosition(
  playerX: number,
  playerY: number,
  index: number,
  count: number,
  radius: number,
): Vec2 {
  const off = allyFollowOffset(index, count, radius);
  return { x: playerX + off.x, y: playerY + off.y };
}

/**
 * Soft separation push away from other allies that are too close.
 * Mutates `pos` in place and returns it.
 */
export function applyAllySeparation(
  pos: Vec2,
  others: readonly Vec2[],
  minDist: number,
  pushStrength: number,
): Vec2 {
  const minSq = minDist * minDist;
  let px = 0;
  let py = 0;
  for (const o of others) {
    const dx = pos.x - o.x;
    const dy = pos.y - o.y;
    const d2 = dx * dx + dy * dy;
    if (d2 < 1e-6 || d2 >= minSq) continue;
    const d = Math.sqrt(d2);
    const strength = ((minDist - d) / minDist) * pushStrength;
    px += (dx / d) * strength;
    py += (dy / d) * strength;
  }
  pos.x += px;
  pos.y += py;
  return pos;
}

export function shouldRecall(distSq: number, recallDistance: number): boolean {
  return distSq > recallDistance * recallDistance;
}

/** Snap toward player when recalled (immediate or strong lerp). */
export function recallToward(
  allyX: number,
  allyY: number,
  targetX: number,
  targetY: number,
  snap: boolean,
  lerp = 0.35,
): Vec2 {
  if (snap) return { x: targetX, y: targetY };
  return {
    x: allyX + (targetX - allyX) * lerp,
    y: allyY + (targetY - allyY) * lerp,
  };
}
