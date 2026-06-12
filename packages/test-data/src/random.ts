// Small deterministic PRNG (mulberry32). A seeded run always produces the same
// values, which keeps test fixtures and bug reproductions stable.

export type Rng = {
  // Float in [0, 1).
  next: () => number;
  // Integer in [min, max] inclusive.
  int: (min: number, max: number) => number;
  pick: <T>(items: readonly T[]) => T;
  bool: () => boolean;
};

export function createRng(seed?: number): Rng {
  let state = (seed ?? Math.floor(Math.random() * 0xffffffff)) >>> 0;
  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (min, max) => Math.floor(next() * (max - min + 1)) + min,
    pick: (items) => items[Math.floor(next() * items.length)]!,
    bool: () => next() < 0.5,
  };
}
