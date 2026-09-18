/**
 * Kill combo popup (T436) — shows streak when kills land close together.
 * Respects performance mode (T457).
 */

import * as Phaser from 'phaser';
import { GameConfig } from '@/data/GameConfig';
import { Fonts } from '@/ui/fonts';
import { juiceAllowed, scaledPx } from '@/ui/settingsAccess';
import { loadSave } from '@/save/SaveManager';

const COMBO_WINDOW_MS = 1800;

export class ComboPopup {
  private readonly scene: Phaser.Scene;
  private text: Phaser.GameObjects.Text;
  private combo = 0;
  private lastKillAt = 0;
  private hideAt = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.text = scene.add
      .text(GameConfig.logicalWidth / 2, 120, '', {
        fontFamily: Fonts.display,
        fontSize: scaledPx(28),
        color: '#fbbf24',
        stroke: '#0f172a',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(2600)
      .setVisible(false);
  }

  registerKill(nowMs: number): number {
    if (nowMs - this.lastKillAt > COMBO_WINDOW_MS) {
      this.combo = 0;
    }
    this.combo += 1;
    this.lastKillAt = nowMs;
    this.hideAt = nowMs + COMBO_WINDOW_MS;

    if (this.combo >= 2 && juiceAllowed(loadSave())) {
      this.text.setFontSize(scaledPx(24 + Math.min(12, this.combo)));
      this.text.setText(`${this.combo} KILL COMBO!`);
      this.text.setVisible(true).setAlpha(1).setScale(1.15);
      this.scene.tweens.killTweensOf(this.text);
      this.scene.tweens.add({
        targets: this.text,
        scale: 1,
        duration: 120,
        ease: 'Back.easeOut',
      });
    }
    return this.combo;
  }

  update(nowMs: number): void {
    if (this.text.visible && nowMs > this.hideAt) {
      this.scene.tweens.add({
        targets: this.text,
        alpha: 0,
        duration: 200,
        onComplete: () => this.text.setVisible(false),
      });
      this.hideAt = Number.POSITIVE_INFINITY;
    }
  }

  getCombo(): number {
    return this.combo;
  }

  destroy(): void {
    this.scene.tweens.killTweensOf(this.text);
    this.text.destroy();
  }
}
