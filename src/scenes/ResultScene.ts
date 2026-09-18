import * as Phaser from 'phaser';
import { GameConfig } from '@/data/GameConfig';
import { Fonts } from '@/ui/fonts';
import { attachButtonFeedback } from '@/ui/buttonFeedback';
import { fadeToScene } from '@/utils/sceneFade';
import { setPendingRun } from '@/systems/RunMode';

export interface RunSummary {
  survivedSeconds: number;
  kills: number;
  level: number;
  skills: string[];
  evolutions: string[];
  bossKills: number;
  chapterId?: number;
  cleared?: boolean;
  unlockedNext?: boolean;
  banknotes?: number;
  gems?: number;
  stars?: number;
  lootName?: string;
  milestoneTitle?: string;
}

/**
 * Game Over / result screen (T231–T234, T345).
 */
export class ResultScene extends Phaser.Scene {
  private summary: RunSummary = {
    survivedSeconds: 0,
    kills: 0,
    level: 1,
    skills: [],
    evolutions: [],
    bossKills: 0,
  };

  constructor() {
    super('Result');
  }

  init(data: Partial<RunSummary>): void {
    this.summary = {
      survivedSeconds: data.survivedSeconds ?? 0,
      kills: data.kills ?? 0,
      level: data.level ?? 1,
      skills: data.skills ?? [],
      evolutions: data.evolutions ?? [],
      bossKills: data.bossKills ?? 0,
      chapterId: data.chapterId,
      cleared: data.cleared,
      unlockedNext: data.unlockedNext,
      banknotes: data.banknotes,
      gems: data.gems,
      stars: data.stars,
      lootName: data.lootName,
      milestoneTitle: data.milestoneTitle,
    };
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#0b0f1a');
    this.cameras.main.fadeIn(240, 0, 0, 0);

    const isChapter = this.summary.chapterId != null;
    const cleared = !!this.summary.cleared;
    const title = isChapter
      ? cleared
        ? 'CHAPTER CLEAR'
        : 'CHAPTER FAILED'
      : 'GAME OVER';
    const titleColor = cleared ? '#4ade80' : '#f87171';

    const over = this.add
      .text(GameConfig.logicalWidth / 2, 100, title, {
        fontFamily: Fonts.display,
        fontSize: '44px',
        color: titleColor,
      })
      .setOrigin(0.5)
      .setAlpha(0)
      .setScale(0.9);

    this.tweens.add({
      targets: over,
      alpha: 1,
      scale: 1,
      duration: 280,
      ease: 'Back.easeOut',
    });

    if (this.summary.milestoneTitle) {
      this.add
        .text(GameConfig.logicalWidth / 2, 150, this.summary.milestoneTitle, {
          fontFamily: Fonts.display,
          fontSize: '20px',
          color: '#fbbf24',
        })
        .setOrigin(0.5);
    }

    const lines = [
      `Survived ${formatTime(this.summary.survivedSeconds)}`,
      `Kills ${this.summary.kills}`,
      `Level ${this.summary.level}`,
      `Bosses ${this.summary.bossKills}`,
      this.summary.banknotes != null ? `Banknotes +${this.summary.banknotes}` : '',
      this.summary.gems != null && this.summary.gems > 0
        ? `Gems +${this.summary.gems}`
        : '',
      this.summary.lootName ? `Loot: ${this.summary.lootName}` : '',
      this.summary.stars != null && this.summary.stars > 0
        ? `Stars ${'*'.repeat(this.summary.stars)}`
        : '',
      this.summary.unlockedNext ? 'Unlocked next chapter!' : '',
      `Skills: ${this.summary.skills.join(', ') || 'none'}`,
      this.summary.evolutions.length
        ? `Evolutions: ${this.summary.evolutions.join(', ')}`
        : '',
    ].filter(Boolean);

    this.add
      .text(GameConfig.logicalWidth / 2, 220, lines.join('\n'), {
        fontFamily: Fonts.ui,
        fontSize: '18px',
        color: '#e2e8f0',
        align: 'center',
        lineSpacing: 8,
      })
      .setOrigin(0.5, 0);

    const retry = this.add
      .text(GameConfig.logicalWidth / 2, 480, '[ RETRY ]', {
        fontFamily: Fonts.display,
        fontSize: '26px',
        color: '#4ade80',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    const hub = this.add
      .text(GameConfig.logicalWidth / 2, 540, '[ HUB ]', {
        fontFamily: Fonts.ui,
        fontSize: '22px',
        color: '#94a3b8',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    attachButtonFeedback(this, retry);
    attachButtonFeedback(this, hub);

    retry.on('pointerdown', () => {
      if (this.summary.chapterId != null) {
        setPendingRun({ mode: 'chapter', chapterId: this.summary.chapterId });
      } else {
        setPendingRun({ mode: 'endless' });
      }
      fadeToScene(this, 'Game', 240);
    });
    hub.on('pointerdown', () => fadeToScene(this, 'Hub', 240));
    this.input.keyboard?.once('keydown-ENTER', () => {
      if (this.summary.chapterId != null) {
        setPendingRun({ mode: 'chapter', chapterId: this.summary.chapterId });
      } else {
        setPendingRun({ mode: 'endless' });
      }
      fadeToScene(this, 'Game', 240);
    });
    this.input.keyboard?.once('keydown-ESC', () => fadeToScene(this, 'Hub', 240));
  }
}

function formatTime(seconds: number): string {
  const s = Math.floor(seconds);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
}
