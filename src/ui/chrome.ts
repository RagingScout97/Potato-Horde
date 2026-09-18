/**
 * UI chrome colors — warm potato / dirt apocalypse (not entity palette).
 * Entity boxes stay in docs/palette.md; menus/HUD use these.
 */

export const UiChrome = {
  /** Deep soil behind menus */
  bgDeep: 0x1a1410,
  bgDeepCss: '#1a1410',
  /** Panel fill */
  panel: 0x2a2118,
  panelCss: '#2a2118',
  /** Panel elevated / hover */
  panelLift: 0x3a2e22,
  panelLiftCss: '#3a2e22',
  /** Amber brand accent */
  accent: 0xfbbf24,
  accentCss: '#fbbf24',
  /** Soft cream text */
  text: 0xf5f0e6,
  textCss: '#f5f0e6',
  /** Muted dirt label */
  muted: 0xa89880,
  mutedCss: '#a89880',
  /** Panel stroke */
  stroke: 0x6b5344,
  strokeCss: '#6b5344',
  /** Dim overlay */
  dim: 0x120e0a,
  /** HP healthy fill */
  hp: 0x4ade80,
  hpCss: '#4ade80',
  /** HP low fill */
  hpLow: 0xf97316,
  hpLowCss: '#f97316',
  /** HP bar track */
  hpTrack: 0x1c1510,
  /** XP fill */
  xp: 0xeab308,
  xpCss: '#eab308',
  /** Danger / quit */
  danger: 0xf43f5e,
  dangerCss: '#f43f5e',
  /** Recommended draft card */
  recommendBg: 0x3a2e18,
  /** Breakthrough draft card */
  evolveBg: 0x3b1d3a,
} as const;
