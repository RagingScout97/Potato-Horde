import { GameConfig } from '@/data/GameConfig';

export interface Vec2 {
  x: number;
  y: number;
}

/** Normalize movement vector; zero if below epsilon. */
export function normalizeMove(x: number, y: number): Vec2 {
  const len = Math.hypot(x, y);
  if (len < 1e-6) return { x: 0, y: 0 };
  return { x: x / len, y: y / len };
}

/**
 * Integrate accel toward desired velocity, then friction when no input.
 * Returns new velocity.
 */
export function integrateVelocity(
  vx: number,
  vy: number,
  inputX: number,
  inputY: number,
  dtSec: number,
  maxSpeed: number = GameConfig.player.maxSpeed,
  accel = GameConfig.player.accel,
  friction = GameConfig.player.friction,
): Vec2 {
  const dir = normalizeMove(inputX, inputY);
  let nx = vx;
  let ny = vy;

  if (dir.x !== 0 || dir.y !== 0) {
    nx += dir.x * accel * dtSec;
    ny += dir.y * accel * dtSec;
    const speed = Math.hypot(nx, ny);
    if (speed > maxSpeed) {
      const s = maxSpeed / speed;
      nx *= s;
      ny *= s;
    }
  } else {
    const speed = Math.hypot(nx, ny);
    if (speed > 0) {
      const drop = friction * dtSec;
      if (drop >= speed) {
        nx = 0;
        ny = 0;
      } else {
        const s = (speed - drop) / speed;
        nx *= s;
        ny *= s;
      }
    }
  }

  return { x: nx, y: ny };
}

/** Diagonal must not exceed axis speed (unit test helper). */
export function diagonalSpeedRatio(axisSpeed: number, diagSpeed: number): number {
  if (axisSpeed <= 0) return 0;
  return diagSpeed / axisSpeed;
}
