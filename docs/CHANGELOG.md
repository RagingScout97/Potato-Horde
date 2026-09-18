# Changelog

Human-oriented summary of shipped work through **Gate 11** (Phases 0–11). Later phases may already exist partially in `src/` while this list stays at the last closed gate.

## Phase 0 — GDD

- Design docs: GDD, palette, names, formulas, save schema, non-goals
- Master plan, task checklist, regression matrix, agent workflow

## Phase 1 — Scaffold

- Vite + Phaser 4 + TypeScript project
- Boot → Menu → Game scene shell, fade transitions
- FPS overlay, path alias `@/`, Vitest/ESLint/Prettier scripts

## Phase 2 — Arena

- Large tiled arena, camera follow, world bounds
- Arena system + grid visual

## Phase 3 — Player

- Green box player, WASD / arrows, virtual joystick
- Acceleration / friction (no diagonal speed boost)
- Pause (**P**), blur-pause, Esc → Menu

## Phase 4 — Combat

- Bullet pool, auto-aim starter gun, damage numbers
- Dummy target kill path for Gate 4
- Camera shake / muzzle flash basics

## Phase 5 — Enemies

- Pooled melee, ranged, and blob enemies
- Contact DPS on interval; blob death puddles
- Soft-cap pressure (e.g. 50 melee spawn debug)

## Phase 6 — Spawner

- Time-based spawner, wave table, director / warmup
- Pause freezes spawn timers; fast-forward test hook

## Phase 7 — XP & draft

- XP orbs, magnet, level-ups
- 3-card draft UI (click or 1/2/3), multi-level queue
- Run build tracks owned skills; **R** rerolls while drafting

## Phase 8 — Skills

- Skill registry (~10 weapons + stat passives)
- SkillSystem behaviors: dual pistol, shotgun, boomerang, trap, shuriken, bowling, lightning, fire ring, freeze nova, drone
- Draft picks apply live; `__TEST__.forceSkill` / `forceAllWeapons` for S11

## Phase 9 — Breakthrough

- Weapon max + catalyst → evolution (breakthrough)
- Evolution registry + draft breakthrough cards / force helper

## Phase 10 — Survival

- Player HP, armor, damage flash, death → ResultScene
- Retry / Menu from results; clean weapon shutoff on death

## Phase 11 — Bosses

- Boss kinds: Brute, Spitter, Splitter
- Intro events, phases, boss kills on result summary
- **B** / `__TEST__.forceBoss` for playtest

## Next (owned by game agents)

- Phase 19+ Juice/UI (partially done by story agent: T444/T450/T455/T459), Harden, Retention, Final QA — see [PROGRESS.md](PROGRESS.md).

## Phases 16–18 — Hub / Gear / Heroes (Gate 16–18)

- `HubScene`: currencies, permanent upgrades, settings, export/import/reset, daily login
- Idempotent rewards keyed by `runId` / day; schema migrate + gear sanitize
- Gear inventory: equip/unequip, merge, salvage, end-run loot, power score
- Heroes: 4 colored skins + passives, unlock conditions, stack with meta/gear
- Menu: additive **HUB** button only (Intro/tutorial/fonts untouched)
- Result → Hub; Vitest 63

## Narrative / tutorial polish (parallel to Phases 12–15)

- [docs/STORY.md](STORY.md) lore + intro crawl (`Intro` scene), skippable
- First-run tutorial overlay (WASD → auto-fire → XP → draft → survive); `localStorage` `tutorialCompleted` / `storyIntroSeen`
- Fredoka + Nunito fonts, global CSS atmosphere, scene fades, draft open/close tweens, button hover feedback
- Hit / level-up flash respects `settings.reduceShake`
- Tasks completed early: T444, T450, T455, T459 (Gate 19 not closed)
