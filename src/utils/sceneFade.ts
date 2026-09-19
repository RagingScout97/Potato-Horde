import type * as Phaser from 'phaser';

/** Fade out current scene then start next. */
export function fadeToScene(
  scene: Phaser.Scene,
  target: string,
  duration = 250,
  data?: object,
): void {
  const cam = scene.cameras.main;
  let started = false;
  const go = (): void => {
    if (started) return;
    started = true;
    scene.scene.start(target, data);
  };

  // Already fully faded (or zero duration): fade event may never fire — start immediately.
  const fade = cam.fadeEffect;
  if (duration <= 0 || (fade && !fade.isRunning && fade.alpha >= 1)) {
    go();
    return;
  }

  cam.once('camerafadeoutcomplete', go);
  cam.fadeOut(duration, 0, 0, 0);
  // Safety: if fade is cancelled / FX stalls, still transition.
  scene.time.delayedCall(duration + 120, go);
}
