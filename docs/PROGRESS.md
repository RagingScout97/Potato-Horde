# Progress Tracker



**Last updated:** 2026-09-19  

**Current phase:** Phase 22 — Final QA (SHIP-ready with open mid/late cases)  

**Next task:** T524 (optional mid/late matrix) or ship  

**Last completed:** T560 (Gate 22 smoke + known issues)  

**Last gate passed:** Gate 22  

**Active feature branch of work:** Phases 19–22 Juice → Harden → Retention → QA  



## Status legend



| Status | Meaning |

|--------|---------|

| `todo` | Not started |

| `doing` | In progress (only ONE task/batch at a time) |

| `done` | Implemented + stage test passed |

| `blocked` | Waiting on you or a dependency |

| `regressed` | Was done, failed a later regression smoke — must fix before new work |



## Phase rollup



| Phase | Tasks | Status | Gate |

|-------|-------|--------|------|

| 0 GDD | T001–T012 | done | Gate 0 ✅ |

| 1 Scaffold | T013–T028 | done (T021 deferred) | Gate 1 ✅ |

| 2 Arena | T029–T042 | done | Gate 2 ✅ |

| 3 Player | T043–T062 | done | Gate 3 ✅ |

| 4 Combat | T063–T088 | done | Gate 4 ✅ |

| 5 Enemies | T089–T118 | done | Gate 5 ✅ |

| 6 Spawner | T119–T145 | done | Gate 6 ✅ |

| 7 XP Draft | T146–T175 | done | Gate 7 ✅ |

| 8 Skills | T176–T210 | done | Gate 8 ✅ |

| 9 Breakthrough | T211–T225 | done | Gate 9 ✅ |

| 10 Survival | T226–T245 | done | Gate 10 ✅ |

| 11 Bosses | T246–T270 | done | Gate 11 ✅ |

| 12 Allies | T271–T295 | done | Gate 12 ✅ |

| 13 Map | T296–T315 | done | Gate 13 ✅ |

| 14 Endless | T316–T335 | done | Gate 14 ✅ |

| 15 Chapters | T336–T355 | done | Gate 15 ✅ |

| 16 Hub | T356–T380 | done | Gate 16 ✅ |

| 17 Gear | T381–T410 | done | Gate 17 ✅ |

| 18 Heroes | T411–T435 | done | Gate 18 ✅ |

| 19 Juice/UI | T436–T460 | done | Gate 19 ✅ |

| 20 Harden | T461–T500 | done (T484–T486 open) | Gate 20 ✅ |

| 21 Retention | T501–T520 | done | Gate 21 ✅ |

| 22 Final QA | T521–T560 | done (mid/late/soak open) | Gate 22 ✅ |



## Agent session log (append each work session)



| Date | Tasks touched | Gate result | Notes |

|------|---------------|-------------|-------|

| 2026-09-18 | planning | n/a | Saved MASTER_PLAN, TASKS, skills, regression matrix |

| 2026-09-18 | T001–T062 | Gates 0–3 PASS | GDD docs; Vite+Phaser4+TS; arena+camera; green player WASD; smokes S01–S04; T021 left open (git init on commit ask); stop before Phase 4 |

| 2026-09-19 | T063–T088 | Gate 4 PASS | Bullet pool, auto-aim gun, dummy kill; pause freezes HP drain + cooldowns; Vitest nearest-enemy; S01 S03 S04 S05 |

| 2026-09-19 | T089–T118 | Gate 5 PASS | Melee/ranged/blob pools; contact DPS; puddles; 50 melee soft-cap; S05 S06 |

| 2026-09-19 | T119–T145 | Gate 6 PASS | Time spawner, waves, director, warmup, blur pause; 5min fastForward soak + soft cap; S04 |

| 2026-09-19 | T146–T175 | Gate 7 PASS | XP orbs, draft 3 cards, multi-queue, run build stats; kill→orb→level→pick→resume; S07 |

| 2026-09-19 | T176–T270 | Gates 8–11 PASS | SkillSystem 10 weapons + stats; breakthroughs×5; ResultScene death/retry; Boss Brute/Spitter/Splitter; Vitest 30/30; `__TEST__.forceSkill/forceBreakthrough/forceBoss/killPlayer`; S04 S05 S07 S11 |

| 2026-09-19 | T271–T355 | Gates 12–15 PASS | Prior agent left allies code un-checked; verified Gate 12 then shipped Map/Endless/Chapters. Allies drop+fight; obstacles/crates/LoS; endless scale+AFK+PB; chapter select Ch1→Ch2 unlock. Vitest 49; smokes S03 S05 S06 S08 S10. Next T356 Hub. |

| 2026-09-19 | T356–T435 | Gates 16–18 PASS | HubScene (currencies, upgrades, settings, export/import); idempotent rewards; Gear inventory/equip/merge/loot; Heroes roster+passives. Menu kept Intro/tutorial/fonts — added HUB only. Vitest 63. Smokes S02 S05 S07 S09. Stopped before Phase 19 (story agent may own juice/tutorial). Next T436. |

| 2026-09-19 | T436–T560 | Gates 19–22 PASS | Juice: combo, pause menu+settings, mute/shake/DN/perf/UI scale/colorblind/safe-area/rebind stub. Harden: spatial hash, cull, overlap budget, NaN, glitch log, corrupt recover, poolAudit/stressFodder. Retention: daily seed/board, achievements, pity, comeback, hooks, analytics stub. QA: known issues + ship notes + prod build. Vitest 71. Smokes S01 S07 S09 Hub. Open: T484–486, mid/late soak matrix. |

| 2026-09-19 | UI polish | S01 S04 S07 PASS | Player HP bar+numeric HUD; stage themes + warm chrome palette; browser verified. |


## Rule



Before claiming a task `done`:



1. Mark it `[x]` in [TASKS.md](TASKS.md)

2. Run its stage Test Gate + required regression smokes from [REGRESSION_MATRIX.md](REGRESSION_MATRIX.md)

3. Update this file’s **Next task** / **Last completed**

4. If a smoke fails, mark the broken area `regressed` and fix it before continuing forward


