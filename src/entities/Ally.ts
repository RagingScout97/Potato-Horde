import * as Phaser from 'phaser';
import { AllyConfig } from '@/data/allies';

/** Thin ally view — invulnerable colored box (T274, T280, T282). */
export class Ally {
  readonly id: string;
  readonly slot: number;
  readonly body: Phaser.GameObjects.Rectangle;
  readonly canopy: Phaser.GameObjects.Triangle;
  invulnerable = true;
  dropping = false;
  active = false;

  private readonly scene: Phaser.Scene;

  constructor(scene: Phaser.Scene, slot: number, color: number) {
    this.scene = scene;
    this.slot = slot;
    this.id = `ally-${slot}`;
    const size = AllyConfig.visualSize;
    this.body = scene.add
      .rectangle(-9999, -9999, size, size, color)
      .setDepth(12)
      .setVisible(false);
    // No arcade body — does not block player/enemies (T289)
    this.canopy = scene.add
      .triangle(-9999, -9999, 0, 14, 18, -10, -18, -10, AllyConfig.canopyColor)
      .setDepth(13)
      .setVisible(false)
      .setAlpha(0.9);
  }

  get x(): number {
    return this.body.x;
  }

  get y(): number {
    return this.body.y;
  }

  setPosition(x: number, y: number): void {
    this.body.setPosition(x, y);
    this.canopy.setPosition(x, y - AllyConfig.visualSize * 0.85);
  }

  showCanopy(on: boolean): void {
    this.canopy.setVisible(on && this.active);
  }

  activate(x: number, y: number): void {
    this.active = true;
    this.dropping = true;
    this.body.setVisible(true).setAlpha(1);
    this.setPosition(x, y);
    this.showCanopy(true);
  }

  finishDrop(): void {
    this.dropping = false;
    this.showCanopy(false);
  }

  /** Allies never die (T280). */
  takeDamage(_amount: number): number {
    return 0;
  }

  deactivate(): void {
    this.active = false;
    this.dropping = false;
    this.scene.tweens.killTweensOf(this.body);
    this.scene.tweens.killTweensOf(this.canopy);
    this.body.setVisible(false).setPosition(-9999, -9999);
    this.canopy.setVisible(false).setPosition(-9999, -9999);
  }

  destroy(): void {
    this.deactivate();
    this.body.destroy();
    this.canopy.destroy();
  }
}
