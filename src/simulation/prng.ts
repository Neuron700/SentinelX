/**
 * Deterministic PRNG (mulberry32). Same seed always yields the same sequence.
 * Used by the simulation engine so scenarios can be replayed identically.
 */
export interface PRNG {
  next(): number;
  int(min: number, max: number): number;
  pick<T>(items: readonly T[]): T;
  weighted<T>(items: readonly { item: T; weight: number }[]): T;
  chance(probability: number): boolean;
}

export function createPRNG(seed: number): PRNG {
  let a = seed >>> 0;

  const next = (): number => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  return {
    next,
    int(min, max) {
      if (max < min) [min, max] = [max, min];
      return Math.floor(next() * (max - min + 1)) + min;
    },
    pick(items) {
      if (items.length === 0) throw new Error("pick() called with empty array");
      return items[Math.floor(next() * items.length)];
    },
    weighted(items) {
      if (items.length === 0)
        throw new Error("weighted() called with empty array");
      const total = items.reduce((sum, i) => sum + i.weight, 0);
      let roll = next() * total;
      for (const item of items) {
        roll -= item.weight;
        if (roll <= 0) return item.item;
      }
      return items[items.length - 1].item;
    },
    chance(probability) {
      return next() < probability;
    },
  };
}

export function seededShuffle<T>(items: readonly T[], prng: PRNG): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = prng.int(0, i);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
