import * as Phaser from 'phaser';
import { GameConfig } from '@/data/GameConfig';
import { tickPuddleTtl } from '@/utils/combatMath';
import { eventBus, GameEvents } from '@/utils/EventBus';

interface Puddle {
  x: number;
  y: number;
  radius: number;
  ttlMs: number;
  dps: number;
  tickMs: number;
  tickAcc: number;
  gfx: Phaser.GameObjects.Arc;
}

/** Death puddles / ground hazards (T101–T102). */
export class HazardSystem {
  private puddles: Puddle[] = [];
  private readonly scene: Phaser.Scene;
  private paused = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  setPaused(paused: boolean): void {
    this.paused = paused;
  }

  spawnPuddle(
    x: number,
    y: number,
    opts: { radius: number; ttlMs: number; dps: number; tickMs: number },
  ): void {
    const gfx = this.scene.add.circle(x, y, opts.radius, GameConfig.combat.hazardColor, 0.45);
    gfx.setDepth(3);
    this.puddles.push({
      x,
      y,
      radius: opts.radius,
      ttlMs: opts.ttlMs,
      dps: opts.dps,
      tickMs: opts.tickMs,
      tickAcc: 0,
      gfx,
    });
  }

  update(
    deltaMs: number,
    playerX: number,
    playerY: number,
    onTick: (damage: number) => void,
  ): void {
    if (this.paused) return;

    for (let i = this.puddles.length - 1; i >= 0; i--) {
      const p = this.puddles[i]!;
      p.ttlMs = tickPuddleTtl(p.ttlMs, deltaMs);
      if (p.ttlMs <= 0) {
        p.gfx.destroy();
        this.puddles.splice(i, 1);
        eventBus.emit(GameEvents.HazardExpired);
        continue;
      }

      // Fade as TTL drops
      p.gfx.setAlpha(0.2 + 0.35 * (p.ttlMs / (p.ttlMs + deltaMs + 1)));

      const dist = Math.hypot(playerX - p.x, playerY - p.y);
      if (dist <= p.radius) {
        p.tickAcc += deltaMs;
        if (p.tickAcc >= p.tickMs) {
          p.tickAcc = 0;
          onTick(p.dps);
        }
      }
    }
  }

  clear(): void {
    for (const p of this.puddles) p.gfx.destroy();
    this.puddles.length = 0;
  }

  getCount(): number {
    return this.puddles.length;
  }

  destroy(): void {
    this.clear();
  }
}
