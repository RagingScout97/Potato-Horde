/** Chapter definitions (Phase 15). */

export interface ChapterDef {
  id: number;
  name: string;
  /** Target clear time seconds for star hint. */
  clearSeconds: number;
  recommendedPower: number;
  /** Wave / boss flavor text. */
  modifier: string;
  bossKind: 'brute' | 'spitter' | 'splitter';
  mapSeed: number;
  banknotesOnClear: number;
  banknotesOnFail: number;
}

export const Chapters: readonly ChapterDef[] = [
  {
    id: 1,
    name: 'Potato Fields',
    clearSeconds: 180,
    recommendedPower: 1,
    modifier: 'Warmup hordes',
    bossKind: 'brute',
    mapSeed: 1001,
    banknotesOnClear: 40,
    banknotesOnFail: 8,
  },
  {
    id: 2,
    name: 'Rusty Yard',
    clearSeconds: 210,
    recommendedPower: 3,
    modifier: '+ranged pressure',
    bossKind: 'spitter',
    mapSeed: 2002,
    banknotesOnClear: 55,
    banknotesOnFail: 10,
  },
  {
    id: 3,
    name: 'Night Market',
    clearSeconds: 240,
    recommendedPower: 5,
    modifier: 'Blob puddles+',
    bossKind: 'splitter',
    mapSeed: 3003,
    banknotesOnClear: 70,
    banknotesOnFail: 12,
  },
  {
    id: 4,
    name: 'Cold Storage',
    clearSeconds: 270,
    recommendedPower: 7,
    modifier: 'Faster elites',
    bossKind: 'brute',
    mapSeed: 4004,
    banknotesOnClear: 90,
    banknotesOnFail: 14,
  },
  {
    id: 5,
    name: 'Ash Basin',
    clearSeconds: 300,
    recommendedPower: 9,
    modifier: 'Boss rush cadence',
    bossKind: 'spitter',
    mapSeed: 5005,
    banknotesOnClear: 120,
    banknotesOnFail: 16,
  },
] as const;

export function getChapter(id: number): ChapterDef {
  return Chapters.find((c) => c.id === id) ?? Chapters[0]!;
}
