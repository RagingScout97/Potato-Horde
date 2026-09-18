/** Save schema — docs/save-schema.md + Phase 16–18 extensions */

import type { GearItem } from '@/data/gear';
import { createDefaultUpgrades, type UpgradeLevels } from '@/data/upgrades';

export interface SaveV1 {
  schemaVersion: 1;
  createdAt: string;
  updatedAt: string;
  settings: {
    masterVolume: number;
    sfxVolume: number;
    musicVolume: number;
    showFps: boolean;
    reduceShake: boolean;
    /** Mute (T366 / T440). */
    muted: boolean;
    /** Damage numbers toggle (T367 / T443). */
    showDamageNumbers: boolean;
    /** UI text scale (T442). */
    uiScale: number;
    /** Disable heavy juice (T446 / T457). */
    performanceMode: boolean;
    /** Micro hitstop on big hits (T438). */
    hitstopEnabled: boolean;
    /** Shape/label aids (T441). */
    colorblindMode: boolean;
    /** Show enemy/orb debug line on HUD (T448/T458). */
    showDebugHud: boolean;
    /** Extra HUD padding for notches (T454). */
    safeAreaPad: boolean;
    /** Key rebind stub — display only until input remap ships (T445). */
    keyRebindStub: {
      up: string;
      down: string;
      left: string;
      right: string;
      pause: string;
    };
  };
  meta: {
    banknotes: number;
    gems: number;
    unlockedChapters: number[];
    unlockedHeroes: string[];
    equippedHeroId: string;
    /** Ally parachute drops unlocked (T281). Default true. */
    alliesUnlocked: boolean;
    /** Endless difficulty preset (T327). */
    difficulty: 'easy' | 'normal' | 'hard';
    /** Chapter best stats (T342). */
    chapterBest: Record<
      number,
      { seconds: number; kills: number; stars: number }
    >;
    gear: {
      weaponId: string | null;
      armorId: string | null;
      accessoryId: string | null;
    };
    /** Legacy id list — kept for migrate. Prefer inventoryGear. */
    inventoryGearIds: string[];
    /** Full gear instances (T381). */
    inventoryGear: GearItem[];
    /** Permanent upgrade levels (T359–T360). */
    upgrades: UpgradeLevels;
    /** Idempotent reward keys (T364–T365). */
    claimedRewardKeys: string[];
  };
  stats: {
    totalRuns: number;
    bestEndlessSeconds: number;
    bestEndlessKills: number;
    totalKills: number;
  };
  daily: {
    lastDailyId: string | null;
    lastClaimedAt: string | null;
    /** Daily challenge seed YYYY-MM-DD → seed (Phase 21). */
    challengeSeed: number | null;
    challengeBestKills: number;
    challengeBestSeconds: number;
  };
  /** Retention (Phase 21). */
  retention: {
    failStreak: number;
    pityLevel: number;
    achievements: string[];
    sessionGoal: string | null;
    lastComebackAt: string | null;
    analyticsStub: Array<{ t: string; e: string }>;
  };
}

export const SAVE_KEY = 'potato-horde-save-v1';
export const SAVE_SCHEMA_VERSION = 1 as const;

export function createDefaultSave(): SaveV1 {
  const now = new Date().toISOString();
  return {
    schemaVersion: 1,
    createdAt: now,
    updatedAt: now,
    settings: {
      masterVolume: 1,
      sfxVolume: 1,
      musicVolume: 0.7,
      showFps: true,
      reduceShake: false,
      muted: false,
      showDamageNumbers: true,
      uiScale: 1,
      performanceMode: false,
      hitstopEnabled: true,
      colorblindMode: false,
      showDebugHud: false,
      safeAreaPad: true,
      keyRebindStub: {
        up: 'W',
        down: 'S',
        left: 'A',
        right: 'D',
        pause: 'P',
      },
    },
    meta: {
      banknotes: 0,
      gems: 0,
      unlockedChapters: [1],
      unlockedHeroes: ['default'],
      equippedHeroId: 'default',
      alliesUnlocked: true,
      difficulty: 'normal',
      chapterBest: {},
      gear: { weaponId: null, armorId: null, accessoryId: null },
      inventoryGearIds: [],
      inventoryGear: [],
      upgrades: createDefaultUpgrades(),
      claimedRewardKeys: [],
    },
    stats: {
      totalRuns: 0,
      bestEndlessSeconds: 0,
      bestEndlessKills: 0,
      totalKills: 0,
    },
    daily: {
      lastDailyId: null,
      lastClaimedAt: null,
      challengeSeed: null,
      challengeBestKills: 0,
      challengeBestSeconds: 0,
    },
    retention: {
      failStreak: 0,
      pityLevel: 0,
      achievements: [],
      sessionGoal: null,
      lastComebackAt: null,
      analyticsStub: [],
    },
  };
}
