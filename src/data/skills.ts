/** Skill registry — Phase 8 library + schema (T176–T193, T209). */

export type SkillId =
  | 'dual_pistol'
  | 'shotgun'
  | 'boomerang'
  | 'energy_trap'
  | 'shuriken'
  | 'bowling'
  | 'lightning'
  | 'fire_ring'
  | 'freeze_nova'
  | 'drone'
  | 'ally_recruit'
  | 'ally_power'
  | 'atk_up'
  | 'firerate_up'
  | 'range_up'
  | 'maxhp_up'
  | 'magnet_up'
  | 'speed_up'
  | 'armor_up'
  | 'crit_up'
  | 'cdr_up'
  | 'heal_on_level';

export type SynergyTag =
  | 'projectile'
  | 'aoe'
  | 'aura'
  | 'status'
  | 'summon'
  | 'stat'
  | 'pierce'
  | 'chain';

export interface SkillDef {
  id: SkillId;
  name: string;
  description: string;
  maxLevel: number;
  occupiesSlot: boolean;
  isStat: boolean;
  /** If false, excluded from draft (broken / unfinished). */
  enabled: boolean;
  /** Colored glyph for draft cards (T189). */
  glyphColor: number;
  tags: SynergyTag[];
  /** Weapon behavior key — must have SkillSystem handler. */
  behavior?: WeaponBehaviorId;
  /** Evolution unlocked when this weapon is maxed + catalyst owned (Phase 9). */
  evolutionId?: EvolutionId;
  catalystId?: SkillId;
}

export type WeaponBehaviorId =
  | 'dual_pistol'
  | 'shotgun'
  | 'boomerang'
  | 'energy_trap'
  | 'shuriken'
  | 'bowling'
  | 'lightning'
  | 'fire_ring'
  | 'freeze_nova'
  | 'drone';

export type EvolutionId =
  | 'dual_storm'
  | 'scatter_cannon'
  | 'orbit_blade'
  | 'death_trap'
  | 'chain_thunder'
  | 'ally_barrage';

/** Balance sheet stub (T190) — tweak here, not in hot paths. */
export const SkillBalance = {
  dual_pistol: {
    intervalMs: 320,
    damage: 9,
    range: 340,
    spreadPx: 10,
    color: 0x93c5fd,
  },
  shotgun: {
    intervalMs: 700,
    damage: 7,
    range: 220,
    pellets: 5,
    coneRad: 0.55,
    color: 0xfbbf24,
  },
  boomerang: {
    intervalMs: 900,
    damage: 14,
    range: 280,
    speed: 380,
    color: 0xa78bfa,
  },
  energy_trap: {
    intervalMs: 1400,
    damage: 6,
    radius: 48,
    ttlMs: 3200,
    tickMs: 350,
    throwRange: 260,
    color: 0x22d3ee,
  },
  shuriken: {
    intervalMs: 500,
    damage: 8,
    range: 300,
    seekSpeed: 420,
    color: 0xe2e8f0,
  },
  bowling: {
    intervalMs: 1100,
    damage: 18,
    range: 400,
    speed: 300,
    pierce: 8,
    color: 0xf472b6,
  },
  lightning: {
    intervalMs: 800,
    damage: 16,
    range: 300,
    chains: 3,
    chainRange: 140,
    color: 0xfef08a,
  },
  fire_ring: {
    intervalMs: 280,
    damage: 4,
    radius: 78,
    color: 0xf97316,
  },
  freeze_nova: {
    intervalMs: 2200,
    damage: 10,
    radius: 120,
    color: 0x38bdf8,
  },
  drone: {
    intervalMs: 420,
    damage: 8,
    range: 280,
    followDist: 56,
    color: 0x4ade80,
  },
  ally: {
    damagePerLevel: 0.18,
    fireratePerLevel: 0.1,
    rangePerLevel: 0.08,
  },
  dual_storm: {
    intervalMs: 180,
    damage: 11,
    range: 360,
    pellets: 3,
    color: 0x60a5fa,
  },
  scatter_cannon: {
    intervalMs: 550,
    damage: 9,
    range: 260,
    pellets: 9,
    coneRad: 0.75,
    color: 0xf59e0b,
  },
  orbit_blade: {
    intervalMs: 80,
    damage: 10,
    orbitRadius: 90,
    blades: 4,
    color: 0xc084fc,
  },
  death_trap: {
    intervalMs: 1000,
    damage: 12,
    radius: 64,
    ttlMs: 4000,
    tickMs: 250,
    throwRange: 300,
    color: 0x06b6d4,
  },
  chain_thunder: {
    intervalMs: 550,
    damage: 22,
    range: 340,
    chains: 6,
    chainRange: 170,
    color: 0xfde047,
  },
  stats: {
    atkPerLevel: 0.15,
    fireratePerLevel: 0.12,
    rangePerLevel: 0.1,
    magnetPerLevel: 40,
    speedPerLevel: 0.08,
    maxHpPerLevel: 20,
    armorPerLevel: 8,
    critPerLevel: 0.04,
    cdrPerLevel: 0.08,
    healOnLevel: 25,
  },
} as const;

export const SkillRegistry: Record<SkillId, SkillDef> = {
  dual_pistol: {
    id: 'dual_pistol',
    name: 'Dual Pea',
    description: 'Twin pistols — two shots',
    maxLevel: 5,
    occupiesSlot: true,
    isStat: false,
    enabled: true,
    glyphColor: 0x93c5fd,
    tags: ['projectile'],
    behavior: 'dual_pistol',
    evolutionId: 'dual_storm',
    catalystId: 'firerate_up',
  },
  shotgun: {
    id: 'shotgun',
    name: 'Spud Shotgun',
    description: 'Cone of pellets',
    maxLevel: 5,
    occupiesSlot: true,
    isStat: false,
    enabled: true,
    glyphColor: 0xfbbf24,
    tags: ['projectile', 'aoe'],
    behavior: 'shotgun',
    evolutionId: 'scatter_cannon',
    catalystId: 'atk_up',
  },
  boomerang: {
    id: 'boomerang',
    name: 'Chip Chakram',
    description: 'Returns to you',
    maxLevel: 5,
    occupiesSlot: true,
    isStat: false,
    enabled: true,
    glyphColor: 0xa78bfa,
    tags: ['projectile', 'pierce'],
    behavior: 'boomerang',
    evolutionId: 'orbit_blade',
    catalystId: 'range_up',
  },
  energy_trap: {
    id: 'energy_trap',
    name: 'Hash Mine',
    description: 'Ground AoE trap',
    maxLevel: 5,
    occupiesSlot: true,
    isStat: false,
    enabled: true,
    glyphColor: 0x22d3ee,
    tags: ['aoe'],
    behavior: 'energy_trap',
    evolutionId: 'death_trap',
    catalystId: 'maxhp_up',
  },
  shuriken: {
    id: 'shuriken',
    name: 'Fry Star',
    description: 'Seeking blades',
    maxLevel: 5,
    occupiesSlot: true,
    isStat: false,
    enabled: true,
    glyphColor: 0xe2e8f0,
    tags: ['projectile'],
    behavior: 'shuriken',
  },
  bowling: {
    id: 'bowling',
    name: 'Mash Cannon',
    description: 'Piercing bowling ball',
    maxLevel: 5,
    occupiesSlot: true,
    isStat: false,
    enabled: true,
    glyphColor: 0xf472b6,
    tags: ['projectile', 'pierce'],
    behavior: 'bowling',
  },
  lightning: {
    id: 'lightning',
    name: 'Gravy Beam',
    description: 'Chains between foes',
    maxLevel: 5,
    occupiesSlot: true,
    isStat: false,
    enabled: true,
    glyphColor: 0xfef08a,
    tags: ['chain', 'aoe'],
    behavior: 'lightning',
    evolutionId: 'chain_thunder',
    catalystId: 'crit_up',
  },
  fire_ring: {
    id: 'fire_ring',
    name: 'Tater Tornado',
    description: 'Burning aura ring',
    maxLevel: 5,
    occupiesSlot: true,
    isStat: false,
    enabled: true,
    glyphColor: 0xf97316,
    tags: ['aura', 'aoe', 'status'],
    behavior: 'fire_ring',
  },
  freeze_nova: {
    id: 'freeze_nova',
    name: 'Frost Mash',
    description: 'Periodic freeze nova',
    maxLevel: 5,
    occupiesSlot: true,
    isStat: false,
    enabled: true,
    glyphColor: 0x38bdf8,
    tags: ['aoe', 'status'],
    behavior: 'freeze_nova',
  },
  drone: {
    id: 'drone',
    name: 'Scout Sprout',
    description: 'Companion auto-gun',
    maxLevel: 5,
    occupiesSlot: true,
    isStat: false,
    enabled: true,
    glyphColor: 0x4ade80,
    tags: ['summon', 'projectile'],
    behavior: 'drone',
  },
  ally_recruit: {
    id: 'ally_recruit',
    name: 'Call Ally',
    description: 'Recruit a parachute ally (max 3)',
    maxLevel: 3,
    occupiesSlot: false,
    isStat: false,
    enabled: true,
    glyphColor: 0x38bdf8,
    tags: ['summon'],
    evolutionId: 'ally_barrage',
    catalystId: 'ally_power',
  },
  ally_power: {
    id: 'ally_power',
    name: 'Squad Feed',
    description: 'Allies deal more damage, faster',
    maxLevel: 5,
    occupiesSlot: false,
    isStat: true,
    enabled: true,
    glyphColor: 0x22d3ee,
    tags: ['summon', 'stat'],
  },
  atk_up: {
    id: 'atk_up',
    name: 'Potato Power',
    description: '+15% damage',
    maxLevel: 5,
    occupiesSlot: false,
    isStat: true,
    enabled: true,
    glyphColor: 0xf87171,
    tags: ['stat'],
  },
  firerate_up: {
    id: 'firerate_up',
    name: 'Rapid Peel',
    description: '+12% attack speed',
    maxLevel: 5,
    occupiesSlot: false,
    isStat: true,
    enabled: true,
    glyphColor: 0xfbbf24,
    tags: ['stat'],
  },
  range_up: {
    id: 'range_up',
    name: 'Long Reach',
    description: '+10% weapon range',
    maxLevel: 5,
    occupiesSlot: false,
    isStat: true,
    enabled: true,
    glyphColor: 0x34d399,
    tags: ['stat'],
  },
  maxhp_up: {
    id: 'maxhp_up',
    name: 'Thick Skin',
    description: '+20 max HP',
    maxLevel: 5,
    occupiesSlot: false,
    isStat: true,
    enabled: true,
    glyphColor: 0x4ade80,
    tags: ['stat'],
  },
  magnet_up: {
    id: 'magnet_up',
    name: 'Magnetism',
    description: '+40 magnet radius',
    maxLevel: 5,
    occupiesSlot: false,
    isStat: true,
    enabled: true,
    glyphColor: 0xa78bfa,
    tags: ['stat'],
  },
  speed_up: {
    id: 'speed_up',
    name: 'Greased Boots',
    description: '+8% move speed',
    maxLevel: 5,
    occupiesSlot: false,
    isStat: true,
    enabled: true,
    glyphColor: 0x38bdf8,
    tags: ['stat'],
  },
  armor_up: {
    id: 'armor_up',
    name: 'Peel Plate',
    description: '+8 armor',
    maxLevel: 5,
    occupiesSlot: false,
    isStat: true,
    enabled: true,
    glyphColor: 0x94a3b8,
    tags: ['stat'],
  },
  crit_up: {
    id: 'crit_up',
    name: 'Lucky Sprout',
    description: '+4% crit chance',
    maxLevel: 5,
    occupiesSlot: false,
    isStat: true,
    enabled: true,
    glyphColor: 0xf472b6,
    tags: ['stat'],
  },
  cdr_up: {
    id: 'cdr_up',
    name: 'Cool Spud',
    description: '+8% cooldown reduction',
    maxLevel: 5,
    occupiesSlot: false,
    isStat: true,
    enabled: true,
    glyphColor: 0x67e8f9,
    tags: ['stat'],
  },
  heal_on_level: {
    id: 'heal_on_level',
    name: 'Field Medic',
    description: 'Heal 25 on pick',
    maxLevel: 3,
    occupiesSlot: false,
    isStat: true,
    enabled: true,
    glyphColor: 0x86efac,
    tags: ['stat'],
  },
};

export const ALL_SKILL_IDS = Object.keys(SkillRegistry) as SkillId[];

export const WEAPON_SKILL_IDS = ALL_SKILL_IDS.filter(
  (id) => SkillRegistry[id].behavior && SkillRegistry[id].enabled,
);

/** Assert skill exists — never silent-fail (T193). */
export function getSkillOrThrow(id: string): SkillDef {
  const def = SkillRegistry[id as SkillId];
  if (!def) {
    throw new Error(`Skill registry missing id: ${id}`);
  }
  return def;
}

/** Draft-eligible skills only (T192). */
export function isDraftable(id: SkillId): boolean {
  const def = SkillRegistry[id];
  return def.enabled;
}

/** Assert weapon behavior is registered in SkillSystem (call on pick). */
export function assertWeaponBehavior(id: SkillId, hasHandler: (b: WeaponBehaviorId) => boolean): void {
  const def = getSkillOrThrow(id);
  if (!def.behavior) return;
  if (!def.enabled) {
    throw new Error(`Disabled skill picked: ${id}`);
  }
  if (!hasHandler(def.behavior)) {
    throw new Error(`No SkillSystem handler for ${def.behavior} (skill ${id})`);
  }
}
