---
name: survivors-game-dev
description: >-
  Builds the Potato Horde / Zombie.io-style single-player survivors game with
  Phaser 4, TypeScript, and Vite. Use when implementing combat, enemies,
  spawners, XP drafts, skills, bosses, meta progression, or any Potato Horde
  gameplay task from docs/TASKS.md.
---

# Survivors Game Dev (Potato Horde)

## Before any code

1. Read `docs/PROGRESS.md` → next task id.
2. Open that task in `docs/TASKS.md`.
3. Read `docs/REGRESSION_MATRIX.md` for touched areas.
4. Implement **only** the current task batch (do not skip ahead phases).

## Stack defaults

- Phaser 4 + TypeScript + Vite
- Arcade physics + **object pools** for bullets/enemies/orbs
- Colored box placeholders; entity behavior from **data configs**
- localStorage saves with schema version
- Single-player only

## Architecture habits

- Scenes: Boot → Menu/Hub → Game → Result
- Systems own logic; entities are thin views
- Event bus for level-up, death, reward (unsubscribe on shutdown)
- Seeded RNG for drafts/dailies — no raw `Math.random()` in gameplay
- Clamp `delta` after tab blur

## Combat loop order (fixed)

1. Input / move  
2. Weapons fire / projectiles  
3. Enemy AI  
4. Overlaps / damage  
5. Spawner  
6. XP / level queue  
7. Draft UI (pauses world)  
8. Cleanup pools  

## Do not

- Silent-fail skills (assert or disable from draft pool)
- Allocate in hot paths after pools exist
- Soft-lock behind paywalls
- Rewrite working systems when extending — add hooks/data

## Done definition

- [ ] Task checked in TASKS.md  
- [ ] Stage Test Gate from MASTER_PLAN passed  
- [ ] Regression smokes for touched area passed  
- [ ] PROGRESS.md updated  

## References

- Plan: `docs/MASTER_PLAN.md`
- Regression: `docs/REGRESSION_MATRIX.md`
- UI skill: `game-ui-hud`
- Browser testing: `browser-playtest`
