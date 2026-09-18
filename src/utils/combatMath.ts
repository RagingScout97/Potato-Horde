/** Pure combat timing helpers (Vitest). */

/** Next contact tick time given last tick + cooldown. */
export function nextContactTick(lastTickAt: number, cooldownMs: number): number {
  return lastTickAt + cooldownMs;
}

/** True if enough time has passed for another contact damage tick. */
export function canContactDamage(
  nowMs: number,
  lastTickAt: number,
  cooldownMs: number,
): boolean {
  return nowMs - lastTickAt >= cooldownMs;
}

/** Remaining puddle lifetime after dt; clamps at 0. */
export function tickPuddleTtl(ttlMs: number, dtMs: number): number {
  return Math.max(0, ttlMs - dtMs);
}

export function puddleExpired(ttlMs: number): boolean {
  return ttlMs <= 0;
}
