# Save Schema v1 (stub)

Storage: `localStorage` key `potato-horde-save-v1`.  
Always include `schemaVersion`. Never overwrite without migrate.

```ts
interface SaveV1 {
  schemaVersion: 1;
  createdAt: string;       // ISO
  updatedAt: string;       // ISO
  settings: {
    masterVolume: number;  // 0–1
    sfxVolume: number;
    musicVolume: number;
    showFps: boolean;
    reduceShake: boolean;
  };
  meta: {
    banknotes: number;
    gems: number;
    unlockedChapters: number[]; // chapter ids, e.g. [1]
    unlockedHeroes: string[];
    equippedHeroId: string;
    gear: {
      weaponId: string | null;
      armorId: string | null;
      accessoryId: string | null;
    };
    inventoryGearIds: string[];
  };
  stats: {
    totalRuns: number;
    bestEndlessSeconds: number;
    totalKills: number;
  };
  daily: {
    lastDailyId: string | null;
    lastClaimedAt: string | null;
  };
}
```

### Migration rule

Bump `schemaVersion` on breaking field changes. Provide `migrate(old) → new` and never wipe player progress silently.
