/** Deterministic PRNG cursor stored on MatchState so `step` stays pure. */
export type RngState = {
  /** Original seed, for debugging / replay labels. */
  seed: number;
  /** Mulberry32 internal state. */
  value: number;
};

export function createRng(seed: number): RngState {
  return { seed, value: seed >>> 0 };
}

/** Next unit interval value in [0, 1). */
export function nextUnit(rng: RngState): { n: number; rng: RngState } {
  let t = (rng.value + 0x6d2b79f5) | 0;
  t = Math.imul(t ^ (t >>> 15), 1 | t);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  const n = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return { n, rng: { seed: rng.seed, value: t >>> 0 } };
}

export function nextInt(
  rng: RngState,
  maxExclusive: number,
): { i: number; rng: RngState } {
  if (maxExclusive <= 0) {
    throw new Error(`nextInt maxExclusive must be > 0, got ${maxExclusive}`);
  }
  const rolled = nextUnit(rng);
  return { i: Math.floor(rolled.n * maxExclusive), rng: rolled.rng };
}

export function nextRange(
  rng: RngState,
  min: number,
  max: number,
): { n: number; rng: RngState } {
  const rolled = nextUnit(rng);
  return { n: min + (max - min) * rolled.n, rng: rolled.rng };
}
