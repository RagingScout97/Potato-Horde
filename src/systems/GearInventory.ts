/**
 * Gear inventory: loot, equip, salvage, merge (Phase 17).
 */

import {
  GEAR_TEMPLATES,
  INVENTORY_CAP,
  RARITY_WEIGHTS,
  gearPowerScore,
  getTemplate,
  salvageValue,
  scaleStats,
  type GearItem,
  type GearRarity,
  type GearSlot,
} from '@/data/gear';
import type { SaveV1 } from '@/save/schema';
import { loadSave, writeSave } from '@/save/SaveManager';
import { SeededRng } from '@/utils/rng';

let idSeq = 0;

export function nextGearId(seed = Date.now()): string {
  idSeq += 1;
  return `g_${seed.toString(36)}_${idSeq.toString(36)}`;
}

function ensureInventory(save: SaveV1): GearItem[] {
  if (!Array.isArray(save.meta.inventoryGear)) {
    save.meta.inventoryGear = [];
  }
  return save.meta.inventoryGear;
}

function rollRarity(rng: SeededRng, luckBonus: number): GearRarity {
  const weights = { ...RARITY_WEIGHTS };
  weights.uncommon += luckBonus * 20;
  weights.rare += luckBonus * 12;
  weights.epic += luckBonus * 6;
  const total = weights.common + weights.uncommon + weights.rare + weights.epic;
  let r = rng.next() * total;
  const order: GearRarity[] = ['common', 'uncommon', 'rare', 'epic'];
  for (const rare of order) {
    r -= weights[rare];
    if (r <= 0) return rare;
  }
  return 'common';
}

export function createGearItem(
  templateId: string,
  rarity: GearRarity,
  mergeLevel = 1,
  id?: string,
): GearItem {
  const t = getTemplate(templateId);
  return {
    id: id ?? nextGearId(),
    templateId: t.templateId,
    name: t.name,
    slot: t.slot,
    rarity,
    mergeLevel,
    stats: scaleStats(t.base, rarity, mergeLevel),
  };
}

/** Seeded end-run loot (T386, T393). Returns null if empty roll. */
export function rollEndRunLoot(
  rng: SeededRng,
  opts: { luckBonus?: number; force?: boolean } = {},
): GearItem | null {
  const luck = opts.luckBonus ?? 0;
  if (!opts.force && rng.next() > Math.min(0.85, 0.45 + luck * 0.4)) return null;
  const template = rng.pick(GEAR_TEMPLATES);
  const rarity = rollRarity(rng, luck);
  return createGearItem(template.templateId, rarity, 1);
}

export function addToInventory(
  item: GearItem,
  save: SaveV1 = loadSave(),
): { ok: boolean; salvaged?: number; item?: GearItem } {
  const inv = ensureInventory(save);
  if (inv.length >= INVENTORY_CAP) {
    // Auto-salvage lowest power (T392, T394)
    let worstIdx = 0;
    let worstScore = Infinity;
    for (let i = 0; i < inv.length; i++) {
      const sc = gearPowerScore(inv[i]!);
      if (sc < worstScore) {
        worstScore = sc;
        worstIdx = i;
      }
    }
    const worst = inv[worstIdx]!;
    // Don't auto-salvage equipped
    const eq = save.meta.gear;
    const equipped = new Set([eq.weaponId, eq.armorId, eq.accessoryId]);
    if (equipped.has(worst.id)) {
      // Find unequipped worst
      let found = false;
      for (let i = 0; i < inv.length; i++) {
        if (equipped.has(inv[i]!.id)) continue;
        const sc = gearPowerScore(inv[i]!);
        if (!found || sc < worstScore) {
          worstScore = sc;
          worstIdx = i;
          found = true;
        }
      }
      if (!found) {
        // Inventory full of equipped — salvage the new drop instead
        const val = salvageValue(item);
        save.meta.banknotes += val;
        writeSave(save);
        return { ok: false, salvaged: val };
      }
    }
    const removed = inv.splice(worstIdx, 1)[0]!;
    unequipIfNeeded(save, removed.id);
    const val = salvageValue(removed);
    save.meta.banknotes += val;
    inv.push(item);
    writeSave(save);
    return { ok: true, item, salvaged: val };
  }
  inv.push(item);
  writeSave(save);
  return { ok: true, item };
}

function unequipIfNeeded(save: SaveV1, id: string): void {
  const g = save.meta.gear;
  if (g.weaponId === id) g.weaponId = null;
  if (g.armorId === id) g.armorId = null;
  if (g.accessoryId === id) g.accessoryId = null;
}

export function equipGear(
  itemId: string,
  save: SaveV1 = loadSave(),
): { ok: boolean; error?: string } {
  const inv = ensureInventory(save);
  const item = inv.find((g) => g.id === itemId);
  if (!item) return { ok: false, error: 'missing' };
  const slot = item.slot;
  const key = slotKey(slot);
  save.meta.gear[key] = item.id;
  writeSave(save);
  return { ok: true };
}

export function unequipSlot(
  slot: GearSlot,
  save: SaveV1 = loadSave(),
): void {
  save.meta.gear[slotKey(slot)] = null;
  writeSave(save);
}

function slotKey(slot: GearSlot): 'weaponId' | 'armorId' | 'accessoryId' {
  if (slot === 'weapon') return 'weaponId';
  if (slot === 'armor') return 'armorId';
  return 'accessoryId';
}

export function salvageGear(
  itemId: string,
  save: SaveV1 = loadSave(),
): { ok: boolean; banknotes: number } {
  const inv = ensureInventory(save);
  const idx = inv.findIndex((g) => g.id === itemId);
  if (idx < 0) return { ok: false, banknotes: 0 };
  const item = inv[idx]!;
  unequipIfNeeded(save, itemId);
  inv.splice(idx, 1);
  const val = salvageValue(item);
  save.meta.banknotes += val;
  writeSave(save);
  return { ok: true, banknotes: val };
}

/**
 * Merge two identical template+rarity items (T385, T400–T401).
 * Consumes both; produces mergeLevel+1 (capped visually at 5).
 */
export function mergeGear(
  idA: string,
  idB: string,
  save: SaveV1 = loadSave(),
): { ok: boolean; error?: string; item?: GearItem } {
  if (idA === idB) return { ok: false, error: 'same_item' };
  const inv = ensureInventory(save);
  const a = inv.find((g) => g.id === idA);
  const b = inv.find((g) => g.id === idB);
  if (!a || !b) return { ok: false, error: 'missing' };
  if (a.templateId !== b.templateId || a.rarity !== b.rarity) {
    return { ok: false, error: 'mismatch' };
  }
  if (a.mergeLevel !== b.mergeLevel) {
    return { ok: false, error: 'mismatch_level' };
  }
  const nextLevel = Math.min(5, a.mergeLevel + 1);
  unequipIfNeeded(save, idA);
  unequipIfNeeded(save, idB);
  const next = createGearItem(a.templateId, a.rarity, nextLevel);
  save.meta.inventoryGear = inv.filter((g) => g.id !== idA && g.id !== idB);
  save.meta.inventoryGear.push(next);
  writeSave(save);
  return { ok: true, item: next };
}

export { sanitizeInventory } from '@/save/sanitizeGear';

export function loadoutPower(save: SaveV1): number {
  const inv = ensureInventory(save);
  const g = save.meta.gear;
  let total = 0;
  for (const id of [g.weaponId, g.armorId, g.accessoryId]) {
    if (!id) continue;
    const item = inv.find((x) => x.id === id);
    if (item) total += gearPowerScore(item);
  }
  return total;
}

export { gearPowerScore, salvageValue };
