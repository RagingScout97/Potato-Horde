/** Spawn rate / density curves (formulas.md + Phase 6). */

export function spawnRatePerSecond(tSeconds: number, baseSpawn = 1.2): number {
  return baseSpawn * (1 + 0.12 * (tSeconds / 60));
}

/** 0..1 density factor used for type mix / bursts. */
export function densityFactor(tSeconds: number): number {
  return Math.min(3, 1 + 0.12 * (tSeconds / 60));
}

export type MixWeights = { melee: number; ranged: number; blob: number };

/** Type mix shifts toward ranged/blob as time rises (T123). */
export function typeMixByTime(tSeconds: number): MixWeights {
  const m = Math.min(1, tSeconds / 300);
  return {
    melee: Math.max(0.35, 0.85 - m * 0.4),
    ranged: Math.min(0.4, 0.1 + m * 0.25),
    blob: Math.min(0.25, 0.05 + m * 0.15),
  };
}

export function pickWeighted<T extends string>(
  weights: Record<T, number>,
  roll01: number,
): T {
  const entries = Object.entries(weights) as [T, number][];
  const sum = entries.reduce((a, [, w]) => a + w, 0);
  let r = roll01 * sum;
  for (const [k, w] of entries) {
    r -= w;
    if (r <= 0) return k;
  }
  return entries[entries.length - 1]![0];
}

/** Director multiplier from player HP ratio & recent kill pressure (T125–T126). */
export function directorMult(opts: {
  hpRatio: number;
  killsLast30s: number;
  expectedKills30s: number;
}): number {
  let m = 1;
  if (opts.hpRatio < 0.35) m *= 0.65; // ease
  else if (opts.hpRatio > 0.85 && opts.killsLast30s > opts.expectedKills30s * 1.4) {
    m *= 1.25; // raise if overpowered
  }
  return m;
}
