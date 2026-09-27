import {
  buildCareerEngineSquad,
  nordsternSquad,
  SEED_DIVISION,
} from "@fussballmanager/shared";
import { describe, expect, it } from "vitest";
import { runMatchday } from "./matchday.ts";

const careerSquad = buildCareerEngineSquad(
  nordsternSquad,
  Array.from({ length: 16 }, (_, index) => ({
    id: `pl_api_${index}`,
    displayName: `Career ${index}`,
    position: index === 0 ? "GK" : index < 5 ? "CB" : index < 8 ? "CM" : "CF",
    attributes: {
      shooting: 100 + index,
      passing: 98 + index,
      dribbling: 90 + index,
      pace: 88 + index,
      stamina: 92 + index,
      positioning: 94 + index,
      strength: 90 + index,
      technique: 90 + index,
      composure: 88 + index,
      gk_handling: index === 0 ? 130 : 20,
    },
    form: 1,
    fitness: 88,
    portraitSeed: index + 3,
    overall: 110 + index,
  })),
);

describe("matchday api", () => {
  it("returns results and table for a division matchday", () => {
    const played = runMatchday({
      matchday: 1,
      baseSeed: 2026,
      clubIds: SEED_DIVISION.map((squad) => squad.team.id),
      squads: [...SEED_DIVISION],
    });
    expect(played.results).toHaveLength(3);
    expect(played.table).toHaveLength(6);
    expect(played.table[0]?.points).toBeGreaterThanOrEqual(0);
    expect(played.playerStats.length).toBeGreaterThan(0);
  });

  it("uses a career squad override for the player club", () => {
    const played = runMatchday({
      matchday: 1,
      baseSeed: 2026,
      clubIds: SEED_DIVISION.map((squad) => squad.team.id),
      squads: [...SEED_DIVISION],
      playerClubSquad: careerSquad,
    });
    const clubStats = played.playerStats.filter((row) => row.teamId === careerSquad.team.id);
    expect(clubStats.some((row) => String(row.playerId).startsWith("pl_api_"))).toBe(true);
  });
});
