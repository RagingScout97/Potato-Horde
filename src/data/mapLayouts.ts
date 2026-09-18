/** Map / obstacle layout data (Phase 13). */

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
}

export const ChapterThemes: readonly ChapterTheme[] = [
  {
    id: 1,
    name: 'Potato Fields',
    ground: 0x1a1f2e,
    grid: 0x2a3348,
    obstacle: 0x64748b,
    crate: 0x92400e,
    pillar: 0x94a3b8,
  },
  {
    id: 2,
    name: 'Rusty Yard',
    ground: 0x1c1917,
    grid: 0x44403c,
    obstacle: 0x78716c,
    crate: 0xb45309,
    pillar: 0xa8a29e,
  },
  {
    id: 3,
    name: 'Night Market',
    ground: 0x0f172a,
    grid: 0x1e293b,
    obstacle: 0x475569,
    crate: 0xc2410c,
    pillar: 0x64748b,
  },
  {
    id: 4,
    name: 'Cold Storage',
    ground: 0x0c1a22,
    grid: 0x1e3a4c,
    obstacle: 0x64748b,
    crate: 0x9a3412,
    pillar: 0x7dd3fc,
  },
  {
    id: 5,
    name: 'Ash Basin',
    ground: 0x1c1210,
    grid: 0x3f2a26,
    obstacle: 0x78716c,
    crate: 0xa16207,
    pillar: 0xfca5a5,
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

export function getChapterTheme(chapterId: number): ChapterTheme {
  return ChapterThemes.find((t) => t.id === chapterId) ?? ChapterThemes[0]!;
}
