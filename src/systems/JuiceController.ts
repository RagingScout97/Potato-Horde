/**
 * Micro hitstop + juice gates (T438, T457).
 */

import type Phaser from 'phaser';
import { hitstopAllowed, shakeAllowed } from '@/ui/settingsAccess';
import { loadSave } from '@/save/SaveManager';
import { GameConfig } from '@/data/GameConfig';

export class JuiceController {
  private hitstopUntil = 0;

  /** Freeze-ish feel via timeScale blip; skipped in performance mode. */
  pulseHitstop(scene: Phaser.Scene, ms = 35): void {
    if (!hitstopAllowed(loadSave())) return;
    const now = scene.time.now;
    if (now < this.hitstopUntil) return;
    this.hitstopUntil = now + ms;
    const cam = scene.cameras.main;
    const prev = scene.time.timeScale;
    scene.time.timeScale = 0.15;
    scene.tweens.timeScale = 0.15;
    scene.time.delayedCall(ms, () => {
      scene.time.timeScale = prev;
      scene.tweens.timeScale = 1;
      void cam;
    });
  }

  maybeShake(scene: Phaser.Scene, duration = 40, intensity = GameConfig.combat.cameraShakeIntensity): void {
    if (!shakeAllowed(loadSave())) return;
    scene.cameras.main.shake(duration, intensity);
  }

  maybeFlash(
    scene: Phaser.Scene,
    duration: number,
    r: number,
    g: number,
    b: number,
  ): void {
    if (!shakeAllowed(loadSave())) return;
    scene.cameras.main.flash(duration, r, g, b, false, undefined, scene);
  }
}

export const juice = new JuiceController();
