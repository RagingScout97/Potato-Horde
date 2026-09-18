import type * as Phaser from 'phaser';
import type { Player } from '@/entities/Player';
import type { RunBuildState } from '@/systems/RunBuild';
import { OrbPool, getOrbData } from '@/systems/OrbPool';
import { applyXpGain, xpToNext } from '@/utils/xp';
import { clampDelta } from '@/utils/math';
import { eventBus, GameEvents } from '@/utils/EventBus';

export interface XpState {
  level: number;
  xpIntoLevel: number;
  xpToLevel: number;
}

/**
 * XP orbs + magnet + level queue (Phase 7).
 */
export class XpSystem {
  readonly orbs: OrbPool;
  level = 1;
  xpIntoLevel = 0;
  private pendingLevels = 0;
  private vacuumUntil = 0;
  private paused = false;
  private nowMs = 0;
  private readonly unsubXp: () => void;

  constructor(_scene: Phaser.Scene) {
    this.orbs = new OrbPool(_scene);

    this.unsubXp = eventBus.on(GameEvents.XpDrop, (payload) => {
      const p = payload as { x: number; y: number; amount: number } | undefined;
      if (!p) return;
      if (p.amount <= 1) this.orbs.spawn(p.x, p.y, 'small');
      else if (p.amount <= 3) this.orbs.spawn(p.x, p.y, 'medium');
      else this.orbs.spawn(p.x, p.y, 'large');
    });
  }

  setPaused(paused: boolean): void {
    this.paused = paused;
  }

  activateVacuum(durationMs: number): void {
    this.vacuumUntil = Math.max(this.vacuumUntil, this.nowMs + durationMs);
  }

  getState(): XpState {
    return {
      level: this.level,
      xpIntoLevel: this.xpIntoLevel,
      xpToLevel: xpToNext(this.level),
    };
  }

  getPendingLevels(): number {
    return this.pendingLevels;
  }

  consumeLevel(): boolean {
    if (this.pendingLevels <= 0) return false;
    this.pendingLevels -= 1;
    return true;
  }

  update(time: number, delta: number, player: Player, build: RunBuildState): void {
    if (this.paused) return;
    this.nowMs = time;
    const dt = clampDelta(delta);
    const magnetR = 70 + build.magnetBonus;
    const vacuum = time < this.vacuumUntil;

    for (let i = this.orbs.getActive().length - 1; i >= 0; i--) {
      const orb = this.orbs.getActive()[i]!;
      const data = getOrbData(orb);
      if (!data) {
        this.orbs.release(orb);
        continue;
      }

      data.ttlMs -= dt;
      if (data.ttlMs <= 0) {
        this.orbs.release(orb);
        continue;
      }

      if (player.flags.dead) continue;

      const dx = player.x - orb.x;
      const dy = player.y - orb.y;
      const dist = Math.hypot(dx, dy);

      if (vacuum || dist < magnetR) {
        data.attracting = true;
        const speed = vacuum ? 520 : 280;
        const nx = dist > 0.1 ? dx / dist : 0;
        const ny = dist > 0.1 ? dy / dist : 0;
        orb.x += nx * speed * (dt / 1000);
        orb.y += ny * speed * (dt / 1000);
      }

      if (Math.hypot(player.x - orb.x, player.y - orb.y) < 18) {
        this.collect(data.amount);
        this.orbs.release(orb);
      }
    }
  }

  private collect(amount: number): void {
    const result = applyXpGain(this.level, this.xpIntoLevel, amount);
    this.level = result.level;
    this.xpIntoLevel = result.xpIntoLevel;
    if (result.levelsGained > 0) {
      this.pendingLevels += result.levelsGained;
      eventBus.emit(GameEvents.LevelUp, {
        level: this.level,
        pending: this.pendingLevels,
      });
    }
  }

  grantXp(amount: number): void {
    this.collect(amount);
  }

  reset(): void {
    this.level = 1;
    this.xpIntoLevel = 0;
    this.pendingLevels = 0;
    this.orbs.releaseAll();
  }

  destroy(): void {
    this.unsubXp();
    this.orbs.destroy();
  }
}
