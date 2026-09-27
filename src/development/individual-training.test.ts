import { describe, expect, it } from "vitest";
import { clonePlayer } from "../types/__tests__/fixtures.ts";
import {
  advanceIndividualTrainingWeek,
  assignIndividualProgram,
  canAssignIndividualProgram,
  MAX_INDIVIDUAL_PROGRAMS,
  programForPlayer,
} from "./individual-training.ts";

describe("individual training", () => {
  it("assigns a weak-foot program and grows weak_foot over a week", () => {
    const player = clonePlayer();
    player.attributes.weak_foot = 40;
    const programs = assignIndividualProgram([], player, "weak_foot", 6, 1, 8);
    const result = advanceIndividualTrainingWeek([player], programs, { season: 1, week: 8 });
    expect(result.players[0]!.attributes.weak_foot).toBeGreaterThan(40);
    expect(programForPlayer(result.programs, player.id)?.weeksRemaining).toBe(5);
  });

  it("advances position retrain proficiency on flexibility", () => {
    const player = clonePlayer();
    player.position = "CM";
    player.flexibility = [];
    const programs = assignIndividualProgram([], player, "position_retrain", 8, 1, 8, "AM");
    const result = advanceIndividualTrainingWeek([player], programs);
    const slot = result.players[0]!.flexibility.find((entry) => entry.trained_as === "AM");
    expect(slot?.proficiency).toBeGreaterThan(0);
    expect(slot?.weeks_trained).toBe(1);
  });

  it("enforces the concurrent program cap", () => {
    const players = Array.from({ length: MAX_INDIVIDUAL_PROGRAMS + 1 }, (_, index) => {
      const player = clonePlayer();
      player.id = `pl_${index}`;
      return player;
    });
    let programs: ReturnType<typeof assignIndividualProgram> = [];
    for (const player of players.slice(0, MAX_INDIVIDUAL_PROGRAMS)) {
      programs = assignIndividualProgram(programs, player, "weak_foot", 4, 1, 1);
    }
    const blocked = canAssignIndividualProgram(players[MAX_INDIVIDUAL_PROGRAMS]!, "weak_foot", programs);
    expect(blocked.ok).toBe(false);
  });
});
