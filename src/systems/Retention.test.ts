import { describe, expect, it, beforeEach } from 'vitest';
import { resetSave } from '@/save/SaveManager';
import {
  dailyChallengeSeed,
  ensureDailyChallenge,
  recordRunOutcome,
  unlockAchievement,
  hasAchievement,
  tryComebackChest,
  getPityDamageMult,
  hookCopy,
  allHookCopy,
} from '@/systems/Retention';

describe('Retention', () => {
  beforeEach(() => {
    resetSave();
  });

  it('daily seed is stable for a day', () => {
    const d = new Date('2026-09-19T12:00:00');
    expect(dailyChallengeSeed(d)).toBe(dailyChallengeSeed(d));
    expect(dailyChallengeSeed(d)).not.toBe(dailyChallengeSeed(new Date('2026-09-20T12:00:00')));
  });

  it('ensureDailyChallenge writes seed', () => {
    const a = ensureDailyChallenge();
    const b = ensureDailyChallenge();
    expect(a.seed).toBe(b.seed);
    expect(a.day).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('pity caps and buffs after fails', () => {
    expect(getPityDamageMult()).toBe(1);
    recordRunOutcome(false);
    recordRunOutcome(false);
    const r = recordRunOutcome(false);
    expect(r.pityLevel).toBeGreaterThanOrEqual(1);
    expect(getPityDamageMult()).toBeGreaterThan(1);
    recordRunOutcome(true);
    expect(getPityDamageMult()).toBe(1);
  });

  it('achievements unlock once', () => {
    expect(unlockAchievement('first_blood')).toBe(true);
    expect(hasAchievement('first_blood')).toBe(true);
    expect(unlockAchievement('first_blood')).toBe(false);
  });

  it('comeback chest once per day', () => {
    const a = tryComebackChest();
    expect(a.granted).toBe(true);
    const b = tryComebackChest();
    expect(b.granted).toBe(false);
  });

  it('hook copy set has 5 lines', () => {
    expect(allHookCopy()).toHaveLength(5);
    expect(hookCopy(0).length).toBeGreaterThan(5);
    expect(hookCopy(5)).toBe(hookCopy(0));
  });
});
