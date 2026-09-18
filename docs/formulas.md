# Formulas

Pure math for progression and endless scaling. Implement with Vitest later; keep formulas here as source of truth.

## XP curve (T005)

Cost to go from level **N** to **N+1**:

```
xpToNext(N) = floor(12 * N^1.45 + 8)
```

- Level starts at **1**.  
- Total XP to reach level L from 1:

```
totalXpTo(L) = sum_{N=1}^{L-1} xpToNext(N)
```

Orbs grant fixed XP by size (small/medium/large) — tuned in combat phases.

## Endless difficulty (T006)

Let `t` = run time in seconds (paused time excluded).

```
hpMult(t)     = 1 + 0.08 * (t / 60)^1.2
dmgMult(t)    = 1 + 0.06 * (t / 60)^1.15
spawnRate(t)  = baseSpawn * (1 + 0.12 * (t / 60))   // spawns per second budget
eliteChance(t)= min(0.25, 0.02 + 0.01 * (t / 60))
```

Clamp `delta` after tab blur (`min(delta, 50)` ms) so formulas do not spike.

## Chapter clear (T007)

A chapter is cleared when **both** are true:

1. Survive for chapter timer **T** seconds (chapter config; Ch1 example: `T = 180`).  
2. Defeat the chapter boss (spawned near end of timer or on timer expiry).

Fail: player HP ≤ 0 at any time.

## Currencies (T008)

| Currency | Earn | Spend | Notes |
|----------|------|-------|-------|
| Banknotes | End-of-run, milestones | Hub gear / upgrades | Primary soft currency |
| Gems | Achievements, dailies, rare drops | Cosmetics / premium unlocks later | **Earn-only in v1** (no IAP) |

## Gear slots (T009)

Exactly three equip slots:

1. **Weapon** — run damage / weapon family bias  
2. **Armor** — max HP / damage reduction  
3. **Accessory** — utility (magnet, speed, luck)

Rarity tiers and rolls arrive in Phase 17.
