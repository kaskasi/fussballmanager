import { SEED_DIVISION, SEED_MATCHUP } from "@fussballmanager/shared";
import { describe, expect, it } from "vitest";
import { CALIBRATION_BANDS, type CalibrationMetricId } from "./calibration-bands.ts";
import { roundRobin, runCalibration, scaleSquad, seedRange } from "./calibration.ts";
import { createInitialState } from "./initial-state.ts";
import { simulate } from "./step.ts";

describe("football feel", () => {
  it("keeps seed 2026 in a football band, not indoor hockey", () => {
    const state = createInitialState({
      home: SEED_MATCHUP.home,
      away: SEED_MATCHUP.away,
      seed: 2026,
    });
    const { events, finalState } = simulate({
      state,
      homeTactics: state.homeTactics,
      awayTactics: state.awayTactics,
    });
    const goals = finalState.score.home + finalState.score.away;
    const shots = events.filter((event) => event.type === "shot").length;
    const offsides = events.filter(
      (event) => event.type === "turnover" && event.reason === "offside",
    ).length;
    const cards = events.filter((event) => event.type === "card").length;
    const throwIns = events.filter(
      (event) => event.type === "restart" && event.phase === "throw_in",
    ).length;
    const corners = events.filter(
      (event) => event.type === "restart" && event.phase === "corner",
    ).length;
    const passes = events.filter((event) => event.type === "pass").length;
    const carries = events.filter((event) => event.type === "carry").length;
    const duels = events.filter((event) => event.type === "duel");
    const aerials = duels.filter((event) => event.kind === "aerial").length;
    const errors = events.filter(
      (event) => event.type === "turnover" && event.reason === "error",
    ).length;
    let duelStreak = 0;
    let maxDuelStreak = 0;
    let passThenError = 0;
    for (let i = 0; i < events.length; i += 1) {
      const event = events[i];
      if (event?.type === "duel") {
        duelStreak += 1;
        maxDuelStreak = Math.max(maxDuelStreak, duelStreak);
      } else {
        duelStreak = 0;
      }
      const prev = events[i - 1];
      if (
        prev?.type === "pass" &&
        !prev.complete &&
        event?.type === "turnover" &&
        event.reason === "error"
      ) {
        passThenError += 1;
      }
    }

    expect(goals).toBeLessThanOrEqual(12);
    expect(shots).toBeGreaterThanOrEqual(3);
    expect(offsides).toBeLessThanOrEqual(12);
    expect(cards).toBeLessThanOrEqual(8);
    expect(throwIns).toBeGreaterThan(0);
    expect(passes).toBeGreaterThan(carries);
    expect(errors).toBeLessThanOrEqual(1);
    expect(passThenError).toBe(0);
    expect(maxDuelStreak).toBeLessThanOrEqual(3);
    expect(aerials / Math.max(1, duels.length)).toBeLessThan(0.22);
    expect(corners + throwIns).toBeGreaterThan(0);
  });
});

/**
 * ADR 0003 — calibration bands over many seeded matches (deterministic, so
 * no flakiness). Concentration metrics are guarded, not yet in band: three
 * forwards still take ~90 % of the shots (see ADR 0003, known gap).
 */
describe("calibration bands", () => {
  const seeds = seedRange(4);
  const division = runCalibration({ fixtures: roundRobin(SEED_DIVISION), seeds });

  const banded: CalibrationMetricId[] = [
    "goals",
    "shots",
    "onTarget",
    "conversion",
    "passCompletion",
    "fouls",
    "yellows",
    "reds",
    "corners",
    "drawRate",
  ];
  for (const metric of banded) {
    it(`keeps ${metric} in its band`, () => {
      const band = CALIBRATION_BANDS[metric];
      expect(division[metric]).toBeGreaterThanOrEqual(band.min);
      expect(division[metric]).toBeLessThanOrEqual(band.max);
    });
  }

  it("guards shot concentration until the midfield takes its share", () => {
    expect(division.topShooterShare).toBeLessThan(0.65);
    expect(division.hatTrickRate).toBeLessThan(0.2);
  });

  it("plays the same football at any skill level", () => {
    const low = runCalibration({
      fixtures: roundRobin(SEED_DIVISION.map((squad) => scaleSquad(squad, 0.7))),
      seeds,
    });
    expect(Math.abs(low.goals - division.goals) / division.goals).toBeLessThan(0.2);
    expect(Math.abs(low.shots - division.shots) / division.shots).toBeLessThan(0.2);
  });

  it("lets a clearly stronger side win most of the time", () => {
    const stronger = SEED_DIVISION.map((squad) => scaleSquad(squad, 1.2));
    const fixtures = stronger.flatMap((home, index) =>
      SEED_DIVISION.filter((_, other) => other !== index).map((away) => ({ home, away })),
    );
    const metrics = runCalibration({ fixtures, seeds: seedRange(2) });
    expect(metrics.homeWinRate).toBeGreaterThan(0.55);
    expect(metrics.awayWinRate).toBeLessThan(0.25);
  });
});
