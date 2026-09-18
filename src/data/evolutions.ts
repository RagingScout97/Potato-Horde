/** Breakthrough evolution map (T188, T211–T225). */

import {
  getSkillOrThrow,
  type EvolutionId,
  type SkillId,
} from '@/data/skills';

/** Minimal build shape — avoids circular import with RunBuild. */
export interface EvolutionBuildView {
  skills: Array<{ id: SkillId; level: number }>;
  evolved: Set<SkillId>;
  evolutions: EvolutionId[];
}

export interface EvolutionDef {
  id: EvolutionId;
  name: string;
  description: string;
  baseWeaponId: SkillId;
  catalystId: SkillId;
  behavior: EvolutionId;
  glyphColor: number;
}

export const EvolutionRegistry: Record<EvolutionId, EvolutionDef> = {
  dual_storm: {
    id: 'dual_storm',
    name: 'Pea Storm',
    description: 'Rapid triple pistols',
    baseWeaponId: 'dual_pistol',
    catalystId: 'firerate_up',
    behavior: 'dual_storm',
    glyphColor: 0x60a5fa,
  },
  scatter_cannon: {
    id: 'scatter_cannon',
    name: 'Scatter Cannon',
    description: 'Wide pellet blast',
    baseWeaponId: 'shotgun',
    catalystId: 'atk_up',
    behavior: 'scatter_cannon',
    glyphColor: 0xf59e0b,
  },
  orbit_blade: {
    id: 'orbit_blade',
    name: 'Orbit Blade',
    description: 'Orbiting chakrams',
    baseWeaponId: 'boomerang',
    catalystId: 'range_up',
    behavior: 'orbit_blade',
    glyphColor: 0xc084fc,
  },
  death_trap: {
    id: 'death_trap',
    name: 'Death Trap',
    description: 'Larger lasting mines',
    baseWeaponId: 'energy_trap',
    catalystId: 'maxhp_up',
    behavior: 'death_trap',
    glyphColor: 0x06b6d4,
  },
  chain_thunder: {
    id: 'chain_thunder',
    name: 'Chain Thunder',
    description: 'Longer lightning chains',
    baseWeaponId: 'lightning',
    catalystId: 'crit_up',
    behavior: 'chain_thunder',
    glyphColor: 0xfde047,
  },
  ally_barrage: {
    id: 'ally_barrage',
    name: 'Ally Barrage',
    description: 'Allies fire twin shots',
    baseWeaponId: 'ally_recruit',
    catalystId: 'ally_power',
    behavior: 'ally_barrage',
    glyphColor: 0x7dd3fc,
  },
};

function levelOf(build: EvolutionBuildView, id: SkillId): number {
  return build.skills.find((s) => s.id === id)?.level ?? 0;
}

export function getEvolutionOrThrow(id: EvolutionId): EvolutionDef {
  const def = EvolutionRegistry[id];
  if (!def) throw new Error(`Evolution missing: ${id}`);
  return def;
}

/** True if weapon is maxed, catalyst owned, and not yet evolved (T211, T214). */
export function isBreakthroughEligible(
  build: EvolutionBuildView,
  weaponId: SkillId,
): boolean {
  const weapon = getSkillOrThrow(weaponId);
  if (!weapon.evolutionId || !weapon.catalystId) return false;
  if (build.evolved.has(weaponId)) return false;
  if (levelOf(build, weaponId) < weapon.maxLevel) return false;
  if (levelOf(build, weapon.catalystId) < 1) return false;
  return true;
}

export function listEligibleBreakthroughs(build: EvolutionBuildView): EvolutionDef[] {
  const out: EvolutionDef[] = [];
  for (const stack of build.skills) {
    const def = getSkillOrThrow(stack.id);
    if (!def.evolutionId) continue;
    if (isBreakthroughEligible(build, stack.id)) {
      out.push(getEvolutionOrThrow(def.evolutionId));
    }
  }
  return out;
}

export function applyEvolution(build: EvolutionBuildView, weaponId: SkillId): boolean {
  if (!isBreakthroughEligible(build, weaponId)) return false;
  const weapon = getSkillOrThrow(weaponId);
  if (!weapon.evolutionId) return false;
  build.evolved.add(weaponId);
  build.evolutions.push(weapon.evolutionId);
  return true;
}

export function activeBehaviorFor(
  build: EvolutionBuildView,
  weaponId: SkillId,
): string | null {
  const def = getSkillOrThrow(weaponId);
  if (!def.behavior) return null;
  if (def.evolutionId && build.evolved.has(weaponId)) {
    return def.evolutionId;
  }
  return def.behavior;
}
