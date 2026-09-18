# Living Task Checklist � Potato Horde

**How to update:** Change `- [ ]` to `- [x]` when done + tested. If regressed, change back to `- [ ]` and note in PROGRESS.md.

**Progress:** see [PROGRESS.md](PROGRESS.md) � **Plan:** [MASTER_PLAN.md](MASTER_PLAN.md) � **Regression:** [REGRESSION_MATRIX.md](REGRESSION_MATRIX.md)

---

## Phase 0 � GDD (Gate 0)

- [x] T001 Write one-page GDD: core fantasy, win/lose, session length
- [x] T002 Document control scheme (WASD + optional virtual stick)
- [x] T003 Define entity color legend in docs/palette.md
- [x] T004 List 8 starter weapons + 6 stats + 4 allies (names only)
- [x] T005 Define XP curve formula (level N cost)
- [x] T006 Define endless difficulty formula (HP/dmg/spawn rate vs time)
- [x] T007 Define chapter clear conditions (survive T + kill boss)
- [x] T008 Define currencies: Banknotes, Gems (earn-only in v1)
- [x] T009 Define gear slots: Weapon, Armor, Accessory
- [x] T010 Define save schema v1 fields
- [x] T011 List non-goals (no multiplayer, no IAP)
- [x] T012 Gate 0: Review GDD / approve before coding

**Test Gate 0:** Explain loop in 30s; docs exist.

## Phase 1 � Scaffold (Gate 1)

- [x] T013 Vite + Phaser 4 + TypeScript project
- [x] T014 Folder layout: scenes, systems, entities, data, ui, utils, save
- [x] T015 ESLint + Prettier + path aliases
- [x] T016 Boot ? Menu ? Game scene stubs
- [x] T017 Fixed logical resolution + FIT scale
- [x] T018 FPS counter overlay (dev)
- [x] T019 ?debug=1 hitboxes flag
- [x] T020 README: install, dev, controls
- [ ] T021 Git init + gitignore (when user asks commit)
- [x] T022 PRESS START placeholder
- [x] T023 Pause key stub (P)
- [x] T024 Scene transition fade helper
- [x] T025 GameConfig.ts
- [x] T026 Seeded RNG utility
- [x] T027 Event bus
- [x] T028 Gate 1: Menu ? Game loads

**Test Gate 1:** localhost; no console errors; scenes switch.

## Phase 2 � Arena (Gate 2)

- [x] T029 Large arena bounds
- [x] T030 Ground grid / tiled rects
- [x] T031 Camera follow API
- [x] T032 Soft camera lerp
- [x] T033 Clamp camera to bounds
- [x] T034 Edge vignette placeholder
- [x] T035 Center spawn marker
- [x] T036 Safe zone first 3s
- [x] T037 World-to-screen helpers
- [x] T038 OOB bullet kill plane
- [x] T039 Minimap stub
- [x] T040 Obstacle group placeholder
- [x] T041 Collision layer stub
- [x] T042 Gate 2: Camera pans smoothly

**Test Gate 2:** Follow dummy; no edge jitter.

## Phase 3 � Player (Gate 3)

- [x] T043 Green player box + facing arrow
- [x] T044 WASD + arrows
- [x] T045 Normalize diagonal speed
- [x] T046 Accel / friction
- [x] T047 Max speed from config
- [x] T048 Hurtbox ? visual
- [x] T049 World bounds collide
- [x] T050 Idle vs move flags
- [x] T051 Touch virtual joystick
- [x] T052 Mouse move-to-pointer off by default
- [x] T053 Dash stub locked
- [x] T054 Invuln flash stub
- [x] T055 Cannot leave arena
- [x] T056 Input buffering for pause
- [x] T057 Disable move during draft
- [x] T058 Death freezes input
- [x] T059 Dev respawn key
- [x] T060 Footstep event stub
- [x] T061 Movement unit tests
- [x] T062 Gate 3: Smooth move desktop+touch

**Test Gate 3:** Edges; diagonals; draft stops move.

## Phase 4 � Combat (Gate 4)

- [x] T063 Bullet object pool
- [x] T064 Fire rate timer
- [x] T065 Nearest enemy in range
- [x] T066 Aim vector
- [x] T067 Spawn bullet from center
- [x] T068 Bullet lifetime / max distance
- [x] T069 Damage on overlap
- [x] T070 Pierce default 0
- [x] T071 No-target idle (or config spin)
- [x] T072 Multi-weapon slots
- [x] T073 Independent cooldowns
- [x] T074 Offscreen in-range targetable
- [x] T075 Friendly fire off
- [x] T076 Bullet vs obstacle
- [x] T077 Muzzle flash box
- [x] T078 Optional micro shake
- [x] T079 Floating damage numbers
- [x] T080 Crit stub
- [x] T081 Atk speed meta hook
- [x] T082 Damage meta hook
- [x] T083 Range meta hook
- [x] T084 Disable weapons on death
- [x] T085 Pause freezes cooldowns
- [x] T086 Cap on-screen bullets
- [x] T087 Nearest-enemy unit test
- [x] T088 Gate 4: Auto-fire kills dummy

**Test Gate 4:** Stand still kills dummy; pause stops bullets. Regression: S01 S03 S04 S05

## Phase 5 � Enemies (Gate 5)

- [x] T089 Enemy base (HP, speed, contact)
- [x] T090 Melee chase
- [x] T091 Separation steering
- [x] T092 Spawn facing player
- [x] T093 Death drops XP
- [x] T094 Contact damage cooldown
- [x] T095 Light knockback
- [x] T096 Stun stub
- [x] T097 Enemy pool
- [x] T098 Far despawn/reposition optional
- [x] T099 Ranged zombie
- [x] T100 Enemy bullet pool
- [x] T101 Blob + death puddle
- [x] T102 Hazard TTL + DPS
- [x] T103 Elite tint + HP mult
- [x] T104 Enemy type registry
- [x] T105 Status slow
- [x] T106 Status burn
- [x] T107 Enemy i-frames optional
- [x] T108 Path around obstacles
- [x] T109 No spawn in player
- [x] T110 Soft cap active enemies
- [x] T111 Cull oldest when over cap
- [x] T112 Aggro player only
- [x] T113 Death scale pop
- [x] T114 Contact DPS unit test
- [x] T115 Puddle TTL unit test
- [x] T116 Debug spawn keys 1/2/3
- [x] T117 Elite/boss HP bars
- [x] T118 Gate 5: 50 melee OK

**Test Gate 5:** Contact interval; puddles; ranged. Regression: S05 S06 S10

## Phase 6 � Spawner (Gate 6)

- [x] T119 Time-based spawner
- [x] T120 Spawn ring outside camera
- [x] T121 Wave table format
- [x] T122 Density ramp
- [x] T123 Type mix by time
- [x] T124 Burst swarm patterns
- [x] T125 Director ease if low HP
- [x] T126 Director raise if overpowered
- [x] T127 Chapter timer UI
- [x] T128 Endless mode flag
- [x] T129 Pause spawner on draft
- [x] T130 Pause spawner on boss intro
- [x] T131 Max simultaneous budget
- [x] T132 Seeded spawn angles
- [x] T133 No spawn in obstacles
- [x] T134 Kills/min telemetry
- [x] T135 Warmup 5s grace
- [x] T136 Spawn curve unit test
- [x] T137 Tab blur pauses game
- [x] T138 Tab focus resumes cleanly
- [x] T139 Long-run 10 min stability
- [x] T140 Long-run 20 min stability
- [x] T141 No spawn on player body
- [x] T142 Spawner respects soft cap
- [x] T143 Spawner survives scene pause
- [x] T144 Spawner reset on retry
- [x] T145 Gate 6: 5 min endless no crash

**Test Gate 6:** Density rises; blur pauses. Regression: S04 S06 S10

## Phase 7 � XP / Draft (Gate 7)

- [x] T146 XP orb yellow
- [x] T147 Small magnet radius
- [x] T148 Orb attract lerp
- [x] T149 XP bank + level
- [x] T150 Level-up timeScale 0
- [x] T151 Draft UI 3 cards
- [x] T152 Limited reroll
- [x] T153 Ban/lock stub
- [x] T154 Apply skill to run build
- [x] T155 Illegal duplicate rules
- [x] T156 Stack same skill levels
- [x] T157 Max skill slots
- [x] T158 Full slots ? upgrades/stats only
- [x] T159 Multi-level draft queue
- [x] T160 Orb TTL optional
- [x] T161 Big orb more XP
- [x] T162 Magnet vacuum powerup
- [x] T163 XP bar HUD
- [x] T164 Level HUD
- [x] T165 Recommended card highlight
- [x] T166 Keys 1/2/3 pick
- [x] T167 Click pick
- [x] T168 Escape no soft-lock
- [x] T169 XP curve unit test
- [x] T170 Draft queue unit test
- [x] T171 Debug save run build
- [x] T172 No orb collect when dead
- [x] T173 Camera locked in draft
- [x] T174 Enemies frozen in draft
- [x] T175 Gate 7: Kill?orb?level?pick?resume

**Test Gate 7:** Triple queue; skills apply. Regression: S03 S04 S07 S11

## Phase 8 � Skills (Gate 8)

- [x] T176 Dual Pistol starter
- [x] T177 Shotgun cone
- [x] T178 Boomerang return
- [x] T179 Energy Trap AoE
- [x] T180 Shuriken seek/orbit
- [x] T181 Bowling ball
- [x] T182 Lightning chain
- [x] T183 Fire ring aura
- [x] T184 Freeze nova
- [x] T185 Drone weapon
- [x] T186 Stat skills pack
- [x] T187 Skill schema
- [x] T188 Evolution req map
- [x] T189 Card colored glyph icons
- [x] T190 Balance sheet stub
- [x] T191 onLevel(n) hooks
- [x] T192 Disable-broken flag (no silent fail)
- [x] T193 Assert skill registered on pick
- [x] T194 Smoke Dual Pistol
- [x] T195 Smoke Shotgun
- [x] T196 Smoke Boomerang
- [x] T197 Smoke Energy Trap
- [x] T198 Smoke Shuriken
- [x] T199 Smoke Bowling
- [x] T200 Smoke Lightning
- [x] T201 Smoke Fire ring
- [x] T202 Smoke Freeze
- [x] T203 Smoke Drone
- [x] T204 Smoke +MaxHP
- [x] T205 Smoke +Speed
- [x] T206 Smoke +Armor
- [x] T207 Smoke +Pickup
- [x] T208 Smoke +Crit/CD
- [x] T209 Synergy tags
- [x] T210 Gate 8: All combat skills visible

**Test Gate 8:** Force-pick each skill 10s. Regression: S07 S11 S05

## Phase 9 � Breakthrough (Gate 9)

- [x] T211 Detect max + catalyst
- [x] T212 Breakthrough badge on card
- [x] T213 Transform weapon behavior
- [x] T214 One evolution per weapon
- [x] T215 Persist evolved in run
- [x] T216 VFX flash placeholder
- [x] T217 Evolved >> max basic
- [x] T218 Owned evolutions UI list
- [x] T219 Requirement unit test
- [x] T220 Evolution A
- [x] T221 Evolution B
- [x] T222 Evolution C
- [x] T223 Evolution D
- [x] T224 Evolution E
- [x] T225 Gate 9: One evolution mid-run

**Test Gate 9:** Badge only when eligible. Regression: S07 S11

## Phase 10 � Survival (Gate 10)

- [x] T226 HP / MaxHP
- [x] T227 Armor formula
- [x] T228 HP bar + numeric
- [x] T229 Damage flash
- [x] T230 Low HP vignette
- [x] T231 Game Over scene
- [x] T232 Stats summary
- [x] T233 Retry button
- [x] T234 Return to hub
- [x] T235 I-frames after hit
- [x] T236 Hazard uses i-frame rules
- [x] T237 Heal skill/orb
- [x] T238 Overheal shield stub
- [x] T239 Cannot die during draft
- [x] T240 HP NaN guard
- [x] T241 Armor unit test
- [x] T242 Death disables weapons
- [x] T243 Grey corpse box
- [x] T244 Last-hit kill credit
- [x] T245 Gate 10: Clean death + retry

**Test Gate 10:** No ghost fire. Regression: S06 S08 S07

## Phase 11 � Bosses (Gate 11)

- [x] T246 Boss spawn timing
- [x] T247 Telegraph warning boxes
- [x] T248 Charge attack
- [x] T249 AoE slam
- [x] T250 Summon adds
- [x] T251 Enrage under 30%
- [x] T252 Boss HP bar UI
- [x] T253 Camera punch spawn
- [x] T254 Fodder clear config
- [x] T255 Victory chest / clear
- [x] T256 Endless recurring bosses
- [x] T257 Immunities list
- [x] T258 Stun resistance
- [x] T259 Intro lock 1s
- [x] T260 Outro freeze
- [x] T261 Phase threshold unit test
- [x] T262 Boss Brute
- [x] T263 Boss Spitter
- [x] T264 Boss Splitter
- [x] T265 Brute telegraphs readable
- [x] T266 Spitter projectile patterns
- [x] T267 Splitter split logic
- [x] T268 Boss reward table
- [x] T269 HP never stuck 0.0001
- [x] T270 Gate 11: Defeat Brute

**Test Gate 11:** Kill once. Regression: S05 S08 S10

## Phase 12 � Allies (Gate 12)

- [x] T271 Parachute drop tween
- [x] T272 Follow offset
- [x] T273 Ally auto-attack
- [x] T274 Ally invulnerable
- [x] T275 Ally draft upgrades
- [x] T276 Max 3 allies
- [x] T277 Ally separation
- [x] T278 Own nearest target
- [x] T279 Recall if far
- [x] T280 No ally death
- [x] T281 Meta unlock hook
- [x] T282 Color per ally
- [x] T283 Draft Ally category
- [x] T284 Ally breakthrough
- [x] T285 Follow offset unit test
- [x] T286 Ally frozen in draft
- [x] T287 Ally during boss intro
- [x] T288 Cleanup on player death
- [x] T289 Ally does not block path unfairly
- [x] T290 Ally weapon uses pools
- [x] T291 Ally drop at 60s
- [x] T292 Second ally timing
- [x] T293 Third ally timing
- [x] T294 Ally UI indicators
- [x] T295 Gate 12: Ally fights

**Test Gate 12:** No unfair block. Regression: S03 S05 S08

## Phase 13 � Map (Gate 13)

- [x] T296 Static grey obstacles
- [x] T297 Bullet collision
- [x] T298 Enemy slide on walls
- [x] T299 Player collision
- [x] T300 Optional LoS block
- [x] T301 Destructible crates
- [x] T302 Chapter color themes
- [x] T303 Kite pillars
- [x] T304 No soft-lock corners
- [x] T305 Procedural obstacle stamps
- [x] T306 Seeded daily layouts
- [x] T307 Minimap dots
- [x] T308 Solid border walls
- [x] T309 Static body perf
- [x] T310 Stuck enemy unstick
- [x] T311 Stuck player unstick
- [x] T312 Crate drops orbs
- [x] T313 Obstacle vs puddle OK
- [x] T314 Map loads with chapter data
- [x] T315 Gate 13: Kite 2 min

**Test Gate 13:** No infinite stuck. Regression: S03 S05 S06

## Phase 14 � Endless (Gate 14)

- [x] T316 Endless mode scene
- [x] T317 Soft HP scale
- [x] T318 Soft dmg scale capped
- [x] T319 Elite chance ramp
- [x] T320 Boss cadence
- [x] T321 Milestone banners
- [x] T322 PB time save
- [x] T323 PB kills save
- [x] T324 Diminishing regen
- [x] T325 Anti-AFK pause 60s
- [x] T326 Perf budget alarms
- [x] T327 Difficulty presets
- [x] T328 Scale caps unit test
- [x] T329 Soak 15 min
- [x] T330 Soak 30 min memory
- [x] T331 No entity leak
- [x] T332 FPS target check
- [x] T333 Endless vs chapter isolation
- [x] T334 PB display hub
- [x] T335 Gate 14: 15 min stable

**Test Gate 14:** Memory flat. Regression: S10 S05 S09

## Phase 15 � Chapters (Gate 15)

- [x] T336 Chapter select UI
- [x] T337 Chapters 1�5 data
- [x] T338 Star rating optional
- [x] T339 Unlock next on clear
- [x] T340 Chapter modifiers
- [x] T341 Fail partial banknotes
- [x] T342 Chapter best stats
- [x] T343 Recommended power
- [x] T344 Locked tooltip
- [x] T345 Hub?chapter?result?hub
- [x] T346 Ch1 waves/boss content
- [x] T347 Ch2 content
- [x] T348 Ch3 content
- [x] T349 Ch4 content
- [x] T350 Ch5 content
- [x] T351 Ch1 clear test
- [x] T352 Unlock persist refresh
- [x] T353 Cannot skip lock
- [x] T354 Chapter retry keeps unlock state
- [x] T355 Gate 15: Ch1?Ch2 unlock

**Test Gate 15:** Lock persists. Regression: S02 S09

## Phase 16 — Hub (Gate 16)

- [x] T356 Hub scene layout
- [x] T357 Banknotes from runs
- [x] T358 Gems rare
- [x] T359 Spend permanent upgrades
- [x] T360 Tree HP/Atk/Speed/Luck/Magnet
- [x] T361 Confirm spend dialog
- [x] T362 Refund debug only
- [x] T363 Daily login local day key
- [x] T364 Reward apply once idempotent
- [x] T365 Duplicate reward guard
- [x] T366 Hub mute placeholder
- [x] T367 Settings volume/shake/numbers
- [x] T368 Reset save danger
- [x] T369 Export save JSON
- [x] T370 Import save JSON
- [x] T371 Schema migration hook
- [x] T372 Reward-once unit test
- [x] T373 Hub nav polish A
- [x] T374 Hub nav polish B
- [x] T375 Hub nav polish C
- [x] T376 Settings persist
- [x] T377 Upgrade affects next run
- [x] T378 Cannot overspend
- [x] T379 Hub after death flow
- [x] T380 Gate 16: Earn→spend→affects run

**Test Gate 16:** Persist + import. Regression: S02 S09 S05

## Phase 17 — Gear (Gate 17)

- [x] T381 Inventory array
- [x] T382 Equip slots
- [x] T383 Rarity colors
- [x] T384 Stat rolls
- [x] T385 Merge duplicates simplified
- [x] T386 End-run loot table
- [x] T387 Power score
- [x] T388 Compare tooltip
- [x] T389 Single weapon slot rule
- [x] T390 Gear → run start stats
- [x] T391 Salvage banknotes
- [x] T392 Inventory cap + auto-salvage
- [x] T393 Seeded loot
- [x] T394 Full inventory edge
- [x] T395 Bad JSON gear recover
- [x] T396 Negative stats clamp
- [x] T397 Unequip reverts stats
- [x] T398 Save keeps loadout
- [x] T399 Loot rarity weights
- [x] T400 Merge consumes correctly
- [x] T401 Cannot merge mismatched
- [x] T402 Gear UI empty state
- [x] T403 Gear UI full state
- [x] T404 Equip from hub only
- [x] T405 Run does not mutate hub gear wrongly
- [x] T406 Salvage confirm
- [x] T407 Power score updates UI
- [x] T408 Gear vs meta stacking correct
- [x] T409 Merge rules unit test
- [x] T410 Gate 17: Equip raises damage

**Test Gate 17:** Unequip+save. Regression: S09 S05

## Phase 18 — Heroes (Gate 18)

- [x] T411 Hero defs starter + 3
- [x] T412 Select hero hub
- [x] T413 Passive per hero
- [x] T414 Unlock conditions
- [x] T415 Hero level meta
- [x] T416 Color skin only
- [x] T417 Squad roster assign
- [x] T418 Locked hero UI
- [x] T419 Hero A balance
- [x] T420 Hero B balance
- [x] T421 Hero C balance
- [x] T422 Hero D balance
- [x] T423 Passive visible in run
- [x] T424 Locked cannot start
- [x] T425 Unlock after condition
- [x] T426 Unlock persists
- [x] T427 Switch hero mid-hub
- [x] T428 Hero + gear stack
- [x] T429 Hero + meta stack
- [x] T430 Squad uses unlocked only
- [x] T431 Hero select empty safe
- [x] T432 New unlock modal hook
- [x] T433 Hero icons colored boxes
- [x] T434 Unlock flags unit test
- [x] T435 Gate 18: Switch hero passive works

**Test Gate 18:** Locked blocked. Regression: S09 S05 S02

## Phase 19 — Juice / UI (Gate 19)

- [ ] T436 Kill combo popup
- [ ] T437 Shake toggle
- [ ] T438 Hitstop micro
- [ ] T439 Pause menu resume/quit
- [ ] T440 Mute
- [ ] T441 Colorblind-safe check
- [ ] T442 Scalable UI text
- [ ] T443 Damage numbers toggle
- [x] T444 First-run tutorial skippable
- [ ] T445 Key rebind stub
- [ ] T446 Performance mode
- [ ] T447 HUD contrast worst-case
- [ ] T448 Persistent HUD core only
- [ ] T449 Contextual alerts not clutter
- [x] T450 Feedback under 100ms feel
- [ ] T451 Draft UI state matrix empty/full
- [ ] T452 Hub button hit targets large
- [ ] T453 Focus order keyboard
- [ ] T454 Safe area mobile
- [x] T455 Tutorial does not soft-lock
- [ ] T456 Settings from pause
- [ ] T457 Juice respects performance mode
- [ ] T458 HUD removal test pass
- [x] T459 First-time UX copy pass
- [ ] T460 Gate 19: Tutorial run complete

**Test Gate 19:** Toggles persist. Regression: S01 S12 S09 S07

## Phase 20 � Harden (Gate 20)

- [ ] T461 Pools audit
- [ ] T462 Offscreen cull
- [ ] T463 Spatial hash nearest
- [ ] T464 Cap particles
- [ ] T465 No hot-path alloc
- [ ] T466 NaN position guards
- [ ] T467 Clamp dt tab spike
- [ ] T468 Fixed timestep option
- [ ] T469 Overlap budget
- [ ] T470 Stress 500 fodder
- [ ] T471 Reload scene 100x
- [ ] T472 Pause 100x
- [ ] T473 Draft empty skills graceful
- [ ] T474 XP boundary no double level
- [ ] T475 Magnet all orbs same frame
- [ ] T476 Boss kill + death same frame
- [ ] T477 Save during draft
- [ ] T478 Corrupt save recovery
- [ ] T479 Negative HP clamp
- [ ] T480 Soft speed self-check
- [ ] T481 I-frame overlap rules
- [ ] T482 Joystick+keyboard conflict
- [ ] T483 Resize mid-run
- [ ] T484 Zoom 50%/150%
- [ ] T485 Firefox + Chrome smoke
- [ ] T486 CPU throttle sim
- [ ] T487 Audio context resume
- [ ] T488 Glitch log template
- [ ] T489 P0 bug triage
- [ ] T490 P1 bug triage
- [ ] T491 Pool leak fix pass
- [ ] T492 Event listener leak fix
- [ ] T493 Scene shutdown cleanup audit
- [ ] T494 Input stuck key fix
- [ ] T495 Draft re-entry race fix
- [ ] T496 Reward double-grant fix
- [ ] T497 Skill silent-fail hunt
- [ ] T498 Save migration dry-run
- [ ] T499 Document known P2
- [ ] T500 Gate 20: P0 backlog empty

**Test Gate 20:** Stress signed off. Regression: all S01�S12

## Phase 21 � Retention (Gate 21)

- [ ] T501 Daily challenge seed
- [ ] T502 Local daily best board
- [ ] T503 Achievements list
- [ ] T504 Pity buff after 3 fails
- [ ] T505 New unlock modal
- [ ] T506 Session goal toast
- [ ] T507 Comeback chest
- [ ] T508 Milestone titles
- [ ] T509 Hook copy A
- [ ] T510 Hook copy B
- [ ] T511 Hook copy C
- [ ] T512 Hook copy D
- [ ] T513 Hook copy E
- [ ] T514 Daily UI entry
- [ ] T515 Achievement toast
- [ ] T516 Pity cap enforced
- [ ] T517 Comeback not exploitable
- [ ] T518 Retention analytics stub
- [ ] T519 Analytics console events
- [ ] T520 Gate 21: Daily midnight reset

**Test Gate 21:** Clock skew daily. Regression: S09 S02

## Phase 22 � Final QA (Gate 22)

- [ ] T521 Case early Easy
- [ ] T522 Case early Normal
- [ ] T523 Case early Hard
- [ ] T524 Case mid Easy
- [ ] T525 Case mid Normal
- [ ] T526 Case mid Hard
- [ ] T527 Case late Easy
- [ ] T528 Case late Normal
- [ ] T529 Case late Hard
- [ ] T530 Case endless 10m
- [ ] T531 Case chapter clear
- [ ] T532 Case death rewards
- [ ] T533 Case draft full slots
- [ ] T534 Case breakthrough path
- [ ] T535 Case boss enrage
- [ ] T536 Case ally max
- [ ] T537 Case gear full inv
- [ ] T538 Case import/export
- [ ] T539 Case mobile touch
- [ ] T540 Case resize+zoom
- [ ] T541 Regression all skills activate
- [ ] T542 Regression saves
- [ ] T543 Regression chapters+endless
- [ ] T544 Accessibility pass
- [ ] T545 Perf pass
- [ ] T546 Balance TTK sheet
- [ ] T547 Content freeze checklist
- [ ] T548 Known issues doc
- [ ] T549 Production build preview
- [ ] T550 Touch smoke phone width
- [ ] T551 Touch smoke tablet width
- [ ] T552 Keyboard-only clear Ch1
- [ ] T553 Fresh save tutorial path
- [ ] T554 Corrupted save recover path
- [ ] T555 Long soak final
- [ ] T556 Skill silent-fail final hunt
- [ ] T557 Meta spend final
- [ ] T558 UI state matrix final
- [ ] T559 Ship notes written
- [ ] T560 Gate 22: Ship checklist complete

**Test Gate 22:** Build playable; zero P0.
