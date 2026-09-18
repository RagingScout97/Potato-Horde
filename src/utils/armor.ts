/** Armor mitigation (T227, T241). damageTaken = raw * 100/(100+armor). */

export function armorMitigation(armor: number): number {
  const a = Math.max(0, armor);
  return 100 / (100 + a);
}

export function applyArmor(rawDamage: number, armor: number): number {
  if (!Number.isFinite(rawDamage) || rawDamage <= 0) return 0;
  const dealt = rawDamage * armorMitigation(armor);
  return Number.isFinite(dealt) ? Math.max(0, dealt) : 0;
}
