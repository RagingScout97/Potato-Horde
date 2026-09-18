/**
 * Single stats pipeline: base × meta upgrades × gear × hero (T408, T428–T429).
 * Run-build multipliers stack on top in CombatSystem / RunBuild.
 */

import { getUpgradeDef, type UpgradeLevels, createDefaultUpgrades } from '@/data/upgrades';
import { emptyGearStats, type GearItem, type GearStats } from '@/data/gear';
import { getHeroOrDefault, type HeroPassive } from '@/data/heroes';
import type { SaveV1 } from '@/save/schema';

export interface MetaBonuses {
  maxHp: number;
  damageMult: number;
  moveSpeedMult: number;
  atkSpeedMult: number;
  magnetBonus: number;
  luckBonus: number;
  armor: number;
  heroId: string;
  heroColor: number;
  powerScore: number;
}

function sumGear(items: GearItem[]): GearStats {
  const s = emptyGearStats();
  for (const it of items) {
    s.damageMult += it.stats.damageMult;
    s.maxHp += it.stats.maxHp;
    s.armor += it.stats.armor;
    s.moveSpeedMult += it.stats.moveSpeedMult;
    s.magnetBonus += it.stats.magnetBonus;
    s.luckBonus += it.stats.luckBonus;
    s.atkSpeedMult += it.stats.atkSpeedMult;
  }
  return s;
}

function upgradesToBonuses(levels: UpgradeLevels): Omit<MetaBonuses, 'heroId' | 'heroColor' | 'powerScore'> {
  const out = {
    maxHp: 0,
    damageMult: 1,
    moveSpeedMult: 1,
    atkSpeedMult: 1,
    magnetBonus: 0,
    luckBonus: 0,
    armor: 0,
  };
  (Object.keys(levels) as (keyof UpgradeLevels)[]).forEach((id) => {
    const lvl = levels[id] ?? 0;
    if (lvl <= 0) return;
    const def = getUpgradeDef(id);
    if (def.perLevel.maxHp) out.maxHp += def.perLevel.maxHp * lvl;
    if (def.perLevel.damageMult) out.damageMult += def.perLevel.damageMult * lvl;
    if (def.perLevel.moveSpeedMult) out.moveSpeedMult += def.perLevel.moveSpeedMult * lvl;
    if (def.perLevel.luckBonus) out.luckBonus += def.perLevel.luckBonus * lvl;
    if (def.perLevel.magnetBonus) out.magnetBonus += def.perLevel.magnetBonus * lvl;
  });
  return out;
}

function applyPassive(
  base: Omit<MetaBonuses, 'heroId' | 'heroColor' | 'powerScore'>,
  p: HeroPassive,
): void {
  if (p.maxHp) base.maxHp += p.maxHp;
  if (p.damageMult) base.damageMult += p.damageMult;
  if (p.moveSpeedMult) base.moveSpeedMult += p.moveSpeedMult;
  if (p.atkSpeedMult) base.atkSpeedMult += p.atkSpeedMult;
  if (p.magnetBonus) base.magnetBonus += p.magnetBonus;
  if (p.luckBonus) base.luckBonus += p.luckBonus;
  if (p.armor) base.armor += p.armor;
}

/** Resolve equipped gear items from save. */
export function equippedGearItems(save: SaveV1): GearItem[] {
  const inv = save.meta.inventoryGear ?? [];
  const slots = save.meta.gear;
  const ids = [slots.weaponId, slots.armorId, slots.accessoryId].filter(
    (x): x is string => !!x,
  );
  return ids
    .map((id) => inv.find((g) => g.id === id))
    .filter((g): g is GearItem => !!g);
}

export function computeMetaBonuses(save: SaveV1): MetaBonuses {
  const upgrades = save.meta.upgrades ?? createDefaultUpgrades();
  const base = upgradesToBonuses(upgrades);
  const gear = sumGear(equippedGearItems(save));
  base.maxHp += gear.maxHp;
  base.damageMult += gear.damageMult;
  base.moveSpeedMult += gear.moveSpeedMult;
  base.atkSpeedMult += gear.atkSpeedMult;
  base.magnetBonus += gear.magnetBonus;
  base.luckBonus += gear.luckBonus;
  base.armor += gear.armor;

  const hero = getHeroOrDefault(save.meta.equippedHeroId ?? 'default');
  applyPassive(base, hero.passive);

  // Floor multipliers so bad rolls never soft-lock movement/damage
  base.damageMult = Math.max(0.25, base.damageMult);
  base.moveSpeedMult = Math.max(0.5, base.moveSpeedMult);
  base.atkSpeedMult = Math.max(0.5, base.atkSpeedMult);
  // maxHp / armor are additive bonuses (may be negative from hero passives)
  base.armor = Math.max(0, base.armor);

  const powerScore = Math.round(
    base.maxHp * 0.4 +
      (base.damageMult - 1) * 100 +
      (base.moveSpeedMult - 1) * 50 +
      (base.atkSpeedMult - 1) * 40 +
      base.magnetBonus * 0.2 +
      base.luckBonus * 80 +
      base.armor * 5,
  );

  return {
    ...base,
    heroId: hero.id,
    heroColor: hero.color,
    powerScore,
  };
}
