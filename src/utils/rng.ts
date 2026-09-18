/** Mulberry32 seeded RNG — no Math.random() in gameplay paths. */
export class SeededRng {
  private state: number;

  constructor(seed = 1) {
    this.state = seed >>> 0 || 1;
  }

  next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  int(min: number, maxInclusive: number): number {
    return Math.floor(this.range(min, maxInclusive + 1));
  }

  pick<T>(items: readonly T[]): T {
    if (items.length === 0) {
      throw new Error('SeededRng.pick: empty array');
    }
    return items[this.int(0, items.length - 1)]!;
  }

  reseed(seed: number): void {
    this.state = seed >>> 0 || 1;
  }
}

export const rng = new SeededRng(1337);
