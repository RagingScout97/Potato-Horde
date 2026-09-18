import { describe, expect, it } from 'vitest';
import { diagonalSpeedRatio, integrateVelocity, normalizeMove } from './movement';

describe('normalizeMove', () => {
  it('normalizes diagonal to unit length', () => {
    const v = normalizeMove(1, 1);
    expect(Math.hypot(v.x, v.y)).toBeCloseTo(1, 5);
  });

  it('returns zero for zero input', () => {
    expect(normalizeMove(0, 0)).toEqual({ x: 0, y: 0 });
  });
});

describe('integrateVelocity', () => {
  it('does not make diagonal faster than cardinal at steady state', () => {
    let card = { x: 0, y: 0 };
    let diag = { x: 0, y: 0 };
    const dt = 1 / 60;
    for (let i = 0; i < 120; i++) {
      card = integrateVelocity(card.x, card.y, 1, 0, dt);
      diag = integrateVelocity(diag.x, diag.y, 1, 1, dt);
    }
    const cardSpeed = Math.hypot(card.x, card.y);
    const diagSpeed = Math.hypot(diag.x, diag.y);
    expect(diagonalSpeedRatio(cardSpeed, diagSpeed)).toBeLessThanOrEqual(1.02);
  });
});
