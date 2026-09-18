import { describe, expect, it } from 'vitest';
import { SeededRng } from '@/utils/rng';
import {
  applyDraftPick,
  applySkill,
  createRunBuild,
  isBreakthroughEligible,
  rollDraft,
} from '@/systems/RunBuild';

describe('draft pool (T170)', () => {
  it('returns up to 3 unique cards', () => {
    const build = createRunBuild();
    const cards = rollDraft(build, new SeededRng(7), 3);
    expect(cards.length).toBe(3);
    const ids = cards.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('applySkill stacks levels', () => {
    const build = createRunBuild();
    expect(applySkill(build, 'atk_up')).toBe(true);
    expect(applySkill(build, 'atk_up')).toBe(true);
    expect(build.damageMult).toBeCloseTo(1.3, 5);
  });

  it('stat pack applies armor/crit/cdr (T186)', () => {
    const build = createRunBuild();
    applySkill(build, 'armor_up');
    applySkill(build, 'crit_up');
    applySkill(build, 'cdr_up');
    expect(build.armor).toBe(8);
    expect(build.critBonus).toBeCloseTo(0.04, 5);
    expect(build.cdrBonus).toBeCloseTo(0.08, 5);
  });
});

describe('breakthrough requirements (T219)', () => {
  it('requires max weapon + catalyst', () => {
    const build = createRunBuild();
    expect(isBreakthroughEligible(build, 'dual_pistol')).toBe(false);
    for (let i = 0; i < 5; i++) applySkill(build, 'dual_pistol');
    expect(isBreakthroughEligible(build, 'dual_pistol')).toBe(false);
    applySkill(build, 'firerate_up');
    expect(isBreakthroughEligible(build, 'dual_pistol')).toBe(true);
  });

  it('applyDraftPick evolves once (T214)', () => {
    const build = createRunBuild();
    for (let i = 0; i < 5; i++) applySkill(build, 'dual_pistol');
    applySkill(build, 'firerate_up');
    expect(applyDraftPick(build, 'dual_pistol')).toBe(true);
    expect(build.evolved.has('dual_pistol')).toBe(true);
    expect(build.evolutions).toContain('dual_storm');
    expect(isBreakthroughEligible(build, 'dual_pistol')).toBe(false);
    expect(applyDraftPick(build, 'dual_pistol')).toBe(false);
  });
});
