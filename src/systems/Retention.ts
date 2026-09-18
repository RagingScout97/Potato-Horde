/**
 * Retention systems (Phase 21): daily challenge, achievements, pity, analytics stub.
 */

import { loadSave, writeSave } from '@/save/SaveManager';
import { localDayKey, grantRewardOnce } from '@/systems/Rewards';
import { SeededRng } from '@/utils/rng';

export const ACHIEVEMENTS = [
  { id: 'first_blood', name: 'First Blood', desc: 'Get 1 kill' },
  { id: 'survivor_5m', name: 'Warmup', desc: 'Survive 5 minutes' },
  { id: 'combo_10', name: 'On Fire', desc: 'Reach 10 kill combo' },
  { id: 'boss_slayer', name: 'Boss Slayer', desc: 'Kill a boss' },
  { id: 'chapter_clear', name: 'Story Start', desc: 'Clear a chapter' },
  { id: 'daily_try', name: 'Daily Driver', desc: 'Play a daily challenge' },
] as const;

export type AchievementId = (typeof ACHIEVEMENTS)[number]['id'];

/** Deterministic daily seed from local calendar day (T501). */
export function dailyChallengeSeed(d = new Date()): number {
  const key = localDayKey(d);
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) || 1;
}

export function ensureDailyChallenge(): { day: string; seed: number } {
  const save = loadSave();
  const day = localDayKey();
  const seed = dailyChallengeSeed();
  if (save.daily.lastDailyId !== day || save.daily.challengeSeed == null) {
    // Midnight reset: new day clears challenge bests for the board (T520)
    if (save.daily.lastDailyId && save.daily.lastDailyId !== day) {
      save.daily.challengeBestKills = 0;
      save.daily.challengeBestSeconds = 0;
    }
    save.daily.challengeSeed = seed;
    writeSave(save);
  }
  return { day, seed: save.daily.challengeSeed ?? seed };
}

export function recordDailyBest(kills: number, seconds: number): boolean {
  const save = loadSave();
  ensureDailyChallenge();
  let improved = false;
  if (kills > (save.daily.challengeBestKills ?? 0)) {
    save.daily.challengeBestKills = kills;
    improved = true;
  }
  if (seconds > (save.daily.challengeBestSeconds ?? 0)) {
    save.daily.challengeBestSeconds = seconds;
    improved = true;
  }
  if (improved) writeSave(save);
  return improved;
}

export function getDailyBoard(): {
  day: string;
  seed: number;
  bestKills: number;
  bestSeconds: number;
} {
  const { day, seed } = ensureDailyChallenge();
  const save = loadSave();
  return {
    day,
    seed,
    bestKills: save.daily.challengeBestKills ?? 0,
    bestSeconds: save.daily.challengeBestSeconds ?? 0,
  };
}

export function unlockAchievement(id: AchievementId): boolean {
  const save = loadSave();
  if (!Array.isArray(save.retention.achievements)) save.retention.achievements = [];
  if (save.retention.achievements.includes(id)) return false;
  save.retention.achievements.push(id);
  writeSave(save);
  trackEvent('achievement', id);
  return true;
}

export function hasAchievement(id: string): boolean {
  return (loadSave().retention.achievements ?? []).includes(id);
}

/** Pity after 3 fails — caps at 3 (T504, T516). */
export function recordRunOutcome(survived: boolean): { pityLevel: number; pityBuff: number } {
  const save = loadSave();
  if (survived) {
    save.retention.failStreak = 0;
    save.retention.pityLevel = 0;
  } else {
    save.retention.failStreak = (save.retention.failStreak ?? 0) + 1;
    if (save.retention.failStreak >= 3) {
      save.retention.pityLevel = Math.min(3, (save.retention.pityLevel ?? 0) + 1);
      save.retention.failStreak = 0;
    }
  }
  writeSave(save);
  const pityLevel = Math.min(3, save.retention.pityLevel ?? 0);
  return { pityLevel, pityBuff: pityLevel * 0.08 };
}

export function getPityDamageMult(): number {
  const lvl = Math.min(3, loadSave().retention.pityLevel ?? 0);
  return 1 + lvl * 0.08;
}

/** Comeback chest once per local day after a fail (T507, T517). */
export function tryComebackChest(): { granted: boolean; banknotes: number } {
  const save = loadSave();
  const day = localDayKey();
  if (save.retention.lastComebackAt === day) {
    return { granted: false, banknotes: 0 };
  }
  const key = `comeback:${day}`;
  const r = grantRewardOnce(key, { banknotes: 25 }, save);
  if (r.applied) {
    const s = loadSave();
    s.retention.lastComebackAt = day;
    writeSave(s);
    trackEvent('comeback_chest', day);
    return { granted: true, banknotes: 25 };
  }
  return { granted: false, banknotes: 0 };
}

export function setSessionGoal(goal: string | null): void {
  const save = loadSave();
  save.retention.sessionGoal = goal;
  writeSave(save);
}

export function getSessionGoal(): string | null {
  return loadSave().retention.sessionGoal;
}

const HOOK_COPY = [
  'One more run — the horde remembers.',
  'Draft smarter. Die louder. Unlock faster.',
  'Your pity buff is waiting if today was rough.',
  'Daily seed is live. Beat your local best.',
  'Gear up in the Hub, then dive back in.',
] as const;

export function hookCopy(index: number): string {
  return HOOK_COPY[((index % HOOK_COPY.length) + HOOK_COPY.length) % HOOK_COPY.length]!;
}

export function allHookCopy(): readonly string[] {
  return HOOK_COPY;
}

/** Analytics stub — console + ring buffer (T518–T519). */
export function trackEvent(event: string, detail = ''): void {
  const save = loadSave();
  if (!Array.isArray(save.retention.analyticsStub)) save.retention.analyticsStub = [];
  save.retention.analyticsStub.push({
    t: new Date().toISOString(),
    e: detail ? `${event}:${detail}` : event,
  });
  while (save.retention.analyticsStub.length > 30) save.retention.analyticsStub.shift();
  writeSave(save);
  if (import.meta.env.DEV) {
    console.info('[analytics]', event, detail);
  }
}

export function createDailyRng(): SeededRng {
  const { seed } = ensureDailyChallenge();
  return new SeededRng(seed);
}

export function milestoneTitle(seconds: number, kills: number): string | null {
  if (seconds >= 900) return 'Endurance Ace';
  if (seconds >= 300) return 'Field Medic';
  if (kills >= 500) return 'Potato Reaper';
  if (kills >= 100) return 'Spud Stomper';
  return null;
}
