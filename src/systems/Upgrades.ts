/**
 * Permanent upgrade spend / refund (T359–T362, T377–T378).
 */

import {
  UPGRADE_DEFS,
  getUpgradeDef,
  createDefaultUpgrades,
  type UpgradeId,
} from '@/data/upgrades';
import type { SaveV1 } from '@/save/schema';
import { loadSave, writeSave } from '@/save/SaveManager';

export function ensureUpgrades(save: SaveV1): void {
  if (!save.meta.upgrades) save.meta.upgrades = createDefaultUpgrades();
}

export function upgradeCost(id: UpgradeId, currentLevel: number): number {
  const def = getUpgradeDef(id);
  if (currentLevel >= def.maxLevel) return Infinity;
  return def.costForLevel(currentLevel + 1);
}

export function canAffordUpgrade(id: UpgradeId, save: SaveV1 = loadSave()): boolean {
  ensureUpgrades(save);
  const lvl = save.meta.upgrades[id] ?? 0;
  const def = getUpgradeDef(id);
  if (lvl >= def.maxLevel) return false;
  return save.meta.banknotes >= upgradeCost(id, lvl);
}

export function purchaseUpgrade(
  id: UpgradeId,
  save: SaveV1 = loadSave(),
): { ok: boolean; error?: string; level?: number; spent?: number } {
  ensureUpgrades(save);
  const def = getUpgradeDef(id);
  const lvl = save.meta.upgrades[id] ?? 0;
  if (lvl >= def.maxLevel) return { ok: false, error: 'maxed' };
  const cost = upgradeCost(id, lvl);
  if (save.meta.banknotes < cost) return { ok: false, error: 'cannot_afford' };
  save.meta.banknotes -= cost;
  save.meta.upgrades[id] = lvl + 1;
  writeSave(save);
  return { ok: true, level: lvl + 1, spent: cost };
}

/** Debug-only full refund of upgrade tree (T362). */
export function refundAllUpgrades(save: SaveV1 = loadSave()): number {
  ensureUpgrades(save);
  let refund = 0;
  for (const def of UPGRADE_DEFS) {
    const lvl = save.meta.upgrades[def.id] ?? 0;
    for (let n = 1; n <= lvl; n++) {
      refund += def.costForLevel(n);
    }
    save.meta.upgrades[def.id] = 0;
  }
  save.meta.banknotes += refund;
  writeSave(save);
  return refund;
}
