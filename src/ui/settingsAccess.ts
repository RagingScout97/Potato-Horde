/**
 * Settings helpers for juice / accessibility (Phase 19).
 */

import type { SaveV1 } from '@/save/schema';
import { loadSave, writeSave } from '@/save/SaveManager';

export type UiScale = 0.85 | 1 | 1.15;

export function readSettings(save: SaveV1 = loadSave()): SaveV1['settings'] {
  return save.settings;
}

export function uiScaleFactor(save: SaveV1 = loadSave()): number {
  const s = save.settings.uiScale;
  if (s === 0.85 || s === 1.15) return s;
  return 1;
}

export function scaledPx(base: number, save?: SaveV1): string {
  return `${Math.round(base * uiScaleFactor(save))}px`;
}

/** True when camera shake / flash / hitstop juice is allowed. */
export function juiceAllowed(save: SaveV1 = loadSave()): boolean {
  if (save.settings.performanceMode) return false;
  return true;
}

export function shakeAllowed(save: SaveV1 = loadSave()): boolean {
  if (!juiceAllowed(save)) return false;
  return !save.settings.reduceShake;
}

export function hitstopAllowed(save: SaveV1 = loadSave()): boolean {
  if (!juiceAllowed(save)) return false;
  return save.settings.hitstopEnabled !== false;
}

export function applyMuteToGame(game: Phaser.Game, muted?: boolean): void {
  const on = muted ?? loadSave().settings.muted;
  try {
    game.sound.mute = on;
  } catch {
    /* no audio context yet */
  }
}

export function toggleSetting<K extends keyof SaveV1['settings']>(
  key: K,
  value?: SaveV1['settings'][K],
): SaveV1 {
  const save = loadSave();
  if (value !== undefined) {
    save.settings[key] = value;
  } else if (typeof save.settings[key] === 'boolean') {
    (save.settings[key] as boolean) = !save.settings[key];
  }
  writeSave(save);
  return save;
}

export function cycleUiScale(save: SaveV1 = loadSave()): SaveV1 {
  const order: UiScale[] = [0.85, 1, 1.15];
  const cur = (save.settings.uiScale ?? 1) as UiScale;
  const i = order.indexOf(cur);
  save.settings.uiScale = order[(i + 1) % order.length]!;
  writeSave(save);
  return save;
}

/** Colorblind-safe palette helpers — shapes/labels preferred; accents stay distinct. */
export const ColorblindSafe = {
  hp: '#4ade80',
  hpLow: '#f97316',
  xp: '#eab308',
  danger: '#f43f5e',
  info: '#e8c070',
  muted: '#a89880',
  /** Pattern markers for enemy kinds when colorblind mode on */
  meleeMark: '■',
  rangedMark: '▲',
  blobMark: '●',
} as const;
