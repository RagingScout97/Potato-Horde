/**
 * Idempotent reward grants (T364–T365, T372).
 * Keys are stored on save.meta.claimedRewardKeys — never double-grant.
 */

import type { SaveV1 } from '@/save/schema';
import { loadSave, writeSave } from '@/save/SaveManager';

export interface RewardPayload {
  banknotes?: number;
  gems?: number;
}

export interface GrantResult {
  applied: boolean;
  reason: 'ok' | 'already_claimed' | 'empty';
  granted: RewardPayload;
}

function ensureClaimed(save: SaveV1): string[] {
  if (!Array.isArray(save.meta.claimedRewardKeys)) {
    save.meta.claimedRewardKeys = [];
  }
  return save.meta.claimedRewardKeys;
}

/** Pure check — does not mutate. */
export function isRewardClaimed(save: SaveV1, key: string): boolean {
  return (save.meta.claimedRewardKeys ?? []).includes(key);
}

/**
 * Grant currency once per key. Returns whether anything was applied.
 */
export function grantRewardOnce(
  key: string,
  payload: RewardPayload,
  save: SaveV1 = loadSave(),
): GrantResult {
  const claimed = ensureClaimed(save);
  if (claimed.includes(key)) {
    return { applied: false, reason: 'already_claimed', granted: {} };
  }
  const banknotes = Math.max(0, Math.floor(payload.banknotes ?? 0));
  const gems = Math.max(0, Math.floor(payload.gems ?? 0));
  if (banknotes === 0 && gems === 0) {
    return { applied: false, reason: 'empty', granted: {} };
  }
  claimed.push(key);
  save.meta.claimedRewardKeys = claimed;
  save.meta.banknotes = Math.max(0, save.meta.banknotes + banknotes);
  save.meta.gems = Math.max(0, save.meta.gems + gems);
  writeSave(save);
  return {
    applied: true,
    reason: 'ok',
    granted: { banknotes: banknotes || undefined, gems: gems || undefined },
  };
}

/** Local calendar day key YYYY-MM-DD (T363). */
export function localDayKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Daily login gems — once per local day (T363–T365). */
export function claimDailyLogin(save: SaveV1 = loadSave()): GrantResult {
  const day = localDayKey();
  const key = `daily:${day}`;
  if (save.daily.lastDailyId === day) {
    return { applied: false, reason: 'already_claimed', granted: {} };
  }
  const result = grantRewardOnce(key, { gems: 5, banknotes: 10 }, save);
  if (result.applied) {
    const s = loadSave();
    s.daily.lastDailyId = day;
    s.daily.lastClaimedAt = new Date().toISOString();
    writeSave(s);
  }
  return result;
}

/** Endless end-of-run banknotes (T357). */
export function endlessBanknotes(survivedSeconds: number, kills: number): number {
  return Math.max(1, Math.floor(survivedSeconds / 12) + Math.floor(kills / 8));
}

/** Rare gem drop chance from long runs (T358). */
export function endlessGemBonus(survivedSeconds: number, luck = 0): number {
  if (survivedSeconds < 120) return 0;
  const chance = Math.min(0.35, 0.08 + luck * 0.5 + survivedSeconds / 1800);
  // Deterministic-ish from seconds+kills proxy: caller may pass rng; here threshold on fractional
  return chance >= 0.2 ? 1 : 0;
}
