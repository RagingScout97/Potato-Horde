/**
 * Hero unlock / select (Phase 18).
 */

import { HEROES, getHero, getHeroOrDefault, type HeroDef } from '@/data/heroes';
import type { SaveV1 } from '@/save/schema';
import { loadSave, writeSave } from '@/save/SaveManager';

export function isHeroUnlocked(heroId: string, save: SaveV1 = loadSave()): boolean {
  return (save.meta.unlockedHeroes ?? ['default']).includes(heroId);
}

export function evaluateUnlock(hero: HeroDef, save: SaveV1): boolean {
  const u = hero.unlock;
  if (u.type === 'starter') return true;
  if (u.type === 'chapter') {
    const best = save.meta.chapterBest?.[u.chapterId];
    return !!best && best.stars >= 1;
  }
  if (u.type === 'endlessSeconds') {
    return (save.stats.bestEndlessSeconds ?? 0) >= u.seconds;
  }
  if (u.type === 'totalKills') {
    return (save.stats.totalKills ?? 0) >= u.kills;
  }
  return false;
}

export function unlockReason(hero: HeroDef): string {
  const u = hero.unlock;
  if (u.type === 'starter') return 'Starter';
  if (u.type === 'chapter') return `Clear Chapter ${u.chapterId}`;
  if (u.type === 'endlessSeconds') {
    const m = Math.floor(u.seconds / 60);
    return `Survive ${m}m in Endless`;
  }
  if (u.type === 'totalKills') return `Reach ${u.kills} total kills`;
  return 'Locked';
}

/** Sync unlock flags from stats (T414, T425–T426). Returns newly unlocked ids. */
export function syncHeroUnlocks(save: SaveV1 = loadSave()): string[] {
  const unlocked = new Set(save.meta.unlockedHeroes ?? ['default']);
  const newly: string[] = [];
  for (const h of HEROES) {
    if (unlocked.has(h.id)) continue;
    if (evaluateUnlock(h, save)) {
      unlocked.add(h.id);
      newly.push(h.id);
    }
  }
  save.meta.unlockedHeroes = [...unlocked];
  if (newly.length) writeSave(save);
  return newly;
}

export function selectHero(
  heroId: string,
  save: SaveV1 = loadSave(),
): { ok: boolean; error?: string } {
  syncHeroUnlocks(save);
  if (!isHeroUnlocked(heroId, save)) return { ok: false, error: 'locked' };
  try {
    getHero(heroId);
  } catch {
    return { ok: false, error: 'unknown' };
  }
  save.meta.equippedHeroId = heroId;
  writeSave(save);
  return { ok: true };
}

export function equippedHero(save: SaveV1 = loadSave()): HeroDef {
  const id = save.meta.equippedHeroId || 'default';
  if (!isHeroUnlocked(id, save)) {
    return getHeroOrDefault('default');
  }
  return getHeroOrDefault(id);
}

/** Squad roster: unlocked heroes only (T417, T430). */
export function squadRoster(save: SaveV1 = loadSave()): HeroDef[] {
  syncHeroUnlocks(save);
  return HEROES.filter((h) => isHeroUnlocked(h.id, save));
}
