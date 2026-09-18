/** Endless soft scaling with hard caps (Phase 14). */

export type DifficultyPreset = 'easy' | 'normal' | 'hard';

export const DifficultyMult: Record<DifficultyPreset, number> = {
  easy: 0.75,
  normal: 1,
  hard: 1.25,
};

export const EndlessCaps = {
  /** Soft HP scale asymptote multiplier (T317–T318). */
  maxHpMult: 4,
  maxDamageMult: 2.5,
  hpPerMinute: 0.18,
  damagePerMinute: 0.08,
  /** Elite chance ramp (T319). */
  eliteBase: 0.02,
  elitePerMinute: 0.015,
  eliteCap: 0.35,
  /** Diminishing regen (T324): heal * 1/(1+k*minutes). */
  regenDiminishK: 0.12,
} as const;

/**
 * Soft HP scale: 1 + rate*minutes, capped (T317, T328).
 */
export function endlessHpMult(runSeconds: number, difficulty: DifficultyPreset = 'normal'): number {
  const minutes = Math.max(0, runSeconds) / 60;
  const raw = 1 + EndlessCaps.hpPerMinute * minutes;
  const capped = Math.min(EndlessCaps.maxHpMult, raw);
  return capped * DifficultyMult[difficulty];
}

/**
 * Soft damage scale capped (T318, T328).
 */
export function endlessDamageMult(
  runSeconds: number,
  difficulty: DifficultyPreset = 'normal',
): number {
  const minutes = Math.max(0, runSeconds) / 60;
  const raw = 1 + EndlessCaps.damagePerMinute * minutes;
  const capped = Math.min(EndlessCaps.maxDamageMult, raw);
  return capped * DifficultyMult[difficulty];
}

export function endlessEliteChance(runSeconds: number): number {
  const minutes = Math.max(0, runSeconds) / 60;
  return Math.min(
    EndlessCaps.eliteCap,
    EndlessCaps.eliteBase + EndlessCaps.elitePerMinute * minutes,
  );
}

/** Diminishing regen factor (T324). */
export function regenFactor(runSeconds: number): number {
  const minutes = Math.max(0, runSeconds) / 60;
  return 1 / (1 + EndlessCaps.regenDiminishK * minutes);
}

export const MILESTONE_SECONDS = [60, 180, 300, 600, 900] as const;
