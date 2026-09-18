import * as Phaser from 'phaser';
import {
  MILESTONE_SECONDS,
  endlessDamageMult,
  endlessEliteChance,
  endlessHpMult,
  regenFactor,
  type DifficultyPreset,
} from '@/utils/endlessScale';
import { loadSave, writeSave } from '@/save/SaveManager';
import { endlessBanknotes, endlessGemBonus, grantRewardOnce } from '@/systems/Rewards';
import { syncHeroUnlocks } from '@/systems/HeroProgress';

/**
 * Endless mode helpers: scale, milestones, AFK, PB, perf (Phase 14).
 */
export class EndlessSystem {
  private claimedMilestones = new Set<number>();
  private lastInputAt = 0;
  private afkPaused = false;
  private difficulty: DifficultyPreset = 'normal';
  private mode: 'endless' | 'chapter' = 'endless';
  private banner: Phaser.GameObjects.Text | null = null;
  private perfText: Phaser.GameObjects.Text | null = null;
  private lowFpsAcc = 0;
  private readonly scene: Phaser.Scene;
  private readonly AFK_MS = 60_000;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const save = loadSave();
    this.difficulty = save.meta.difficulty ?? 'normal';

    this.banner = scene.add
      .text(scene.scale.width / 2, 100, '', {
        fontFamily: 'monospace',
        fontSize: '22px',
        color: '#fbbf24',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(2600)
      .setVisible(false);

    this.perfText = scene.add
      .text(scene.scale.width - 12, scene.scale.height - 28, '', {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: '#f87171',
      })
      .setOrigin(1, 1)
      .setScrollFactor(0)
      .setDepth(2600)
      .setVisible(false);

    this.lastInputAt = scene.time.now;
    scene.input.on('pointerdown', this.markInput, this);
    scene.input.keyboard?.on('keydown', this.markInput, this);
  }

  setMode(mode: 'endless' | 'chapter'): void {
    this.mode = mode;
  }

  getMode(): 'endless' | 'chapter' {
    return this.mode;
  }

  setDifficulty(d: DifficultyPreset): void {
    this.difficulty = d;
    const save = loadSave();
    save.meta.difficulty = d;
    writeSave(save);
  }

  getDifficulty(): DifficultyPreset {
    return this.difficulty;
  }

  isAfkPaused(): boolean {
    return this.afkPaused;
  }

  hpMult(runSeconds: number): number {
    if (this.mode !== 'endless') return 1;
    return endlessHpMult(runSeconds, this.difficulty);
  }

  damageMult(runSeconds: number): number {
    if (this.mode !== 'endless') return 1;
    return endlessDamageMult(runSeconds, this.difficulty);
  }

  eliteChance(runSeconds: number): number {
    if (this.mode !== 'endless') return 0.02;
    return endlessEliteChance(runSeconds);
  }

  /** Apply diminishing regen (T324). */
  scaleHeal(amount: number, runSeconds: number): number {
    if (this.mode !== 'endless') return amount;
    return amount * regenFactor(runSeconds);
  }

  update(runSeconds: number, nowMs: number, fps: number, entityCount: number): void {
    if (this.mode === 'endless') {
      this.tickMilestones(runSeconds);
      this.tickAfk(nowMs);
    }
    this.tickPerf(fps, entityCount);
  }

  /** Persist personal bests + endless banknotes (T322–T323, T357). */
  recordRunEnd(
    survivedSeconds: number,
    kills: number,
    opts?: { runId?: string; luckBonus?: number },
  ): { banknotes: number; gems: number } {
    if (this.mode !== 'endless') return { banknotes: 0, gems: 0 };
    const save = loadSave();
    if (survivedSeconds > save.stats.bestEndlessSeconds) {
      save.stats.bestEndlessSeconds = Math.floor(survivedSeconds);
    }
    if (kills > (save.stats.bestEndlessKills ?? 0)) {
      save.stats.bestEndlessKills = kills;
    }
    save.stats.totalRuns += 1;
    save.stats.totalKills += kills;
    writeSave(save);

    const notes = endlessBanknotes(survivedSeconds, kills);
    const gems = endlessGemBonus(survivedSeconds, opts?.luckBonus ?? 0);
    const key = opts?.runId ? `endless-run:${opts.runId}` : `endless-run:${Date.now()}`;
    const granted = grantRewardOnce(key, { banknotes: notes, gems: gems || undefined });
    syncHeroUnlocks();
    return {
      banknotes: granted.granted.banknotes ?? 0,
      gems: granted.granted.gems ?? 0,
    };
  }

  reset(): void {
    this.claimedMilestones.clear();
    this.afkPaused = false;
    this.lowFpsAcc = 0;
    this.lastInputAt = this.scene.time.now;
    this.banner?.setVisible(false);
    this.perfText?.setVisible(false);
  }

  destroy(): void {
    this.scene.input.off('pointerdown', this.markInput, this);
    this.scene.input.keyboard?.off('keydown', this.markInput, this);
    this.banner?.destroy();
    this.perfText?.destroy();
    this.banner = null;
    this.perfText = null;
  }

  private markInput = (): void => {
    this.lastInputAt = this.scene.time.now;
    this.afkPaused = false;
  };

  private tickMilestones(runSeconds: number): void {
    for (const t of MILESTONE_SECONDS) {
      if (runSeconds >= t && !this.claimedMilestones.has(t)) {
        this.claimedMilestones.add(t);
        this.showBanner(`${formatMilestone(t)} SURVIVED`);
      }
    }
  }

  private tickAfk(nowMs: number): void {
    if (nowMs - this.lastInputAt >= this.AFK_MS) {
      if (!this.afkPaused) {
        this.afkPaused = true;
        this.showBanner('AFK PAUSE — move to resume');
      }
    }
  }

  clearAfk(): void {
    this.lastInputAt = this.scene.time.now;
    this.afkPaused = false;
  }

  /** Test helper: simulate 60s idle (T325). */
  forceAfkNow(): boolean {
    this.lastInputAt = this.scene.time.now - this.AFK_MS - 1;
    this.tickAfk(this.scene.time.now);
    return this.afkPaused;
  }

  private tickPerf(fps: number, entityCount: number): void {
    // Perf budget alarms (T326)
    if (fps > 0 && fps < 50) this.lowFpsAcc += 1;
    else this.lowFpsAcc = Math.max(0, this.lowFpsAcc - 2);

    if (this.lowFpsAcc > 90 || entityCount > 220) {
      this.perfText?.setText(
        `PERF ${fps.toFixed(0)} FPS · entities ${entityCount}`,
      );
      this.perfText?.setVisible(true);
    } else if (this.perfText) {
      this.perfText.setVisible(false);
    }
  }

  private showBanner(text: string): void {
    if (!this.banner) return;
    this.banner.setText(text).setVisible(true).setAlpha(1);
    this.scene.tweens.killTweensOf(this.banner);
    this.scene.tweens.add({
      targets: this.banner,
      alpha: 0,
      delay: 1800,
      duration: 600,
      onComplete: () => this.banner?.setVisible(false),
    });
  }
}

function formatMilestone(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  return `${m} MIN`;
}
