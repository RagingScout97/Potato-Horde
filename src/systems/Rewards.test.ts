import { describe, expect, it, beforeEach } from 'vitest';
import { createDefaultSave } from '@/save/schema';
import { grantRewardOnce, isRewardClaimed, localDayKey } from '@/systems/Rewards';

describe('reward-once (T372)', () => {
  beforeEach(() => {
    // Use in-memory save objects — no localStorage dependency in pure path
  });

  it('grants banknotes once per key', () => {
    const save = createDefaultSave();
    const a = grantRewardOnce('test:a', { banknotes: 25 }, save);
    expect(a.applied).toBe(true);
    expect(a.granted.banknotes).toBe(25);
    expect(save.meta.banknotes).toBe(25);
    expect(isRewardClaimed(save, 'test:a')).toBe(true);

    const b = grantRewardOnce('test:a', { banknotes: 25 }, save);
    expect(b.applied).toBe(false);
    expect(b.reason).toBe('already_claimed');
    expect(save.meta.banknotes).toBe(25);
  });

  it('grants gems idempotently', () => {
    const save = createDefaultSave();
    grantRewardOnce('gem:1', { gems: 3 }, save);
    grantRewardOnce('gem:1', { gems: 3 }, save);
    expect(save.meta.gems).toBe(3);
  });

  it('localDayKey format', () => {
    expect(localDayKey(new Date('2026-09-19T12:00:00'))).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
