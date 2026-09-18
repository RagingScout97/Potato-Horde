import * as Phaser from 'phaser';
import { AllyConfig } from '@/data/allies';
import { Ally } from '@/entities/Ally';
import type { Player } from '@/entities/Player';
import type { BulletPool } from '@/systems/BulletPool';
import type { DamageableTarget } from '@/systems/CombatSystem';
import type { RunBuildState } from '@/systems/RunBuild';
import { getSkillLevel } from '@/systems/RunBuild';
import { eventBus, GameEvents } from '@/utils/EventBus';
import {
  allyDesiredPosition,
  applyAllySeparation,
  recallToward,
  shouldRecall,
} from '@/utils/allyFollow';
import { clampDelta } from '@/utils/math';
import { aimVector, findNearestInRange, type TargetPoint } from '@/utils/targeting';
import { loadSave } from '@/save/SaveManager';

/**
 * Ally parachute drops + follow + auto-attack (T271–T294).
 * Max 3, invulnerable, uses shared bullet pool.
 */
export class AllySystem {
  private readonly allies: Ally[] = [];
  private readonly cooldowns: number[] = [0, 0, 0];
  private readonly claimedDrops = new Set<number>();
  private paused = false;
  private bossIntroFrozen = false;
  private weaponsEnabled = true;
  private damageMult = 1;
  private atkSpeedMult = 1;
  private rangeMult = 1;
  private dualShot = false;
  private metaUnlocked = true;
  private desiredFromDraft = 0;
  private targetProvider: (() => DamageableTarget[]) | null = null;
  private readonly unsubs: Array<() => void> = [];
  private hudText: Phaser.GameObjects.Text | null = null;

  private readonly scene: Phaser.Scene;
  private readonly bullets: BulletPool;

  constructor(scene: Phaser.Scene, bullets: BulletPool) {
    this.scene = scene;
    this.bullets = bullets;

    for (let i = 0; i < AllyConfig.maxAllies; i++) {
      const color = AllyConfig.colors[i] ?? AllyConfig.colors[0]!;
      this.allies.push(new Ally(scene, i, color));
    }

    // Meta unlock hook (T281) — allies locked until save allows (default unlocked)
    const save = loadSave();
    this.metaUnlocked = save.meta.alliesUnlocked !== false;

    this.unsubs.push(
      eventBus.on(GameEvents.BossIntro, () => {
        this.bossIntroFrozen = true;
      }),
    );
    this.unsubs.push(
      eventBus.on(GameEvents.BossIntroEnd, () => {
        this.bossIntroFrozen = false;
      }),
    );
    this.unsubs.push(
      eventBus.on(GameEvents.PlayerDeath, () => {
        this.clearAll();
      }),
    );

    this.hudText = scene.add
      .text(12, 146, '', {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#38bdf8',
      })
      .setScrollFactor(0)
      .setDepth(2500);
  }

  setTargetProvider(provider: () => DamageableTarget[]): void {
    this.targetProvider = provider;
  }

  setPaused(paused: boolean): void {
    this.paused = paused;
  }

  setWeaponsEnabled(enabled: boolean): void {
    this.weaponsEnabled = enabled;
  }

  syncBuild(build: RunBuildState): void {
    const power = getSkillLevel(build, 'ally_power');
    const recruit = getSkillLevel(build, 'ally_recruit');
    this.damageMult = 1 + 0.18 * power;
    this.atkSpeedMult = 1 + 0.1 * power;
    this.rangeMult = 1 + 0.08 * power;
    this.dualShot = build.evolutions.includes('ally_barrage');
    // Draft recruit levels can summon allies early (T275)
    this.desiredFromDraft = Math.min(AllyConfig.maxAllies, recruit);
  }

  getActiveCount(): number {
    return this.allies.filter((a) => a.active).length;
  }

  getAlliesDebug(): Array<{ id: string; x: number; y: number; dropping: boolean }> {
    return this.allies
      .filter((a) => a.active)
      .map((a) => ({ id: a.id, x: a.x, y: a.y, dropping: a.dropping }));
  }

  /** Timed drops at 60 / 150 / 240s (T291–T293). */
  update(delta: number, player: Player, runSeconds: number): void {
    this.refreshHud();

    if (this.paused || this.bossIntroFrozen) return;
    if (player.flags.dead) return;

    const dt = clampDelta(delta);

    // Honor draft recruit stacks (T275 / T283)
    while (this.getActiveCount() < this.desiredFromDraft) {
      if (!this.forceDropNearPlayer(player)) break;
    }

    if (this.metaUnlocked) {
      for (let i = 0; i < AllyConfig.dropAtSeconds.length; i++) {
        const t = AllyConfig.dropAtSeconds[i]!;
        if (
          runSeconds >= t &&
          !this.claimedDrops.has(i) &&
          this.getActiveCount() < AllyConfig.maxAllies
        ) {
          this.claimedDrops.add(i);
          this.beginParachuteDrop(player, i);
        }
      }
    }

    const active = this.allies.filter((a) => a.active && !a.dropping);
    const count = active.length;
    const positions = active.map((a) => ({ x: a.x, y: a.y }));

    for (let ai = 0; ai < active.length; ai++) {
      const ally = active[ai]!;
      const slotIndex = active.indexOf(ally);
      let desired = allyDesiredPosition(
        player.x,
        player.y,
        slotIndex,
        count,
        AllyConfig.followRadius,
      );

      const others = positions.filter((_, j) => j !== ai);
      applyAllySeparation(
        desired,
        others,
        AllyConfig.separationRadius,
        AllyConfig.separationPush * (dt / 1000),
      );

      const distSq =
        (ally.x - player.x) * (ally.x - player.x) + (ally.y - player.y) * (ally.y - player.y);
      if (shouldRecall(distSq, AllyConfig.recallDistance)) {
        const snapped = recallToward(ally.x, ally.y, desired.x, desired.y, true);
        ally.setPosition(snapped.x, snapped.y);
      } else {
        const nx = ally.x + (desired.x - ally.x) * AllyConfig.followLerp;
        const ny = ally.y + (desired.y - ally.y) * AllyConfig.followLerp;
        ally.setPosition(nx, ny);
      }
      positions[ai] = { x: ally.x, y: ally.y };
    }

    if (!this.weaponsEnabled || player.flags.draftLocked) return;
    this.tickFire(dt, active);
  }

  private tickFire(dt: number, active: Ally[]): void {
    const targets = this.targetProvider?.() ?? [];
    const points: TargetPoint[] = targets.map((t) => ({
      id: t.id,
      x: t.x,
      y: t.y,
      alive: t.alive,
    }));

    for (const ally of active) {
      const slot = ally.slot;
      this.cooldowns[slot] = Math.max(0, (this.cooldowns[slot] ?? 0) - dt);
      if ((this.cooldowns[slot] ?? 0) > 0) continue;

      const range = AllyConfig.range * this.rangeMult;
      // Own nearest target (T278) — from ally position, not player
      const nearest = findNearestInRange(ally.x, ally.y, range, points);
      if (!nearest) continue;

      const aim = aimVector(ally.x, ally.y, nearest.x, nearest.y);
      if (aim.x === 0 && aim.y === 0) continue;

      const dmg = Math.round(AllyConfig.damage * this.damageMult);
      const speed = AllyConfig.bulletSpeed;
      const shots = this.dualShot ? 2 : 1;
      let fired = false;
      for (let s = 0; s < shots; s++) {
        const spread = shots > 1 ? (s === 0 ? -0.12 : 0.12) : 0;
        const cos = Math.cos(spread);
        const sin = Math.sin(spread);
        const dx = aim.x * cos - aim.y * sin;
        const dy = aim.x * sin + aim.y * cos;
        const bullet = this.bullets.spawn({
          x: ally.x,
          y: ally.y,
          vx: dx * speed,
          vy: dy * speed,
          damage: dmg,
          pierce: 0,
          owner: 'player',
          weaponSlot: 10 + slot,
          color: AllyConfig.bulletColor,
        });
        if (bullet) fired = true;
      }
      if (fired) {
        const interval = AllyConfig.fireIntervalMs / Math.max(0.05, this.atkSpeedMult);
        this.cooldowns[slot] = interval;
      }
    }
  }

  /** Parachute drop tween (T271). */
  private beginParachuteDrop(player: Player, slotHint: number): void {
    const ally = this.allies.find((a) => !a.active);
    if (!ally) return;

    const slot = ally.slot;
    void slotHint;
    const land = allyDesiredPosition(
      player.x,
      player.y,
      this.getActiveCount(),
      this.getActiveCount() + 1,
      AllyConfig.followRadius,
    );
    const startY = land.y - AllyConfig.parachuteHeight;
    ally.activate(land.x, startY);

    this.scene.tweens.add({
      targets: ally.body,
      y: land.y,
      duration: AllyConfig.parachuteDurationMs,
      ease: 'Sine.easeIn',
      onUpdate: () => {
        ally.canopy.setPosition(ally.body.x, ally.body.y - AllyConfig.visualSize * 0.85);
      },
      onComplete: () => {
        ally.setPosition(land.x, land.y);
        ally.finishDrop();
        eventBus.emit('ally:drop', { slot, id: ally.id });
      },
    });
  }

  /** Debug / draft recruit — drop immediately near player. */
  forceDropNearPlayer(player: Player): boolean {
    if (this.getActiveCount() >= AllyConfig.maxAllies) return false;
    const ally = this.allies.find((a) => !a.active);
    if (!ally) return false;

    const land = allyDesiredPosition(
      player.x,
      player.y,
      this.getActiveCount(),
      this.getActiveCount() + 1,
      AllyConfig.followRadius,
    );
    ally.activate(land.x, land.y - AllyConfig.parachuteHeight);
    this.scene.tweens.add({
      targets: ally.body,
      y: land.y,
      duration: AllyConfig.parachuteDurationMs,
      ease: 'Sine.easeIn',
      onUpdate: () => {
        ally.canopy.setPosition(ally.body.x, ally.body.y - AllyConfig.visualSize * 0.85);
      },
      onComplete: () => {
        ally.setPosition(land.x, land.y);
        ally.finishDrop();
      },
    });
    return true;
  }

  clearAll(): void {
    for (const a of this.allies) a.deactivate();
    this.cooldowns.fill(0);
  }

  reset(): void {
    this.clearAll();
    this.claimedDrops.clear();
    this.bossIntroFrozen = false;
  }

  private refreshHud(): void {
    if (!this.hudText) return;
    const n = this.getActiveCount();
    this.hudText.setText(n > 0 ? `Allies ${n}/${AllyConfig.maxAllies}` : '');
  }

  destroy(): void {
    for (const u of this.unsubs) u();
    this.unsubs.length = 0;
    for (const a of this.allies) a.destroy();
    this.allies.length = 0;
    this.hudText?.destroy();
    this.hudText = null;
  }
}
