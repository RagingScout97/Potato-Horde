import { describe, expect, it } from 'vitest';
import {
  canContactDamage,
  nextContactTick,
  puddleExpired,
  tickPuddleTtl,
} from './combatMath';

describe('contact DPS cooldown (T114)', () => {
  it('blocks damage within cooldown window', () => {
    expect(canContactDamage(0, -Infinity, 500)).toBe(true);
    expect(canContactDamage(400, 0, 500)).toBe(false);
    expect(canContactDamage(500, 0, 500)).toBe(true);
  });

  it('computes next tick time', () => {
    expect(nextContactTick(1000, 500)).toBe(1500);
  });
});

describe('puddle TTL (T115)', () => {
  it('ticks down and expires', () => {
    expect(tickPuddleTtl(4000, 1000)).toBe(3000);
    expect(tickPuddleTtl(200, 500)).toBe(0);
    expect(puddleExpired(0)).toBe(true);
    expect(puddleExpired(1)).toBe(false);
  });
});
