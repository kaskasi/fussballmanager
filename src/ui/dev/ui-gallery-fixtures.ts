/** UI gallery fixtures: kits for the title bar samples (one per branch of titleBarColors) and a mini league. */
import { standings, type FixtureResult, type TableRow, type TeamId } from "@fussballmanager/shared";
import { DEFAULT_GENERATED_WORLD, defaultLeaguePools } from "../../sim/league-divisions.ts";
import { DEFAULT_DIVISION_ID } from "../../sim/league-pyramid.ts";
import { PLAYER_CLUB_KIT_PRIMARY, PLAYER_CLUB_KIT_SECONDARY } from "../../world/club-kit.ts";
import { NORDSTERN_TEAM_ID, type WorldClub } from "../../world/world-generator.ts";
import type { KitColors } from "../shell/title-bar-colors.ts";

export const SAMPLE_KITS: readonly { name: string; initials: string; kit: KitColors }[] = [
  { name: "Kieler FC", initials: "KFC", kit: { primary: PLAYER_CLUB_KIT_PRIMARY, secondary: PLAYER_CLUB_KIT_SECONDARY } },
  { name: "SC Lübeck", initials: "SCL", kit: { primary: "#1d3a8a", secondary: "#0f1f4d" } },
  { name: "Fortuna Husum Nord", initials: "FHN", kit: { primary: "#f2c500", secondary: "#1d3a8a" } },
  { name: "VfB Flensburg", initials: "VFB", kit: { primary: "#ffffff", secondary: "#c8102e" } },
  { name: "TSV Pinneberg Nord", initials: "TSV", kit: { primary: "#111111", secondary: "#e2e2e2" } },
  { name: "Holstein Rendsburg", initials: "HR", kit: { primary: "#e0503a", secondary: "#7a1d12" } },
  { name: "SV Goldgelb", initials: "SVG", kit: { primary: "#ffd000", secondary: "#f5c400" } },
];

/** A seeded mini league (first ten Regionalliga clubs, six rounds) for the real LeagueTable in the gallery. */
export function galleryLeague(): {
  clubIds: TeamId[];
  results: FixtureResult[];
  table: TableRow[];
  playerClubId: TeamId;
  worldClubs: readonly WorldClub[];
} {
  const pools = defaultLeaguePools();
  const pool = pools[DEFAULT_DIVISION_ID] ?? [];
  const clubIds = [NORDSTERN_TEAM_ID, ...pool.filter((id) => id !== NORDSTERN_TEAM_ID)].slice(0, 10);
  let seed = 20261022;
  const goals = () => {
    // xorshift32: the low bits of a plain LCG cycle too fast for small ranges
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    return [0, 0, 1, 1, 1, 2, 2, 3][(seed >>> 0) % 8]!;
  };
  const results: FixtureResult[] = [];
  const rotation = [...clubIds];
  for (let round = 0; round < 6; round += 1) {
    for (let index = 0; index < rotation.length / 2; index += 1) {
      results.push({
        homeTeamId: rotation[index]!,
        awayTeamId: rotation[rotation.length - 1 - index]!,
        homeGoals: goals(),
        awayGoals: goals(),
      });
    }
    rotation.splice(1, 0, rotation.pop()!);
  }
  return {
    clubIds,
    results,
    table: standings(clubIds, results),
    playerClubId: NORDSTERN_TEAM_ID,
    worldClubs: DEFAULT_GENERATED_WORLD.clubs,
  };
}

/** Twelve portrait seeds for the gallery samples. */
export const PORTRAIT_SAMPLE_SEEDS: readonly number[] = [
  11, 23, 37, 41, 58, 63, 79, 84, 97, 105, 112, 128,
];
