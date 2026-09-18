import { getChapter } from '@/data/chapters';
import { loadSave, writeSave } from '@/save/SaveManager';
import { grantRewardOnce } from '@/systems/Rewards';
import { syncHeroUnlocks } from '@/systems/HeroProgress';

export interface ChapterBestEntry {
  seconds: number;
  kills: number;
  stars: number;
}

/** Star rating optional (T338): 1 survive boss, 2 under clear time, 3 under 80% clear time. */
export function computeStars(
  cleared: boolean,
  survivedSeconds: number,
  clearSeconds: number,
): number {
  if (!cleared) return 0;
  if (survivedSeconds <= clearSeconds * 0.8) return 3;
  if (survivedSeconds <= clearSeconds) return 2;
  return 1;
}

/**
 * Apply chapter clear / fail rewards + unlock (T339, T341–T342, T352).
 * Idempotent when `runId` is provided (T364).
 */
export function applyChapterResult(opts: {
  chapterId: number;
  cleared: boolean;
  survivedSeconds: number;
  kills: number;
  runId?: string;
}): { unlockedNext: boolean; banknotes: number; stars: number } {
  const ch = getChapter(opts.chapterId);
  const save = loadSave();
  const banknotes = opts.cleared ? ch.banknotesOnClear : ch.banknotesOnFail;

  let grantedNotes = banknotes;
  if (opts.runId) {
    const key = `chapter-run:${opts.runId}`;
    const g = grantRewardOnce(key, { banknotes }, save);
    grantedNotes = g.applied ? (g.granted.banknotes ?? 0) : 0;
  } else {
    save.meta.banknotes += banknotes;
  }

  const stars = computeStars(opts.cleared, opts.survivedSeconds, ch.clearSeconds);
  if (!save.meta.chapterBest) save.meta.chapterBest = {};
  const prev = save.meta.chapterBest[opts.chapterId];
  if (
    !prev ||
    stars > prev.stars ||
    (stars === prev.stars && opts.survivedSeconds < prev.seconds)
  ) {
    save.meta.chapterBest[opts.chapterId] = {
      seconds: Math.floor(opts.survivedSeconds),
      kills: opts.kills,
      stars: Math.max(stars, prev?.stars ?? 0),
    };
  }

  let unlockedNext = false;
  if (opts.cleared) {
    const next = opts.chapterId + 1;
    if (next <= 5 && !(save.meta.unlockedChapters ?? []).includes(next)) {
      save.meta.unlockedChapters = [...(save.meta.unlockedChapters ?? [1]), next];
      unlockedNext = true;
    }
  }

  save.stats.totalRuns += 1;
  save.stats.totalKills += opts.kills;
  writeSave(save);
  syncHeroUnlocks();
  return { unlockedNext, banknotes: grantedNotes || banknotes, stars };
}

export function isChapterUnlocked(chapterId: number): boolean {
  const save = loadSave();
  return (save.meta.unlockedChapters ?? [1]).includes(chapterId);
}
