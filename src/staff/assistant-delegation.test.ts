import { describe, expect, it } from "vitest";
import { newGameSession } from "../persistence/game-session.ts";
import { loadDemoRoster } from "../ui/demo-roster.ts";
import { defaultTacticsPresets } from "../match/tactics-presets.ts";
import { createScoutBoard } from "../scouting/scout-board.ts";
import { initializeRivalPlayers } from "../sim/rival-growth.ts";
import { defaultCoachingStaff } from "./coaching-staff.ts";
import { emptyWeeklyTrainingPlan } from "../development/training-plan-state.ts";
import {
  applyAssistantDelegationWeek,
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

  it("keeps an existing XI when the assistant sets lineup", () => {
    const seed = buildAssistantMatchLineup(
      players,
      clubId,
      defaultTacticsPresets(),
      undefined,
      72,
      2026,
    );
    const next = buildAssistantMatchLineup(
      players,
      clubId,
      defaultTacticsPresets(),
      seed,
      45,
      999,
    );
    expect(next.assignments).toEqual(seed.assignments);
  });

  it("creates a valid five-slot training plan with at most three focus slots", () => {
    const plan = assistantTrainingPlan(players, clubId, 75, 1, 3, 2026);
    expect(plan).toHaveLength(15);
    expect(plan.filter((slot) => slot.focus).length).toBeLessThanOrEqual(2);
  });

  it("seeds scout assignments when board is empty", () => {
    const session = newGameSession();
    const board = assistantScoutBoard(session.scoutBoard, rivals, 72, 1, 4, session.masterSeed);
    expect(board.assignments?.length).toBeGreaterThan(0);
    expect(board.assignments?.every((entry) => entry.active)).toBe(true);
  });

  it("normalizes delegation toggles", () => {
    expect(normalizeAssistantDelegation({ lineup: true })).toEqual({
      lineup: true,
      training: false,
      scouting: false,
    });
  });

  it("training delegation sends a reminder without changing the plan", () => {
    const plan = emptyWeeklyTrainingPlan();
    const result = applyAssistantDelegationWeek({
      delegation: { lineup: false, training: true, scouting: false },
      assistantName: "Alex",
      quality: 60,
      players,
      clubId,
      trainingPlan: plan,
      scoutBoard: createScoutBoard(rivals),
      rivalPlayers: rivals,
      tacticsPresets: defaultTacticsPresets(),
      matchLineup: undefined,
      season: 1,
      week: 2,
      masterSeed: 2026,
      hasPlayerFixture: false,
    });
    expect(result.trainingPlan).toEqual(plan);
    expect(result.messages.some((line) => line.includes("Wochenplan"))).toBe(true);
  });
});
