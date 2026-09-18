import * as Phaser from 'phaser';
import { EnemyTuning, type EnemyKind } from '@/data/enemies';
import { currentWave, type WaveEntry } from '@/data/waves';
import type { Player } from '@/entities/Player';
import type { EnemySystem } from '@/systems/EnemySystem';
import type { ArenaSystem } from '@/systems/ArenaSystem';
import {
  densityFactor,
  directorMult,
  pickWeighted,
  spawnRatePerSecond,
  typeMixByTime,
} from '@/utils/spawnCurve';
import { clampDelta } from '@/utils/math';
import { SeededRng } from '@/utils/rng';
import { eventBus, GameEvents } from '@/utils/EventBus';

export interface SpawnerStats {
  runTimeSeconds: number;
  totalSpawned: number;
  totalKills: number;
  killsLast60s: number;
  endless: boolean;
}

/**
 * Time-based endless / chapter spawner (Phase 6).
 */
export class SpawnerSystem {
  private runMs = 0;
  private spawnAcc = 0;
  private paused = false;
  private draftPaused = false;
  private bossPaused = false;
  private endless = true;
  private warmupMs = 5000;
  private totalSpawned = 0;
  private totalKills = 0;
  private killTimestamps: number[] = [];
  private lastWaveAt = -1;
  private readonly rng: SeededRng;
  private readonly maxBudget: number;

  private readonly enemies: EnemySystem;
  private readonly arena: ArenaSystem;
  private readonly scene: Phaser.Scene;

  private readonly unsubs: Array<() => void> = [];
  private eliteChanceFn: ((tSec: number) => number) | null = null;
  private scaleFn: ((tSec: number) => { hp: number; damage: number }) | null = null;

  constructor(
    scene: Phaser.Scene,
    enemies: EnemySystem,
    arena: ArenaSystem,
    opts?: { seed?: number; endless?: boolean },
  ) {
    this.scene = scene;
    this.enemies = enemies;
    this.arena = arena;
    this.rng = new SeededRng(opts?.seed ?? 42);
    this.endless = opts?.endless ?? true;
    this.maxBudget = EnemyTuning.softCap;

    this.unsubs.push(eventBus.on(GameEvents.EnemyDeath, this.onKill));
    this.unsubs.push(
      eventBus.on(GameEvents.DraftOpen, () => {
        this.draftPaused = true;
      }),
    );
    this.unsubs.push(
      eventBus.on(GameEvents.DraftClose, () => {
        this.draftPaused = false;
      }),
    );
    this.unsubs.push(
      eventBus.on(GameEvents.BossIntro, () => {
        this.bossPaused = true;
      }),
    );
    this.unsubs.push(
      eventBus.on(GameEvents.BossIntroEnd, () => {
        this.bossPaused = false;
      }),
    );
  }

  private onKill = (): void => {
    this.totalKills += 1;
    this.killTimestamps.push(this.runMs);
  };

  setPaused(paused: boolean): void {
    this.paused = paused;
  }

  setEndless(endless: boolean): void {
    this.endless = endless;
  }

  setEliteChanceFn(fn: (tSec: number) => number): void {
    this.eliteChanceFn = fn;
  }

  setScaleFn(fn: (tSec: number) => { hp: number; damage: number }): void {
    this.scaleFn = fn;
  }

  reset(): void {
    this.runMs = 0;
    this.spawnAcc = 0;
    this.totalSpawned = 0;
    this.totalKills = 0;
    this.killTimestamps = [];
    this.lastWaveAt = -1;
    this.draftPaused = false;
    this.bossPaused = false;
    this.rng.reseed(42);
  }

  getStats(): SpawnerStats {
    const cutoff = this.runMs - 60_000;
    const killsLast60s = this.killTimestamps.filter((t) => t >= cutoff).length;
    return {
      runTimeSeconds: this.runMs / 1000,
      totalSpawned: this.totalSpawned,
      totalKills: this.totalKills,
      killsLast60s,
      endless: this.endless,
    };
  }

  /** Kills per minute telemetry (T134). */
  killsPerMinute(): number {
    const sec = this.runMs / 1000;
    if (sec < 1) return 0;
    return (this.totalKills / sec) * 60;
  }

  update(_time: number, delta: number, player: Player): void {
    if (this.paused || this.draftPaused || this.bossPaused) return;

    const dt = clampDelta(delta);
    this.runMs += dt;

    // Warmup grace (T135)
    if (this.runMs < this.warmupMs) return;

    const tSec = this.runMs / 1000;
    const wave = currentWave(tSec);
    this.maybeBurst(wave, player);

    const active = this.enemies.pool.getActiveCount();
    if (active >= this.maxBudget) return; // T131 / T142

    const cutoff30 = this.runMs - 30_000;
    const kills30 = this.killTimestamps.filter((t) => t >= cutoff30).length;
    const dir = directorMult({
      hpRatio: player.hp / Math.max(1, player.maxHp),
      killsLast30s: kills30,
      expectedKills30s: spawnRatePerSecond(tSec) * 30 * 0.5,
    });

    const rate =
      spawnRatePerSecond(tSec) * wave.spawnRateMult * densityFactor(tSec) * 0.85 * dir;
    this.spawnAcc += (rate * dt) / 1000;

    while (this.spawnAcc >= 1 && this.enemies.pool.getActiveCount() < this.maxBudget) {
      this.spawnAcc -= 1;
      this.spawnOne(player, tSec);
    }
  }

  private maybeBurst(wave: WaveEntry, player: Player): void {
    if (wave.atSeconds === this.lastWaveAt) return;
    if (wave.burstCount <= 0) {
      this.lastWaveAt = wave.atSeconds;
      return;
    }
    // Only fire burst when crossing into wave
    if (this.runMs / 1000 < wave.atSeconds) return;
    this.lastWaveAt = wave.atSeconds;
    for (let i = 0; i < wave.burstCount; i++) {
      if (this.enemies.pool.getActiveCount() >= this.maxBudget) break;
      const kind =
        wave.burstKinds[this.rng.int(0, Math.max(0, wave.burstKinds.length - 1))] ??
        'melee';
      this.spawnOne(player, this.runMs / 1000, kind);
    }
  }

  private spawnOne(player: Player, tSec: number, forced?: EnemyKind): void {
    const mix = typeMixByTime(tSec);
    const kind =
      forced ??
      pickWeighted(
        { melee: mix.melee, ranged: mix.ranged, blob: mix.blob },
        this.rng.next(),
      );

    const pos = this.pickSpawnOutsideCamera(player.x, player.y);
    if (!pos) return;

    // Elite chance rises (T319) — endless uses soft ramp
    const eliteRoll = this.eliteChanceFn
      ? this.eliteChanceFn(tSec)
      : Math.min(0.12, 0.02 + tSec / 600);
    const elite = this.rng.next() < eliteRoll;

    const e = this.enemies.spawn(pos.x, pos.y, kind, player.x, player.y, { elite });
    if (e) {
      this.totalSpawned += 1;
      if (this.endless && this.scaleFn) {
        const s = this.scaleFn(tSec);
        e.applyEndlessScale(s.hp, s.damage);
      }
    }
  }

  /** Ring outside camera view (T120), seeded angle (T132). */
  private pickSpawnOutsideCamera(
    playerX: number,
    playerY: number,
  ): { x: number; y: number } | null {
    const cam = this.scene.cameras.main;
    const margin = 80;
    const viewW = cam.width / cam.zoom;
    const viewH = cam.height / cam.zoom;
    const halfDiag = Math.hypot(viewW, viewH) / 2 + margin;
    const radius = halfDiag + 40 + this.rng.range(0, 60);
    const angle = this.rng.next() * Math.PI * 2;
    let x = playerX + Math.cos(angle) * radius;
    let y = playerY + Math.sin(angle) * radius;

    // Clamp into arena
    const pad = 40;
    x = Phaser.Math.Clamp(x, pad, this.arena.bounds.width - pad);
    y = Phaser.Math.Clamp(y, pad, this.arena.bounds.height - pad);

    // No spawn on player (T141)
    if (Math.hypot(x - playerX, y - playerY) < EnemyTuning.minSpawnDistanceFromPlayer) {
      return null;
    }

    // No spawn in obstacles (T133 / T313 puddles OK separately)
    if (this.arena.isPointBlocked(x, y, 28)) {
      return null;
    }

    return { x, y };
  }

  destroy(): void {
    for (const u of this.unsubs) u();
    this.unsubs.length = 0;
  }
}
