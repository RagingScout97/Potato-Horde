import * as Phaser from 'phaser';
import { INTRO_PANELS } from '@/data/storyContent';
import { Fonts } from '@/ui/fonts';
import { attachButtonFeedback } from '@/ui/buttonFeedback';
import { setStoryIntroSeen } from '@/save/uxFlags';
import { fadeToScene } from '@/utils/sceneFade';

/**
 * First-launch comic / crawl panels. Skippable → Menu.
 */
export class IntroScene extends Phaser.Scene {
  private index = 0;
  private title!: Phaser.GameObjects.Text;
  private body!: Phaser.GameObjects.Text;
  private panelBg!: Phaser.GameObjects.Rectangle;
  private finished = false;

  constructor() {
    super('Intro');
  }

  create(): void {
    this.index = 0;
    this.finished = false;
    this.cameras.main.setBackgroundColor('#0b0f1a');
    this.cameras.main.fadeIn(280, 0, 0, 0);

    this.add
      .text(this.scale.width / 2, 48, 'TRANSMISSION', {
        fontFamily: Fonts.display,
        fontSize: '18px',
        color: '#94a3b8',
      })
      .setOrigin(0.5);

    this.panelBg = this.add
      .rectangle(this.scale.width / 2, this.scale.height * 0.42, 520, 260, 0x1e293b)
      .setStrokeStyle(3, 0xfbbf24);

    this.title = this.add
      .text(this.scale.width / 2, this.scale.height * 0.32, '', {
        fontFamily: Fonts.display,
        fontSize: '40px',
        color: '#fbbf24',
      })
      .setOrigin(0.5);

    this.body = this.add
      .text(this.scale.width / 2, this.scale.height * 0.48, '', {
        fontFamily: Fonts.ui,
        fontSize: '20px',
        color: '#e2e8f0',
        align: 'center',
        wordWrap: { width: 440 },
      })
      .setOrigin(0.5);

    const nextHint = this.add
      .text(this.scale.width / 2, this.scale.height * 0.72, 'Enter / Space / Click — next', {
        fontFamily: Fonts.ui,
        fontSize: '14px',
        color: '#94a3b8',
      })
      .setOrigin(0.5);

    const skip = this.add
      .text(this.scale.width / 2, this.scale.height * 0.8, '[ SKIP INTRO · Esc ]', {
        fontFamily: Fonts.ui,
        fontSize: '16px',
        color: '#38bdf8',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    attachButtonFeedback(this, skip);
    skip.on('pointerdown', () => this.finish());

    this.showPanel(0);

    const advance = () => this.next();
    const onEsc = (ev: KeyboardEvent) => {
      if (ev.code === 'Escape' || ev.key === 'Escape') {
        ev.preventDefault();
        this.finish();
      }
    };
    this.input.on('pointerdown', (_p: Phaser.Input.Pointer, objs: Phaser.GameObjects.GameObject[]) => {
      if (objs.length > 0) return; // skip button handled separately
      advance();
    });
    this.input.keyboard?.on('keydown-ENTER', advance);
    this.input.keyboard?.on('keydown-SPACE', advance);
    this.input.keyboard?.on('keydown-ESC', () => this.finish());
    window.addEventListener('keydown', onEsc);

    this.tweens.add({
      targets: nextHint,
      alpha: 0.4,
      yoyo: true,
      repeat: -1,
      duration: 700,
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.off('pointerdown');
      this.input.keyboard?.off('keydown-ENTER', advance);
      this.input.keyboard?.off('keydown-SPACE', advance);
      this.input.keyboard?.removeAllListeners('keydown-ESC');
      window.removeEventListener('keydown', onEsc);
    });
  }

  private showPanel(i: number): void {
    const panel = INTRO_PANELS[i];
    if (!panel) {
      this.finish();
      return;
    }
    this.title.setText(panel.title).setColor(phaserHex(panel.tint));
    this.body.setText(panel.body);
    this.panelBg.setStrokeStyle(3, panel.tint);

    this.title.setAlpha(0).setY(this.scale.height * 0.3);
    this.body.setAlpha(0);
    this.tweens.add({ targets: this.title, alpha: 1, y: this.scale.height * 0.32, duration: 220 });
    this.tweens.add({ targets: this.body, alpha: 1, duration: 280, delay: 60 });
  }

  private next(): void {
    if (this.finished) return;
    this.index += 1;
    if (this.index >= INTRO_PANELS.length) {
      this.finish();
      return;
    }
    this.showPanel(this.index);
  }

  private finish(): void {
    if (this.finished) return;
    this.finished = true;
    setStoryIntroSeen(true);
    fadeToScene(this, 'Menu', 300);
  }
}

function phaserHex(n: number): string {
  return `#${n.toString(16).padStart(6, '0')}`;
}
