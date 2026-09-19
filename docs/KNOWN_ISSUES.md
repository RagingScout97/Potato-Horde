# Known Issues (P2 / deferred)

Last updated: 2026-09-19 · Post chapter-clear black-screen fix

## P0

*None — Gate 20 requires empty P0 backlog.*

### Fixed this pass

| ID | Area | Note |
|----|------|------|
| ~~P0-black~~ | Scene shutdown | Chapter clear → black screen: `ArenaSystem.clearObstacles` threw during SHUTDOWN after physics nulled `StaticGroup.children`, aborting `scene.start('Result')`. Fixed + safe GameScene shutdown + fade fallback. |

## P1

| ID | Area | Note |
|----|------|------|
| P1-01 | Daily draft RNG | Daily seed is stored and shown; draft still uses scene `SeededRng(9001)` until daily mode fully wires draft/spawner |
| P1-02 | Key rebind | Stub UI only — WASD/P fixed until input remap ships |
| P1-03 | Audio | Mute toggles Phaser `sound.mute`; no authored SFX/music bank yet |

## P2

| ID | Area | Note |
|----|------|------|
| P2-01 | Particles | Cap helper exists; few VFX still allocate ad-hoc texts (damage numbers) |
| P2-02 | Overlap budget | Hard cap can skip hits under extreme density — prefer Performance Mode |
| P2-03 | Firefox | Manual smoke recommended; automated check Chrome-first |
| P2-04 | Touch | Virtual joystick present; full phone QA not exhaustive |
| P2-05 | Analytics | Console + local ring buffer stub only |
| P2-06 | Unlock modal | Achievement unlocks persist; dedicated toast animation is minimal |
| P2-07 | Fixed timestep | Optional fixed step not fully separated from clampDelta(50) |
| P2-08 | Multi-scene start | Calling `game.scene.start` (vs in-scene `this.scene.start` / `fadeToScene`) can leave prior scenes running — normal UI paths are fine |

## Glitch log

Dev: entries append to `localStorage['potato-horde-glitch-log']` via `logGlitch()`.

## Recovery

Corrupt JSON save → `recoverCorruptSave()` / migrate path returns defaults and may stash `.corrupt.bak`.
