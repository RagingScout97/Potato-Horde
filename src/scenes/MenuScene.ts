import * as Phaser from 'phaser';
import { FIRST_RUN_BRIEFING } from '@/data/storyContent';
import { Fonts } from '@/ui/fonts';
import { attachButtonFeedback } from '@/ui/buttonFeedback';
import { isTutorialCompleted } from '@/save/uxFlags';
import { loadSave, writeSave } from '@/save/SaveManager';
import { fadeToScene } from '@/utils/sceneFade';
import { setPendingRun } from '@/systems/RunMode';
import type { DifficultyPreset } from '@/utils/endlessScale';
import { hookCopy, getDailyBoard, setSessionGoal } from '@/systems/Retention';
import { applyMuteToGame } from '@/ui/settingsAccess';

export class MenuScene extends Phaser.Scene {
  private started = false;

  constructor() {
    super('Menu');
  }

  create(): void {
    this.started = false;
    this.cameras.main.setBackgroundColor('#0b0f1a');
    this.cameras.main.fadeIn(280, 0, 0, 0);
    applyMuteToGame(this.game);

    const save = loadSave();
    const daily = getDailyBoard();
    const hook = hookCopy(save.stats.totalRuns);
    setSessionGoal('Clear a draft pick or beat daily best');

    const title = this.add
      .text(this.scale.width / 2, this.scale.height * 0.18, 'POTATO HORDE', {
        fontFamily: Fonts.display,
        fontSize: '56px',
        color: '#fbbf24',
      })
      .setOrigin(0.5)
      .setAlpha(0);

    this.add
      .text(this.scale.width / 2, this.scale.height * 0.28, hook, {
        fontFamily: Fonts.ui,
        fontSize: '15px',
        color: '#cbd5e1',
        align: 'center',
        wordWrap: { width: 560 },
      })
      .setOrigin(0.5);

    this.add
      .text(this.scale.width / 2, this.scale.height * 0.34, 'Survivors · colored boxes · single-player', {
        fontFamily: Fonts.ui,
        fontSize: '14px',
        color: '#94a3b8',
      })
      .setOrigin(0.5);

    const pbSec = save.stats.bestEndlessSeconds;
    const pbKills = save.stats.bestEndlessKills ?? 0;
    const pbLine =
      pbSec > 0 || pbKills > 0
        ? `Endless PB  ${formatPb(pbSec)}  ·  ${pbKills} kills  ·  ${save.meta.difficulty}`
        : `Endless · ${save.meta.difficulty}`;
    this.add
      .text(this.scale.width / 2, this.scale.height * 0.4, pbLine, {
        fontFamily: Fonts.ui,
        fontSize: '13px',
        color: '#64748b',
      })
      .setOrigin(0.5);

    this.add
      .text(
        this.scale.width / 2,
        this.scale.height * 0.45,
        `Daily ${daily.day}  ·  seed ${daily.seed}  ·  best ${daily.bestKills} kills / ${formatPb(daily.bestSeconds)}`,
        {
          fontFamily: Fonts.ui,
          fontSize: '12px',
          color: '#38bdf8',
        },
      )
      .setOrigin(0.5);

    if (!isTutorialCompleted()) {
      this.add
        .text(this.scale.width / 2, this.scale.height * 0.52, FIRST_RUN_BRIEFING, {
          fontFamily: Fonts.ui,
          fontSize: '14px',
          color: '#e2e8f0',
          align: 'center',
          wordWrap: { width: 520 },
        })
        .setOrigin(0.5);
    }

    const start = this.add
      .text(this.scale.width / 2, this.scale.height * 0.62, 'ENDLESS', {
        fontFamily: Fonts.display,
        fontSize: '28px',
        color: '#4ade80',
        backgroundColor: '#1e293b',
        padding: { x: 24, y: 12 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    const chaptersBtn = this.add
      .text(this.scale.width / 2, this.scale.height * 0.7, 'CHAPTERS', {
        fontFamily: Fonts.display,
        fontSize: '24px',
        color: '#38bdf8',
        backgroundColor: '#1e293b',
        padding: { x: 20, y: 10 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    const hubBtn = this.add
      .text(this.scale.width / 2, this.scale.height * 0.78, 'HUB', {
        fontFamily: Fonts.display,
        fontSize: '22px',
        color: '#c084fc',
        backgroundColor: '#1e293b',
        padding: { x: 20, y: 10 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    attachButtonFeedback(this, start);
    attachButtonFeedback(this, chaptersBtn);
    attachButtonFeedback(this, hubBtn);

    this.add
      .text(this.scale.width / 2, this.scale.height * 0.88, '[D] difficulty  ·  [C] chapters  ·  [H] hub', {
        fontFamily: Fonts.ui,
        fontSize: '12px',
        color: '#475569',
      })
      .setOrigin(0.5);

    this.tweens.add({
      targets: title,
      alpha: 1,
      y: this.scale.height * 0.2,
      duration: 400,
      ease: 'Back.easeOut',
    });

    this.tweens.add({
      targets: start,
      alpha: 0.4,
      yoyo: true,
      repeat: -1,
      duration: 700,
    });

    const goEndless = () => {
      if (this.started) return;
      this.started = true;
      setPendingRun({ mode: 'endless' });
      fadeToScene(this, 'Game', 280);
    };
    const goChapters = () => {
      if (this.started) return;
      this.started = true;
      fadeToScene(this, 'ChapterSelect', 280);
    };
    const goHub = () => {
      if (this.started) return;
      this.started = true;
      fadeToScene(this, 'Hub', 280);
    };
    const cycleDiff = () => {
      const s = loadSave();
      const order: DifficultyPreset[] = ['easy', 'normal', 'hard'];
      const i = order.indexOf(s.meta.difficulty ?? 'normal');
      s.meta.difficulty = order[(i + 1) % order.length]!;
      writeSave(s);
      this.scene.restart();
    };
    start.on('pointerdown', goEndless);
    chaptersBtn.on('pointerdown', goChapters);
    hubBtn.on('pointerdown', goHub);
    this.input.keyboard?.on('keydown-ENTER', goEndless);
    this.input.keyboard?.on('keydown-SPACE', goEndless);
    this.input.keyboard?.on('keydown-C', goChapters);
    this.input.keyboard?.on('keydown-H', goHub);
    this.input.keyboard?.on('keydown-D', cycleDiff);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard?.off('keydown-ENTER', goEndless);
      this.input.keyboard?.off('keydown-SPACE', goEndless);
      this.input.keyboard?.off('keydown-C', goChapters);
      this.input.keyboard?.off('keydown-H', goHub);
      this.input.keyboard?.off('keydown-D', cycleDiff);
    });
  }
}

function formatPb(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
