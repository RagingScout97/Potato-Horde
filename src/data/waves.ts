/** Wave table format (T121) — data-driven spawn phases. */
import type { EnemyKind } from '@/data/enemies';

export interface WaveEntry {
  /** Run time when this wave becomes active (seconds). */
  atSeconds: number;
  /** Override base spawn rate while this wave is current. */
  spawnRateMult: number;
  /** Forced burst count when wave starts (0 = none). */
  burstCount: number;
  /** Preferred kinds for burst. */
  burstKinds: EnemyKind[];
}

export const EndlessWaveTable: WaveEntry[] = [
  { atSeconds: 0, spawnRateMult: 1, burstCount: 0, burstKinds: [] },
  { atSeconds: 30, spawnRateMult: 1.1, burstCount: 6, burstKinds: ['melee'] },
  { atSeconds: 60, spawnRateMult: 1.25, burstCount: 8, burstKinds: ['melee', 'ranged'] },
  { atSeconds: 120, spawnRateMult: 1.4, burstCount: 10, burstKinds: ['melee', 'blob'] },
  { atSeconds: 180, spawnRateMult: 1.6, burstCount: 12, burstKinds: ['ranged', 'blob'] },
  { atSeconds: 300, spawnRateMult: 1.85, burstCount: 14, burstKinds: ['melee', 'ranged', 'blob'] },
];

export function currentWave(tSeconds: number, table = EndlessWaveTable): WaveEntry {
  let cur = table[0]!;
  for (const w of table) {
    if (tSeconds >= w.atSeconds) cur = w;
  }
  return cur;
}
