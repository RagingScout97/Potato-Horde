import {
  ALL_SKILL_IDS,
  SkillBalance,
  getSkillOrThrow,
  isDraftable,
  type EvolutionId,
  type SkillId,
} from '@/data/skills';
import {
  applyEvolution,
  isBreakthroughEligible,
  listEligibleBreakthroughs,
} from '@/data/evolutions';
import { SeededRng } from '@/utils/rng';

export interface RunSkillStack {
  id: SkillId;
  level: number;
}

export interface RunBuildState {
  skills: RunSkillStack[];
  maxSlots: number;
  damageMult: number;
  atkSpeedMult: number;
  rangeMult: number;
  magnetBonus: number;
  moveSpeedMult: number;
  maxHpBonus: number;
  armor: number;
  critBonus: number;
  cdrBonus: number;
  rerollsLeft: number;
  bannedIds: SkillId[];
  lockedIds: SkillId[];
  /** Weapon ids that have breakthrough'd (T214–T215). */
  evolved: Set<SkillId>;
  evolutions: EvolutionId[];
  /** Pending heal from heal_on_level pick (T191). */
  pendingHeal: number;
}

const MAX_SLOTS = 6;

export function createRunBuild(): RunBuildState {
  return {
    skills: [],
    maxSlots: MAX_SLOTS,
    damageMult: 1,
    atkSpeedMult: 1,
    rangeMult: 1,
    magnetBonus: 0,
    moveSpeedMult: 1,
    maxHpBonus: 0,
    armor: 0,
    critBonus: 0,
    cdrBonus: 0,
    rerollsLeft: 1,
    bannedIds: [],
    lockedIds: [],
    evolved: new Set(),
    evolutions: [],
    pendingHeal: 0,
  };
}

export function getSkillLevel(build: RunBuildState, id: SkillId): number {
  return build.skills.find((s) => s.id === id)?.level ?? 0;
}

export function occupiedSlots(build: RunBuildState): number {
  return build.skills.filter((s) => getSkillOrThrow(s.id).occupiesSlot).length;
}

/** Apply skill level-up; returns false if illegal. */
export function applySkill(build: RunBuildState, id: SkillId): boolean {
  const def = getSkillOrThrow(id);
  if (!def.enabled) {
    console.error(`Cannot apply disabled skill ${id}`);
    return false;
  }
  const existing = build.skills.find((s) => s.id === id);
  if (existing) {
    if (existing.level >= def.maxLevel) return false;
    existing.level += 1;
  } else {
    if (def.occupiesSlot && occupiedSlots(build) >= build.maxSlots) return false;
    build.skills.push({ id, level: 1 });
  }

  // onLevel hooks (T191)
  if (id === 'heal_on_level') {
    build.pendingHeal += SkillBalance.stats.healOnLevel;
  }

  recomputeStats(build);
  return true;
}

/** Debug/Gate 8: grant skill ignoring slot cap (S11). */
export function forceGrantSkill(build: RunBuildState, id: SkillId, level = 3): void {
  const def = getSkillOrThrow(id);
  if (!def.enabled) throw new Error(`Disabled skill ${id}`);
  const existing = build.skills.find((s) => s.id === id);
  const target = Math.min(level, def.maxLevel);
  if (existing) {
    existing.level = Math.max(existing.level, target);
  } else {
    build.skills.push({ id, level: target });
  }
  if (id === 'heal_on_level') {
    build.pendingHeal += SkillBalance.stats.healOnLevel;
  }
  recomputeStats(build);
}

function recomputeStats(build: RunBuildState): void {
  const S = SkillBalance.stats;
  build.damageMult = 1 + S.atkPerLevel * getSkillLevel(build, 'atk_up');
  build.atkSpeedMult = 1 + S.fireratePerLevel * getSkillLevel(build, 'firerate_up');
  build.rangeMult = 1 + S.rangePerLevel * getSkillLevel(build, 'range_up');
  build.magnetBonus = S.magnetPerLevel * getSkillLevel(build, 'magnet_up');
  build.moveSpeedMult = 1 + S.speedPerLevel * getSkillLevel(build, 'speed_up');
  build.maxHpBonus = S.maxHpPerLevel * getSkillLevel(build, 'maxhp_up');
  build.armor = S.armorPerLevel * getSkillLevel(build, 'armor_up');
  build.critBonus = S.critPerLevel * getSkillLevel(build, 'crit_up');
  build.cdrBonus = S.cdrPerLevel * getSkillLevel(build, 'cdr_up');
}

export interface DraftCard {
  id: SkillId;
  name: string;
  description: string;
  nextLevel: number;
  recommended: boolean;
  glyphColor: number;
  breakthrough: boolean;
  breakthroughName?: string;
}

/**
 * Offer 3 draft cards (T151, T155–T158, T170).
 * Breakthrough cards when eligible (T211–T212).
 */
export function rollDraft(
  build: RunBuildState,
  rng: SeededRng,
  count = 3,
): DraftCard[] {
  const slotsFull = occupiedSlots(build) >= build.maxSlots;
  const eligibleEvos = listEligibleBreakthroughs(build);

  // Prefer injecting one breakthrough card if eligible
  const picks: SkillId[] = [];
  if (eligibleEvos.length > 0 && rng.next() < 0.85) {
    const evo = eligibleEvos[rng.int(0, eligibleEvos.length - 1)]!;
    picks.push(evo.baseWeaponId);
  }

  const pool = ALL_SKILL_IDS.filter((id) => {
    if (!isDraftable(id)) return false;
    if (build.bannedIds.includes(id)) return false;
    const def = getSkillOrThrow(id);
    const lvl = getSkillLevel(build, id);
    if (lvl >= def.maxLevel) {
      // Still allow if breakthrough eligible (shows as evolve card)
      return isBreakthroughEligible(build, id);
    }
    if (slotsFull && def.occupiesSlot && lvl === 0) return false;
    return true;
  });

  const available = pool.filter((id) => !picks.includes(id));
  while (picks.length < count && available.length > 0) {
    const idx = rng.int(0, available.length - 1);
    const id = available.splice(idx, 1)[0]!;
    if (picks.includes(id)) continue;
    picks.push(id);
  }

  const rec = picks.includes('atk_up')
    ? 'atk_up'
    : picks.includes('dual_pistol')
      ? 'dual_pistol'
      : picks[0];

  return picks.map((id) => {
    const def = getSkillOrThrow(id);
    const breakthrough = isBreakthroughEligible(build, id);
    const evo = breakthrough && def.evolutionId
      ? listEligibleBreakthroughs(build).find((e) => e.baseWeaponId === id)
      : undefined;
    return {
      id,
      name: breakthrough && evo ? evo.name : def.name,
      description: breakthrough && evo ? evo.description : def.description,
      nextLevel: breakthrough ? def.maxLevel : getSkillLevel(build, id) + 1,
      recommended: id === rec || breakthrough,
      glyphColor: breakthrough && evo ? evo.glyphColor : def.glyphColor,
      breakthrough,
      breakthroughName: evo?.name,
    };
  });
}

/**
 * Apply draft pick — either level skill or breakthrough (T213).
 */
export function applyDraftPick(build: RunBuildState, id: SkillId): boolean {
  if (isBreakthroughEligible(build, id)) {
    return applyEvolution(build, id);
  }
  return applySkill(build, id);
}

export { applyEvolution, isBreakthroughEligible, listEligibleBreakthroughs };
