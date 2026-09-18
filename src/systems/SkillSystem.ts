import * as Phaser from 'phaser';
import {
  SkillBalance,
  assertWeaponBehavior,
  getSkillOrThrow,
  type SkillId,
  type WeaponBehaviorId,
} from '@/data/skills';
import { activeBehaviorFor } from '@/data/evolutions';
import type { Player } from '@/entities/Player';
import type { DamageableTarget } from '@/systems/CombatSystem';
import { BulletPool, getBulletData } from '@/systems/BulletPool';
import type { RunBuildState } from '@/systems/RunBuild';
import { getSkillLevel } from '@/systems/RunBuild';
import { DamageNumbers } from '@/ui/DamageNumbers';
import { aimVector, findNearestInRange, type TargetPoint } from '@/utils/targeting';
import { clampDelta } from '@/utils/math';
import { rng } from '@/utils/rng';
import { GameConfig } from '@/data/GameConfig';

interface TrapRuntime {
  x: number;
  y: number;
  radius: number;
  ttlMs: number;
  tickMs: number;
  tickAcc: number;
  damage: number;
  gfx: Phaser.GameObjects.Arc;
}

interface BoomerangExtra {
  homeX: number;
  homeY: number;
  returning: boolean;
  skillId: SkillId;
}

interface OrbitBlade {
  angle: number;
  gfx: Phaser.GameObjects.Rectangle;
  hitAcc: Map<string, number>;
}

/**
 * Combat skill runtime (T176–T185, T191–T193).
 * Every weapon skill must have a handler — pick asserts registration.
 */
export class SkillSystem {
  private readonly cooldowns = new Map<string, number>();
  private traps: TrapRuntime[] = [];
  private paused = false;
  private weaponsEnabled = true;
  private fireRingGfx: Phaser.GameObjects.Arc | null = null;
  private droneGfx: Phaser.GameObjects.Rectangle | null = null;
  private droneX = 0;
  private droneY = 0;
  private orbitBlades: OrbitBlade[] = [];
  private readonly boomExtra = new WeakMap<Phaser.GameObjects.Rectangle, BoomerangExtra>();
  private readonly damageNumbers: DamageNumbers;
  private readonly handlers: Set<WeaponBehaviorId | string>;

  private readonly scene: Phaser.Scene;
  private readonly player: Player;
  private readonly bullets: BulletPool;
  private readonly isOutsideKillPlane: (x: number, y: number) => boolean;
  private targetProvider: (() => DamageableTarget[]) | null = null;
  private build: RunBuildState | null = null;
  private critChance = 0.05 as number;
  private damageMult = 1;
  private metaDamageMult = 1;
  private atkSpeedMult = 1;
  private rangeMult = 1;
  private cdrMult = 1;
  private lastFired = new Map<string, number>();

  constructor(
    scene: Phaser.Scene,
    player: Player,
    bullets: BulletPool,
    opts: { isOutsideKillPlane: (x: number, y: number) => boolean },
  ) {
    this.scene = scene;
    this.player = player;
    this.bullets = bullets;
    this.isOutsideKillPlane = opts.isOutsideKillPlane;
    void this.isOutsideKillPlane;
    this.damageNumbers = new DamageNumbers(scene);
    this.handlers = new Set([
      'dual_pistol',
      'shotgun',
      'boomerang',
      'energy_trap',
      'shuriken',
      'bowling',
      'lightning',
      'fire_ring',
      'freeze_nova',
      'drone',
      'dual_storm',
      'scatter_cannon',
      'orbit_blade',
      'death_trap',
      'chain_thunder',
    ]);
  }

  hasHandler = (b: WeaponBehaviorId | string): boolean => this.handlers.has(b);

  setTargetProvider(provider: () => DamageableTarget[]): void {
    this.targetProvider = provider;
  }

  setPaused(paused: boolean): void {
    this.paused = paused;
  }

  setWeaponsEnabled(enabled: boolean): void {
    this.weaponsEnabled = enabled;
  }

  syncBuild(build: RunBuildState): void {
    this.build = build;
    this.damageMult = build.damageMult;
    this.atkSpeedMult = build.atkSpeedMult;
    this.rangeMult = build.rangeMult;
    this.cdrMult = 1 + build.cdrBonus;
    this.critChance = GameConfig.combat.critChance + build.critBonus;

    // Ensure every owned weapon is registered (T192–T193)
    for (const s of build.skills) {
      const def = getSkillOrThrow(s.id);
      if (def.behavior) {
        assertWeaponBehavior(s.id, this.hasHandler);
      }
    }

    this.ensureOrbitBlades(build);
    this.ensureFireRing(build);
    this.ensureDrone(build);
  }

  /** Hub meta damage multiplier (gear / upgrades / hero). */
  setMetaDamageMult(mult: number): void {
    this.metaDamageMult = Math.max(0.25, mult);
  }

  /** Debug force-pick (Gate 8 / S11). */
  forceSkill(id: SkillId): void {
    if (!this.build) throw new Error('SkillSystem: no build');
    assertWeaponBehavior(id, this.hasHandler);
  }

  /** Visible activity counters for playtests. */
  getDebugCounts(): {
    traps: number;
    lastFired: Record<string, number>;
    orbitBlades: number;
    hasDrone: boolean;
    hasFireRing: boolean;
  } {
    const lastFired: Record<string, number> = {};
    for (const [k, v] of this.lastFired) lastFired[k] = v;
    return {
      traps: this.traps.length,
      lastFired,
      orbitBlades: this.orbitBlades.length,
      hasDrone: !!this.droneGfx?.visible,
      hasFireRing: !!this.fireRingGfx?.visible,
    };
  }

  update(_time: number, delta: number): void {
    if (this.paused) return;
    const dt = clampDelta(delta);

    this.updateBoomerangs(dt);
    this.updateTraps(dt);
    this.updateOrbitBlades(dt);
    this.updateDroneFollow(dt);

    if (!this.weaponsEnabled || this.player.flags.dead || this.player.flags.draftLocked) {
      return;
    }
    if (!this.build) return;

    const targets = this.collectTargets();
    const points: TargetPoint[] = targets.map((t) => ({
      id: t.id,
      x: t.x,
      y: t.y,
      alive: t.alive,
    }));

    for (const stack of this.build.skills) {
      const def = getSkillOrThrow(stack.id);
      if (!def.behavior) continue;
      const behavior = activeBehaviorFor(this.build, stack.id);
      if (!behavior) continue;
      if (!this.handlers.has(behavior)) {
        console.error(`Skill silent-fail blocked: ${stack.id}`);
        continue;
      }

      const cdKey = stack.id;
      const left = (this.cooldowns.get(cdKey) ?? 0) - dt;
      this.cooldowns.set(cdKey, Math.max(0, left));
      if (left > 0) continue;

      const lvl = stack.level;
      const fired = this.fireBehavior(behavior, lvl, points, targets);
      if (fired) {
        const interval = this.intervalFor(behavior, lvl);
        this.cooldowns.set(cdKey, interval);
        this.lastFired.set(behavior, this.scene.time.now);
      }
    }
  }

  private intervalFor(behavior: string, level: number): number {
    const base = this.baseInterval(behavior);
    const levelMult = 1 / (1 + 0.06 * (level - 1));
    return (base * levelMult) / Math.max(0.05, this.atkSpeedMult * this.cdrMult);
  }

  private baseInterval(behavior: string): number {
    const bal = SkillBalance as Record<string, { intervalMs?: number }>;
    return bal[behavior]?.intervalMs ?? 500;
  }

  private fireBehavior(
    behavior: string,
    level: number,
    points: TargetPoint[],
    targets: DamageableTarget[],
  ): boolean {
    switch (behavior) {
      case 'dual_pistol':
        return this.fireDualPistol(level, points, false);
      case 'dual_storm':
        return this.fireDualPistol(level, points, true);
      case 'shotgun':
        return this.fireShotgun(level, points, false);
      case 'scatter_cannon':
        return this.fireShotgun(level, points, true);
      case 'boomerang':
        return this.fireBoomerang(level, points);
      case 'energy_trap':
        return this.fireTrap(level, points, false);
      case 'death_trap':
        return this.fireTrap(level, points, true);
      case 'shuriken':
        return this.fireShuriken(level, points);
      case 'bowling':
        return this.fireBowling(level, points);
      case 'lightning':
        return this.fireLightning(level, points, targets, false);
      case 'chain_thunder':
        return this.fireLightning(level, points, targets, true);
      case 'fire_ring':
        return this.tickFireRing(level, targets);
      case 'freeze_nova':
        return this.fireFreezeNova(level, targets);
      case 'drone':
        return this.fireDrone(level, points);
      case 'orbit_blade':
        return true; // continuous in updateOrbitBlades
      default:
        console.error(`Unhandled skill behavior: ${behavior}`);
        return false;
    }
  }

  private dmg(base: number, level: number): number {
    return Math.round(base * (1 + 0.12 * (level - 1)) * this.damageMult * this.metaDamageMult);
  }

  private rangeOf(base: number): number {
    return base * this.rangeMult;
  }

  private fireDualPistol(level: number, points: TargetPoint[], storm: boolean): boolean {
    const bal = storm ? SkillBalance.dual_storm : SkillBalance.dual_pistol;
    const nearest = findNearestInRange(
      this.player.x,
      this.player.y,
      this.rangeOf(bal.range),
      points,
    );
    if (!nearest) return false;
    const aim = aimVector(this.player.x, this.player.y, nearest.x, nearest.y);
    const perpX = -aim.y;
    const perpY = aim.x;
    const count = storm ? SkillBalance.dual_storm.pellets : 2;
    const spread = storm ? 14 : SkillBalance.dual_pistol.spreadPx;
    let any = false;
    for (let i = 0; i < count; i++) {
      const o = (i - (count - 1) / 2) * spread;
      const fired = this.bullets.spawn({
        x: this.player.x + perpX * o,
        y: this.player.y + perpY * o,
        vx: aim.x * GameConfig.combat.bulletSpeed,
        vy: aim.y * GameConfig.combat.bulletSpeed,
        damage: this.dmg(bal.damage, level),
        color: bal.color,
        pierce: storm ? 1 : 0,
      });
      if (fired) any = true;
    }
    return any;
  }

  private fireShotgun(level: number, points: TargetPoint[], evo: boolean): boolean {
    const bal = evo ? SkillBalance.scatter_cannon : SkillBalance.shotgun;
    const nearest = findNearestInRange(
      this.player.x,
      this.player.y,
      this.rangeOf(bal.range),
      points,
    );
    if (!nearest) return false;
    const baseAng = Math.atan2(nearest.y - this.player.y, nearest.x - this.player.x);
    const pellets = bal.pellets + Math.floor((level - 1) / 2);
    let any = false;
    for (let i = 0; i < pellets; i++) {
      const t = pellets === 1 ? 0 : i / (pellets - 1) - 0.5;
      const ang = baseAng + t * bal.coneRad;
      const fired = this.bullets.spawn({
        x: this.player.x,
        y: this.player.y,
        vx: Math.cos(ang) * GameConfig.combat.bulletSpeed * 0.9,
        vy: Math.sin(ang) * GameConfig.combat.bulletSpeed * 0.9,
        damage: this.dmg(bal.damage, level),
        color: bal.color,
        lifetimeMs: 500,
        maxDistance: bal.range * 1.2,
      });
      if (fired) any = true;
    }
    return any;
  }

  private fireBoomerang(level: number, points: TargetPoint[]): boolean {
    const bal = SkillBalance.boomerang;
    const nearest = findNearestInRange(
      this.player.x,
      this.player.y,
      this.rangeOf(bal.range),
      points,
    );
    if (!nearest) return false;
    const aim = aimVector(this.player.x, this.player.y, nearest.x, nearest.y);
    const fired = this.bullets.spawn({
      x: this.player.x,
      y: this.player.y,
      vx: aim.x * bal.speed,
      vy: aim.y * bal.speed,
      damage: this.dmg(bal.damage, level),
      color: bal.color,
      pierce: 99,
      lifetimeMs: 2500,
      maxDistance: 9999,
    });
    if (!fired) return false;
    this.boomExtra.set(fired, {
      homeX: this.player.x,
      homeY: this.player.y,
      returning: false,
      skillId: 'boomerang',
    });
    return true;
  }

  private updateBoomerangs(dt: number): void {
    void dt;
    for (const obj of this.bullets.physicsChildren) {
      const bullet = obj as Phaser.GameObjects.Rectangle;
      if (!bullet.active) continue;
      const extra = this.boomExtra.get(bullet);
      if (!extra) continue;
      const body = bullet.body as Phaser.Physics.Arcade.Body;
      const data = getBulletData(bullet);
      if (!data) continue;

      if (!extra.returning) {
        const dist = Math.hypot(bullet.x - extra.homeX, bullet.y - extra.homeY);
        if (dist > SkillBalance.boomerang.range * this.rangeMult * 0.95) {
          extra.returning = true;
          data.hitIds.clear();
        }
      } else {
        extra.homeX = this.player.x;
        extra.homeY = this.player.y;
        const aim = aimVector(bullet.x, bullet.y, this.player.x, this.player.y);
        const spd = SkillBalance.boomerang.speed * 1.15;
        body.setVelocity(aim.x * spd, aim.y * spd);
        if (Math.hypot(bullet.x - this.player.x, bullet.y - this.player.y) < 28) {
          this.boomExtra.delete(bullet);
          this.bullets.release(bullet);
        }
      }
    }
  }

  private fireTrap(level: number, points: TargetPoint[], evo: boolean): boolean {
    const bal = evo ? SkillBalance.death_trap : SkillBalance.energy_trap;
    const nearest = findNearestInRange(
      this.player.x,
      this.player.y,
      this.rangeOf(bal.throwRange),
      points,
    );
    const tx = nearest ? nearest.x : this.player.x + 80;
    const ty = nearest ? nearest.y : this.player.y;
    const radius = bal.radius * (1 + 0.08 * (level - 1));
    const gfx = this.scene.add.circle(tx, ty, radius, bal.color, 0.35).setDepth(4);
    this.traps.push({
      x: tx,
      y: ty,
      radius,
      ttlMs: bal.ttlMs,
      tickMs: bal.tickMs,
      tickAcc: 0,
      damage: this.dmg(bal.damage, level),
      gfx,
    });
    return true;
  }

  private updateTraps(dt: number): void {
    const targets = this.collectTargets();
    for (let i = this.traps.length - 1; i >= 0; i--) {
      const t = this.traps[i]!;
      t.ttlMs -= dt;
      if (t.ttlMs <= 0) {
        t.gfx.destroy();
        this.traps.splice(i, 1);
        continue;
      }
      t.gfx.setAlpha(0.2 + 0.25 * Math.min(1, t.ttlMs / 1000));
      t.tickAcc += dt;
      if (t.tickAcc < t.tickMs) continue;
      t.tickAcc = 0;
      for (const target of targets) {
        if (!target.alive) continue;
        if (Math.hypot(target.x - t.x, target.y - t.y) <= t.radius) {
          this.dealTo(target, t.damage);
        }
      }
    }
  }

  private fireShuriken(level: number, points: TargetPoint[]): boolean {
    const bal = SkillBalance.shuriken;
    const nearest = findNearestInRange(
      this.player.x,
      this.player.y,
      this.rangeOf(bal.range),
      points,
    );
    if (!nearest) return false;
    const aim = aimVector(this.player.x, this.player.y, nearest.x, nearest.y);
    return !!this.bullets.spawn({
      x: this.player.x,
      y: this.player.y,
      vx: aim.x * bal.seekSpeed,
      vy: aim.y * bal.seekSpeed,
      damage: this.dmg(bal.damage, level),
      color: bal.color,
      pierce: 1,
      lifetimeMs: 1200,
    });
  }

  private fireBowling(level: number, points: TargetPoint[]): boolean {
    const bal = SkillBalance.bowling;
    const nearest = findNearestInRange(
      this.player.x,
      this.player.y,
      this.rangeOf(bal.range),
      points,
    );
    if (!nearest) return false;
    const aim = aimVector(this.player.x, this.player.y, nearest.x, nearest.y);
    const b = this.bullets.spawn({
      x: this.player.x,
      y: this.player.y,
      vx: aim.x * bal.speed,
      vy: aim.y * bal.speed,
      damage: this.dmg(bal.damage, level),
      color: bal.color,
      pierce: bal.pierce + level,
      lifetimeMs: 2200,
      maxDistance: bal.range * 1.5,
    });
    if (b) b.setSize(16, 16);
    return !!b;
  }

  private fireLightning(
    level: number,
    points: TargetPoint[],
    targets: DamageableTarget[],
    evo: boolean,
  ): boolean {
    const bal = evo ? SkillBalance.chain_thunder : SkillBalance.lightning;
    const nearest = findNearestInRange(
      this.player.x,
      this.player.y,
      this.rangeOf(bal.range),
      points,
    );
    if (!nearest) return false;

    const hit: DamageableTarget[] = [];
    let cur = targets.find((t) => t.id === nearest.id);
    if (!cur) return false;
    hit.push(cur);

    const chains = bal.chains + Math.floor((level - 1) / 2);
    for (let c = 0; c < chains; c++) {
      const last = hit[hit.length - 1]!;
      let best: DamageableTarget | null = null;
      let bestD = Infinity;
      for (const t of targets) {
        if (!t.alive || hit.includes(t)) continue;
        const d = Math.hypot(t.x - last.x, t.y - last.y);
        if (d < bal.chainRange && d < bestD) {
          bestD = d;
          best = t;
        }
      }
      if (!best) break;
      hit.push(best);
    }

    const dmg = this.dmg(bal.damage, level);
    let prevX = this.player.x;
    let prevY = this.player.y;
    for (const t of hit) {
      this.drawBolt(prevX, prevY, t.x, t.y, bal.color);
      this.dealTo(t, dmg);
      prevX = t.x;
      prevY = t.y;
    }
    return true;
  }

  private drawBolt(x1: number, y1: number, x2: number, y2: number, color: number): void {
    const g = this.scene.add.graphics().setDepth(25);
    g.lineStyle(3, color, 0.95);
    g.lineBetween(x1, y1, x2, y2);
    this.scene.tweens.add({
      targets: g,
      alpha: 0,
      duration: 120,
      onComplete: () => g.destroy(),
    });
  }

  private tickFireRing(level: number, targets: DamageableTarget[]): boolean {
    const bal = SkillBalance.fire_ring;
    const r = bal.radius * (1 + 0.1 * (level - 1));
    if (this.fireRingGfx) {
      this.fireRingGfx.setPosition(this.player.x, this.player.y).setRadius(r).setVisible(true);
    }
    const dmg = this.dmg(bal.damage, level);
    const now = this.scene.time.now;
    for (const t of targets) {
      if (!t.alive) continue;
      if (Math.hypot(t.x - this.player.x, t.y - this.player.y) <= r) {
        this.dealTo(t, dmg);
        // Apply burn if enemy supports it
        const maybe = t as DamageableTarget & { applyBurn?: (n: number) => void };
        maybe.applyBurn?.(now);
      }
    }
    return true; // always "fires" visually even if empty
  }

  private fireFreezeNova(level: number, targets: DamageableTarget[]): boolean {
    const bal = SkillBalance.freeze_nova;
    const r = bal.radius * (1 + 0.08 * (level - 1));
    const ring = this.scene.add
      .circle(this.player.x, this.player.y, 10, bal.color, 0.4)
      .setDepth(24);
    this.scene.tweens.add({
      targets: ring,
      scaleX: r / 10,
      scaleY: r / 10,
      alpha: 0,
      duration: 280,
      onComplete: () => ring.destroy(),
    });
    const dmg = this.dmg(bal.damage, level);
    const now = this.scene.time.now;
    for (const t of targets) {
      if (!t.alive) continue;
      if (Math.hypot(t.x - this.player.x, t.y - this.player.y) <= r) {
        this.dealTo(t, dmg);
        const maybe = t as DamageableTarget & {
          applySlow?: (n: number) => void;
          applyStun?: (n: number) => void;
        };
        maybe.applySlow?.(now);
        maybe.applyStun?.(now);
      }
    }
    return true;
  }

  private fireDrone(level: number, points: TargetPoint[]): boolean {
    const bal = SkillBalance.drone;
    if (!this.droneGfx) return false;
    const nearest = findNearestInRange(this.droneX, this.droneY, this.rangeOf(bal.range), points);
    if (!nearest) return false;
    const aim = aimVector(this.droneX, this.droneY, nearest.x, nearest.y);
    return !!this.bullets.spawn({
      x: this.droneX,
      y: this.droneY,
      vx: aim.x * GameConfig.combat.bulletSpeed * 0.85,
      vy: aim.y * GameConfig.combat.bulletSpeed * 0.85,
      damage: this.dmg(bal.damage, level),
      color: bal.color,
    });
  }

  private ensureFireRing(build: RunBuildState): void {
    const lvl = getSkillLevel(build, 'fire_ring');
    if (lvl <= 0) {
      this.fireRingGfx?.setVisible(false);
      return;
    }
    if (!this.fireRingGfx) {
      this.fireRingGfx = this.scene.add
        .circle(this.player.x, this.player.y, SkillBalance.fire_ring.radius, SkillBalance.fire_ring.color, 0.15)
        .setStrokeStyle(2, SkillBalance.fire_ring.color, 0.7)
        .setDepth(5);
    }
    this.fireRingGfx.setVisible(true);
  }

  private ensureDrone(build: RunBuildState): void {
    const lvl = getSkillLevel(build, 'drone');
    if (lvl <= 0) {
      this.droneGfx?.setVisible(false);
      return;
    }
    if (!this.droneGfx) {
      this.droneGfx = this.scene.add
        .rectangle(this.player.x, this.player.y, 18, 18, SkillBalance.drone.color)
        .setDepth(12);
      this.droneX = this.player.x;
      this.droneY = this.player.y;
    }
    this.droneGfx.setVisible(true);
  }

  private updateDroneFollow(dt: number): void {
    if (!this.droneGfx?.visible) return;
    const bal = SkillBalance.drone;
    const ang = this.scene.time.now / 500;
    const tx = this.player.x + Math.cos(ang) * bal.followDist;
    const ty = this.player.y + Math.sin(ang) * bal.followDist;
    const k = Math.min(1, (dt / 1000) * 8);
    this.droneX += (tx - this.droneX) * k;
    this.droneY += (ty - this.droneY) * k;
    this.droneGfx.setPosition(this.droneX, this.droneY);
  }

  private ensureOrbitBlades(build: RunBuildState): void {
    const want =
      build.evolved.has('boomerang') && getSkillLevel(build, 'boomerang') > 0
        ? SkillBalance.orbit_blade.blades
        : 0;
    while (this.orbitBlades.length < want) {
      const gfx = this.scene.add
        .rectangle(0, 0, 14, 14, SkillBalance.orbit_blade.color)
        .setDepth(13);
      this.orbitBlades.push({ angle: (this.orbitBlades.length / want) * Math.PI * 2, gfx, hitAcc: new Map() });
    }
    while (this.orbitBlades.length > want) {
      const b = this.orbitBlades.pop()!;
      b.gfx.destroy();
    }
  }

  private updateOrbitBlades(dt: number): void {
    if (this.orbitBlades.length === 0 || !this.build) return;
    const bal = SkillBalance.orbit_blade;
    const level = getSkillLevel(this.build, 'boomerang');
    const dmg = this.dmg(bal.damage, level);
    const targets = this.collectTargets();
    for (const blade of this.orbitBlades) {
      blade.angle += (dt / 1000) * 3.2;
      const x = this.player.x + Math.cos(blade.angle) * bal.orbitRadius;
      const y = this.player.y + Math.sin(blade.angle) * bal.orbitRadius;
      blade.gfx.setPosition(x, y);
      for (const t of targets) {
        if (!t.alive) continue;
        if (Math.hypot(t.x - x, t.y - y) > 22) continue;
        const last = blade.hitAcc.get(t.id) ?? 0;
        if (this.scene.time.now - last < 200) continue;
        blade.hitAcc.set(t.id, this.scene.time.now);
        this.dealTo(t, dmg);
      }
    }
  }

  private dealTo(target: DamageableTarget, damage: number): void {
    const crit = rng.next() < this.critChance;
    const dmg = crit ? Math.round(damage * GameConfig.combat.critMult) : damage;
    const dealt = target.takeDamage(dmg, crit);
    if (dealt > 0) this.damageNumbers.spawn(target.x, target.y, dealt, crit);
  }

  private collectTargets(): DamageableTarget[] {
    return this.targetProvider?.() ?? [];
  }

  clearVisuals(): void {
    for (const t of this.traps) t.gfx.destroy();
    this.traps = [];
    for (const b of this.orbitBlades) b.gfx.destroy();
    this.orbitBlades = [];
    this.fireRingGfx?.destroy();
    this.fireRingGfx = null;
    this.droneGfx?.destroy();
    this.droneGfx = null;
    this.cooldowns.clear();
    this.lastFired.clear();
  }

  destroy(): void {
    this.clearVisuals();
  }
}
