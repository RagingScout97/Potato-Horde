---
name: browser-playtest
description: >-
  Opens the browser, runs Potato Horde stage test gates, console checks, and
  smoke playtests. Use when verifying a Test Gate, after gameplay changes, for
  UI testing, FPS/memory checks, or automated Playwright-style smoke later.
---

# Browser Playtest

## When to run

- After every task batch before marking `done`
- Before starting a new phase
- Whenever the user says something “broke”
- After scene/input/pool/save changes (with regression smokes)

## Manual / Cursor browser flow

1. Ensure `npm run dev` is running (or start it).
2. Navigate to local URL (usually `http://localhost:5173`).
3. Open console; note errors/warnings.
4. Execute the **Test Gate** steps for the current phase from `docs/MASTER_PLAN.md`.
5. Run required smokes from `docs/REGRESSION_MATRIX.md`.
6. Screenshot on failure; write note in `docs/PROGRESS.md`.

## Instrumentation (Phase 1+)

Dev-only hooks (never rely on them in production build checks). Full API: `docs/PLAYTEST.md`.

```js
window.__GAME__   // Phaser.Game
window.__TEST__   // set when GameScene is active
// Useful: getPlayer, getEnemyCount, getXp, getBuild, isPaused, isDraftOpen,
// grantXp, pickDraft, forceSkill, forceAllWeapons, forceBreakthrough,
// forceBoss, forceAlly, killPlayer, spawnEnemy, spawnFiftyMelee, fastForward, pause, resume
```

Use for assertions: HP changes, enemy count, draft open, boss alive, scene key.

## Gate cheat-sheet

| Gate | Minimum browser check |
|------|------------------------|
| 1 | Menu↔Game, canvas visible, 0 errors |
| 3 | Move WASD, no diagonal boost |
| 4 | Auto-kill dummy |
| 7 | Level → 3 cards → resume |
| 10 | Death → retry clean |
| 14 | 15m soak / memory |
| 16 | Refresh keeps save |

## Later automation (Phase 20+)

- Vitest for pure math
- Playwright smoke: boot, canvas, no pageerror, optional scenario keys
- Deterministic seed + skip intro for CI

## Pass / fail

**Pass:** gate criteria met + required smokes green + checklist updated.  
**Fail:** do not check task done; fix or mark `regressed`.

## Agent behavior

Prefer **you** running browser tools over asking the user to click when possible. Report: what you opened, what you saw, pass/fail per smoke id (S01…).
