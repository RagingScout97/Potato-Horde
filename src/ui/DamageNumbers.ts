import * as Phaser from 'phaser';
import { GameConfig } from '@/data/GameConfig';
import { loadSave } from '@/save/SaveManager';

/** Floating combat text (T079). */
export class DamageNumbers {
  private readonly scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  spawn(x: number, y: number, amount: number, crit = false): void {
    const save = loadSave();
    if (save.settings.showDamageNumbers === false) return;
    if (save.settings.performanceMode) return;
    const color = crit ? '#fbbf24' : '#f8fafc';
    const scale = save.settings.uiScale === 0.85 || save.settings.uiScale === 1.15 ? save.settings.uiScale : 1;
    const text = this.scene.add
      .text(x, y - 12, crit ? `${amount}!` : String(amount), {
        fontFamily: 'monospace',
        fontSize: crit ? `${Math.round(16 * scale)}px` : `${Math.round(13 * scale)}px`,
        color,
        stroke: '#0f172a',
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(40);

    this.scene.tweens.add({
      targets: text,
      y: y - 48,
      alpha: 0,
      duration: GameConfig.combat.damageNumberMs,
      ease: 'Cubic.easeOut',
      onComplete: () => text.destroy(),
    });
  }
}
