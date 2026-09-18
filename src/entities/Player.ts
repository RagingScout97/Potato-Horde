import * as Phaser from 'phaser';
import { GameConfig } from '@/data/GameConfig';
import { eventBus, GameEvents } from '@/utils/EventBus';
import { applyArmor } from '@/utils/armor';
import { integrateVelocity } from '@/utils/movement';
import { clampDelta } from '@/utils/math';

export interface PlayerFlags {
  idle: boolean;
  moving: boolean;
  dead: boolean;
  invulnerable: boolean;
  draftLocked: boolean;
  dashLocked: boolean;
}

export class Player {
  readonly body: Phaser.GameObjects.Rectangle;
  readonly facing: Phaser.GameObjects.Triangle;
  readonly hurtbox: Phaser.GameObjects.Arc;
  flags: PlayerFlags = {
    idle: true,
    moving: false,
    dead: false,
    invulnerable: false,
    draftLocked: false,
    dashLocked: true,
  };

  private vx = 0;
  private vy = 0;
  private facingAngle = 0;
  private footstepAcc = 0;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
  };
  private externalAxis: { x: number; y: number } = { x: 0, y: 0 };
  private moveEnabled = true;
  private pausedBuffered = false;
  private moveSpeedMult = 1;
  armor = 0;
  /** Overheal shield stub (T238). */
  shield = 0;
  hp: number;
  maxHp: number;
  /** Last damage source id for kill credit (T244). */
  lastHitBy: string | null = null;
  private skinColor: number = GameConfig.player.color;

  private readonly scene: Phaser.Scene;

  constructor(scene: Phaser.Scene, x: number, y: number, debugHitboxes: boolean) {
    this.scene = scene;
    this.maxHp = GameConfig.playerCombat.maxHp;
    this.hp = this.maxHp;
    const size = GameConfig.player.visualSize;
    this.body = scene.add.rectangle(x, y, size, size, GameConfig.player.color);
    this.body.setDepth(10);

    this.facing = scene.add.triangle(
      x,
      y - size * 0.55,
      0,
      10,
      8,
      -6,
      -8,
      -6,
      0xfbbf24,
    );
    this.facing.setDepth(11);

    this.hurtbox = scene.add.circle(x, y, GameConfig.player.hurtboxRadius, 0xff0000, 0.25);
    this.hurtbox.setDepth(9);
    this.hurtbox.setVisible(debugHitboxes);

    scene.physics.add.existing(this.body);
    const pb = this.body.body as Phaser.Physics.Arcade.Body;
    pb.setCollideWorldBounds(true);
    pb.setSize(size * 0.85, size * 0.85);

    if (scene.input.keyboard) {
      this.cursors = scene.input.keyboard.createCursorKeys();
      this.wasd = {
        W: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
        A: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
        S: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
        D: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      };
    }
  }

  setExternalAxis(x: number, y: number): void {
    this.externalAxis = { x, y };
  }

  setMoveSpeedMult(mult: number): void {
    this.moveSpeedMult = mult;
  }

  setArmor(armor: number): void {
    this.armor = Math.max(0, armor);
  }

  heal(amount: number): number {
    if (this.flags.dead) return 0;
    const before = this.hp;
    this.hp = Math.min(this.maxHp, this.hp + Math.max(0, amount));
    return this.hp - before;
  }

  setMoveEnabled(enabled: boolean): void {
    this.moveEnabled = enabled;
    if (!enabled) {
      this.vx = 0;
      this.vy = 0;
      this.syncPhysicsVelocity();
    }
  }

  setPaused(paused: boolean): void {
    this.pausedBuffered = paused;
    if (paused) {
      this.vx = 0;
      this.vy = 0;
      this.syncPhysicsVelocity();
    }
  }

  setDead(dead: boolean): void {
    this.flags.dead = dead;
    if (dead) {
      this.setMoveEnabled(false);
      this.body.setFillStyle(0x64748b); // grey corpse (T243)
      eventBus.emit(GameEvents.PlayerDeath);
    } else {
      this.body.setFillStyle(this.skinColor);
    }
  }

  setBodyColor(color: number): void {
    this.skinColor = color;
    if (!this.flags.dead) this.body.setFillStyle(color);
  }

  /**
   * Apply damage; returns amount actually dealt.
   * Respects invuln, armor, draft lock (T227, T235, T239, T240).
   */
  takeDamage(amount: number, sourceId?: string): number {
    if (this.flags.dead || this.flags.invulnerable) return 0;
    // Cannot die / take damage during draft (T239)
    if (this.flags.draftLocked) return 0;
    if (!Number.isFinite(amount) || amount <= 0) return 0;

    let remaining = applyArmor(amount, this.armor);
    if (this.shield > 0) {
      const absorbed = Math.min(this.shield, remaining);
      this.shield -= absorbed;
      remaining -= absorbed;
    }
    const dealt = remaining;
    if (dealt <= 0) return 0;

    if (sourceId) this.lastHitBy = sourceId;
    this.hp = Math.max(0, this.hp - dealt);
    if (!Number.isFinite(this.hp)) this.hp = 0; // NaN guard (T240)
    eventBus.emit(GameEvents.PlayerDamaged, { hp: this.hp, dealt });
    this.flashInvuln(GameConfig.playerCombat.hurtIFramesMs);
    if (this.hp <= 0) {
      this.hp = 0;
      this.setDead(true);
    }
    return dealt;
  }

  /** Invuln flash stub — alpha blink. */
  flashInvuln(durationMs = 400): void {
    this.flags.invulnerable = true;
    this.scene.tweens.add({
      targets: this.body,
      alpha: 0.35,
      yoyo: true,
      repeat: 3,
      duration: durationMs / 4,
      onComplete: () => {
        this.body.setAlpha(1);
        this.flags.invulnerable = false;
      },
    });
  }

  respawn(x: number, y: number): void {
    this.flags.dead = false;
    this.hp = this.maxHp;
    this.shield = 0;
    this.lastHitBy = null;
    this.setMoveEnabled(true);
    this.body.setFillStyle(GameConfig.player.color);
    this.body.setPosition(x, y);
    this.vx = 0;
    this.vy = 0;
    this.syncPhysicsVelocity();
    this.body.setAlpha(1);
    this.syncVisuals();
  }

  get x(): number {
    return this.body.x;
  }

  get y(): number {
    return this.body.y;
  }

  update(time: number, delta: number): void {
    void time;
    if (this.flags.dead || this.flags.draftLocked || this.pausedBuffered || !this.moveEnabled) {
      this.flags.idle = true;
      this.flags.moving = false;
      this.syncPhysicsVelocity();
      this.syncVisuals();
      return;
    }

    const dt = clampDelta(delta) / 1000;
    const input = this.readInput();
    const next = integrateVelocity(
      this.vx,
      this.vy,
      input.x,
      input.y,
      dt,
      GameConfig.player.maxSpeed * this.moveSpeedMult,
    );
    this.vx = next.x;
    this.vy = next.y;
    this.syncPhysicsVelocity();

    const moving = Math.hypot(this.vx, this.vy) > 8;
    this.flags.moving = moving;
    this.flags.idle = !moving;

    if (moving) {
      this.facingAngle = Math.atan2(this.vy, this.vx);
      this.footstepAcc += delta;
      if (this.footstepAcc > 280) {
        this.footstepAcc = 0;
        eventBus.emit(GameEvents.Footstep, { x: this.x, y: this.y });
      }
    }

    this.syncVisuals();
  }

  private readInput(): { x: number; y: number } {
    let x = this.externalAxis.x;
    let y = this.externalAxis.y;

    if (this.cursors && this.wasd) {
      if (this.cursors.left.isDown || this.wasd.A.isDown) x -= 1;
      if (this.cursors.right.isDown || this.wasd.D.isDown) x += 1;
      if (this.cursors.up.isDown || this.wasd.W.isDown) y -= 1;
      if (this.cursors.down.isDown || this.wasd.S.isDown) y += 1;
    }

    // Mouse move-to-pointer OFF by default (T052)
    return { x, y };
  }

  private syncPhysicsVelocity(): void {
    const pb = this.body.body as Phaser.Physics.Arcade.Body | null;
    if (pb) pb.setVelocity(this.vx, this.vy);
  }

  private syncVisuals(): void {
    const size = GameConfig.player.visualSize;
    this.facing.setPosition(
      this.body.x + Math.cos(this.facingAngle) * (size * 0.55),
      this.body.y + Math.sin(this.facingAngle) * (size * 0.55),
    );
    this.facing.setRotation(this.facingAngle + Math.PI / 2);
    this.hurtbox.setPosition(this.body.x, this.body.y);
  }

  destroy(): void {
    this.body.destroy();
    this.facing.destroy();
    this.hurtbox.destroy();
  }
}
