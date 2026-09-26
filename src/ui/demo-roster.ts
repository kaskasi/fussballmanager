import type { Player } from "../types/player.ts";
import { generateYouthIntake } from "../youth/intake-generator.ts";

/** One deterministic U17 intake for the pipeline and campus demos. */
export function loadDemoRoster(): Player[] {
  return generateYouthIntake({
    season: 1,
    week: 34,
    seasonYear: 2026,
    clubId: "cl_fc_nordstern",
    nationality: "DE",
    region: "Schleswig-Holstein",
    facility: "academy_basic",
    idStart: 1,
    random: mulberry32(2026),
  });
}

function mulberry32(seed: number): () => number {
  let state = seed;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
