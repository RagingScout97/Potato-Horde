---
name: regression-safe-gamedev
description: >-
  Prevents new Potato Horde features from breaking finished systems. Use before
  editing shared code (scenes, input, pools, pause, save, combat, UI layers),
  when fixing bugs, or when a checklist item might regress.
---

# Regression-Safe Game Dev

## Golden rule

**Creating something must not destroy something that already passed a gate.**  
If it does, stop forward progress and restore the broken gate first.

## Pre-change checklist

- [ ] Identify touched areas in `docs/REGRESSION_MATRIX.md`
- [ ] Note which TASKS were already `[x]` in those areas
- [ ] Prefer extend (config/hook) over rewrite
- [ ] Plan smokes Sxx to re-run

## High-risk shared systems

| System | Common breakage |
|--------|-----------------|
| `timeScale` / pause | Draft open forever; spawner keeps going; cooldowns desync |
| Object pools | Leaks, “dead” bullets, double activate |
| Event bus | Duplicate listeners after scene restart |
| Input | Stuck keys; move during modal; joystick+keyboard fight |
| Save | Overwrite without migrate; double reward grant |
| Scene start/shutdown | Ghost entities; multiple players |
| Skill registry | Pickable skill does nothing |

## Safe patterns

1. **Feature flags** for unfinished skills — remove from draft weights.
2. **Idempotent rewards** — grant keyed by `runId`.
3. **Shutdown discipline** — kill timers, tweens, listeners in `shutdown()`.
4. **Single stats pipeline** — base × meta × gear × run buffs.
5. **dt clamp** — `Math.min(delta, 50)` after blur.
6. **Tests for math** — XP curve, armor, spawn rate monotonic.

## Post-change checklist

- [ ] Stage gate for current task  
- [ ] All listed regression smokes  
- [ ] If old `[x]` task fails → uncheck it, set PROGRESS note `regressed`, fix  
- [ ] Only then mark new task `[x]`  

## Forbidden

- Deleting a working path “temporarily” without a failing test or TODO gate
- Shipping a skill card that does not call registered behavior
- Saving without schema version
- Leaving `console.error` loops
