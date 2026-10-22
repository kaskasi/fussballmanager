import { describe, expect, it } from "vitest";
import { clonePlayer } from "../types/__tests__/fixtures.ts";
import { hasStamp } from "./ability-stamps.ts";
import {
  advanceIndividualTrainingWeek,
  appendIndividualHistory,
  assignIndividualProgram,
  INDIVIDUAL_HISTORY_LIMIT,
  type IndividualProgramResult,
  canAssignIndividualProgram,
  individualProgramFitnessDrain,
  programForPlayer,
} from "./individual-training.ts";
import {
  retrainDeterministicUnit,
  retrainSuccessProbability,
  rollRetrainSuccess,
} from "./position-retrain-roll.ts";

describe("individual training", () => {
  it("assigns attribute focus and grows the chosen attribute over a week", () => {
    const player = clonePlayer();
    const before = player.attributes.shooting;
    const programs = assignIndividualProgram(
      [],
      player,
      "attribute_focus",
      6,
      1,
      8,
      undefined,
      undefined,
      "shooting",
    );
    const result = advanceIndividualTrainingWeek([player], programs, { season: 1, week: 8 });
    expect(result.players[0]!.attributes.shooting).toBeGreaterThan(before);
  });

  it("drains fitness on hard team intensity when an individual program runs", () => {
    const player = clonePlayer();
    player.state.fitness = 88;
    const programs = assignIndividualProgram(
      [],
      player,
      "attribute_focus",
      4,
      1,
      1,
      undefined,
      undefined,
      "pace",
    );
    expect(individualProgramFitnessDrain(100)).toBe(0);
    expect(individualProgramFitnessDrain(115)).toBeGreaterThan(0);
    const result = advanceIndividualTrainingWeek([player], programs, {
      season: 1,
      week: 1,
      intensity: 115,
    });
    expect(result.players[0]!.state.fitness).toBeLessThan(88);
  });

  it("assigns a weak-foot program and grows weak_foot over a week", () => {
    const player = clonePlayer();
    player.attributes.weak_foot = 40;
    const programs = assignIndividualProgram([], player, "weak_foot", 6, 1, 8);
    const result = advanceIndividualTrainingWeek([player], programs, { season: 1, week: 8 });
    expect(result.players[0]!.attributes.weak_foot).toBeGreaterThan(40);
    expect(programForPlayer(result.programs, player.id)?.weeksRemaining).toBe(5);
  });

  it("resolves position retrain only on the final program week", () => {
    const player = clonePlayer();
    player.position = "CM";
    player.flexibility = [];
    const masterSeed = 99;
    const programs = assignIndividualProgram([], player, "position_retrain", 4, 1, 8, "AM");
    let squad = [player];
    let active = programs;
    for (let week = 1; week <= 3; week++) {
      const step = advanceIndividualTrainingWeek(squad, active, {
        season: 1,
        week,
        masterSeed,
      });
      squad = step.players;
      active = step.programs;
      expect(squad[0]!.flexibility).toHaveLength(0);
    }
    const final = advanceIndividualTrainingWeek(squad, active, { season: 1, week: 4, masterSeed });
    expect(final.retrainNotices).toHaveLength(1);
    const slot = final.players[0]!.flexibility.find((entry) => entry.trained_as === "AM");
    expect(slot).toBeDefined();
    expect(slot!.proficiency).toBeGreaterThan(0);
  });

  it("blocks a target after two failed retrain completions", () => {
    const player = clonePlayer();
    player.position = "CM";
    player.state.retrain_failures = { AM: 2 };
    const blocked = canAssignIndividualProgram(player, "position_retrain", [], "AM");
    expect(blocked.ok).toBe(false);
  });

  it("enforces the concurrent program cap", () => {
    const slots = 3;
    const players = Array.from({ length: slots + 1 }, (_, index) => {
      const player = clonePlayer();
      player.id = `pl_${index}`;
      return player;
    });
    let programs: ReturnType<typeof assignIndividualProgram> = [];
    for (const player of players.slice(0, slots)) {
      programs = assignIndividualProgram(programs, player, "weak_foot", 4, 1, 1, undefined, undefined, undefined, slots);
    }
    const blocked = canAssignIndividualProgram(
      players[slots]!,
      "weak_foot",
      programs,
      undefined,
      undefined,
      undefined,
      slots,
    );
    expect(blocked.ok).toBe(false);
  });

  it("awards a train stamp on the final program week", () => {
    const player = clonePlayer();
    player.attributes.strength = 110;
    player.attributes.positioning = 100;
    const programs = assignIndividualProgram(
      [],
      player,
      "stamp",
      10,
      1,
      1,
      undefined,
      "kopfballungeheuer",
    );
    expect(programs[0]?.weeksRemaining).toBe(10);

    let squad = [player];
    let active = programs;
    for (let week = 1; week <= 10; week++) {
      const step = advanceIndividualTrainingWeek(squad, active, { season: 1, week });
      squad = step.players;
      active = step.programs;
      if (week < 10) {
        expect(hasStamp(squad[0]!, "kopfballungeheuer")).toBe(false);
      }
    }
    expect(hasStamp(squad[0]!, "kopfballungeheuer")).toBe(true);
    expect(active).toHaveLength(0);
    expect(squad[0]!.attributes.strength).toBeGreaterThanOrEqual(113);
  });

  it("records a failure counter when the retrain roll misses", () => {
    const player = clonePlayer();
    player.position = "CM";
    player.flexibility = [];
    const startedWeek = 3;
    let masterSeed = -1;
    for (let seed = 0; seed < 500; seed += 1) {
      const probability = retrainSuccessProbability({
        plannedWeeks: 4,
        from: player.position,
        to: "RW",
        attrs: player.attributes,
        currentProficiency: 0,
      });
      const unit = retrainDeterministicUnit(seed, player.id, "RW", 1, startedWeek);
      if (!rollRetrainSuccess(unit, probability)) {
        masterSeed = seed;
        break;
      }
    }
    expect(masterSeed).toBeGreaterThanOrEqual(0);

    const programs = assignIndividualProgram(
      [],
      player,
      "position_retrain",
      4,
      1,
      startedWeek,
      "RW",
    );
    let squad = [player];
    let active = programs;
    for (let week = 1; week <= 4; week++) {
      const step = advanceIndividualTrainingWeek(squad, active, {
        season: 1,
        week,
        masterSeed,
      });
      squad = step.players;
      active = step.programs;
    }
    expect(squad[0]!.state.retrain_failures?.RW).toBe(1);
    expect(squad[0]!.flexibility[0]?.proficiency).toBeLessThan(1);
  });

  describe("progress and results", () => {
    it("given an attribute focus, when a week runs, then the program records what it added", () => {
      const player = clonePlayer();
      const before = player.attributes.shooting;
      const programs = assignIndividualProgram([], player, "attribute_focus", 6, 1, 8, undefined, undefined, "shooting");
      const step = advanceIndividualTrainingWeek([player], programs, { season: 1, week: 8 });
      const gained = programForPlayer(step.programs, player.id)?.gained ?? 0;
      expect(gained).toBeGreaterThan(0);
      expect(gained).toBeCloseTo(step.players[0]!.attributes.shooting - before, 6);
      expect(step.results).toHaveLength(0);
    });

    it("given the last week of a weak-foot program, when it runs, then a gain result is emitted", () => {
      const player = clonePlayer();
      player.attributes.weak_foot = 40;
      let squad = [player];
      let active = assignIndividualProgram([], player, "weak_foot", 4, 1, 1);
      let results: IndividualProgramResult[] = [];
      for (let week = 1; week <= 4; week++) {
        const step = advanceIndividualTrainingWeek(squad, active, { season: 1, week });
        squad = step.players;
        active = step.programs;
        results = [...results, ...step.results];
      }
      expect(active).toHaveLength(0);
      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({ playerId: player.id, kind: "weak_foot", outcome: "gain", weeks: 4, endedWeek: 4 });
      expect(results[0]!.gained).toBeCloseTo(squad[0]!.attributes.weak_foot - 40, 6);
    });

    it("reports a retrain as retrained or failed", () => {
      const player = clonePlayer();
      player.position = "CM";
      player.flexibility = [];
      let squad = [player];
      let active = assignIndividualProgram([], player, "position_retrain", 4, 1, 1, "AM");
      let results: IndividualProgramResult[] = [];
      for (let week = 1; week <= 4; week++) {
        const step = advanceIndividualTrainingWeek(squad, active, { season: 1, week, masterSeed: 99 });
        squad = step.players;
        active = step.programs;
        results = [...results, ...step.results];
      }
      expect(results).toHaveLength(1);
      expect(["retrained", "failed"]).toContain(results[0]!.outcome);
      expect(results[0]!.targetPosition).toBe("AM");
    });

    it("keeps history newest first and capped", () => {
      const entry = (n: number): IndividualProgramResult => ({
        playerId: `pl_${n}`,
        kind: "weak_foot",
        weeks: 4,
        outcome: "gain",
        gained: 1,
        season: 1,
        endedWeek: n,
      });
      let history: IndividualProgramResult[] = [];
      for (let n = 1; n <= INDIVIDUAL_HISTORY_LIMIT + 5; n++) {
        history = appendIndividualHistory(history, [entry(n)]);
      }
      expect(history).toHaveLength(INDIVIDUAL_HISTORY_LIMIT);
      expect(history[0]!.endedWeek).toBe(INDIVIDUAL_HISTORY_LIMIT + 5);
    });
  });
});
