import * as Phaser from 'phaser';
import { GameConfig } from '@/data/GameConfig';
import { Chapters } from '@/data/chapters';
import { loadSave } from '@/save/SaveManager';
import { Fonts } from '@/ui/fonts';
import { attachButtonFeedback } from '@/ui/buttonFeedback';
import { UiChrome } from '@/ui/chrome';
import { fadeToScene } from '@/utils/sceneFade';
import { setPendingRun } from '@/systems/RunMode';

/**
 * Chapter select UI (T336–T344). Locked chapters show reason tooltip.
 */
export class ChapterSelectScene extends Phaser.Scene {
  constructor() {
    super('ChapterSelect');
  }

  create(): void {
    this.cameras.main.setBackgroundColor(UiChrome.bgDeepCss);
    this.cameras.main.fadeIn(200, 0, 0, 0);
    const save = loadSave();

    this.add
      .text(GameConfig.logicalWidth / 2, 48, 'CHAPTERS', {
        fontFamily: Fonts.display,
        fontSize: '32px',
        color: UiChrome.accentCss,
      })
      .setOrigin(0.5);

    this.add
      .text(GameConfig.logicalWidth / 2, 92, 'Clear a chapter to unlock the next', {
        fontFamily: Fonts.ui,
        fontSize: '14px',
        color: UiChrome.mutedCss,
      })
      .setOrigin(0.5);

    const unlocked = new Set(save.meta.unlockedChapters ?? [1]);
    const best = save.meta.chapterBest ?? {};

    Chapters.forEach((ch, i) => {
      const y = 148 + i * 92;
      const isUnlocked = unlocked.has(ch.id);
      const stars = best[ch.id]?.stars ?? 0;
      const label = isUnlocked
        ? `Ch${ch.id}  ${ch.name}  ·  power ${ch.recommendedPower}  ·  ${ch.modifier}`
        : `Ch${ch.id}  LOCKED — clear Ch${ch.id - 1} first`;
      const color = isUnlocked ? UiChrome.textCss : '#6b5344';

      const row = this.add
        .text(GameConfig.logicalWidth / 2, y, label, {
          fontFamily: Fonts.ui,
          fontSize: '16px',
          color,
          backgroundColor: isUnlocked ? UiChrome.panelCss : undefined,
          padding: isUnlocked ? { x: 20, y: 12 } : undefined,
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: isUnlocked });

      if (isUnlocked) {
        attachButtonFeedback(this, row);
      }

      if (isUnlocked && stars > 0) {
        this.add
          .text(
            GameConfig.logicalWidth / 2,
            y + 28,
            `${'*'.repeat(stars)}${'.'.repeat(3 - stars)}  best ${formatTime(best[ch.id]?.seconds ?? 0)}`,
            {
              fontFamily: Fonts.ui,
              fontSize: '12px',
              color: UiChrome.accentCss,
            },
          )
          .setOrigin(0.5);
      } else if (!isUnlocked) {
        row.on('pointerover', () => {
          row.setColor('#f87171');
        });
        row.on('pointerout', () => {
          row.setColor('#6b5344');
        });
      }

      if (isUnlocked) {
        row.on('pointerdown', () => {
          setPendingRun({ mode: 'chapter', chapterId: ch.id });
          fadeToScene(this, 'Game', 200);
        });
      }
    });

    const back = this.add
      .text(GameConfig.logicalWidth / 2, 660, '[ BACK ]', {
        fontFamily: Fonts.ui,
        fontSize: '20px',
        color: UiChrome.mutedCss,
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    attachButtonFeedback(this, back);
    back.on('pointerdown', () => fadeToScene(this, 'Hub', 200));
    this.input.keyboard?.once('keydown-ESC', () => fadeToScene(this, 'Hub', 200));
  }
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
