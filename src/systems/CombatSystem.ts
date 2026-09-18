import * as Phaser from 'phaser';
import { GameConfig } from '@/data/GameConfig';
import type { Player } from '@/entities/Player';
import { BulletPool, getBulletData } from '@/systems/BulletPool';
import { DamageNumbers } from '@/ui/DamageNumbers';
import { aimVector, type TargetPoint } from '@/utils/targeting';
import { clampDelta } from '@/utils/math';
import { juice } from '@/systems/JuiceController';
import { rng } from '@/utils/rng';
import { SpatialHash, findNearestHybrid } from '@/utils/spatialHash';
import { HARDEN } from '@/utils/harden';
import { loadSave } from '@/save/SaveManager';

export interface WeaponSlotDef {
  id: string;
  fireIntervalMs: number;
  damage: number;
  range: number;
  pierce: number;
  enabled: boolean;
}

export interface DamageableTarget {
  id: string;
  x: number;
  y: number;
  alive: boolean;
  body: Phaser.GameObjects.Rectangle;
  takeDamage(amount: number, crit?: boolean): number;
}

interface SlotRuntime {
  def: WeaponSlotDef;
  cooldownMs: number;
}

/**
 * Auto-aim multi-weapon combat.
 * Independent cooldowns per slot; pause freezes timers.
 */
export class CombatSystem {
  readonly bullets: BulletPool;
  readonly enemyBullets: BulletPool;
  private readonly slots: SlotRuntime[] = [];
  private readonly damageNumbers: DamageNumbers;
  private readonly spatial = new SpatialHash(128);
  private overlapBudget = 0;
  private weaponsEnabled = true;
  private paused = false;
  private readonly extraTargets: DamageableTarget[] = [];
  private targetProvider: (() => DamageableTarget[]) | null = null;
  private muzzleFlash: Phaser.GameObjects.Rectangle | null = null;

  private readonly scene: Phaser.Scene;
  private readonly player: Player;
  private readonly isOutsideKillPlane: (x: number, y: number) => boolean;
  /** Returns true if bullet hits a solid obstacle (may damage crates). */
  private readonly onBulletObstacle: (
    bullet: Phaser.GameObjects.Rectangle,
    damage: number,
  ) => boolean;

  constructor(
    scene: Phaser.Scene,
    player: Player,
    opts: {
      isOutsideKillPlane: (x: number, y: number) => boolean;
      onBulletObstacle: (
        bullet: Phaser.GameObjects.Rectangle,
        damage: number,
      ) => boolean;
    },
  ) {
    this.scene = scene;
    this.player = player;
    this.isOutsideKillPlane = opts.isOutsideKillPlane;
    this.onBulletObstacle = opts.onBulletObstacle;
    this.bullets = new BulletPool(scene);
    this.enemyBullets = new BulletPool(scene, 48);
    this.damageNumbers = new DamageNumbers(scene);

    this.slots.push({
      def: {
        id: 'basic_gun',
        fireIntervalMs: GameConfig.combat.baseFireIntervalMs,
        damage: GameConfig.combat.baseDamage,
        range: GameConfig.combat.baseRange,
        pierce: GameConfig.combat.defaultPierce,
        enabled: true,
      },
      cooldownMs: 0,
    });
    this.slots.push({
      def: {
        id: 'slot_2',
        fireIntervalMs: 400,
        damage: 8,
        range: 280,
        pierce: 0,
        enabled: false,
      },
      cooldownMs: 0,
    });
    this.slots.push({
      def: {
        id: 'slot_3',
        fireIntervalMs: 500,
        damage: 10,
        range: 300,
        pierce: 0,
        enabled: false,
      },
      cooldownMs: 0,
    });
  }

  setTargetProvider(provider: () => DamageableTarget[]): void {
    this.targetProvider = provider;
  }

  addTarget(target: DamageableTarget): void {
    this.extraTargets.push(target);
  }

  private collectTargets(): DamageableTarget[] {
    const fromProvider = this.targetProvider?.() ?? [];
    return [...fromProvider, ...this.extraTargets.filter((t) => t.alive)];
  }

  setPaused(paused: boolean): void {
    this.paused = paused;
    this.freezePool(this.bullets, paused);
    this.freezePool(this.enemyBullets, paused);
  }

  private freezePool(pool: BulletPool, paused: boolean): void {
    for (const obj of pool.physicsChildren) {
      const bullet = obj as Phaser.GameObjects.Rectangle;
      if (!bullet.active) continue;
      const body = bullet.body as Phaser.Physics.Arcade.Body | null;
      if (!body) continue;
      const key = bullet as Phaser.GameObjects.Rectangle & {
        _frozenVel?: { x: number; y: number };
      };
      if (paused) {
        key._frozenVel = { x: body.velocity.x, y: body.velocity.y };
        body.setVelocity(0, 0);
      } else if (key._frozenVel) {
        body.setVelocity(key._frozenVel.x, key._frozenVel.y);
        key._frozenVel = undefined;
      }
    }
  }

  setWeaponsEnabled(enabled: boolean): void {
    this.weaponsEnabled = enabled;
  }

  enableSlot(index: number): void {
    const slot = this.slots[index];
    if (slot) slot.def.enabled = true;
  }

  update(_time: number, delta: number): void {
    if (this.paused) return;

    const dt = clampDelta(delta);
    this.bullets.update(dt, this.isOutsideKillPlane);
    this.enemyBullets.update(dt, this.isOutsideKillPlane);

    if (!this.weaponsEnabled || this.player.flags.dead || this.player.flags.draftLocked) {
      return;
    }

    const meta = this.readMeta();
    const targets = this.collectTargets();
    const points: TargetPoint[] = targets.map((t) => ({
      id: t.id,
      x: t.x,
      y: t.y,
      alive: t.alive,
    }));

    for (let i = 0; i < this.slots.length; i++) {
      const slot = this.slots[i]!;
      if (!slot.def.enabled) continue;

      slot.cooldownMs = Math.max(0, slot.cooldownMs - dt);
      if (slot.cooldownMs > 0) continue;

      const range = slot.def.range * meta.rangeMult;
      const nearest = findNearestHybrid(
        this.player.x,
        this.player.y,
        range,
        points,
        this.spatial,
        24,
      );
      if (!nearest) continue;

      const aim = aimVector(this.player.x, this.player.y, nearest.x, nearest.y);
      if (aim.x === 0 && aim.y === 0) continue;

      const speed = GameConfig.combat.bulletSpeed;
      const damage = Math.round(slot.def.damage * meta.damageMult);
      const fired = this.bullets.spawn({
        x: this.player.x,
        y: this.player.y,
        vx: aim.x * speed,
        vy: aim.y * speed,
        damage,
        pierce: slot.def.pierce,
        weaponSlot: i,
        owner: 'player',
      });

      if (fired) {
        const interval = slot.def.fireIntervalMs / Math.max(0.05, meta.atkSpeedMult);
        slot.cooldownMs = interval;
        this.flashMuzzle(this.player.x, this.player.y, aim.x, aim.y);
        this.maybeShake();
      }
    }
  }

  private runMult = { atkSpeedMult: 1, damageMult: 1, rangeMult: 1 };

  setRunMultipliers(m: {
    atkSpeedMult: number;
    damageMult: number;
    rangeMult: number;
  }): void {
    this.runMult = m;
  }

  private readMeta(): { atkSpeedMult: number; damageMult: number; rangeMult: number } {
    // Hub meta (upgrades/gear/hero) is baked into runMult by GameScene.applyBuildToSystems
    return {
      atkSpeedMult: GameConfig.meta.atkSpeedMult * this.runMult.atkSpeedMult,
      damageMult: GameConfig.meta.damageMult * this.runMult.damageMult,
      rangeMult: GameConfig.meta.rangeMult * this.runMult.rangeMult,
    };
  }

  resolveHits(): void {
    if (this.paused) return;

    const targets = this.collectTargets();
    this.overlapBudget = 0;
    const perf = loadSave().settings.performanceMode;
    const budget = perf ? HARDEN.overlapBudgetPerFrame / 2 : HARDEN.overlapBudgetPerFrame;

    for (const bulletObj of this.bullets.physicsChildren) {
      if (this.overlapBudget >= budget) break;
      const bullet = bulletObj as Phaser.GameObjects.Rectangle;
      if (!bullet.active) continue;
      const data = getBulletData(bullet);
      if (!data || data.owner !== 'player') continue;

      if (this.onBulletObstacle(bullet, data.damage)) {
        this.bullets.release(bullet);
        continue;
      }

      for (const target of targets) {
        this.overlapBudget += 1;
        if (this.overlapBudget >= budget) break;
        if (!target.alive) continue;
        if (data.hitIds.has(target.id)) continue;
        if (!this.rectsOverlap(bullet, target.body)) continue;

        const crit = rng.next() < GameConfig.combat.critChance;
        const dmg = crit
          ? Math.round(data.damage * GameConfig.combat.critMult)
          : data.damage;
        const dealt = target.takeDamage(dmg, crit);
        if (dealt > 0) {
          this.damageNumbers.spawn(target.x, target.y, dealt, crit);
          if (crit || dealt >= 40) juice.pulseHitstop(this.scene, crit ? 45 : 28);
        }
        data.hitIds.add(target.id);

        if (data.pierceLeft <= 0) {
          this.bullets.release(bullet);
          break;
        }
        data.pierceLeft -= 1;
      }
    }

    // Enemy bullets vs player (friendly fire off for player bullets already)
    if (!this.player.flags.dead) {
      for (const bulletObj of this.enemyBullets.physicsChildren) {
        const bullet = bulletObj as Phaser.GameObjects.Rectangle;
        if (!bullet.active) continue;
        const data = getBulletData(bullet);
        if (!data || data.owner !== 'enemy') continue;
        if (this.onBulletObstacle(bullet, data.damage)) {
          this.enemyBullets.release(bullet);
          continue;
        }
        if (this.rectsOverlap(bullet, this.player.body)) {
          this.player.takeDamage(data.damage);
          this.enemyBullets.release(bullet);
        }
      }
    }
  }

  private rectsOverlap(
    a: Phaser.GameObjects.Rectangle,
    b: Phaser.GameObjects.Rectangle,
  ): boolean {
    return (
      Math.abs(a.x - b.x) * 2 < a.width + b.width &&
      Math.abs(a.y - b.y) * 2 < a.height + b.height
    );
  }

  private flashMuzzle(x: number, y: number, dirX: number, dirY: number): void {
    const ox = x + dirX * 22;
    const oy = y + dirY * 22;
    if (!this.muzzleFlash) {
      this.muzzleFlash = this.scene.add.rectangle(ox, oy, 14, 10, 0xfef08a).setDepth(21);
    } else {
      this.muzzleFlash.setPosition(ox, oy).setVisible(true).setAlpha(1);
    }
    this.scene.tweens.killTweensOf(this.muzzleFlash);
    this.scene.tweens.add({
      targets: this.muzzleFlash,
      alpha: 0,
      duration: GameConfig.combat.muzzleFlashMs,
      onComplete: () => this.muzzleFlash?.setVisible(false),
    });
  }

  private maybeShake(): void {
    juice.maybeShake(this.scene);
  }

  getActiveBulletCount(): number {
    return this.bullets.getActiveCount() + this.enemyBullets.getActiveCount();
  }

  destroy(): void {
    this.bullets.destroy();
    this.enemyBullets.destroy();
    this.muzzleFlash?.destroy();
    this.extraTargets.length = 0;
  }
}
