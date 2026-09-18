import { describe, expect, it } from 'vitest';
import { createDefaultSave } from '@/save/schema';
import { purchaseUpgrade, canAffordUpgrade, refundAllUpgrades } from '@/systems/Upgrades';
import { computeMetaBonuses } from '@/systems/MetaStats';

describe('permanent upgrades', () => {
  it('cannot overspend', () => {
    const save = createDefaultSave();
    save.meta.banknotes = 5;
    expect(canAffordUpgrade('hp', save)).toBe(false);
    const r = purchaseUpgrade('hp', save);
    expect(r.ok).toBe(false);
    expect(r.error).toBe('cannot_afford');
  });

  it('spend affects meta bonuses', () => {
    const save = createDefaultSave();
    save.meta.banknotes = 500;
    const before = computeMetaBonuses(save);
    purchaseUpgrade('atk', save);
    purchaseUpgrade('atk', save);
    const after = computeMetaBonuses(save);
    expect(after.damageMult).toBeGreaterThan(before.damageMult);
    expect(save.meta.banknotes).toBeLessThan(500);
  });

  it('refund restores notes (debug)', () => {
    const save = createDefaultSave();
    save.meta.banknotes = 200;
    purchaseUpgrade('speed', save);
    const afterBuy = save.meta.banknotes;
    const refunded = refundAllUpgrades(save);
    expect(refunded).toBeGreaterThan(0);
    expect(save.meta.banknotes).toBe(afterBuy + refunded);
    expect(save.meta.upgrades.speed).toBe(0);
  });
});
