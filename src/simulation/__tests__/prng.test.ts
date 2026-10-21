import { describe, expect, it } from "vitest";
import { createPRNG } from "@/simulation/prng";

describe("seeded PRNG", () => {
  it("produces identical sequences for the same seed", () => {
    const a = createPRNG(1337);
    const b = createPRNG(1337);
    const seqA = Array.from({ length: 50 }, () => a.next());
    const seqB = Array.from({ length: 50 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it("produces different sequences for different seeds", () => {
    const a = createPRNG(1);
    const b = createPRNG(2);
    const seqA = Array.from({ length: 20 }, () => a.next());
    const seqB = Array.from({ length: 20 }, () => b.next());
    expect(seqA).not.toEqual(seqB);
  });

  it("returns integers within the inclusive range", () => {
    const prng = createPRNG(42);
    for (let i = 0; i < 1000; i++) {
      const v = prng.int(3, 7);
      expect(v).toBeGreaterThanOrEqual(3);
      expect(v).toBeLessThanOrEqual(7);
      expect(Number.isInteger(v)).toBe(true);
    }
  });

  it("weighted picks respect weights", () => {
    const prng = createPRNG(7);
    let heavy = 0;
    let light = 0;
    for (let i = 0; i < 1000; i++) {
      const pick = prng.weighted([
        { item: "heavy", weight: 9 },
        { item: "light", weight: 1 },
      ]);
      if (pick === "heavy") heavy++;
      else light++;
    }
    expect(heavy).toBeGreaterThan(light * 3);
  });
});
