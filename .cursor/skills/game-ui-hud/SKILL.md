---
name: game-ui-hud
description: >-
  Designs and implements game HUD, menus, draft cards, hub screens, and
  feedback for Potato Horde. Use when building UI, HUD, pause menus, skill
  draft, settings, hub navigation, accessibility, or playtesting interface clarity.
---

# Game UI / HUD Design

## Core rules (survivors HUD)

1. **Urgency test:** Keep on HUD only what is needed often *and* urgently (HP, XP bar, level, timer). Everything else is contextual or in menus.
2. **Stable core:** Persistent elements stay in fixed corners; never jump around.
3. **Contrast:** Validate text against *worst* in-game backgrounds (bloody red puddles, purple boss), not a clean mockup.
4. **Color is not the only signal:** Shape/position/text too (colorblind-safe).
5. **Feedback &lt; 100ms** for hits, picks, level-up open — feels causal.
6. **State matrix before polish:** empty, full, error, loading, disabled, locked for every screen.

## Potato Horde HUD budget (combat)

| Always on | Contextual | Menu only |
|-----------|------------|-----------|
| HP, XP bar, level | Boss bar, magnet pickup toast, low-HP vignette | Settings, inventory, heroes |
| Run timer (chapter) | Milestone banner | Gear compare |

Draft UI is a **modal pause layer**: blocks world input; Escape must not soft-lock; keyboard 1/2/3 + click.

## Hub / meta UI

- One clear primary CTA per screen (Play / Continue)
- Large hit targets for touch later
- Locked content: visible + reason tooltip, not invisible
- Confirm destructive actions (reset save, salvage)

## Playtest script (UI)

Observe, do not coach mid-run. Note: **Q** questions, **O** observations, **+** works, **−** broken.

1. Can they start a run in &lt;10s without help?
2. Do they notice HP dropping?
3. Is level-up readable under chaos?
4. Can they quit to hub without losing understanding of rewards?
5. Any element they never look at? (candidate for removal)

## Implementation notes (Phaser)

- UI in screen-space (scrollFactor 0) separate from world
- Depth layers: world &lt; world VFX &lt; HUD &lt; modal
- On pause/draft: set input flags; restore exactly on close
- Prefer nine-slice / simple rect panels over decorative clutter in v1

## Done

- [ ] State matrix covered  
- [ ] Gate for UI phase passed  
- [ ] Regression S01 S07 S12 as applicable  
- [ ] TASKS/PROGRESS updated  
