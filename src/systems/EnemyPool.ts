import * as Phaser from 'phaser';
import { EnemyTuning, type EnemyKind } from '@/data/enemies';
import { Enemy } from '@/entities/Enemy';

/** Object-pooled enemies (T097, T110, T111). */
export class EnemyPool {
  private readonly free: Enemy[] = [];
  private readonly active: Enemy[] = [];
  private spawnCounter = 0;
  private readonly scene: Phaser.Scene;
  private readonly maxPool: number;

  constructor(scene: Phaser.Scene, prewarm = 64) {
    this.scene = scene;
    this.maxPool = Math.max(prewarm, EnemyTuning.softCap + 16);
    for (let i = 0; i < prewarm; i++) {
      const e = new Enemy(scene, -9999, -9999, 'melee', { id: `pool-${i}` });
      e.deactivate();
      this.free.push(e);
    }
  }

  getActive(): readonly Enemy[] {
    return this.active;
  }

  getActiveCount(): number {
    return this.active.length;
  }

  spawn(
    x: number,
    y: number,
    kind: EnemyKind,
    opts?: { elite?: boolean },
  ): Enemy | null {
    // Soft cap — cull oldest if over (T110–T111)
    while (this.active.length >= EnemyTuning.softCap) {
      this.cullOldest();
    }

    let enemy = this.free.pop();
    this.spawnCounter += 1;
    if (!enemy) {
      if (this.active.length + this.free.length >= this.maxPool) {
        this.cullOldest();
        enemy = this.free.pop();
      }
      if (!enemy) {
        enemy = new Enemy(this.scene, x, y, kind, {
          elite: opts?.elite,
          spawnIndex: this.spawnCounter,
        });
        this.active.push(enemy);
        return enemy;
      }
    }

    enemy.reactivate(x, y, kind, {
      elite: opts?.elite,
      spawnIndex: this.spawnCounter,
    });
    this.active.push(enemy);
    return enemy;
  }

  release(enemy: Enemy): void {
    const idx = this.active.indexOf(enemy);
    if (idx >= 0) this.active.splice(idx, 1);
    enemy.deactivate();
    this.free.push(enemy);
  }

  /** Release dead enemies back to pool after death anim. */
  sweepDead(): void {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const e = this.active[i]!;
      if (!e.alive && !e.body.visible) {
        this.release(e);
      }
    }
  }

  private cullOldest(): void {
    if (this.active.length === 0) return;
    let oldest = this.active[0]!;
    for (const e of this.active) {
      if (e.spawnIndex < oldest.spawnIndex) oldest = e;
    }
    this.release(oldest);
  }

  releaseAll(): void {
    while (this.active.length > 0) {
      this.release(this.active[0]!);
    }
  }

  destroy(): void {
    this.releaseAll();
    for (const e of this.free) e.destroy();
    this.free.length = 0;
  }
}
