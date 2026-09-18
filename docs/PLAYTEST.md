# Playtest Guide

How to run Potato Horde locally and exercise the current build (Phases 0–11 shipped; later phases may be in flight).

## Install & run

```powershell
cd "e:\Project\Shooting game"
npm install
npm run dev
```

Open **http://localhost:5173** (Vite port from `vite.config.ts`).

| Command | Purpose |
|---------|---------|
| `npm run dev` | Dev server + HMR |
| `npm run build` | `tsc -b` + production bundle |
| `npm run preview` | Serve the production build |
| `npm run test` | Vitest unit tests |
| `npm run lint` | ESLint |

Optional query: `http://localhost:5173/?debug=1` — shows player hurtbox overlays (`isDebugQuery()`).

Do **not** restart the shared `npm run dev` process if another agent is already using it; reuse the same URL.

## Session flow

1. **Boot** → loads fonts → if first launch **Intro** (story panels) → **Menu**
2. Menu: **ENDLESS** / Enter / Space → **Game**; **CHAPTERS** / **C** → chapter select
3. Survive until death → **Result** (summary) → **Enter**/Retry → Game, or **Esc**/Menu → Menu
4. In Game, **Esc** (when not drafting) returns to Menu — if tutorial is active, first **Esc** skips tutorial

### Story / tutorial (first launch)

| Flag (localStorage) | Meaning |
|---------------------|---------|
| `storyIntroSeen` | Intro crawl already shown |
| `tutorialCompleted` | In-run tutorial finished or skipped |

| Input | Action |
|-------|--------|
| Intro: Enter / Space / Click | Next panel |
| Intro: **Esc** or Skip | Skip intro → Menu |
| Tutorial: **T** or Skip button | Skip remaining tips |
| Tutorial: **Esc** (not in draft) | Skip tutorial (does not soft-lock; Esc again → Menu) |

Dev helpers: `__TEST__.skipTutorial()`, `__TEST__.resetUxFlags()`, `__TEST__.isTutorialActive()`.

Re-test first-run: clear those keys (or `__TEST__.resetUxFlags()` then reload).

## In-run controls

See [CONTROLS.md](CONTROLS.md) for the short cheat sheet. Summary:

| Input | Action |
|-------|--------|
| WASD / Arrows | Move |
| Touch | Virtual joystick (bottom-left) |
| Auto | Weapons fire at nearest targets (no click-to-shoot) |
| **P** | Pause / unpause (blocked during draft) |
| **Esc** | Tutorial active: skip tutorial first. Else → Menu (ignored while draft is open — no soft-skip) |
| **T** | Skip remaining tutorial tips (first-run only) |
| **1 / 2 / 3** | Outside draft: spawn melee / ranged / blob. In draft: pick card 1 / 2 / 3 |
| **R** | In draft: reroll (uses `rerollsLeft`). Outside draft: **dev respawn** (reset build, clear pools, center) |
| **X** | Grant ~999 XP (fast level-ups) |
| **V** | Activate XP vacuum (~4s) |
| **B** | Force-spawn Brute boss |
| **Y** | Force-drop ally near player (ally systems in progress) |
| **5** | Spawn ring of 50 melee (soft-cap / pool smoke) |

Window **blur** auto-pauses; **focus** resumes (unless you were already paused / in draft).

## Draft (level-up)

- Kill enemies → XP orbs → level → **3 skill cards**
- Click a card or press **1 / 2 / 3**; **R** or the reroll label to reroll while charges remain
- Esc does **not** close the draft
- Combat, spawner, bosses, and cooldowns freeze until you pick

## Console helpers

Available after GameScene creates (open DevTools on the game tab).

### `window.__GAME__`

Phaser.Game instance (`src/main.ts`). Useful for scene keys / scale inspection.

### `window.__TEST__`

Dev harness object set by `GameScene` (replaces on each Game enter). Common calls:

```js
// State
__TEST__.getPlayer()
__TEST__.getEnemyCount()
__TEST__.getBulletCount()
__TEST__.getOrbCount()
__TEST__.getXp()
__TEST__.getBuild()
__TEST__.getSkillsDebug()
__TEST__.getSpawner()
__TEST__.getBoss()
__TEST__.getAllies()
__TEST__.isPaused()
__TEST__.isDraftOpen()

// Actions
__TEST__.pause() / __TEST__.resume()
__TEST__.grantXp(999)
__TEST__.pickDraft(0)          // 0..2 while draft open
__TEST__.forceSkill('shotgun') // max skill + nearby fodder
__TEST__.forceAllWeapons()
__TEST__.forceBreakthrough('dual_pistol')
__TEST__.forceBoss('brute')    // 'brute' | 'spitter' | 'splitter'
__TEST__.forceAlly()
__TEST__.spawnEnemy('melee')   // optional elite: spawnEnemy('melee', true)
__TEST__.spawnFiftyMelee()
__TEST__.fastForward(60_000)   // advance spawner/enemies without waiting (not while paused/draft)
__TEST__.killPlayer()          // → Result after death delay
__TEST__.saveBuild()           // localStorage key potato-horde-debug-build
__TEST__.isTutorialActive()
__TEST__.skipTutorial()
__TEST__.resetUxFlags()        // clear storyIntroSeen + tutorialCompleted
```

Skill ids match `src/data/skills.ts` (e.g. `dual_pistol`, `shotgun`, `boomerang`, `lightning`, `drone`, `atk_up`, …).

## Quick smoke recipes

| Goal | Steps |
|------|--------|
| Boot / canvas | Load page → Menu visible → no console errors (**S01**) |
| Move | Start → WASD; diagonals should not feel faster (**S03**) |
| Pause | **P** — movement, spawner, cooldowns freeze (**S04**) |
| Combat | Stand near red dummy / spawn with **1** — auto-fire damages (**S05**) |
| Draft | **X** until level-up → pick card → combat resumes (**S07**) |
| HUD HP | In Game: top-left **HP bar + `HP n/max`** always visible (dirt panel) |
| Stage theme | Endless = *Endless Starch*; Chapters 1–5 swap ground/grid/haze (`__TEST__.getMap().theme`) |
| Story / tutorial | Clear `storyIntroSeen` + `tutorialCompleted` → reload → Intro → skip → Menu briefing → Game tips → **T**/Esc skip; second load → Menu only |
| Boss | **B** or `__TEST__.forceBoss('spitter')` (**S05**/boss path) |
| Death | `__TEST__.killPlayer()` → Result → Retry (**S08**) |
| Skills | `__TEST__.forceAllWeapons()` then watch fire (**S11**) |

Full smoke IDs and dependency map: [REGRESSION_MATRIX.md](REGRESSION_MATRIX.md). Phase Test Gates: [MASTER_PLAN.md](MASTER_PLAN.md).

## Unit tests

```powershell
npm run test
```

Pure math / build helpers live under `src/**/*.test.ts` (Vitest). Prefer these for targeting, XP curves, armor, spawn curves, boss math — browser for scene/input/pools.
