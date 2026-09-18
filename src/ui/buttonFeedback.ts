import type * as Phaser from 'phaser';

type InteractiveTarget = Phaser.GameObjects.GameObject & {
  setScale?: (x: number, y?: number) => unknown;
  setAlpha?: (a: number) => unknown;
};

/**
 * Hover / press scale feedback for menu buttons (perf-friendly tweens).
 */
export function attachButtonFeedback(
  scene: Phaser.Scene,
  target: InteractiveTarget,
  opts?: { hoverScale?: number; pressScale?: number },
): void {
  const hover = opts?.hoverScale ?? 1.06;
  const press = opts?.pressScale ?? 0.96;
  const base = 1;

  target.on('pointerover', () => {
    scene.tweens.killTweensOf(target);
    scene.tweens.add({ targets: target, scale: hover, duration: 90, ease: 'Quad.easeOut' });
  });
  target.on('pointerout', () => {
    scene.tweens.killTweensOf(target);
    scene.tweens.add({ targets: target, scale: base, duration: 90, ease: 'Quad.easeOut' });
  });
  target.on('pointerdown', () => {
    scene.tweens.killTweensOf(target);
    scene.tweens.add({ targets: target, scale: press, duration: 60, ease: 'Quad.easeOut' });
  });
  target.on('pointerup', () => {
    scene.tweens.killTweensOf(target);
    scene.tweens.add({ targets: target, scale: hover, duration: 60, ease: 'Quad.easeOut' });
  });
}
