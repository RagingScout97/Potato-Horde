import * as Phaser from 'phaser';
import { EnemyTuning, type EnemyKind } from '@/data/enemies';
import type { Enemy } from '@/entities/Enemy';
import type { Player } from '@/entities/Player';
import { EnemyPool } from '@/systems/EnemyPool';
import type { ArenaSystem } from '@/systems/ArenaSystem';
import type { BulletPool } from '@/systems/BulletPool';
import { canContactDamage } from '@/utils/combatMath';
import { clampDelta } from '@/utils/math';
import { aimVector } from '@/utils/targeting';
import { eventBus, GameEvents } from '@/utils/EventBus';
import { isFarOffscreen, isFinitePos, sanitizePos } from '@/utils/harden';
import { loadSave } from '@/save/SaveManager';

/**
 * Enemy AI: chase, separation, ranged fire, contact DPS (Phase 5).
 */
export class EnemySystem {
  readonly pool: EnemyPool;
  private paused = false;
  private readonly scene: Phaser.Scene;
  private readonly enemyBullets: BulletPool;
  private arena: ArenaSystem | null = null;
  private nowMs = 0;

  constructor(scene: Phaser.Scene, enemyBullets: BulletPool) {
    this.scene = scene;
    this.enemyBullets = enemyBullets;
    this.pool = new EnemyPool(scene);
  }

  setArena(arena: ArenaSystem): void {
    this.arena = arena;
  }

  setPaused(paused: boolean): void {
    this.paused = paused;
  }

  spawn(
    x: number,
    y: number,
    kind: EnemyKind,
    playerX: number,
    playerY: number,
    opts?: { elite?: boolean },
  ): Enemy | null {
    // No spawn inside player (T109)
    if (
      Math.hypot(x - playerX, y - playerY) < EnemyTuning.minSpawnDistanceFromPlayer
    ) {
      const ang = Math.atan2(y - playerY, x - playerX) || 0;
      x = playerX + Math.cos(ang) * EnemyTuning.minSpawnDistanceFromPlayer;
      y = playerY + Math.sin(ang) * EnemyTuning.minSpawnDistanceFromPlayer;
    }
    const e = this.pool.spawn(x, y, kind, opts);
    if (e) e.faceToward(playerX, playerY);
    return e;
  }

  /** Debug: spawn N melee around player (Gate 5). */
  spawnRing(
    count: number,
    kind: EnemyKind,
    playerX: number,
    playerY: number,
    radius = 220,
    elite = false,
  ): void {
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      this.spawn(
        playerX + Math.cos(a) * radius,
        playerY + Math.sin(a) * radius,
        kind,
        playerX,
        playerY,
        { elite },
      );
    }
  }

  update(time: number, delta: number, player: Player): void {
    if (this.paused) return;
    const dt = clampDelta(delta);
    this.nowMs = time;

    const actives = this.pool.getActive();
    const perf = loadSave().settings.performanceMode;
    // Separation + chase
    for (const e of actives) {
      if (!e.alive) continue;
      if (!isFinitePos(e.x, e.y)) {
        const p = sanitizePos(e.x, e.y, player.x, player.y);
        e.body.setPosition(p.x, p.y);
      }
      // Offscreen cull AI cost (T462) — still move toward player simply
      if (perf && isFarOffscreen(e.x, e.y, player.x, player.y, 1100)) {
        const ang = Math.atan2(player.y - e.y, player.x - e.x);
        this.applyVelocity(e, Math.cos(ang) * e.def.speed, Math.sin(ang) * e.def.speed);
        continue;
      }
      this.tickBurn(e, dt);
      if (time < e.status.stunUntil) {
        this.applyVelocity(e, 0, 0);
        continue;
      }

      if (time < e.knockbackUntil) {
        this.applyVelocity(e, e.vx, e.vy);
        e.syncHpBar();
        continue;
      }

      let speed = e.def.speed;
      if (time < e.status.slowUntil) speed *= EnemyTuning.status.slowMult;

      // Aggro player only (T112)
      const toPlayerX = player.x - e.x;
      const toPlayerY = player.y - e.y;
      const dist = Math.hypot(toPlayerX, toPlayerY) || 1;

      let desireX = toPlayerX / dist;
      let desireY = toPlayerY / dist;

      // Ranged: keep distance when in fire range
      const ranged = e.def.ranged;
      if (ranged && dist < ranged.range * 0.55) {
        desireX = -desireX;
        desireY = -desireY;
      } else if (ranged && dist < ranged.range) {
        desireX *= 0.15;
        desireY *= 0.15;
      }

      // Separation (T091)
      let sepX = 0;
      let sepY = 0;
      for (const o of actives) {
        if (o === e || !o.alive) continue;
        const dx = e.x - o.x;
        const dy = e.y - o.y;
        const d = Math.hypot(dx, dy);
        if (d > 0 && d < EnemyTuning.separationRadius) {
          sepX += dx / d;
          sepY += dy / d;
        }
      }
      const sepLen = Math.hypot(sepX, sepY);
      if (sepLen > 0) {
        desireX += (sepX / sepLen) * 0.65;
        desireY += (sepY / sepLen) * 0.65;
      }

      const dLen = Math.hypot(desireX, desireY) || 1;
      e.vx = (desireX / dLen) * speed;
      e.vy = (desireY / dLen) * speed;
      this.applyVelocity(e, e.vx, e.vy);
      // Slide on walls (T298) + stuck unstick (T310)
      if (this.arena) {
        this.arena.collideWithObstacles(e.body);
        const stuck = this.arena.unstick(e.x, e.y, e.def.size);
        if (stuck.x !== e.x || stuck.y !== e.y) {
          e.body.setPosition(stuck.x, stuck.y);
          const pb = e.body.body as Phaser.Physics.Arcade.Body | null;
          pb?.reset(stuck.x, stuck.y);
        }
      }
      e.faceToward(player.x, player.y);
      e.syncHpBar();

      // Contact damage (T094)
      if (!player.flags.dead && !player.flags.invulnerable) {
        const touchR = e.def.size * 0.5 + 14;
        if (dist < touchR && canContactDamage(time, e.lastContactAt, e.def.contactCooldownMs)) {
          e.lastContactAt = time;
          const dealt = player.takeDamage(e.contactDamage);
          if (dealt > 0) {
            const kb = aimVector(player.x, player.y, e.x, e.y);
            e.applyKnockback(kb.x, kb.y, time);
          }
        }
      }

      // Ranged fire (T099–T100)
      if (ranged) {
        e.rangedCooldownMs = Math.max(0, e.rangedCooldownMs - dt);
        if (e.rangedCooldownMs <= 0 && dist <= ranged.range) {
          const aim = aimVector(e.x, e.y, player.x, player.y);
          this.enemyBullets.spawn({
            x: e.x,
            y: e.y,
            vx: aim.x * ranged.bulletSpeed,
            vy: aim.y * ranged.bulletSpeed,
            damage: Math.round(ranged.bulletDamage * e.damageMult),
            pierce: 0,
            owner: 'enemy',
            color: ranged.bulletColor,
          });
          e.rangedCooldownMs = ranged.fireIntervalMs;
        }
      }

      // Optional far despawn (T098)
      if (dist > EnemyTuning.farDespawnDistance) {
        this.pool.release(e);
      }
    }

    this.pool.sweepDead();
    void this.scene;
  }

  private tickBurn(e: Enemy, dt: number): void {
    if (this.nowMs >= e.status.burnUntil) return;
    e.status.burnAcc += dt;
    if (e.status.burnAcc >= EnemyTuning.status.burnTickMs) {
      e.status.burnAcc = 0;
      e.takeDamage(EnemyTuning.status.burnDps);
    }
  }

  private applyVelocity(e: Enemy, vx: number, vy: number): void {
    const pb = e.body.body as Phaser.Physics.Arcade.Body | null;
    if (pb) pb.setVelocity(vx, vy);
  }

  /** Targeting list for auto-aim. */
  getTargetPoints(): { id: string; x: number; y: number; alive: boolean }[] {
    return this.pool.getActive().map((e) => ({
      id: e.id,
      x: e.x,
      y: e.y,
      alive: e.alive,
    }));
  }

  getEnemyById(id: string): Enemy | undefined {
    return this.pool.getActive().find((e) => e.id === id);
  }

  destroy(): void {
    this.pool.destroy();
  }
}

// Re-export death XP wiring helper
export function wireEnemyDeathXp(): () => void {
  return eventBus.on(GameEvents.EnemyDeath, (payload) => {
    const p = payload as { x: number; y: number; xp: number } | undefined;
    if (!p) return;
    eventBus.emit(GameEvents.XpDrop, { x: p.x, y: p.y, amount: p.xp });
  });
}
