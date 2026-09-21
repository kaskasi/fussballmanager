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
