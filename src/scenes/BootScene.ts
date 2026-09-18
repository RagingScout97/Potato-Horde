import * as Phaser from 'phaser';
import { Fonts } from '@/ui/fonts';
import { isStoryIntroSeen } from '@/save/uxFlags';
import { fadeToScene } from '@/utils/sceneFade';
import { loadGameFonts, markGameReady } from '@/utils/loadFonts';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#0b0f1a');
    const label = this.add
      .text(this.scale.width / 2, this.scale.height / 2, 'Potato Horde', {
        fontFamily: Fonts.display,
        fontSize: '42px',
        color: '#fbbf24',
      })
      .setOrigin(0.5)
      .setAlpha(0.2);

    void loadGameFonts().then(() => {
      markGameReady();
      label.setAlpha(1);
      this.tweens.add({
        targets: label,
        alpha: 0.45,
        yoyo: true,
        duration: 380,
        onComplete: () => {
          const next = isStoryIntroSeen() ? 'Menu' : 'Intro';
          fadeToScene(this, next, 320);
        },
      });
    });
  }
}
