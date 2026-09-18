/** Global game / arena / player / combat tuning (data-driven). */
export const GameConfig = {
  logicalWidth: 1280,
  logicalHeight: 720,
  arena: {
    width: 4000,
    height: 4000,
    gridSize: 80,
    centerX: 2000,
    centerY: 2000,
  },
  player: {
    visualSize: 36,
    hurtboxRadius: 14,
    maxSpeed: 220,
    accel: 1400,
    friction: 1600,
    color: 0x4ade80,
  },
  combat: {
    bulletColor: 0xe2e8f0,
    bulletSize: 8,
    bulletSpeed: 520,
    bulletLifetimeMs: 1400,
    bulletMaxDistance: 700,
    maxOnScreenBullets: 80,
    poolSize: 96,
    defaultPierce: 0,
    baseDamage: 12,
    baseFireIntervalMs: 280,
    baseRange: 320,
    critChance: 0.05,
    critMult: 2,
    muzzleFlashMs: 60,
    damageNumberMs: 650,
    cameraShakeIntensity: 0.002,
    hazardColor: 0xdc2626,
  },
  playerCombat: {
    maxHp: 100,
    /** Contact i-frames after a hit (ms). */
    hurtIFramesMs: 120,
  },
  dummy: {
    color: 0xef4444,
    size: 40,
    hp: 100,
    /** Offset from arena center for Gate 4 kill test. */
    offsetX: 180,
    offsetY: 0,
  },
  /** Meta multiplier hooks (hub gear later); default 1. */
  meta: {
    atkSpeedMult: 1,
    damageMult: 1,
    rangeMult: 1,
  },
  camera: {
    lerp: 0.12,
  },
  safeZoneSeconds: 3,
  debug: {
    showFps: true,
  },
} as const;

export type GameConfigType = typeof GameConfig;
