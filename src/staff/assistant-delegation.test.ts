import { describe, expect, it } from "vitest";
import { loadDemoRoster } from "../ui/demo-roster.ts";
import { defaultTacticsPresets } from "../match/tactics-presets.ts";
import { createScoutBoard, activeScoutCount } from "../scouting/scout-board.ts";
import { initializeRivalPlayers } from "../sim/rival-growth.ts";
import { defaultCoachingStaff } from "./coaching-staff.ts";
import {
  assistantLineupMode,
  assistantQuality,
  assistantScoutBoard,
  assistantTrainingPlan,
  buildAssistantMatchLineup,
  normalizeAssistantDelegation,
} from "./assistant-delegation.ts";

describe("assistant delegation", () => {
  const players = loadDemoRoster();
  const clubId = "cl_fc_nordstern";
  const rivals = initializeRivalPlayers(2026);

  it("derives assistant quality from attack and defense coaches", () => {
    const staff = defaultCoachingStaff(2026);
    expect(assistantQuality(staff)).toBeGreaterThanOrEqual(50);
    expect(assistantQuality(staff)).toBeLessThanOrEqual(70);
  });

  it("maps quality to lineup modes", () => {
    expect(assistantLineupMode(80)).toBe("best_eleven");
    expect(assistantLineupMode(65)).toBe("rotation");
    expect(assistantLineupMode(45)).toBe("youth");
  });

  it("builds a full match lineup for the manager club", () => {
    const lineup = buildAssistantMatchLineup(
      players,
      clubId,
      defaultTacticsPresets(),
      undefined,
      72,
      2026,
    );
    expect(Object.keys(lineup.assignments).length).toBeGreaterThanOrEqual(11);
  });

  it("creates a valid five-slot training plan with at most three focus slots", () => {
    const plan = assistantTrainingPlan(players, clubId, 75, 1, 3, 2026);
    expect(plan).toHaveLength(5);
    expect(plan.filter((slot) => slot.focus).length).toBeLessThanOrEqual(3);
  });

  it("seeds scout assignments when board is empty", () => {
    const board = assistantScoutBoard(createScoutBoard(rivals), rivals, 72, 1, 4, 2026);
    expect(board.assignments?.length).toBeGreaterThan(0);
    expect(activeScoutCount(board)).toBeGreaterThan(0);
  });

  it("normalizes delegation toggles", () => {
    expect(normalizeAssistantDelegation({ lineup: true })).toEqual({
      lineup: true,
      training: false,
      scouting: false,
    });
  });
});
