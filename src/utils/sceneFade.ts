import type * as Phaser from 'phaser';

/** Fade out current scene then start next. */
export function fadeToScene(
  scene: Phaser.Scene,
  target: string,
  duration = 250,
  data?: object,
): void {
  scene.cameras.main.fadeOut(duration, 0, 0, 0);
  scene.cameras.main.once('camerafadeoutcomplete', () => {
    scene.scene.start(target, data);
  });
}
