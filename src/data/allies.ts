/** Ally squad config (Phase 12). */

export const AllyConfig = {
  maxAllies: 3,
  visualSize: 28,
  /** Timed parachute drops (seconds of run time). */
  dropAtSeconds: [60, 150, 240] as const,
  followRadius: 72,
  followLerp: 0.14,
  separationRadius: 36,
  separationPush: 48,
  recallDistance: 420,
  fireIntervalMs: 380,
  damage: 7,
  range: 280,
  bulletSpeed: 480,
  bulletColor: 0xbae6fd,
  parachuteHeight: 220,
  parachuteDurationMs: 900,
  /** Per-slot colors (T282). */
  colors: [0x38bdf8, 0x22d3ee, 0x67e8f9] as const,
  canopyColor: 0xfef3c7,
} as const;

export type AllySlotIndex = 0 | 1 | 2;
