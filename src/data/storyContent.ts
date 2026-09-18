/** Intro panels + chapter blurb stubs — see docs/STORY.md */

export interface IntroPanel {
  title: string;
  body: string;
  /** Palette hex without # for panel tint */
  tint: number;
}

export const INTRO_PANELS: IntroPanel[] = [
  {
    title: 'CRASH',
    body: 'Seed-pod down. Hatch blown. The fields are… walking.',
    tint: 0xfbbf24,
  },
  {
    title: 'HORDE',
    body: 'Potato-zombies. Endless. Hungry. Not a metaphor.',
    tint: 0xef4444,
  },
  {
    title: 'ALLIANCE',
    body: 'Green survivors. Cyan drop-ins. Scrap guns that aim themselves.',
    tint: 0x38bdf8,
  },
  {
    title: 'ENDLESS',
    body: 'No final trench. Grow a ridiculous build. Buy one more minute.',
    tint: 0xa855f7,
  },
];

export const FIRST_RUN_BRIEFING =
  'The horde never sleeps. You only move — weapons auto-fire. Draft skills. Survive.';

/** Optional between-chapter stubs (Phase 15 wiring later). */
export const CHAPTER_BLURBS: Record<number, string> = {
  1: 'Chapter 1 — Crash Site. Clear the starch fields before dusk.',
  2: 'Chapter 2 — Fryer Factory. Steam, grease, and worse.',
  3: 'Chapter 3 — Mash Pit. Soft ground. Hard choices.',
  4: 'Chapter 4 — Spud Spire. Something purple waits upstairs.',
  5: 'Chapter 5 — Endless Horizon. The alliance holds the line.',
};

export function getChapterBlurb(chapterId: number): string {
  return CHAPTER_BLURBS[chapterId] ?? `Chapter ${chapterId} — The horde presses on.`;
}
