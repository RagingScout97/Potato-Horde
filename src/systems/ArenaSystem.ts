import * as Phaser from 'phaser';
import { GameConfig } from '@/data/GameConfig';
import {
  MapConfig,
  getChapterTheme,
  type ChapterTheme,
  type ObstacleKind,
  type ObstacleStamp,
} from '@/data/mapLayouts';
import {
  aabbOverlap,
  generateMapStamps,
  segmentHitsAabb,
  unstickFromAabb,
} from '@/utils/mapLayout';
import { eventBus, GameEvents } from '@/utils/EventBus';

export interface ObstacleMeta {
  kind: ObstacleKind;
  blocksLos: boolean;
  hp: number;
  maxHp: number;
  destructible: boolean;
}

type ObstacleRect = Phaser.GameObjects.Rectangle & { obstacleMeta?: ObstacleMeta };

/**
 * Arena ground + obstacles / map (Phase 2 + Phase 13).
 */
export class ArenaSystem {
  readonly bounds: Phaser.Geom.Rectangle;
  private grid!: Phaser.GameObjects.Graphics;
  private vignette!: Phaser.GameObjects.Graphics;
  private spawnMarker!: Phaser.GameObjects.Arc;
  private safeZone!: Phaser.GameObjects.Arc;
  private minimap!: Phaser.GameObjects.Graphics;
  private obstacleGroup!: Phaser.Physics.Arcade.StaticGroup;
  private collisionLayer!: Phaser.GameObjects.Zone;
  private killPlanePadding = 80;
  private theme: ChapterTheme = getChapterTheme(1);
  private chapterId = 1;
  private layoutSeed = 9001;
  private playerCollider: Phaser.Physics.Arcade.Collider | null = null;

  private readonly scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const { width, height, centerX, centerY } = GameConfig.arena;
    this.bounds = new Phaser.Geom.Rectangle(0, 0, width, height);
    scene.physics.world.setBounds(0, 0, width, height);
    scene.cameras.main.setBounds(0, 0, width, height);

    this.drawGrid();
    this.spawnMarker = scene.add.circle(centerX, centerY, 18, 0xfbbf24, 0.35);
    this.spawnMarker.setStrokeStyle(2, 0xfbbf24);
    this.spawnMarker.setDepth(1);

    this.safeZone = scene.add.circle(centerX, centerY, 120, 0x4ade80, 0.12);
    this.safeZone.setStrokeStyle(1, 0x4ade80, 0.5);
    this.safeZone.setDepth(1);

    this.vignette = scene.add.graphics();
    this.vignette.setScrollFactor(0);
    this.vignette.setDepth(1000);
    this.drawVignette();

    this.minimap = scene.add.graphics();
    this.minimap.setScrollFactor(0);
    this.minimap.setDepth(1001);

    this.obstacleGroup = scene.physics.add.staticGroup();
    this.collisionLayer = scene.add.zone(centerX, centerY, width, height);
    scene.physics.add.existing(this.collisionLayer, true);

    // Default endless layout (T314 — chapter data hook)
    this.loadMap(1, 9001);

    scene.scale.on('resize', () => this.drawVignette());
  }

  /** Load chapter-themed seeded layout (T302, T305–T306, T314). */
  loadMap(chapterId: number, seed = 9001): void {
    this.chapterId = chapterId;
    this.layoutSeed = seed;
    this.theme = getChapterTheme(chapterId);
    this.clearObstacles();
    this.drawGrid();

    const stamps = generateMapStamps({
      arenaW: this.bounds.width,
      arenaH: this.bounds.height,
      centerX: GameConfig.arena.centerX,
      centerY: GameConfig.arena.centerY,
      seed,
      chapterId,
    });
    for (const stamp of stamps) this.placeStamp(stamp);

    this.updateMinimap(GameConfig.arena.centerX, GameConfig.arena.centerY);
  }

  getChapterId(): number {
    return this.chapterId;
  }

  getLayoutSeed(): number {
    return this.layoutSeed;
  }

  getTheme(): ChapterTheme {
    return this.theme;
  }

  /** First 3s safe zone visual; fades out. */
  startSafeZone(): void {
    this.safeZone.setAlpha(1);
    this.safeZone.setVisible(true);
    this.scene.tweens.add({
      targets: this.safeZone,
      alpha: 0,
      delay: GameConfig.safeZoneSeconds * 1000,
      duration: 400,
      onComplete: () => this.safeZone.setVisible(false),
    });
  }

  follow(target: Phaser.GameObjects.GameObject): void {
    const cam = this.scene.cameras.main;
    cam.startFollow(target, true, GameConfig.camera.lerp, GameConfig.camera.lerp);
    cam.setDeadzone(40, 40);
  }

  /** Wire player ↔ static obstacles (T299). */
  enablePlayerCollision(playerBody: Phaser.GameObjects.Rectangle): void {
    this.playerCollider?.destroy();
    this.playerCollider = this.scene.physics.add.collider(playerBody, this.obstacleGroup);
  }

  /** Collide a dynamic body with obstacles (enemies slide — T298). */
  collideWithObstacles(body: Phaser.GameObjects.GameObject): void {
    this.scene.physics.collide(body, this.obstacleGroup);
  }

  isOutsideKillPlane(x: number, y: number): boolean {
    const p = this.killPlanePadding;
    return (
      x < -p ||
      y < -p ||
      x > this.bounds.width + p ||
      y > this.bounds.height + p
    );
  }

  getObstacleGroup(): Phaser.Physics.Arcade.StaticGroup {
    return this.obstacleGroup;
  }

  getObstacleCount(): number {
    return this.obstacleGroup.getLength();
  }

  /** Bullet / projectile hit: damage crates, block all solid obstacles (T297, T301). */
  handleBulletHit(bullet: Phaser.GameObjects.Rectangle, damage: number): boolean {
    for (const obj of this.obstacleGroup.getChildren()) {
      const obs = obj as ObstacleRect;
      if (!obs.active) continue;
      if (!rectsOverlap(bullet, obs)) continue;
      const meta = obs.obstacleMeta;
      if (meta?.destructible) {
        meta.hp -= damage;
        obs.setFillStyle(this.theme.crate, Math.max(0.35, meta.hp / meta.maxHp));
        if (meta.hp <= 0) this.destroyCrate(obs);
      }
      return true;
    }
    return false;
  }

  /** Optional LoS block (T300). */
  hasLineOfSight(x1: number, y1: number, x2: number, y2: number): boolean {
    for (const obj of this.obstacleGroup.getChildren()) {
      const obs = obj as ObstacleRect;
      if (!obs.active || !obs.obstacleMeta?.blocksLos) continue;
      if (segmentHitsAabb(x1, y1, x2, y2, obs.x, obs.y, obs.width, obs.height)) {
        return false;
      }
    }
    return true;
  }

  /** Unstick entity if overlapping a static obstacle (T310–T311). */
  unstick(x: number, y: number, size: number): { x: number; y: number } {
    let px = x;
    let py = y;
    for (const obj of this.obstacleGroup.getChildren()) {
      const obs = obj as ObstacleRect;
      if (!obs.active) continue;
      if (!aabbOverlap(px, py, size, size, obs.x, obs.y, obs.width, obs.height)) continue;
      const next = unstickFromAabb(
        px,
        py,
        size,
        obs.x,
        obs.y,
        obs.width,
        obs.height,
        MapConfig.unstickPush,
      );
      px = next.x;
      py = next.y;
    }
    // Clamp inside borders
    const pad = MapConfig.borderThickness + size;
    px = Phaser.Math.Clamp(px, pad, this.bounds.width - pad);
    py = Phaser.Math.Clamp(py, pad, this.bounds.height - pad);
    return { x: px, y: py };
  }

  isPointBlocked(x: number, y: number, radius = 20): boolean {
    for (const obj of this.obstacleGroup.getChildren()) {
      const obs = obj as ObstacleRect;
      if (!obs.active) continue;
      if (aabbOverlap(x, y, radius * 2, radius * 2, obs.x, obs.y, obs.width, obs.height)) {
        return true;
      }
    }
    return false;
  }

  /** Minimap with obstacle dots (T307). */
  updateMinimap(playerX: number, playerY: number): void {
    const g = this.minimap;
    g.clear();
    const ox = GameConfig.logicalWidth - 110;
    const oy = 20;
    const s = 90;
    g.fillStyle(0x0b0f1a, 0.7);
    g.fillRect(ox, oy, s, s);
    g.lineStyle(1, 0x64748b, 1);
    g.strokeRect(ox, oy, s, s);

    for (const obj of this.obstacleGroup.getChildren()) {
      const obs = obj as ObstacleRect;
      if (!obs.active) continue;
      const kind = obs.obstacleMeta?.kind;
      if (kind === 'border') continue;
      const mx = ox + (obs.x / this.bounds.width) * s;
      const my = oy + (obs.y / this.bounds.height) * s;
      g.fillStyle(kind === 'crate' ? 0xb45309 : 0x94a3b8, 0.9);
      g.fillRect(mx - 1, my - 1, 2, 2);
    }

    const px = ox + (playerX / this.bounds.width) * s;
    const py = oy + (playerY / this.bounds.height) * s;
    g.fillStyle(0x4ade80, 1);
    g.fillCircle(px, py, 3);
  }

  private placeStamp(stamp: ObstacleStamp): void {
    const color =
      stamp.kind === 'crate'
        ? this.theme.crate
        : stamp.kind === 'pillar'
          ? this.theme.pillar
          : this.theme.obstacle;
    const rect = this.scene.add
      .rectangle(stamp.x, stamp.y, stamp.w, stamp.h, color)
      .setDepth(2) as ObstacleRect;
    rect.obstacleMeta = {
      kind: stamp.kind,
      blocksLos: stamp.blocksLos ?? stamp.kind !== 'crate',
      hp: stamp.hp ?? 0,
      maxHp: stamp.hp ?? 0,
      destructible: stamp.kind === 'crate',
    };
    this.obstacleGroup.add(rect);
    const body = rect.body as Phaser.Physics.Arcade.StaticBody | null;
    body?.updateFromGameObject();
  }

  private destroyCrate(obs: ObstacleRect): void {
    const x = obs.x;
    const y = obs.y;
    this.obstacleGroup.remove(obs, true, true);
    // Crate drops orbs (T312)
    eventBus.emit(GameEvents.XpDrop, { x, y, amount: 3 });
    eventBus.emit(GameEvents.XpDrop, { x: x + 10, y: y - 8, amount: 1 });
  }

  private clearObstacles(): void {
    this.obstacleGroup.clear(true, true);
  }

  private drawGrid(): void {
    if (this.grid) this.grid.destroy();
    this.grid = this.scene.add.graphics();
    this.grid.setDepth(0);
    const { width, height, gridSize } = GameConfig.arena;
    this.grid.fillStyle(this.theme.ground, 1);
    this.grid.fillRect(0, 0, width, height);
    this.grid.lineStyle(1, this.theme.grid, 1);
    for (let x = 0; x <= width; x += gridSize) {
      this.grid.lineBetween(x, 0, x, height);
    }
    for (let y = 0; y <= height; y += gridSize) {
      this.grid.lineBetween(0, y, width, y);
    }
  }

  private drawVignette(): void {
    const g = this.vignette;
    g.clear();
    const w = this.scene.scale.width;
    const h = this.scene.scale.height;
    g.fillStyle(0x000000, 0.35);
    g.fillRect(0, 0, w, 28);
    g.fillRect(0, h - 28, w, 28);
    g.fillRect(0, 0, 28, h);
    g.fillRect(w - 28, 0, 28, h);
  }
}

function rectsOverlap(
  a: Phaser.GameObjects.Rectangle,
  b: Phaser.GameObjects.Rectangle,
): boolean {
  return (
    Math.abs(a.x - b.x) * 2 < a.width + b.width &&
    Math.abs(a.y - b.y) * 2 < a.height + b.height
  );
}
