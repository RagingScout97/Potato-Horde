/** Map / obstacle layout data (Phase 13) + stage visual themes. */

export type ObstacleKind = 'pillar' | 'wall' | 'crate' | 'border';

export interface ObstacleStamp {
  x: number;
  y: number;
  w: number;
  h: number;
  kind: ObstacleKind;
  /** Optional LoS block (T300). Borders/walls/pillars block; crates do not. */
  blocksLos?: boolean;
  /** Destructible crate HP (T301). */
  hp?: number;
}

export interface ChapterTheme {
  id: number;
  name: string;
  ground: number;
  grid: number;
  obstacle: number;
  crate: number;
  pillar: number;
  /** Soft atmospheric haze tint (screen overlay). */
  haze: number;
  /** Drifting dust / ash particle color. */
  particle: number;
  /** Camera clear color. */
  camBg: number;
}

/** Endless / hub fallback — scorched starch fields. */
export const EndlessTheme: ChapterTheme = {
  id: 0,
  name: 'Endless Starch',
  ground: 0x1c1812,
  grid: 0x3d3428,
  obstacle: 0x6b5d4d,
  crate: 0xb45309,
  pillar: 0x8b7355,
  haze: 0x5c4030,
  particle: 0xd4a574,
  camBg: 0x14110c,
};

export const ChapterThemes: readonly ChapterTheme[] = [
  {
    id: 1,
    name: 'Potato Fields',
    ground: 0x1a2218,
    grid: 0x2f3d2a,
    obstacle: 0x5a6b52,
    crate: 0x92400e,
    pillar: 0x7a8f6e,
    haze: 0x3d5a2e,
    particle: 0xa3c47a,
    camBg: 0x12180f,
  },
  {
    id: 2,
    name: 'Rusty Yard',
    ground: 0x1c1612,
    grid: 0x4a3a30,
    obstacle: 0x7a6558,
    crate: 0xb45309,
    pillar: 0xa89080,
    haze: 0x6b4020,
    particle: 0xe8a060,
    camBg: 0x140f0c,
  },
  {
    id: 3,
    name: 'Night Market',
    ground: 0x1a1518,
    grid: 0x3a2a32,
    obstacle: 0x6a5560,
    crate: 0xc2410c,
    pillar: 0x8a7080,
    haze: 0x5a2848,
    particle: 0xf0c060,
    camBg: 0x120e10,
  },
  {
    id: 4,
    name: 'Cold Storage',
    ground: 0x141c1a,
    grid: 0x2a3c38,
    obstacle: 0x5a7068,
    crate: 0x9a3412,
    pillar: 0x7a9a90,
    haze: 0x2a5048,
    particle: 0x90c8b8,
    camBg: 0x0e1412,
  },
  {
    id: 5,
    name: 'Ash Basin',
    ground: 0x1c1210,
    grid: 0x3f2a26,
    obstacle: 0x78605c,
    crate: 0xa16207,
    pillar: 0xc08070,
    haze: 0x6b2020,
    particle: 0xfca5a5,
    camBg: 0x140c0a,
  },
] as const;

export const MapConfig = {
  borderThickness: 48,
  kitePillarSize: 72,
  kitePillarOffset: 420,
  crateSize: 40,
  crateHp: 30,
  wallStampMin: 48,
  wallStampMax: 120,
  /** Keep center spawn clear (T304). */
  safeRadius: 220,
  /** Unstick impulse when overlapping static bodies (T310–T311). */
  unstickPush: 28,
} as const;

/** chapterId 0 = endless theme; 1–5 = chapters. */
export function getChapterTheme(chapterId: number): ChapterTheme {
  if (chapterId === 0) return EndlessTheme;
  return ChapterThemes.find((t) => t.id === chapterId) ?? ChapterThemes[0]!;
}
