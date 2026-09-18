import * as Phaser from 'phaser';

/** Basic virtual joystick stub (touch / pointer). */
export class VirtualJoystick {
  private base: Phaser.GameObjects.Arc;
  private thumb: Phaser.GameObjects.Arc;
  private pointerId: number | null = null;
  private axis = { x: 0, y: 0 };
  private readonly radius = 48;
  private readonly originX: number;
  private readonly originY: number;

  constructor(scene: Phaser.Scene) {
    this.originX = 96;
    this.originY = GameConfigLogicalHeight() - 96;

    this.base = scene.add.circle(this.originX, this.originY, this.radius, 0xffffff, 0.12);
    this.base.setStrokeStyle(2, 0xffffff, 0.35);
    this.base.setScrollFactor(0);
    this.base.setDepth(2000);

    this.thumb = scene.add.circle(this.originX, this.originY, 22, 0xffffff, 0.35);
    this.thumb.setScrollFactor(0);
    this.thumb.setDepth(2001);

    scene.input.on('pointerdown', this.onDown, this);
    scene.input.on('pointermove', this.onMove, this);
    scene.input.on('pointerup', this.onUp, this);
  }

  getAxis(): { x: number; y: number } {
    return this.axis;
  }

  destroy(scene: Phaser.Scene): void {
    scene.input.off('pointerdown', this.onDown, this);
    scene.input.off('pointermove', this.onMove, this);
    scene.input.off('pointerup', this.onUp, this);
    this.base.destroy();
    this.thumb.destroy();
  }

  private onDown(pointer: Phaser.Input.Pointer): void {
    if (this.pointerId !== null) return;
    if (pointer.x > 220 || pointer.y < GameConfigLogicalHeight() - 220) return;
    this.pointerId = pointer.id;
    this.updateThumb(pointer.x, pointer.y);
  }

  private onMove(pointer: Phaser.Input.Pointer): void {
    if (pointer.id !== this.pointerId) return;
    this.updateThumb(pointer.x, pointer.y);
  }

  private onUp(pointer: Phaser.Input.Pointer): void {
    if (pointer.id !== this.pointerId) return;
    this.pointerId = null;
    this.axis = { x: 0, y: 0 };
    this.thumb.setPosition(this.originX, this.originY);
  }

  private updateThumb(x: number, y: number): void {
    const dx = x - this.originX;
    const dy = y - this.originY;
    const len = Math.hypot(dx, dy);
    const clamped = Math.min(len, this.radius);
    const nx = len > 0 ? dx / len : 0;
    const ny = len > 0 ? dy / len : 0;
    this.thumb.setPosition(this.originX + nx * clamped, this.originY + ny * clamped);
    const mag = clamped / this.radius;
    this.axis = { x: nx * mag, y: ny * mag };
  }
}

function GameConfigLogicalHeight(): number {
  // Avoid circular import at module init; match GameConfig.logicalHeight
  return 720;
}
