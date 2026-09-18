# Potato Horde — Entity Color Legend

Colored-box art only (v1). Hex values are authoritative for placeholders.

| Entity | Hex | Notes |
|--------|-----|-------|
| Player | `#4ade80` | Green box + facing arrow |
| Melee zombie | `#ef4444` | Red chase unit |
| Ranged zombie | `#f97316` | Orange shooter |
| Boss | `#a855f7` | Purple elite / chapter boss |
| Ally | `#38bdf8` | Cyan follower |
| XP orb | `#facc15` | Yellow pickup |
| Bullet (player) | `#e2e8f0` | Light slate |
| Hazard / puddle | `#dc2626` | Dark red ground DoT |
| Obstacle | `#64748b` | Slate pillars (later) |

## Stage ground themes (not entity boxes)

Themes live in `src/data/mapLayouts.ts` (`ChapterThemes` + `EndlessTheme`). Ground/grid/haze shift by chapter and endless — warm dirt greens, rust, ash; avoid flat navy UI chrome.

| Theme id | Name | Vibe |
|----------|------|------|
| 0 | Endless Starch | Scorched starch fields |
| 1 | Potato Fields | Green dirt rows |
| 2 | Rusty Yard | Warm rust / scrap |
| 3 | Night Market | Magenta-amber dusk |
| 4 | Cold Storage | Cool mint steel (not blue UI) |
| 5 | Ash Basin | Danger reds / ash |

## UI chrome (menus / HUD panels)

Warm potato apocalypse — see `src/ui/chrome.ts` and `src/styles/global.css`:

| Role | Hex |
|------|-----|
| Deep bg | `#1a1410` |
| Panel | `#2a2118` |
| Accent | `#fbbf24` |
| Text | `#f5f0e6` |
| Muted | `#a89880` |
| Stroke | `#6b5344` |

Do **not** default menus to slate-blue (`#1e293b` / `#38bdf8`). Keep boss purple and ally cyan on **entities** only.

## Contrast rules

- Never rely on color alone: shape + position + label for HUD.
- Validate text against puddles and boss purple backgrounds.
- Player HP: always show **bar + numeric** on a dirt panel (combat HUD).
