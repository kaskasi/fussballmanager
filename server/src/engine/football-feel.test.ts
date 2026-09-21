import { SEED_MATCHUP } from "@fussballmanager/shared";
import { describe, expect, it } from "vitest";
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
    const passes = events.filter((event) => event.type === "pass").length;
    const carries = events.filter((event) => event.type === "carry").length;

    expect(goals).toBeLessThanOrEqual(8);
    expect(shots).toBeGreaterThan(8);
    expect(offsides).toBeLessThanOrEqual(12);
    expect(cards).toBeLessThanOrEqual(8);
    expect(throwIns).toBeGreaterThan(0);
    expect(passes).toBeGreaterThan(carries);
  });
});
