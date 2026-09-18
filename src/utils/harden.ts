/**
 * Hardening helpers (Phase 20): cull, NaN, particle caps, glitch log.
 */

import { GameConfig } from '@/data/GameConfig';

export const HARDEN = {
  particleCap: 48,
  overlapBudgetPerFrame: 400,
  maxOffscreenKeep: 12,
} as const;

let particleCount = 0;

export function resetParticleBudget(): void {
  particleCount = 0;
}

export function trySpawnParticle(): boolean {
  if (particleCount >= HARDEN.particleCap) return false;
  particleCount += 1;
  return true;
}

export function releaseParticle(): void {
  particleCount = Math.max(0, particleCount - 1);
}

export function isFinitePos(x: number, y: number): boolean {
  return Number.isFinite(x) && Number.isFinite(y);
}

export function sanitizePos(
  x: number,
  y: number,
  fallbackX: number = GameConfig.arena.centerX,
  fallbackY: number = GameConfig.arena.centerY,
): { x: number; y: number } {
  return {
    x: Number.isFinite(x) ? x : fallbackX,
    y: Number.isFinite(y) ? y : fallbackY,
  };
}

/** Rough offscreen check vs camera mid (T462). */
export function isFarOffscreen(
  x: number,
  y: number,
  camX: number,
  camY: number,
  margin = 900,
): boolean {
  return Math.abs(x - camX) > margin || Math.abs(y - camY) > margin;
}

export interface GlitchEntry {
  at: string;
  code: string;
  detail: string;
  severity: 'P0' | 'P1' | 'P2';
}

const GLITCH_KEY = 'potato-horde-glitch-log';

/** Append glitch log template entry (T488). */
export function logGlitch(code: string, detail: string, severity: GlitchEntry['severity'] = 'P2'): void {
  const entry: GlitchEntry = {
    at: new Date().toISOString(),
    code,
    detail,
    severity,
  };
  try {
    const raw = localStorage.getItem(GLITCH_KEY);
    const list: GlitchEntry[] = raw ? (JSON.parse(raw) as GlitchEntry[]) : [];
    list.push(entry);
    while (list.length > 40) list.shift();
    localStorage.setItem(GLITCH_KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
  if (severity === 'P0') console.error('[GLITCH P0]', code, detail);
  else if (import.meta.env.DEV) console.warn('[GLITCH]', code, detail);
}

export function readGlitchLog(): GlitchEntry[] {
  try {
    const raw = localStorage.getItem(GLITCH_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as GlitchEntry[];
  } catch {
    return [];
  }
}

export function clearGlitchLog(): void {
  try {
    localStorage.removeItem(GLITCH_KEY);
  } catch {
    /* ignore */
  }
}
