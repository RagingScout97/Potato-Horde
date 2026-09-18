/** Standalone UX flags (not in SaveV1 schema — keep merge-safe with other agents). */

export const UX_KEYS = {
  storyIntroSeen: 'storyIntroSeen',
  tutorialCompleted: 'tutorialCompleted',
} as const;

function readFlag(key: string): boolean {
  try {
    return localStorage.getItem(key) === '1' || localStorage.getItem(key) === 'true';
  } catch {
    return false;
  }
}

function writeFlag(key: string, value: boolean): void {
  try {
    if (value) localStorage.setItem(key, '1');
    else localStorage.removeItem(key);
  } catch {
    /* ignore quota / private mode */
  }
}

export function isStoryIntroSeen(): boolean {
  return readFlag(UX_KEYS.storyIntroSeen);
}

export function setStoryIntroSeen(seen = true): void {
  writeFlag(UX_KEYS.storyIntroSeen, seen);
}

export function isTutorialCompleted(): boolean {
  return readFlag(UX_KEYS.tutorialCompleted);
}

export function setTutorialCompleted(done = true): void {
  writeFlag(UX_KEYS.tutorialCompleted, done);
}

/** Dev / playtest helper */
export function resetUxFlags(): void {
  writeFlag(UX_KEYS.storyIntroSeen, false);
  writeFlag(UX_KEYS.tutorialCompleted, false);
}
