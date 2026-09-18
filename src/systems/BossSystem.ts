import * as Phaser from 'phaser';
import type { Player } from '@/entities/Player';
import type { DamageableTarget } from '@/systems/CombatSystem';
import type { EnemySystem } from '@/systems/EnemySystem';
import { eventBus, GameEvents } from '@/utils/EventBus';
import { clampDelta } from '@/utils/math';
import { aimVector } from '@/utils/targeting';
import { GameConfig } from '@/data/GameConfig';

export type BossKind = 'brute' | 'spitter' | 'splitter';

interface BossDef {
  kind: BossKind;
  name: string;
  color: number;
  size: number;
  hp: number;
  speed: number;
  contactDamage: number;
  immunities: string[];
  stunResist: number;
}

const BossDefs: Record<BossKind, BossDef> = {
  brute: {
    kind: 'brute',
    name: 'BRUTE',
    color: 0x7f1d1d,
    size: 72,
    hp: 800,
    speed: 55,
    contactDamage: 18,
    immunities: ['knockback'],
    stunResist: 0.8,
  },
  spitter: {
    kind: 'spitter',
    name: 'SPITTER',
    color: 0x9a3412,
    size: 56,
    hp: 520,
    speed: 70,
    contactDamage: 10,
    immunities: [],
    stunResist: 0.5,
  },
  splitter: {
    kind: 'splitter',
    name: 'SPLITTER',
    color: 0x86198f,
    size: 64,
    hp: 600,
    speed: 62,
    contactDamage: 12,
    immunities: [],
    stunResist: 0.4,
  },
};

type BossPhase = 'intro' | 'fight' | 'outro' | 'dead';

interface Telegraph {
  gfx: Phaser.GameObjects.Rectangle;
  ttlMs: number;
  kind: 'charge' | 'slam';
  dirX: number;
  dirY: number;
}

/**
 * Boss encounters (T246–T270) — Brute / Spitter / Splitter.
 */
export class BossSystem implements DamageableTarget {
  id = 'boss-none';
  x = 0;
  y = 0;
  alive = false;
  body!: Phaser.GameObjects.Rectangle;

  private def: BossDef = BossDefs.brute;
  private hp = 0;
  private maxHp = 0;
  private phase: BossPhase = 'dead';
  private phaseTimer = 0;
  private attackCd = 0;
  private enraged = false;
  private paused = false;
  private introLock = false;
  private telegraphs: Telegraph[] = [];
  private hpBarBg: Phaser.GameObjects.Rectangle | null = null;
  private hpBarFg: Phaser.GameObjects.Rectangle | null = null;
  private nameText: Phaser.GameObjects.Text | null = null;
  private spawnIndex = 0;
  private kills = 0;
  private nextSpawnAt = 90; // seconds (T246)
  private readonly scene: Phaser.Scene;
  private readonly enemies: EnemySystem;
  private chargeVel = { x: 0, y: 0 };
  private charging = false;
  private chargeLeft = 0;
  private splitDone = false;

  constructor(scene: Phaser.Scene, enemies: EnemySystem) {
    this.scene = scene;
    this.enemies = enemies;
    this.body = scene.add.rectangle(-9999, -9999, 72, 72, 0x7f1d1d).setVisible(false).setDepth(15);
  }

  setPaused(paused: boolean): void {
    this.paused = paused;
  }

  getBossKills(): number {
    return this.kills;
  }

  getHp(): number {
    return this.hp;
  }

  getMaxHp(): number {
    return this.maxHp;
  }

  getPhase(): BossPhase {
    return this.phase;
  }

  /** Debug / Gate 11. */
  forceSpawn(kind: BossKind, player: Player): void {
    this.spawn(kind, player.x + 280, player.y, player);
  }

  maybeSpawnByTime(runSeconds: number, player: Player): void {
    if (this.alive || this.phase === 'intro' || this.phase === 'outro') return;
    if (runSeconds < this.nextSpawnAt) return;
    const kinds: BossKind[] = ['brute', 'spitter', 'splitter'];
    const kind = kinds[this.spawnIndex % kinds.length]!;
    this.spawnIndex += 1;
    this.nextSpawnAt = runSeconds + 120; // endless recurring (T256)
    this.spawn(kind, player.x + 300, player.y, player);
  }

  private spawn(kind: BossKind, x: number, y: number, player: Player): void {
    this.def = BossDefs[kind];
    this.id = `boss-${kind}-${this.spawnIndex}`;
    this.maxHp = this.def.hp;
    this.hp = this.maxHp;
    this.alive = true;
    this.enraged = false;
    this.splitDone = false;
    this.phase = 'intro';
    this.phaseTimer = 1000; // intro lock 1s (T259)
    this.introLock = true;
    this.attackCd = 800;
    this.x = x;
    this.y = y;
    this.body
      .setPosition(x, y)
      .setSize(this.def.size, this.def.size)
      .setFillStyle(this.def.color)
      .setVisible(true)
      .setAlpha(1);

    this.ensureHud();
    this.nameText?.setText(this.def.name).setVisible(true);
    this.updateHpBar();

    // Camera punch (T253)
    this.scene.cameras.main.shake(220, 0.01);
    eventBus.emit(GameEvents.BossIntro, { kind });

    // Fodder clear config stub (T254) — cull distant enemies soft
    void player;
  }

  takeDamage(amount: number, _crit = false): number {
    if (!this.alive || this.phase === 'intro' || this.phase === 'outro') return 0;
    // HP never stuck fractional ghost (T269)
    const dealt = Math.max(0, Math.round(amount));
    if (dealt <= 0) return 0;
    this.hp = Math.max(0, this.hp - dealt);
    if (this.hp < 0.5) this.hp = 0;
    this.updateHpBar();

    if (!this.enraged && this.hp / this.maxHp <= 0.3) {
      this.enraged = true;
      this.body.setFillStyle(0xdc2626);
    }

    // Splitter splits once under 50% (T267)
    if (this.def.kind === 'splitter' && !this.splitDone && this.hp / this.maxHp <= 0.5) {
      this.splitDone = true;
      this.enemies.spawn(this.x + 40, this.y, 'melee', this.x, this.y, { elite: true });
      this.enemies.spawn(this.x - 40, this.y, 'melee', this.x, this.y, { elite: true });
    }

    if (this.hp <= 0) {
      this.beginOutro();
    }
    return dealt;
  }

  applySlow(_now: number): void {
    // Stun resistance — slows still apply lightly; bosses ignore full freeze often
  }

  applyStun(nowMs: number): void {
    void nowMs;
    // High stun resist: ignore most stuns (T258)
    if (this.def.stunResist >= 0.75) return;
  }

  applyBurn(_now: number): void {
    // allowed
  }

  private beginOutro(): void {
    this.phase = 'outro';
    this.phaseTimer = 800;
    this.alive = false;
    // Victory flash (T255, T260)
    this.body.setFillStyle(0xfbbf24);
    this.scene.cameras.main.flash(200, 250, 200, 50);
  }

  private finishKill(): void {
    this.phase = 'dead';
    this.kills += 1;
    this.body.setVisible(false).setPosition(-9999, -9999);
    this.hpBarBg?.setVisible(false);
    this.hpBarFg?.setVisible(false);
    this.nameText?.setVisible(false);
    this.clearTelegraphs();
    eventBus.emit(GameEvents.EnemyDeath, {
      id: this.id,
      x: this.x,
      y: this.y,
      boss: true,
      kind: this.def.kind,
      reward: { xp: 40, banknotes: 15 },
    });
    eventBus.emit(GameEvents.BossIntroEnd, { kind: this.def.kind, victory: true });
  }

  update(delta: number, player: Player, runSeconds: number): void {
    if (this.paused) return;
    const dt = clampDelta(delta);

    this.maybeSpawnByTime(runSeconds, player);

    if (this.phase === 'dead') return;

    this.tickTelegraphs(dt, player);

    if (this.phase === 'intro') {
      this.phaseTimer -= dt;
      this.body.setAlpha(0.5 + 0.5 * Math.sin(this.scene.time.now / 80));
      if (this.phaseTimer <= 0) {
        this.phase = 'fight';
        this.introLock = false;
        this.body.setAlpha(1);
        eventBus.emit(GameEvents.BossIntroEnd, { kind: this.def.kind });
      }
      return;
    }

    if (this.phase === 'outro') {
      this.phaseTimer -= dt;
      if (this.phaseTimer <= 0) this.finishKill();
      return;
    }

    if (!this.alive) return;

    // AI
    if (this.charging) {
      this.chargeLeft -= dt;
      this.x += this.chargeVel.x * (dt / 1000);
      this.y += this.chargeVel.y * (dt / 1000);
      this.body.setPosition(this.x, this.y);
      if (this.chargeLeft <= 0) this.charging = false;
    } else {
      const spd = this.def.speed * (this.enraged ? 1.45 : 1);
      const aim = aimVector(this.x, this.y, player.x, player.y);
      this.x += aim.x * spd * (dt / 1000);
      this.y += aim.y * spd * (dt / 1000);
      this.body.setPosition(this.x, this.y);
    }

    // Contact
    if (Math.hypot(this.x - player.x, this.y - player.y) < this.def.size * 0.55) {
      player.takeDamage(this.def.contactDamage * (dt / 500), this.id);
    }

    this.attackCd -= dt;
    if (this.attackCd <= 0 && !this.charging) {
      this.pickAttack(player);
    }

    this.updateHpBar();
  }

  private pickAttack(player: Player): void {
    const roll = this.scene.time.now % 3;
    if (this.def.kind === 'spitter' || roll === 1) {
      this.telegraphSlam(player);
    } else {
      this.telegraphCharge(player);
    }
    // Summon adds (T250)
    if (this.enraged || this.def.kind === 'splitter') {
      this.enemies.spawn(this.x + 90, this.y, 'melee', player.x, player.y);
    }
    this.attackCd = this.enraged ? 1400 : 2200;
  }

  private telegraphCharge(player: Player): void {
    const aim = aimVector(this.x, this.y, player.x, player.y);
    const gfx = this.scene.add
      .rectangle(
        this.x + aim.x * 80,
        this.y + aim.y * 80,
        40,
        120,
        0xfbbf24,
        0.35,
      )
      .setRotation(Math.atan2(aim.y, aim.x))
      .setDepth(6);
    this.telegraphs.push({
      gfx,
      ttlMs: 450,
      kind: 'charge',
      dirX: aim.x,
      dirY: aim.y,
    });
  }

  private telegraphSlam(player: Player): void {
    const gfx = this.scene.add
      .rectangle(player.x, player.y, 100, 100, 0xf97316, 0.3)
      .setDepth(6);
    this.telegraphs.push({
      gfx,
      ttlMs: 550,
      kind: 'slam',
      dirX: 0,
      dirY: 0,
    });
  }

  private tickTelegraphs(dt: number, player: Player): void {
    for (let i = this.telegraphs.length - 1; i >= 0; i--) {
      const t = this.telegraphs[i]!;
      t.ttlMs -= dt;
      if (t.ttlMs > 0) continue;
      // Resolve attack
      if (t.kind === 'charge') {
        this.charging = true;
        this.chargeLeft = 420;
        const spd = 520 * (this.enraged ? 1.3 : 1);
        this.chargeVel = { x: t.dirX * spd, y: t.dirY * spd };
      } else {
        // AoE slam at telegraph position
        const sx = t.gfx.x;
        const sy = t.gfx.y;
        if (Math.hypot(player.x - sx, player.y - sy) < 70) {
          player.takeDamage(22, this.id);
        }
        const flash = this.scene.add.circle(sx, sy, 70, 0xf97316, 0.5).setDepth(7);
        this.scene.tweens.add({
          targets: flash,
          alpha: 0,
          duration: 200,
          onComplete: () => flash.destroy(),
        });
        // Spitter pattern: also spawn a puddle-like ring (T266)
        if (this.def.kind === 'spitter') {
          this.enemies.spawn(sx, sy, 'ranged', player.x, player.y);
        }
      }
      t.gfx.destroy();
      this.telegraphs.splice(i, 1);
    }
  }

  private ensureHud(): void {
    if (!this.hpBarBg) {
      this.hpBarBg = this.scene.add
        .rectangle(GameConfig.logicalWidth / 2, 56, 360, 14, 0x2a2118)
        .setScrollFactor(0)
        .setDepth(2600);
      this.hpBarFg = this.scene.add
        .rectangle(GameConfig.logicalWidth / 2 - 180, 56, 360, 14, 0xa855f7)
        .setOrigin(0, 0.5)
        .setScrollFactor(0)
        .setDepth(2601);
      this.nameText = this.scene.add
        .text(GameConfig.logicalWidth / 2, 34, '', {
          fontFamily: 'monospace',
          fontSize: '16px',
          color: '#e9d5ff',
        })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(2602);
    }
    this.hpBarBg.setVisible(true);
    this.hpBarFg?.setVisible(true);
  }

  private updateHpBar(): void {
    if (!this.hpBarFg || !this.alive && this.phase !== 'outro') return;
    const ratio = this.maxHp > 0 ? this.hp / this.maxHp : 0;
    this.hpBarFg.width = 360 * Math.max(0, ratio);
  }

  private clearTelegraphs(): void {
    for (const t of this.telegraphs) t.gfx.destroy();
    this.telegraphs = [];
  }

  isIntroLocked(): boolean {
    return this.introLock;
  }

  destroy(): void {
    this.clearTelegraphs();
    this.body.destroy();
    this.hpBarBg?.destroy();
    this.hpBarFg?.destroy();
    this.nameText?.destroy();
  }
}

import { bossEnrageThreshold } from '@/utils/bossMath';

// re-export for callers that imported from BossSystem
export { bossEnrageThreshold };
