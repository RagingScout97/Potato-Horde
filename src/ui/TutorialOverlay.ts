import * as Phaser from 'phaser';
import { GameConfig } from '@/data/GameConfig';
import { Fonts } from '@/ui/fonts';
import { attachButtonFeedback } from '@/ui/buttonFeedback';
import { setTutorialCompleted } from '@/save/uxFlags';
import { eventBus, GameEvents } from '@/utils/EventBus';

export type TutorialStepId = 'move' | 'autofire' | 'xp' | 'draft' | 'survive';

interface StepDef {
  id: TutorialStepId;
  title: string;
  body: string;
}

const STEPS: StepDef[] = [
  {
    id: 'move',
    title: 'MOVE',
    body: 'Hold WASD or Arrow keys (or the joystick). Diagonal is fine — speed stays honest.',
  },
  {
    id: 'autofire',
    title: 'AUTO-FIRE',
    body: 'Weapons aim and shoot for you. Keep moving — the guns handle the rest.',
  },
  {
    id: 'xp',
    title: 'COLLECT XP',
    body: 'Yellow orbs magnet toward you. Kill → scoop → grow.',
  },
  {
    id: 'draft',
    title: 'LEVEL UP',
    body: 'Pick 1 of 3 skill cards (click or 1 / 2 / 3). Esc stays open — no soft-skip.',
  },
  {
    id: 'survive',
    title: 'SURVIVE',
    body: 'Stack skills, dodge the horde, last as long as you can. Good luck, potato.',
  },
];

export interface TutorialHost {
  getPlayerMoved(): boolean;
  getXpCollected(): boolean;
  isDraftOpen(): boolean;
  isPaused(): boolean;
}

/**
 * First-run contextual tutorial (T444 / T455 spirit).
 * Skippable, pause-friendly, does not soft-lock draft.
 */
export class TutorialOverlay {
  private root: Phaser.GameObjects.Container;
  private panel: Phaser.GameObjects.Container;
  private titleText: Phaser.GameObjects.Text;
  private bodyText: Phaser.GameObjects.Text;
  private progressText: Phaser.GameObjects.Text;
  private skipBtn: Phaser.GameObjects.Text;
  private active = false;
  private stepIndex = 0;
  private stepEnteredAt = 0;
  private draftSeen = false;
  private draftPicked = false;
  private surviveArmed = false;
  private readonly scene: Phaser.Scene;
  private readonly host: TutorialHost;
  private unsubs: Array<() => void> = [];
  private onSkipKey!: (ev: KeyboardEvent) => void;

  constructor(scene: Phaser.Scene, host: TutorialHost) {
    this.scene = scene;
    this.host = host;

    this.root = scene.add.container(0, 0).setDepth(3200).setScrollFactor(0).setVisible(false);

    this.panel = scene.add.container(GameConfig.logicalWidth / 2, GameConfig.logicalHeight - 110);
    const bg = scene.add
      .rectangle(0, 0, 560, 118, 0x0f172a, 0.92)
      .setStrokeStyle(2, 0xfbbf24)
      .setScrollFactor(0);

    this.titleText = scene.add
      .text(-260, -42, '', {
        fontFamily: Fonts.display,
        fontSize: '20px',
        color: '#fbbf24',
      })
      .setScrollFactor(0);

    this.bodyText = scene.add
      .text(-260, -12, '', {
        fontFamily: Fonts.ui,
        fontSize: '15px',
        color: '#e2e8f0',
        wordWrap: { width: 420 },
      })
      .setScrollFactor(0);

    this.progressText = scene.add
      .text(250, -42, '', {
        fontFamily: Fonts.ui,
        fontSize: '12px',
        color: '#94a3b8',
      })
      .setOrigin(1, 0)
      .setScrollFactor(0);

    this.skipBtn = scene.add
      .text(250, 28, '[ SKIP · T ]', {
        fontFamily: Fonts.ui,
        fontSize: '13px',
        color: '#38bdf8',
      })
      .setOrigin(1, 0.5)
      .setScrollFactor(0)
      .setInteractive({ useHandCursor: true });

    attachButtonFeedback(scene, this.skipBtn, { hoverScale: 1.08 });
    this.skipBtn.on('pointerdown', () => this.skipAll());

    this.panel.add([bg, this.titleText, this.bodyText, this.progressText, this.skipBtn]);
    this.root.add(this.panel);

    this.onSkipKey = (ev: KeyboardEvent) => {
      if (!this.active) return;
      if (ev.code === 'KeyT' || ev.key === 't' || ev.key === 'T') {
        ev.preventDefault();
        this.skipAll();
      }
    };
  }

  isActive(): boolean {
    return this.active;
  }

  /** Esc while tutorial active: skip tutorial (does not leave to menu). */
  handleEscSkip(): boolean {
    if (!this.active) return false;
    this.skipAll();
    return true;
  }

  start(): void {
    if (this.active) return;
    this.active = true;
    this.stepIndex = 0;
    this.draftSeen = false;
    this.draftPicked = false;
    this.surviveArmed = false;
    this.root.setVisible(true);
    this.showStep(0);
    this.panel.setAlpha(0).setScale(0.92);
    this.scene.tweens.add({
      targets: this.panel,
      alpha: 1,
      scale: 1,
      duration: 180,
      ease: 'Back.easeOut',
    });

    this.unsubs.push(
      eventBus.on(GameEvents.DraftOpen, () => {
        if (!this.active) return;
        this.draftSeen = true;
        if (this.current()?.id === 'xp' || this.current()?.id === 'autofire') {
          this.goToStep('draft');
        } else if (this.current()?.id !== 'draft' && this.current()?.id !== 'survive') {
          this.goToStep('draft');
        }
      }),
    );
    this.unsubs.push(
      eventBus.on(GameEvents.DraftClose, () => {
        if (!this.active) return;
        if (this.draftSeen) {
          this.draftPicked = true;
          if (this.current()?.id === 'draft') this.advance();
        }
      }),
    );

    window.addEventListener('keydown', this.onSkipKey);
  }

  update(_time: number): void {
    if (!this.active) return;
    // Stay readable while paused / drafting; do not advance on timers alone during pause
    // except autofire tip which uses a short dwell after move.
    const step = this.current();
    if (!step) return;

    if (step.id === 'move' && this.host.getPlayerMoved()) {
      this.advance();
      return;
    }
    if (step.id === 'autofire') {
      const elapsed = this.scene.time.now - this.stepEnteredAt;
      if (elapsed > 2200 && !this.host.isPaused()) {
        this.advance();
      }
      return;
    }
    if (step.id === 'xp' && this.host.getXpCollected()) {
      this.advance();
      return;
    }
    if (step.id === 'draft' && this.draftPicked) {
      this.advance();
      return;
    }
    if (step.id === 'survive') {
      if (!this.surviveArmed) {
        this.surviveArmed = true;
        this.stepEnteredAt = this.scene.time.now;
      } else if (this.scene.time.now - this.stepEnteredAt > 2800 && !this.host.isPaused()) {
        this.complete();
      }
    }
  }

  destroy(): void {
    this.teardownListeners();
    this.root.destroy(true);
    this.active = false;
  }

  private current(): StepDef | undefined {
    return STEPS[this.stepIndex];
  }

  private goToStep(id: TutorialStepId): void {
    const idx = STEPS.findIndex((s) => s.id === id);
    if (idx < 0 || idx === this.stepIndex) return;
    this.showStep(idx);
  }

  private advance(): void {
    if (this.stepIndex >= STEPS.length - 1) {
      this.complete();
      return;
    }
    this.showStep(this.stepIndex + 1);
  }

  private showStep(index: number): void {
    this.stepIndex = index;
    this.stepEnteredAt = this.scene.time.now;
    const step = STEPS[index]!;
    this.titleText.setText(step.title);
    this.bodyText.setText(step.body);
    this.progressText.setText(`${index + 1} / ${STEPS.length}`);

    // Nudge scale only — do not kill open fade (alpha) tweens
    if (this.panel.alpha < 0.5) {
      this.panel.setAlpha(1);
    }
    this.panel.setScale(0.96);
    this.scene.tweens.add({
      targets: this.panel,
      scale: 1,
      duration: 120,
      ease: 'Quad.easeOut',
    });
  }

  private skipAll(): void {
    this.complete();
  }

  private complete(): void {
    if (!this.active) return;
    this.active = false;
    setTutorialCompleted(true);
    this.teardownListeners();
    this.scene.tweens.add({
      targets: this.panel,
      alpha: 0,
      scale: 0.9,
      duration: 160,
      onComplete: () => this.root.setVisible(false),
    });
  }

  private teardownListeners(): void {
    for (const u of this.unsubs) u();
    this.unsubs = [];
    window.removeEventListener('keydown', this.onSkipKey);
  }
}
