import * as Phaser from 'phaser';
import { GameConfig } from '@/data/GameConfig';

export interface BulletData {
  damage: number;
  pierceLeft: number;
  lifetimeMs: number;
  maxDistance: number;
  traveled: number;
  owner: 'player' | 'enemy';
  weaponSlot: number;
  /** Targets already hit this flight (pierce tracking). */
  hitIds: Set<string>;
}

const DEFAULT_DATA: BulletData = {
  damage: 0,
  pierceLeft: 0,
  lifetimeMs: 0,
  maxDistance: 0,
  traveled: 0,
  owner: 'player',
  weaponSlot: 0,
  hitIds: new Set(),
};

/**
 * Object-pooled player/enemy bullets (T063, T086).
 * Never allocate in the hot path after warm-up.
 */
export class BulletPool {
  private readonly group: Phaser.GameObjects.Group;
  private activeCount = 0;

  constructor(scene: Phaser.Scene, size: number = GameConfig.combat.poolSize) {
    this.group = scene.add.group({
      classType: Phaser.GameObjects.Rectangle,
      maxSize: size,
      runChildUpdate: false,
    });

    for (let i = 0; i < size; i++) {
      const b = scene.add.rectangle(
        -9999,
        -9999,
        GameConfig.combat.bulletSize,
        GameConfig.combat.bulletSize,
        GameConfig.combat.bulletColor,
      );
      b.setActive(false).setVisible(false).setDepth(20);
      scene.physics.add.existing(b);
      const body = b.body as Phaser.Physics.Arcade.Body;
      body.enable = false;
      body.setAllowGravity(false);
      (b as Phaser.GameObjects.Rectangle & { bulletData?: BulletData }).bulletData = {
        ...DEFAULT_DATA,
        hitIds: new Set(),
      };
      this.group.add(b, false);
    }
  }

  get physicsChildren(): Phaser.GameObjects.GameObject[] {
    return this.group.getChildren() as Phaser.GameObjects.GameObject[];
  }

  getActiveCount(): number {
    return this.activeCount;
  }

  /** Spawn a bullet; returns null if pool / on-screen cap exhausted. */
  spawn(opts: {
    x: number;
    y: number;
    vx: number;
    vy: number;
    damage: number;
    pierce?: number;
    lifetimeMs?: number;
    maxDistance?: number;
    owner?: 'player' | 'enemy';
    weaponSlot?: number;
    color?: number;
  }): Phaser.GameObjects.Rectangle | null {
    if (this.activeCount >= GameConfig.combat.maxOnScreenBullets) return null;

    const bullet = this.group.getFirstDead(false) as Phaser.GameObjects.Rectangle | null;
    if (!bullet) return null;

    const data =
      (bullet as Phaser.GameObjects.Rectangle & { bulletData?: BulletData }).bulletData ??
      ({ ...DEFAULT_DATA, hitIds: new Set() } as BulletData);
    data.damage = opts.damage;
    data.pierceLeft = opts.pierce ?? GameConfig.combat.defaultPierce;
    data.lifetimeMs = opts.lifetimeMs ?? GameConfig.combat.bulletLifetimeMs;
    data.maxDistance = opts.maxDistance ?? GameConfig.combat.bulletMaxDistance;
    data.traveled = 0;
    data.owner = opts.owner ?? 'player';
    data.weaponSlot = opts.weaponSlot ?? 0;
    data.hitIds = new Set();
    (bullet as Phaser.GameObjects.Rectangle & { bulletData: BulletData }).bulletData = data;

    bullet.setPosition(opts.x, opts.y);
    bullet.setFillStyle(opts.color ?? GameConfig.combat.bulletColor);
    bullet.setActive(true).setVisible(true);

    const body = bullet.body as Phaser.Physics.Arcade.Body;
    body.enable = true;
    body.reset(opts.x, opts.y);
    body.setVelocity(opts.vx, opts.vy);

    this.activeCount += 1;
    return bullet;
  }

  release(bullet: Phaser.GameObjects.Rectangle): void {
    if (!bullet.active) return;
    const body = bullet.body as Phaser.Physics.Arcade.Body | null;
    if (body) {
      body.setVelocity(0, 0);
      body.enable = false;
    }
    bullet.setActive(false).setVisible(false);
    bullet.setPosition(-9999, -9999);
    this.activeCount = Math.max(0, this.activeCount - 1);
  }

  update(deltaMs: number, isOutsideKillPlane: (x: number, y: number) => boolean): void {
    let children: Phaser.GameObjects.Rectangle[];
    try {
      children = this.group.getChildren() as Phaser.GameObjects.Rectangle[];
    } catch {
      return;
    }
    if (!children) return;
    for (const bullet of children) {
      if (!bullet.active) continue;
      const data = (bullet as Phaser.GameObjects.Rectangle & { bulletData?: BulletData }).bulletData;
      if (!data) {
        this.release(bullet);
        continue;
      }

      const body = bullet.body as Phaser.Physics.Arcade.Body;
      const speed = Math.hypot(body.velocity.x, body.velocity.y);
      data.traveled += (speed * deltaMs) / 1000;
      data.lifetimeMs -= deltaMs;

      if (
        data.lifetimeMs <= 0 ||
        data.traveled >= data.maxDistance ||
        isOutsideKillPlane(bullet.x, bullet.y)
      ) {
        this.release(bullet);
      }
    }
  }

  releaseAll(): void {
    try {
      const children = this.group.getChildren() as Phaser.GameObjects.Rectangle[];
      if (!children) return;
      for (const b of children) {
        if (b?.active) this.release(b);
      }
    } catch {
      this.activeCount = 0;
    }
  }

  destroy(): void {
    try {
      this.releaseAll();
      this.group.destroy(true);
    } catch {
      this.activeCount = 0;
    }
  }
}

export function getBulletData(
  bullet: Phaser.GameObjects.Rectangle,
): BulletData | undefined {
  return (bullet as Phaser.GameObjects.Rectangle & { bulletData?: BulletData }).bulletData;
}
