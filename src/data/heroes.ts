/** Hero roster defs (Phase 18). Color skins + passives. */

export interface HeroPassive {
  damageMult?: number;
  maxHp?: number;
  moveSpeedMult?: number;
  magnetBonus?: number;
  luckBonus?: number;
  atkSpeedMult?: number;
  armor?: number;
}

export interface HeroDef {
  id: string;
  name: string;
  /** Colored box tint. */
  color: number;
  colorHex: string;
  blurb: string;
  passive: HeroPassive;
  passiveLabel: string;
  /** Unlock: always | chapter clear | endless seconds | kills. */
  unlock:
    | { type: 'starter' }
    | { type: 'chapter'; chapterId: number }
    | { type: 'endlessSeconds'; seconds: number }
    | { type: 'totalKills'; kills: number };
}

export const HEROES: readonly HeroDef[] = [
  {
    id: 'default',
    name: 'Green Runner',
    color: 0x4ade80,
    colorHex: '#4ade80',
    blurb: 'Reliable starter. Balanced kit.',
    passive: {},
    passiveLabel: 'None',
    unlock: { type: 'starter' },
  },
  {
    id: 'bruiser',
    name: 'Bruiser',
    color: 0xf97316,
    colorHex: '#f97316',
    blurb: 'Tanky orange bruiser.',
    passive: { maxHp: 30, armor: 2, moveSpeedMult: -0.04 },
    passiveLabel: '+30 HP, +2 armor, −4% speed',
    unlock: { type: 'chapter', chapterId: 1 },
  },
  {
    id: 'glass',
    name: 'Glass Cannon',
    color: 0x38bdf8,
    colorHex: '#38bdf8',
    blurb: 'Glass cannon cyan.',
    passive: { damageMult: 0.18, maxHp: -15, atkSpeedMult: 0.08 },
    passiveLabel: '+18% dmg, +8% atk spd, −15 HP',
    unlock: { type: 'endlessSeconds', seconds: 180 },
  },
  {
    id: 'magneto',
    name: 'Magneto',
    color: 0xc084fc,
    colorHex: '#c084fc',
    blurb: 'Orb vacuum specialist.',
    passive: { magnetBonus: 40, luckBonus: 0.06 },
    passiveLabel: '+40 magnet, +6% luck',
    unlock: { type: 'totalKills', kills: 200 },
  },
] as const;

export function getHero(id: string): HeroDef {
  const h = HEROES.find((x) => x.id === id);
  if (!h) throw new Error(`Unknown hero ${id}`);
  return h;
}

export function getHeroOrDefault(id: string): HeroDef {
  return HEROES.find((x) => x.id === id) ?? HEROES[0]!;
}
