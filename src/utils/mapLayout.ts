/** Seeded obstacle layout generation (T305–T306, T304). */

import { MapConfig, type ObstacleStamp } from '@/data/mapLayouts';
import { SeededRng } from '@/utils/rng';

export interface LayoutParams {
  arenaW: number;
  arenaH: number;
  centerX: number;
  centerY: number;
  seed: number;
  chapterId: number;
}

/** Solid border walls (T308). */
export function borderWalls(arenaW: number, arenaH: number, thickness: number): ObstacleStamp[] {
  const t = thickness;
  return [
    { x: arenaW / 2, y: t / 2, w: arenaW, h: t, kind: 'border', blocksLos: true },
    { x: arenaW / 2, y: arenaH - t / 2, w: arenaW, h: t, kind: 'border', blocksLos: true },
    { x: t / 2, y: arenaH / 2, w: t, h: arenaH, kind: 'border', blocksLos: true },
    { x: arenaW - t / 2, y: arenaH / 2, w: t, h: arenaH, kind: 'border', blocksLos: true },
  ];
}

/** Four kite pillars around center (T303). */
export function kitePillars(
  cx: number,
  cy: number,
  offset: number,
  size: number,
): ObstacleStamp[] {
  const s = size;
  return [
    { x: cx - offset, y: cy - offset, w: s, h: s, kind: 'pillar', blocksLos: true },
    { x: cx + offset, y: cy - offset, w: s, h: s, kind: 'pillar', blocksLos: true },
    { x: cx - offset, y: cy + offset, w: s, h: s, kind: 'pillar', blocksLos: true },
    { x: cx + offset, y: cy + offset, w: s, h: s, kind: 'pillar', blocksLos: true },
  ];
}

function overlapsSafe(
  x: number,
  y: number,
  w: number,
  h: number,
  cx: number,
  cy: number,
  safeR: number,
): boolean {
  const dx = Math.max(Math.abs(x - cx) - w / 2, 0);
  const dy = Math.max(Math.abs(y - cy) - h / 2, 0);
  return dx * dx + dy * dy < safeR * safeR;
}

function overlapsStamp(a: ObstacleStamp, b: ObstacleStamp, pad = 24): boolean {
  return (
    Math.abs(a.x - b.x) * 2 < a.w + b.w + pad &&
    Math.abs(a.y - b.y) * 2 < a.h + b.h + pad
  );
}

/**
 * Procedural obstacle stamps + crates (T305–T306).
 * Same seed → same layout. Avoids soft-lock corners by keeping gaps.
 */
export function generateMapStamps(params: LayoutParams): ObstacleStamp[] {
  const { arenaW, arenaH, centerX, centerY, seed, chapterId } = params;
  const rng = new SeededRng(seed ^ (chapterId * 9973));
  const stamps: ObstacleStamp[] = [];

  stamps.push(...borderWalls(arenaW, arenaH, MapConfig.borderThickness));
  stamps.push(
    ...kitePillars(
      centerX,
      centerY,
      MapConfig.kitePillarOffset,
      MapConfig.kitePillarSize,
    ),
  );

  const wallCount = 10 + (chapterId % 3) * 2;
  for (let i = 0; i < wallCount; i++) {
    const w = rng.range(MapConfig.wallStampMin, MapConfig.wallStampMax);
    const h = rng.range(MapConfig.wallStampMin, MapConfig.wallStampMax);
    const pad = MapConfig.borderThickness + 80;
    const x = rng.range(pad, arenaW - pad);
    const y = rng.range(pad, arenaH - pad);
    const stamp: ObstacleStamp = {
      x,
      y,
      w,
      h,
      kind: 'wall',
      blocksLos: true,
    };
    if (overlapsSafe(x, y, w, h, centerX, centerY, MapConfig.safeRadius)) continue;
    if (stamps.some((s) => overlapsStamp(s, stamp))) continue;
    stamps.push(stamp);
  }

  const crateCount = 6 + chapterId;
  for (let i = 0; i < crateCount; i++) {
    const s = MapConfig.crateSize;
    const pad = MapConfig.borderThickness + 100;
    const x = rng.range(pad, arenaW - pad);
    const y = rng.range(pad, arenaH - pad);
    const stamp: ObstacleStamp = {
      x,
      y,
      w: s,
      h: s,
      kind: 'crate',
      blocksLos: false,
      hp: MapConfig.crateHp,
    };
    if (overlapsSafe(x, y, s, s, centerX, centerY, MapConfig.safeRadius)) continue;
    if (stamps.some((o) => overlapsStamp(o, stamp, 16))) continue;
    stamps.push(stamp);
  }

  return stamps;
}

/** Axis AABB overlap helper for unstick (T310–T311). */
export function aabbOverlap(
  ax: number,
  ay: number,
  aw: number,
  ah: number,
  bx: number,
  by: number,
  bw: number,
  bh: number,
): boolean {
  return Math.abs(ax - bx) * 2 < aw + bw && Math.abs(ay - by) * 2 < ah + bh;
}

/**
 * Push point out of overlapping AABB toward the shallow axis (unstick).
 */
export function unstickFromAabb(
  x: number,
  y: number,
  size: number,
  ox: number,
  oy: number,
  ow: number,
  oh: number,
  push: number,
): { x: number; y: number } {
  const dx = x - ox;
  const dy = y - oy;
  const overlapX = (ow + size) / 2 - Math.abs(dx);
  const overlapY = (oh + size) / 2 - Math.abs(dy);
  if (overlapX <= 0 || overlapY <= 0) return { x, y };
  if (overlapX < overlapY) {
    const sx = dx === 0 ? 1 : Math.sign(dx);
    return { x: x + sx * (overlapX + push * 0.25), y };
  }
  const sy = dy === 0 ? 1 : Math.sign(dy);
  return { x, y: y + sy * (overlapY + push * 0.25) };
}

/** Optional LoS: segment vs AABB (T300). */
export function segmentHitsAabb(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  ox: number,
  oy: number,
  ow: number,
  oh: number,
): boolean {
  const left = ox - ow / 2;
  const right = ox + ow / 2;
  const top = oy - oh / 2;
  const bottom = oy + oh / 2;
  // Liang–Barsky-ish coarse: sample midpoints
  for (let i = 0; i <= 8; i++) {
    const t = i / 8;
    const x = x1 + (x2 - x1) * t;
    const y = y1 + (y2 - y1) * t;
    if (x >= left && x <= right && y >= top && y <= bottom) return true;
  }
  return false;
}
