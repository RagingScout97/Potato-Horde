/** Gear templates, rarity, loot (Phase 17). Colored-box placeholders. */

export type GearSlot = 'weapon' | 'armor' | 'accessory';
export type GearRarity = 'common' | 'uncommon' | 'rare' | 'epic';

export const RARITY_COLORS: Record<GearRarity, number> = {
  common: 0x94a3b8,
  uncommon: 0x4ade80,
  rare: 0x38bdf8,
  epic: 0xc084fc,
};

export const RARITY_HEX: Record<GearRarity, string> = {
  common: '#94a3b8',
  uncommon: '#4ade80',
  rare: '#38bdf8',
  epic: '#c084fc',
};

export interface GearStats {
  damageMult: number;
  maxHp: number;
  armor: number;
  moveSpeedMult: number;
  magnetBonus: number;
  luckBonus: number;
  atkSpeedMult: number;
}

export interface GearTemplate {
  templateId: string;
  name: string;
  slot: GearSlot;
  /** Base stats before rarity roll. */
  base: Partial<GearStats>;
}

export interface GearItem {
  /** Unique instance id. */
  id: string;
  templateId: string;
  name: string;
  slot: GearSlot;
  rarity: GearRarity;
  stats: GearStats;
  /** Merge level (1 = base). */
  mergeLevel: number;
}

export const GEAR_TEMPLATES: readonly GearTemplate[] = [
  {
    templateId: 'rusty_pistol',
    name: 'Rusty Pistol',
    slot: 'weapon',
    base: { damageMult: 0.08, atkSpeedMult: 0.02 },
  },
  {
    templateId: 'riot_plate',
    name: 'Riot Plate',
    slot: 'armor',
    base: { maxHp: 20, armor: 2 },
  },
  {
    templateId: 'sprint_sneakers',
    name: 'Sprint Sneakers',
    slot: 'accessory',
    base: { moveSpeedMult: 0.05, magnetBonus: 10 },
  },
  {
    templateId: 'lucky_charm',
    name: 'Lucky Charm',
    slot: 'accessory',
    base: { luckBonus: 0.05, magnetBonus: 5 },
  },
  {
    templateId: 'carbine',
    name: 'Carbine',
    slot: 'weapon',
    base: { damageMult: 0.12, atkSpeedMult: 0.04 },
  },
  {
    templateId: 'kevlar',
    name: 'Kevlar Vest',
    slot: 'armor',
    base: { maxHp: 28, armor: 3 },
  },
] as const;

const RARITY_MULT: Record<GearRarity, number> = {
  common: 1,
  uncommon: 1.25,
  rare: 1.55,
  epic: 2,
};

/** Loot rarity weights before luck (T399). */
export const RARITY_WEIGHTS: Record<GearRarity, number> = {
  common: 55,
  uncommon: 28,
  rare: 13,
  epic: 4,
};

export const INVENTORY_CAP = 24;

export function emptyGearStats(): GearStats {
  return {
    damageMult: 0,
    maxHp: 0,
    armor: 0,
    moveSpeedMult: 0,
    magnetBonus: 0,
    luckBonus: 0,
    atkSpeedMult: 0,
  };
}

export function getTemplate(templateId: string): GearTemplate {
  const t = GEAR_TEMPLATES.find((g) => g.templateId === templateId);
  if (!t) throw new Error(`Unknown gear template ${templateId}`);
  return t;
}

export function scaleStats(base: Partial<GearStats>, rarity: GearRarity, mergeLevel: number): GearStats {
  const m = RARITY_MULT[rarity] * (1 + 0.15 * (mergeLevel - 1));
  const out = emptyGearStats();
  (Object.keys(out) as (keyof GearStats)[]).forEach((k) => {
    out[k] = (base[k] ?? 0) * m;
  });
  // Clamp negatives (T396)
  out.damageMult = Math.max(0, out.damageMult);
  out.maxHp = Math.max(0, out.maxHp);
  out.armor = Math.max(0, out.armor);
  out.moveSpeedMult = Math.max(0, out.moveSpeedMult);
  out.magnetBonus = Math.max(0, out.magnetBonus);
  out.luckBonus = Math.max(0, out.luckBonus);
  out.atkSpeedMult = Math.max(0, out.atkSpeedMult);
  return out;
}

/** Simple power score for UI compare (T387). */
export function gearPowerScore(item: GearItem): number {
  const s = item.stats;
  return Math.round(
    s.damageMult * 100 +
      s.atkSpeedMult * 80 +
      s.maxHp * 0.5 +
      s.armor * 4 +
      s.moveSpeedMult * 60 +
      s.magnetBonus * 0.3 +
      s.luckBonus * 80 +
      item.mergeLevel * 5,
  );
}

export function salvageValue(item: GearItem): number {
  const rarityBase = { common: 8, uncommon: 14, rare: 24, epic: 40 }[item.rarity];
  return rarityBase * item.mergeLevel;
}
