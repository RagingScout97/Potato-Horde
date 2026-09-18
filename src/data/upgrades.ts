/** Permanent hub upgrade tree (T359–T360). Levels start at 0. */

export type UpgradeId = 'hp' | 'atk' | 'speed' | 'luck' | 'magnet';

export interface UpgradeDef {
  id: UpgradeId;
  name: string;
  description: string;
  maxLevel: number;
  /** Banknotes cost for next level (currentLevel → currentLevel+1). */
  costForLevel: (nextLevel: number) => number;
  /** Per-level effect applied at run start. */
  perLevel: {
    maxHp?: number;
    damageMult?: number;
    moveSpeedMult?: number;
    luckBonus?: number;
    magnetBonus?: number;
  };
}

export const UPGRADE_DEFS: readonly UpgradeDef[] = [
  {
    id: 'hp',
    name: 'Vitality',
    description: '+12 max HP per level',
    maxLevel: 10,
    costForLevel: (n) => 20 + n * 15,
    perLevel: { maxHp: 12 },
  },
  {
    id: 'atk',
    name: 'Firepower',
    description: '+6% damage per level',
    maxLevel: 10,
    costForLevel: (n) => 25 + n * 18,
    perLevel: { damageMult: 0.06 },
  },
  {
    id: 'speed',
    name: 'Boots',
    description: '+4% move speed per level',
    maxLevel: 8,
    costForLevel: (n) => 18 + n * 14,
    perLevel: { moveSpeedMult: 0.04 },
  },
  {
    id: 'luck',
    name: 'Lucky Spud',
    description: '+3% luck (loot / crit bias) per level',
    maxLevel: 8,
    costForLevel: (n) => 30 + n * 20,
    perLevel: { luckBonus: 0.03 },
  },
  {
    id: 'magnet',
    name: 'Magnet Pull',
    description: '+18 magnet range per level',
    maxLevel: 8,
    costForLevel: (n) => 15 + n * 12,
    perLevel: { magnetBonus: 18 },
  },
] as const;

export type UpgradeLevels = Record<UpgradeId, number>;

export function createDefaultUpgrades(): UpgradeLevels {
  return { hp: 0, atk: 0, speed: 0, luck: 0, magnet: 0 };
}

export function getUpgradeDef(id: UpgradeId): UpgradeDef {
  const d = UPGRADE_DEFS.find((u) => u.id === id);
  if (!d) throw new Error(`Unknown upgrade ${id}`);
  return d;
}
