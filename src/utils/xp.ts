/** XP curve from docs/formulas.md */

export function xpToNext(level: number): number {
  return Math.floor(12 * Math.pow(level, 1.45) + 8);
}

export function totalXpTo(level: number): number {
  let sum = 0;
  for (let n = 1; n < level; n++) sum += xpToNext(n);
  return sum;
}

/** Apply gained XP; returns how many levels gained and leftover XP into current level. */
export function applyXpGain(
  level: number,
  xpIntoLevel: number,
  gain: number,
): { level: number; xpIntoLevel: number; levelsGained: number } {
  let lvl = level;
  let xp = xpIntoLevel + gain;
  let gained = 0;
  let need = xpToNext(lvl);
  while (xp >= need) {
    xp -= need;
    lvl += 1;
    gained += 1;
    need = xpToNext(lvl);
  }
  return { level: lvl, xpIntoLevel: xp, levelsGained: gained };
}

export const OrbXp = {
  small: 1,
  medium: 3,
  large: 8,
} as const;
