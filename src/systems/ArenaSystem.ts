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
import { loadSave } from '@/save/SaveManager';

export interface ObstacleMeta {
  kind: ObstacleKind;
  blocksLos: boolean;
  hp: number;
  maxHp: number;
  destructible: boolean;
}

type ObstacleRect = Phaser.GameObjects.Rectangle & { obstacleMeta?: ObstacleMeta };

type DustParticle = {
  gfx: Phaser.GameObjects.Arc;
  vx: number;
  vy: number;
  life: number;
};

const DUST_CAP = 18;

/**
 * Arena ground + obstacles / map (Phase 2 + Phase 13) + themed atmosphere.
 */
export class ArenaSystem {
  readonly bounds: Phaser.Geom.Rectangle;
  private grid!: Phaser.GameObjects.Graphics;
  private haze!: Phaser.GameObjects.Rectangle;
  private vignette!: Phaser.GameObjects.Graphics;
  private fadeOverlay!: Phaser.GameObjects.Rectangle;
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
  private dust: DustParticle[] = [];
  private pulseTween: Phaser.Tweens.Tween | null = null;
  private hazeBaseAlpha = 0.045;

  private readonly scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const { width, height, centerX, centerY } = GameConfig.arena;
    this.bounds = new Phaser.Geom.Rectangle(0, 0, width, height);
    scene.physics.world.setBounds(0, 0, width, height);
    scene.cameras.main.setBounds(0, 0, width, height);

    this.grid = scene.add.graphics().setDepth(0);
    this.drawGrid();

    this.haze = scene.add
      .rectangle(
        GameConfig.logicalWidth / 2,
        GameConfig.logicalHeight / 2,
        GameConfig.logicalWidth,
        GameConfig.logicalHeight,
        this.theme.haze,
        this.hazeBaseAlpha,
      )
      .setScrollFactor(0)
      .setDepth(900);

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

    this.fadeOverlay = scene.add
      .rectangle(
        GameConfig.logicalWidth / 2,
        GameConfig.logicalHeight / 2,
        GameConfig.logicalWidth,
        GameConfig.logicalHeight,
        0x000000,
        0,
      )
      .setScrollFactor(0)
      .setDepth(950)
      .setVisible(false);

    this.minimap = scene.add.graphics();
    this.minimap.setScrollFactor(0);
    this.minimap.setDepth(1001);

    this.obstacleGroup = scene.physics.add.staticGroup();
    this.collisionLayer = scene.add.zone(centerX, centerY, width, height);
    scene.physics.add.existing(this.collisionLayer, true);

    // Default endless layout (T314 — chapter data hook)
    this.loadMap(0, 9001, { animate: false });

    scene.scale.on('resize', () => this.drawVignette());
  }

  /** Load chapter-themed seeded layout (T302, T305–T306, T314). */
  loadMap(chapterId: number, seed = 9001, opts?: { animate?: boolean }): void {
    const animate = opts?.animate !== false;
    const prevTheme = this.theme;
    this.chapterId = chapterId;
    this.layoutSeed = seed;
    this.theme = getChapterTheme(chapterId);

    const applyTheme = (): void => {
      this.clearObstacles();
      this.drawGrid();
      this.applyAtmosphere();
      this.rebuildDust();

      const stamps = generateMapStamps({
        arenaW: this.bounds.width,
        arenaH: this.bounds.height,
        centerX: GameConfig.arena.centerX,
        centerY: GameConfig.arena.centerY,
        seed,
        chapterId: Math.max(1, chapterId),
      });
      for (const stamp of stamps) this.placeStamp(stamp);

      this.updateMinimap(GameConfig.arena.centerX, GameConfig.arena.centerY);
      this.scene.cameras.main.setBackgroundColor(this.theme.camBg);
    };

    if (animate && prevTheme.id !== this.theme.id) {
      this.scene.tweens.killTweensOf(this.fadeOverlay);
      this.fadeOverlay.setFillStyle(prevTheme.camBg, 1);
      this.fadeOverlay.setVisible(true).setAlpha(0);
      this.scene.tweens.add({
        targets: this.fadeOverlay,
        alpha: 0.72,
        duration: 160,
        ease: 'Quad.easeIn',
        onComplete: () => {
          applyTheme();
          this.scene.tweens.add({
            targets: this.fadeOverlay,
            alpha: 0,
            duration: 280,
            ease: 'Quad.easeOut',
            onComplete: () => {
              this.fadeOverlay.setVisible(false);
              this.fadeOverlay.setAlpha(0);
            },
          });
        },
      });
    } else {
      this.scene.tweens.killTweensOf(this.fadeOverlay);
      this.fadeOverlay.setVisible(false).setAlpha(0);
      applyTheme();
    }
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

  /** Soft dust drift + haze pulse (skipped in performance mode). */
  updateAtmosphere(delta: number): void {
    let perf = false;
    try {
      perf = !!loadSave().settings.performanceMode;
    } catch {
      /* ignore */
    }
    if (perf) {
      for (const d of this.dust) d.gfx.setVisible(false);
      this.haze.setAlpha(this.hazeBaseAlpha * 0.5);
      return;
    }

    const dt = Math.min(delta, 50) / 1000;
    const w = this.bounds.width;
    const h = this.bounds.height;
    for (const d of this.dust) {
      d.gfx.x += d.vx * dt;
      d.gfx.y += d.vy * dt;
      d.life -= dt;
      if (d.life <= 0 || d.gfx.x < 0 || d.gfx.y < 0 || d.gfx.x > w || d.gfx.y > h) {
        this.respawnDust(d);
      }
    }
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
    const ox = GameConfig.logicalWidth - 118;
    const oy = 16;
    const s = 96;
    g.fillStyle(0x1a1410, 0.78);
    g.fillRect(ox, oy, s, s);
    g.lineStyle(1, 0x6b5344, 1);
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

  destroy(): void {
    this.pulseTween?.stop();
    this.pulseTween = null;
    this.playerCollider?.destroy();
    this.playerCollider = null;
    for (const d of this.dust) d.gfx.destroy();
    this.dust = [];
    this.haze?.destroy();
    this.fadeOverlay?.destroy();
    this.vignette?.destroy();
    this.grid?.destroy();
    this.minimap?.destroy();
    this.spawnMarker?.destroy();
    this.safeZone?.destroy();
    // Physics plugin may already have torn down StaticGroup.children on SHUTDOWN.
    this.clearObstacles();
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
    const group = this.obstacleGroup;
    // Phaser StaticGroup.clear crashes if children was nulled during physics shutdown.
    if (!group?.children) return;
    group.clear(true, true);
  }

  private drawGrid(): void {
    this.grid.clear();
    const { width, height, gridSize } = GameConfig.arena;
    this.grid.fillStyle(this.theme.ground, 1);
    this.grid.fillRect(0, 0, width, height);
    this.grid.lineStyle(1, this.theme.grid, 0.85);
    for (let x = 0; x <= width; x += gridSize) {
      this.grid.lineBetween(x, 0, x, height);
    }
    for (let y = 0; y <= height; y += gridSize) {
      this.grid.lineBetween(0, y, width, y);
    }
  }

  private applyAtmosphere(): void {
    this.haze.setFillStyle(this.theme.haze, this.hazeBaseAlpha);
    this.haze.setAlpha(this.hazeBaseAlpha);
    this.pulseTween?.stop();
    this.pulseTween = this.scene.tweens.add({
      targets: this.haze,
      alpha: this.hazeBaseAlpha * 1.35,
      duration: 4800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private rebuildDust(): void {
    for (const d of this.dust) d.gfx.destroy();
    this.dust = [];
    let perf = false;
    try {
      perf = !!loadSave().settings.performanceMode;
    } catch {
      /* ignore */
    }
    if (perf) return;

    for (let i = 0; i < DUST_CAP; i++) {
      const gfx = this.scene.add
        .circle(0, 0, 2 + (i % 3), this.theme.particle, 0.22 + (i % 4) * 0.04)
        .setDepth(0.5);
      const d: DustParticle = { gfx, vx: 0, vy: 0, life: 1 };
      this.respawnDust(d, true);
      this.dust.push(d);
    }
  }

  private respawnDust(d: DustParticle, initial = false): void {
    const w = this.bounds.width;
    const h = this.bounds.height;
    d.gfx.setPosition(
      Phaser.Math.Between(80, w - 80),
      Phaser.Math.Between(80, h - 80),
    );
    d.gfx.setFillStyle(this.theme.particle, 0.2 + Math.random() * 0.15);
    d.vx = Phaser.Math.FloatBetween(-18, 18);
    d.vy = Phaser.Math.FloatBetween(-12, 12);
    d.life = initial ? Phaser.Math.FloatBetween(2, 10) : Phaser.Math.FloatBetween(6, 14);
    d.gfx.setVisible(true);
  }

  private drawVignette(): void {
    const g = this.vignette;
    g.clear();
    const w = GameConfig.logicalWidth;
    const h = GameConfig.logicalHeight;
    const edge = 36;
    g.fillStyle(0x000000, 0.4);
    g.fillRect(0, 0, w, edge);
    g.fillRect(0, h - edge, w, edge);
    g.fillRect(0, 0, edge, h);
    g.fillRect(w - edge, 0, edge, h);
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
