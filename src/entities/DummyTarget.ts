import * as Phaser from 'phaser';
import { GameConfig } from '@/data/GameConfig';
import { eventBus, GameEvents } from '@/utils/EventBus';

/** Thin damageable target used for Gate 4 auto-fire kill (and early enemy stub). */
export class DummyTarget {
  readonly id: string;
  readonly body: Phaser.GameObjects.Rectangle;
  hp: number;
  maxHp: number;
  alive = true;

  private hpText: Phaser.GameObjects.Text;
  private readonly scene: Phaser.Scene;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    opts?: { id?: string; hp?: number; color?: number; size?: number },
  ) {
    this.scene = scene;
    this.id = opts?.id ?? nextDummyId();
    this.maxHp = opts?.hp ?? GameConfig.dummy.hp;
    this.hp = this.maxHp;
    const size = opts?.size ?? GameConfig.dummy.size;
    const color = opts?.color ?? GameConfig.dummy.color;

    this.body = scene.add.rectangle(x, y, size, size, color);
    this.body.setDepth(8);
    scene.physics.add.existing(this.body);
    const pb = this.body.body as Phaser.Physics.Arcade.Body;
    pb.setImmovable(true);
    pb.setAllowGravity(false);
    pb.setVelocity(0, 0);

    this.hpText = scene.add
      .text(x, y - size * 0.7, `${this.hp}`, {
        fontFamily: monospaceFont(),
        fontSize: '12px',
        color: '#f8fafc',
      })
      .setOrigin(0.5)
      .setDepth(9);
  }

  get x(): number {
    return this.body.x;
  }

  get y(): number {
    return this.body.y;
  }

  /** Apply damage; returns actual damage dealt. Emits death when HP hits 0. */
  takeDamage(amount: number, crit = false): number {
    if (!this.alive) return 0;
    const dealt = Math.max(0, amount);
    this.hp = Math.max(0, this.hp - dealt);
    this.hpText.setText(String(Math.ceil(this.hp)));
    this.flashHit(crit);

    if (this.hp <= 0) {
      this.die();
    }
    return dealt;
  }

  private flashHit(crit: boolean): void {
    this.scene.tweens.add({
      targets: this.body,
      alpha: 0.4,
      duration: 50,
      yoyo: true,
      onComplete: () => {
        if (this.alive) this.body.setAlpha(1);
      },
    });
    if (crit) {
      this.body.setScale(1.15);
      this.scene.tweens.add({
        targets: this.body,
        scaleX: 1,
        scaleY: 1,
        duration: 100,
      });
    }
  }

  private die(): void {
    if (!this.alive) return;
    this.alive = false;
    this.body.setActive(false).setVisible(false);
    const pb = this.body.body as Phaser.Physics.Arcade.Body | null;
    if (pb) pb.enable = false;
    this.hpText.setVisible(false);
    eventBus.emit(GameEvents.EnemyDeath, { id: this.id, x: this.x, y: this.y });
  }

  destroy(): void {
    this.body.destroy();
    this.hpText.destroy();
  }
}

let dummySeq = 0;

function monospaceFont(): string {
  return 'monospace';
}

function nextDummyId(): string {
  dummySeq += 1;
  return `dummy-${dummySeq}`;
}
