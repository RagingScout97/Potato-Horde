/** Gear inventory sanitization without SaveManager (avoids circular imports). */

import {
  getTemplate,
  scaleStats,
  type GearItem,
  type GearRarity,
} from '@/data/gear';
import type { SaveV1 } from './schema';

let seq = 0;
function genId(): string {
  seq += 1;
  return `g_fix_${Date.now().toString(36)}_${seq}`;
}

function makeItem(
  templateId: string,
  rarity: GearRarity,
  mergeLevel: number,
  id: string,
): GearItem {
  const t = getTemplate(templateId);
  return {
    id,
    templateId: t.templateId,
    name: t.name,
    slot: t.slot,
    rarity,
    mergeLevel,
    stats: scaleStats(t.base, rarity, mergeLevel),
  };
}

/** Recover bad JSON gear entries (T395). */
export function sanitizeInventory(save: SaveV1): SaveV1 {
  const inv = Array.isArray(save.meta.inventoryGear) ? save.meta.inventoryGear : [];
  const clean: GearItem[] = [];
  for (const raw of inv) {
    if (!raw || typeof raw !== 'object') continue;
    try {
      const t = getTemplate(raw.templateId);
      const rarity = (['common', 'uncommon', 'rare', 'epic'] as GearRarity[]).includes(
        raw.rarity as GearRarity,
      )
        ? (raw.rarity as GearRarity)
        : 'common';
      const mergeLevel = Math.max(1, Math.min(5, Math.floor(Number(raw.mergeLevel) || 1)));
      const id = typeof raw.id === 'string' && raw.id ? raw.id : genId();
      clean.push(makeItem(t.templateId, rarity, mergeLevel, id));
    } catch {
      /* drop corrupt */
    }
  }
  save.meta.inventoryGear = clean;
  const ids = new Set(clean.map((g) => g.id));
  const g = save.meta.gear;
  if (g.weaponId && !ids.has(g.weaponId)) g.weaponId = null;
  if (g.armorId && !ids.has(g.armorId)) g.armorId = null;
  if (g.accessoryId && !ids.has(g.accessoryId)) g.accessoryId = null;
  save.meta.inventoryGearIds = clean.map((x) => x.id);
  return save;
}
