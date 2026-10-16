import { describe, expect, it } from "vitest";
import { clonePlayer } from "../types/__tests__/fixtures.ts";
import { advanceIndividualTrainingWeek, assignIndividualProgram } from "./individual-training.ts";

describe("attribute individual program", () => {
  it("raises only the chosen attribute", () => {
    const player = clonePlayer();
    player.attributes.passing = 40;
    player.attributes.pace = 40;
    const programs = assignIndividualProgram(
      [],
      player,
      "attribute",
      4,
      1,
      2,
      undefined,
      undefined,
      "passing",
    );
    const step = advanceIndividualTrainingWeek([player], programs, {
      season: 1,
      week: 2,
      masterSeed: 7,
      leagueMatchdaysPlayed: 0,
      environmentFactor: 1,
      intensity: 100,
    });
    const next = step.players[0]!;
    expect(next.attributes.passing).toBeGreaterThan(player.attributes.passing);
    expect(next.attributes.pace).toBe(player.attributes.pace);
  });
});
