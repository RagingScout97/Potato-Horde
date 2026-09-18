import * as Phaser from 'phaser';
import { EnemyTuning, EnemyTypes, type EnemyKind, type EnemyTypeDef } from '@/data/enemies';
import { eventBus, GameEvents } from '@/utils/EventBus';

export interface EnemyStatus {
  slowUntil: number;
  burnUntil: number;
  burnAcc: number;
  stunUntil: number;
  iFramesUntil: number;
}

export class Enemy {
  readonly id: string;
  readonly body: Phaser.GameObjects.Rectangle;
  kind: EnemyKind;
  def: EnemyTypeDef;
  hp: number;
  maxHp: number;
  alive = true;
  elite = false;
  /** Spawn order for cull-oldest (T111). */
  spawnIndex = 0;
  /** Per-instance contact damage (endless scale). */
  contactDamage: number;
  /** Ranged / contact damage mult from endless (T318). */
  damageMult = 1;

  vx = 0;
  vy = 0;
  lastContactAt = -Infinity;
  rangedCooldownMs = 0;
  knockbackUntil = 0;
  status: EnemyStatus = {
    slowUntil: 0,
    burnUntil: 0,
    burnAcc: 0,
    stunUntil: 0,
    iFramesUntil: 0,
  };

  private hpBarBg: Phaser.GameObjects.Rectangle | null = null;
  private hpBarFg: Phaser.GameObjects.Rectangle | null = null;
  private readonly scene: Phaser.Scene;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    kind: EnemyKind,
    opts?: { elite?: boolean; id?: string; spawnIndex?: number },
  ) {
    this.scene = scene;
    this.kind = kind;
    this.def = EnemyTypes[kind];
    this.id = opts?.id ?? `enemy-${kind}-${spawnIndexId()}`;
    this.spawnIndex = opts?.spawnIndex ?? 0;
    this.elite = opts?.elite ?? false;

    const hpMult = this.elite ? EnemyTuning.eliteHpMult : 1;
    this.maxHp = Math.round(this.def.hp * hpMult);
    this.hp = this.maxHp;
    this.contactDamage = this.def.contactDamage;

    const color = this.elite ? this.def.eliteColor : this.def.color;
    this.body = scene.add.rectangle(x, y, this.def.size, this.def.size, color);
    this.body.setDepth(8);
    scene.physics.add.existing(this.body);
    const pb = this.body.body as Phaser.Physics.Arcade.Body;
    pb.setAllowGravity(false);
    pb.setVelocity(0, 0);

    if (this.elite) {
      this.ensureHpBar();
    }
  }

  get x(): number {
    return this.body.x;
  }

  get y(): number {
    return this.body.y;
  }

  faceToward(tx: number, ty: number): void {
    void ty;
    const dx = tx - this.x;
    this.body.setScale(dx < 0 ? -1 : 1, 1);
  }

  takeDamage(amount: number, _crit = false): number {
    if (!this.alive) return 0;
    const nowMs = this.scene.time.now;
    if (nowMs < this.status.iFramesUntil) return 0;
    const dealt = Math.max(0, amount);
    this.hp = Math.max(0, this.hp - dealt);
    this.updateHpBar();
    this.flashHit();
    if (this.hp <= 0) this.die();
    return dealt;
  }

  applySlow(nowMs: number): void {
    this.status.slowUntil = Math.max(
      this.status.slowUntil,
      nowMs + EnemyTuning.status.slowMs,
    );
  }

  applyBurn(nowMs: number): void {
    this.status.burnUntil = Math.max(
      this.status.burnUntil,
      nowMs + EnemyTuning.status.burnMs,
    );
  }

  applyStun(nowMs: number): void {
    this.status.stunUntil = Math.max(
      this.status.stunUntil,
      nowMs + EnemyTuning.status.stunMs,
    );
  }

  applyKnockback(dirX: number, dirY: number, nowMs: number): void {
    const len = Math.hypot(dirX, dirY) || 1;
    this.vx = (dirX / len) * EnemyTuning.knockbackSpeed;
    this.vy = (dirY / len) * EnemyTuning.knockbackSpeed;
    this.knockbackUntil = nowMs + EnemyTuning.knockbackMs;
  }

  /** Soft endless scale (T317–T318) — does not mutate shared def. */
  applyEndlessScale(hpMult: number, damageMult: number): void {
    this.damageMult = damageMult;
    this.maxHp = Math.max(1, Math.round(this.maxHp * hpMult));
    this.hp = this.maxHp;
    this.contactDamage = Math.max(1, Math.round(this.def.contactDamage * damageMult));
    if (hpMult > 1.15) this.ensureHpBar();
    this.updateHpBar();
  }

  private flashHit(): void {
    this.scene.tweens.add({
      targets: this.body,
      alpha: 0.45,
      duration: 45,
      yoyo: true,
      onComplete: () => {
        if (this.alive) this.body.setAlpha(1);
      },
    });
  }

  private die(): void {
    if (!this.alive) return;
    this.alive = false;
    // Death scale pop (T113)
    this.scene.tweens.add({
      targets: this.body,
      scaleX: 1.35,
      scaleY: 1.35,
      alpha: 0,
      duration: 120,
      onComplete: () => {
        this.body.setActive(false).setVisible(false);
        const pb = this.body.body as Phaser.Physics.Arcade.Body | null;
        if (pb) pb.enable = false;
      },
    });
    this.hpBarBg?.setVisible(false);
    this.hpBarFg?.setVisible(false);
    eventBus.emit(GameEvents.EnemyDeath, {
      id: this.id,
      kind: this.kind,
      x: this.x,
      y: this.y,
      xp: this.def.xpReward,
      puddle: this.def.puddleOnDeath ? this.def.puddle : undefined,
      elite: this.elite,
    });
  }

  private ensureHpBar(): void {
    const w = this.def.size;
    this.hpBarBg = this.scene.add
      .rectangle(this.x, this.y - this.def.size * 0.7, w, 4, 0x1e293b)
      .setDepth(9);
    this.hpBarFg = this.scene.add
      .rectangle(this.x, this.y - this.def.size * 0.7, w, 4, 0xf87171)
      .setDepth(10)
      .setOrigin(0.5, 0.5);
  }

  private updateHpBar(): void {
    if (!this.hpBarBg || !this.hpBarFg) {
      if (this.elite || this.maxHp > this.def.hp) this.ensureHpBar();
    }
    if (!this.hpBarBg || !this.hpBarFg) return;
    const ratio = this.hp / this.maxHp;
    this.hpBarBg.setPosition(this.x, this.y - this.def.size * 0.7);
    this.hpBarFg.setPosition(
      this.x - (this.def.size * (1 - ratio)) / 2,
      this.y - this.def.size * 0.7,
    );
    this.hpBarFg.width = Math.max(0, this.def.size * ratio);
    this.hpBarBg.setVisible(this.alive);
    this.hpBarFg.setVisible(this.alive);
  }

  syncHpBar(): void {
    this.updateHpBar();
  }

  /** Recycle into pool (inactive). */
  deactivate(): void {
    this.alive = false;
    this.body.setActive(false).setVisible(false);
    this.body.setPosition(-9999, -9999);
    const pb = this.body.body as Phaser.Physics.Arcade.Body | null;
    if (pb) {
      pb.enable = false;
      pb.setVelocity(0, 0);
    }
    this.hpBarBg?.setVisible(false);
    this.hpBarFg?.setVisible(false);
    this.vx = 0;
    this.vy = 0;
  }

  reactivate(
    x: number,
    y: number,
    kind: EnemyKind,
    opts?: { elite?: boolean; spawnIndex?: number },
  ): void {
    this.def = EnemyTypes[kind];
    this.kind = kind;
    this.elite = opts?.elite ?? false;
    this.spawnIndex = opts?.spawnIndex ?? this.spawnIndex;
    const hpMult = this.elite ? EnemyTuning.eliteHpMult : 1;
    this.maxHp = Math.round(this.def.hp * hpMult);
    this.hp = this.maxHp;
    this.contactDamage = this.def.contactDamage;
    this.damageMult = 1;
    this.alive = true;
    this.lastContactAt = -Infinity;
    this.rangedCooldownMs = 0;
    this.knockbackUntil = 0;
    this.status = {
      slowUntil: 0,
      burnUntil: 0,
      burnAcc: 0,
      stunUntil: 0,
      iFramesUntil: 0,
    };
    this.body.setPosition(x, y);
    this.body.setFillStyle(this.elite ? this.def.eliteColor : this.def.color);
    this.body.setSize(this.def.size, this.def.size);
    this.body.setScale(1, 1);
    this.body.setAlpha(1);
    this.body.setActive(true).setVisible(true);
    const pb = this.body.body as Phaser.Physics.Arcade.Body;
    pb.enable = true;
    pb.reset(x, y);
    pb.setVelocity(0, 0);
    if (this.elite) this.ensureHpBar();
    else {
      this.hpBarBg?.setVisible(false);
      this.hpBarFg?.setVisible(false);
    }
  }

  destroy(): void {
    this.hpBarBg?.destroy();
    this.hpBarFg?.destroy();
    this.body.destroy();
  }
}

let enemySeq = 0;
function spawnIndexId(): number {
  enemySeq += 1;
  return enemySeq;
}
