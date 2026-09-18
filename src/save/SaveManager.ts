import { createDefaultSave, SAVE_KEY, SAVE_SCHEMA_VERSION, type SaveV1 } from './schema';
import { createDefaultUpgrades } from '@/data/upgrades';
import { sanitizeInventory } from './sanitizeGear';

/**
 * Migrate / normalize partial saves (T371). Never wipe progress silently.
 */
export function migrateSave(raw: unknown): SaveV1 {
  const base = createDefaultSave();
  if (!raw || typeof raw !== 'object') return base;
  const parsed = raw as Partial<SaveV1> & { schemaVersion?: number };

  // Future: if schemaVersion > known, keep best-effort merge
  // if schemaVersion < known, run stepwise migrators
  const version = parsed.schemaVersion ?? 0;
  if (version > SAVE_SCHEMA_VERSION) {
    // Newer save from future build — merge carefully, don't wipe
  }

  const merged: SaveV1 = {
    ...base,
    ...parsed,
    schemaVersion: 1,
    createdAt: typeof parsed.createdAt === 'string' ? parsed.createdAt : base.createdAt,
    updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : base.updatedAt,
    settings: {
      ...base.settings,
      ...(parsed.settings ?? {}),
      keyRebindStub: {
        ...base.settings.keyRebindStub,
        ...(parsed.settings?.keyRebindStub ?? {}),
      },
    },
    meta: {
      ...base.meta,
      ...(parsed.meta ?? {}),
      gear: {
        ...base.meta.gear,
        ...(parsed.meta?.gear ?? {}),
      },
      upgrades: {
        ...createDefaultUpgrades(),
        ...(parsed.meta?.upgrades ?? {}),
      },
      unlockedChapters: Array.isArray(parsed.meta?.unlockedChapters)
        ? parsed.meta!.unlockedChapters
        : base.meta.unlockedChapters,
      unlockedHeroes: Array.isArray(parsed.meta?.unlockedHeroes)
        ? parsed.meta!.unlockedHeroes
        : base.meta.unlockedHeroes,
      inventoryGearIds: Array.isArray(parsed.meta?.inventoryGearIds)
        ? parsed.meta!.inventoryGearIds
        : [],
      inventoryGear: Array.isArray(parsed.meta?.inventoryGear)
        ? parsed.meta!.inventoryGear
        : [],
      claimedRewardKeys: Array.isArray(parsed.meta?.claimedRewardKeys)
        ? parsed.meta!.claimedRewardKeys
        : [],
      chapterBest: parsed.meta?.chapterBest ?? {},
    },
    stats: {
      ...base.stats,
      ...(parsed.stats ?? {}),
    },
    daily: {
      ...base.daily,
      ...(parsed.daily ?? {}),
    },
    retention: {
      ...base.retention,
      ...(parsed.retention ?? {}),
      achievements: Array.isArray(parsed.retention?.achievements)
        ? parsed.retention!.achievements
        : base.retention.achievements,
      analyticsStub: Array.isArray(parsed.retention?.analyticsStub)
        ? parsed.retention!.analyticsStub
        : [],
    },
  };

  // Clamp volumes / scales
  merged.settings.masterVolume = clamp01(merged.settings.masterVolume);
  merged.settings.sfxVolume = clamp01(merged.settings.sfxVolume);
  merged.settings.musicVolume = clamp01(merged.settings.musicVolume);
  const scale = merged.settings.uiScale;
  if (scale !== 0.85 && scale !== 1 && scale !== 1.15) merged.settings.uiScale = 1;
  merged.settings.performanceMode = !!merged.settings.performanceMode;
  merged.settings.hitstopEnabled = merged.settings.hitstopEnabled !== false;
  merged.settings.colorblindMode = !!merged.settings.colorblindMode;
  merged.settings.showDebugHud = !!merged.settings.showDebugHud;
  merged.settings.safeAreaPad = merged.settings.safeAreaPad !== false;
  merged.meta.banknotes = Math.max(0, Math.floor(merged.meta.banknotes || 0));
  merged.meta.gems = Math.max(0, Math.floor(merged.meta.gems || 0));
  merged.retention.failStreak = Math.max(0, Math.floor(merged.retention.failStreak || 0));
  merged.retention.pityLevel = Math.max(0, Math.min(3, Math.floor(merged.retention.pityLevel || 0)));

  return sanitizeInventory(merged);
}

function clamp01(n: number): number {
  if (typeof n !== 'number' || Number.isNaN(n)) return 1;
  return Math.min(1, Math.max(0, n));
}

export function loadSave(): SaveV1 {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return createDefaultSave();
    const parsed = JSON.parse(raw) as unknown;
    return migrateSave(parsed);
  } catch {
    return createDefaultSave();
  }
}

export function writeSave(save: SaveV1): void {
  const next = { ...save, schemaVersion: 1 as const, updatedAt: new Date().toISOString() };
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(next));
  } catch {
    /* private mode / node tests */
  }
}

/** Export save JSON string (T369). */
export function exportSaveJson(save: SaveV1 = loadSave()): string {
  return JSON.stringify(save, null, 2);
}

/** Import save JSON; validates + migrates (T370). */
export function importSaveJson(json: string): { ok: boolean; error?: string; save?: SaveV1 } {
  try {
    const parsed = JSON.parse(json) as unknown;
    if (!parsed || typeof parsed !== 'object') {
      return { ok: false, error: 'not_object' };
    }
    const migrated = migrateSave(parsed);
    writeSave(migrated);
    return { ok: true, save: migrated };
  } catch {
    return { ok: false, error: 'parse_failed' };
  }
}

/** Danger: wipe to defaults (T368). */
export function resetSave(): SaveV1 {
  const fresh = createDefaultSave();
  writeSave(fresh);
  return fresh;
}
