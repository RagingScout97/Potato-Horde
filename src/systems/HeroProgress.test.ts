import { describe, expect, it } from 'vitest';
import { createDefaultSave } from '@/save/schema';
import {
  evaluateUnlock,
  isHeroUnlocked,
  selectHero,
  syncHeroUnlocks,
} from '@/systems/HeroProgress';
import { getHero } from '@/data/heroes';
import { computeMetaBonuses } from '@/systems/MetaStats';

describe('hero unlocks (T434)', () => {
  it('starter always unlocked', () => {
    const save = createDefaultSave();
    expect(isHeroUnlocked('default', save)).toBe(true);
    expect(evaluateUnlock(getHero('default'), save)).toBe(true);
  });

  it('bruiser unlocks after chapter 1 clear', () => {
    const save = createDefaultSave();
    expect(evaluateUnlock(getHero('bruiser'), save)).toBe(false);
    save.meta.chapterBest[1] = { seconds: 100, kills: 10, stars: 1 };
    const newly = syncHeroUnlocks(save);
    expect(newly).toContain('bruiser');
    expect(isHeroUnlocked('bruiser', save)).toBe(true);
  });

  it('locked hero cannot select', () => {
    const save = createDefaultSave();
    const r = selectHero('glass', save);
    expect(r.ok).toBe(false);
  });

  it('hero passive stacks into meta', () => {
    const save = createDefaultSave();
    save.meta.unlockedHeroes = ['default', 'glass'];
    save.meta.equippedHeroId = 'glass';
    const m = computeMetaBonuses(save);
    expect(m.damageMult).toBeGreaterThan(1);
    expect(m.heroColor).toBe(0x38bdf8);
  });
});
