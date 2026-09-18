import { describe, expect, it } from 'vitest';
import { createDefaultSave } from '@/save/schema';
import {
  createGearItem,
  mergeGear,
  equipGear,
  unequipSlot,
  salvageGear,
} from '@/systems/GearInventory';
import { computeMetaBonuses } from '@/systems/MetaStats';

describe('gear merge (T409)', () => {
  it('merges matching template+rarity+level', () => {
    const save = createDefaultSave();
    const a = createGearItem('rusty_pistol', 'common', 1, 'a1');
    const b = createGearItem('rusty_pistol', 'common', 1, 'b1');
    save.meta.inventoryGear = [a, b];
    const r = mergeGear('a1', 'b1', save);
    expect(r.ok).toBe(true);
    expect(r.item?.mergeLevel).toBe(2);
    expect(save.meta.inventoryGear).toHaveLength(1);
  });

  it('rejects mismatched templates', () => {
    const save = createDefaultSave();
    const a = createGearItem('rusty_pistol', 'common', 1, 'a1');
    const b = createGearItem('riot_plate', 'common', 1, 'b1');
    save.meta.inventoryGear = [a, b];
    const r = mergeGear('a1', 'b1', save);
    expect(r.ok).toBe(false);
    expect(r.error).toBe('mismatch');
  });

  it('equip / unequip reverts loadout', () => {
    const save = createDefaultSave();
    const a = createGearItem('carbine', 'rare', 1, 'w1');
    save.meta.inventoryGear = [a];
    equipGear('w1', save);
    expect(save.meta.gear.weaponId).toBe('w1');
    const withGear = computeMetaBonuses(save);
    unequipSlot('weapon', save);
    const without = computeMetaBonuses(save);
    expect(withGear.damageMult).toBeGreaterThan(without.damageMult);
  });

  it('salvage returns banknotes', () => {
    const save = createDefaultSave();
    const a = createGearItem('lucky_charm', 'uncommon', 1, 'c1');
    save.meta.inventoryGear = [a];
    const r = salvageGear('c1', save);
    expect(r.ok).toBe(true);
    expect(r.banknotes).toBeGreaterThan(0);
    expect(save.meta.inventoryGear).toHaveLength(0);
  });
});
