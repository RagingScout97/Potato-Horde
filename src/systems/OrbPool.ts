import * as Phaser from 'phaser';
import { OrbXp } from '@/utils/xp';

export type OrbSize = 'small' | 'medium' | 'large';

export interface OrbData {
  amount: number;
  size: OrbSize;
  ttlMs: number;
  attracting: boolean;
}

/** Pooled XP orbs (T146–T148, T160–T161). */
export class OrbPool {
  private readonly free: Phaser.GameObjects.Arc[] = [];
  private readonly active: Phaser.GameObjects.Arc[] = [];
  private readonly scene: Phaser.Scene;

  constructor(scene: Phaser.Scene, prewarm = 48) {
    this.scene = scene;
    for (let i = 0; i < prewarm; i++) {
      const o = scene.add.circle(-9999, -9999, 6, 0xfacc15);
      o.setActive(false).setVisible(false).setDepth(6);
      (o as Phaser.GameObjects.Arc & { orbData?: OrbData }).orbData = {
        amount: 1,
        size: 'small',
        ttlMs: 20000,
        attracting: false,
      };
      this.free.push(o);
    }
  }

  getActive(): readonly Phaser.GameObjects.Arc[] {
    return this.active;
  }

  spawn(x: number, y: number, size: OrbSize = 'small'): Phaser.GameObjects.Arc | null {
    const orb = this.free.pop() ?? this.scene.add.circle(0, 0, 6, 0xfacc15).setDepth(6);
    const amount = OrbXp[size];
    const radius = size === 'large' ? 12 : size === 'medium' ? 9 : 6;
    orb.setPosition(x, y);
    orb.setRadius(radius);
    orb.setFillStyle(0xfacc15);
    orb.setActive(true).setVisible(true).setAlpha(1);
    (orb as Phaser.GameObjects.Arc & { orbData: OrbData }).orbData = {
      amount,
      size,
      ttlMs: 20000,
      attracting: false,
    };
    this.active.push(orb);
    return orb;
  }

  release(orb: Phaser.GameObjects.Arc): void {
    const idx = this.active.indexOf(orb);
    if (idx >= 0) this.active.splice(idx, 1);
    orb.setActive(false).setVisible(false);
    orb.setPosition(-9999, -9999);
    this.free.push(orb);
  }

  releaseAll(): void {
    while (this.active.length) this.release(this.active[0]!);
  }

  getActiveCount(): number {
    return this.active.length;
  }

  destroy(): void {
    this.releaseAll();
    for (const o of this.free) o.destroy();
    this.free.length = 0;
  }
}

export function getOrbData(orb: Phaser.GameObjects.Arc): OrbData | undefined {
  return (orb as Phaser.GameObjects.Arc & { orbData?: OrbData }).orbData;
}
