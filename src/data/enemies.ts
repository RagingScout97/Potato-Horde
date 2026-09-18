/** Enemy type registry (T104). Colors from docs/palette.md. */

export type EnemyKind = 'melee' | 'ranged' | 'blob';

export interface EnemyTypeDef {
  kind: EnemyKind;
  color: number;
  eliteColor: number;
  size: number;
  hp: number;
  speed: number;
  contactDamage: number;
  /** Ms between contact ticks while overlapping player (T094). */
  contactCooldownMs: number;
  xpReward: number;
  /** Optional ranged attack. */
  ranged?: {
    range: number;
    fireIntervalMs: number;
    bulletSpeed: number;
    bulletDamage: number;
    bulletColor: number;
  };
  /** Blob leaves hazard on death (T101). */
  puddleOnDeath?: boolean;
  puddle?: {
    radius: number;
    ttlMs: number;
    dps: number;
    tickMs: number;
  };
}

export const EnemyTypes: Record<EnemyKind, EnemyTypeDef> = {
  melee: {
    kind: 'melee',
    color: 0xef4444,
    eliteColor: 0xa855f7,
    size: 28,
    hp: 30,
    speed: 95,
    contactDamage: 8,
    contactCooldownMs: 500,
    xpReward: 1,
  },
  ranged: {
    kind: 'ranged',
    color: 0xf97316,
    eliteColor: 0xa855f7,
    size: 26,
    hp: 22,
    speed: 72,
    contactDamage: 5,
    contactCooldownMs: 600,
    xpReward: 2,
    ranged: {
      range: 300,
      fireIntervalMs: 1400,
      bulletSpeed: 260,
      bulletDamage: 6,
      bulletColor: 0xfdba74,
    },
  },
  blob: {
    kind: 'blob',
    color: 0xdc2626,
    eliteColor: 0xa855f7,
    size: 34,
    hp: 45,
    speed: 58,
    contactDamage: 10,
    contactCooldownMs: 500,
    xpReward: 3,
    puddleOnDeath: true,
    puddle: {
      radius: 36,
      ttlMs: 4000,
      dps: 4,
      tickMs: 400,
    },
  },
};

export const EnemyTuning = {
  softCap: 50,
  separationRadius: 36,
  separationStrength: 80,
  knockbackSpeed: 140,
  knockbackMs: 120,
  eliteHpMult: 2.5,
  eliteTintAlpha: 1,
  farDespawnDistance: 1600,
  minSpawnDistanceFromPlayer: 80,
  status: {
    slowMult: 0.55,
    slowMs: 1500,
    burnDps: 3,
    burnTickMs: 400,
    burnMs: 2000,
    stunMs: 600,
  },
} as const;
