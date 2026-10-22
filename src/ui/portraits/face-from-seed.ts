/**
 * Player and staff portraits from faces.js (ZenGM, Apache-2.0) — PRD 26, design.md §5.
 * A `portrait_seed` always yields the same face: generation runs on a seeded RNG, and the result is cached.
 */
import { generate, type FaceConfig, type Gender, type Race } from "facesjs";

export type PortraitPool = "mens_squad" | "mixed";

export type TeamColors = [string, string, string];

/** Shirt for staff, rivals without a known club, and anyone off the pitch. */
export const NEUTRAL_TEAM_COLORS: TeamColors = ["#8a958d", "#56635a", "#ffffff"];

/** faces.js has no football shirt; its "football" jersey reads as a plain crew-neck kit at portrait sizes. */
const JERSEY_ID = "football";

/**
 * Probability weights for faces.js' four appearance groups by nationality code. They only pick skin and hair
 * palettes for illustration; a nation not listed uses the German mix (the league the game is set in).
 */
const RACE_WEIGHTS: Record<string, readonly [Race, number][]> = {
  DE: [["white", 0.72], ["brown", 0.14], ["black", 0.1], ["asian", 0.04]],
  BR: [["white", 0.45], ["brown", 0.3], ["black", 0.25]],
  FR: [["white", 0.55], ["black", 0.3], ["brown", 0.15]],
  NG: [["black", 1]],
  TR: [["brown", 0.65], ["white", 0.35]],
  HR: [["white", 1]],
  PL: [["white", 1]],
};

const STAFF_FEMALE_SHARE = 0.3;

export function xorshift(seed: number): () => number {
  let state = Math.imul(seed | 0, 2654435761) >>> 0 || 1;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 4294967296;
  };
}

export function raceForNationality(nationality: string | undefined, roll: number): Race {
  const weights = RACE_WEIGHTS[(nationality ?? "").toUpperCase()] ?? RACE_WEIGHTS.DE!;
  let acc = 0;
  for (const [race, weight] of weights) {
    acc += weight;
    if (roll < acc) return race;
  }
  return weights[weights.length - 1]![0];
}

export interface FaceFromSeedInput {
  seed: number;
  nationality?: string;
  pool?: PortraitPool;
  teamColors?: TeamColors;
}

const cache = new Map<string, FaceConfig>();
const CACHE_LIMIT = 600;

/** faces.js draws with Math.random; it is swapped for a seeded generator for the duration of one generate(). */
export function faceFromSeed({
  seed,
  nationality,
  pool = "mens_squad",
  teamColors = NEUTRAL_TEAM_COLORS,
}: FaceFromSeedInput): FaceConfig {
  const random = xorshift(seed);
  const race = raceForNationality(nationality, random());
  const gender: Gender = pool === "mixed" && random() < STAFF_FEMALE_SHARE ? "female" : "male";
  const key = `${seed}|${race}|${gender}|${teamColors.join(",")}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const original = Math.random;
  Math.random = random;
  let face: FaceConfig;
  try {
    face = generate(
      {
        teamColors,
        jersey: { id: JERSEY_ID },
        accessories: { id: "none" },
        glasses: { id: "none" },
      },
      { gender, race },
    );
  } finally {
    Math.random = original;
  }

  if (cache.size >= CACHE_LIMIT) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, face);
  return face;
}

/** Home kit as faces.js team colours: shirt, trim, accent. */
export function teamColorsForKit(kit: { primary: string; secondary: string }): TeamColors {
  return [kit.primary, kit.secondary, "#ffffff"];
}
