import * as Phaser from 'phaser';
import { GameConfig } from '@/data/GameConfig';
import { loadSave } from '@/save/SaveManager';

/** Dev FPS overlay (screen-space). */
export class FpsOverlay {
  private text: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    const show = loadSave().settings.showFps !== false && GameConfig.debug.showFps;
    this.text = scene.add.text(12, 12, 'FPS --', {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#fbbf24',
      stroke: '#0f172a',
      strokeThickness: 3,
    });
    this.text.setScrollFactor(0);
    this.text.setDepth(3000);
    this.text.setVisible(show);
  }

  update(fps: number): void {
    const show = loadSave().settings.showFps !== false;
    this.text.setVisible(show);
    if (show) this.text.setText(`FPS ${Math.round(fps)}`);
  }
}
