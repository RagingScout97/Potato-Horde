/** Boss phase thresholds (pure — T261). */

export function bossEnrageThreshold(hp: number, maxHp: number): boolean {
  return maxHp > 0 && hp / maxHp <= 0.3;
}
