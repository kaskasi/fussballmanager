import { SEED_MATCHUP } from "@fussballmanager/shared";
import { describe, expect, it } from "vitest";
import { createInitialState } from "./initial-state.ts";
import { simulate } from "./step.ts";

function run(seed: number) {
  const state = createInitialState({
    home: SEED_MATCHUP.home,
    away: SEED_MATCHUP.away,
    seed,
  });
  return simulate({
    state,
    homeTactics: state.homeTactics,
    awayTactics: state.awayTactics,
  });
}

describe("simulate()", () => {
  it("plays two halves with stoppage through match_end", () => {
    const { events, finalState } = run(2026);
    const types = events.map((event) => event.type);
    expect(types[0]).toBe("kickoff");
    expect(types.filter((type) => type === "period_end")).toEqual([
      "period_end",
      "period_end",
    ]);
    expect(types[types.length - 1]).toBe("match_end");
    expect(finalState.clock.period).toBe("full_time");
    expect(finalState.phase).toBe("full_time");

    const firstEnd = events.find(
      (event) => event.type === "period_end" && event.period === "first_half",
    );
    expect(firstEnd?.clock.minute).toBe(45);
    expect(firstEnd && firstEnd.clock.stoppageMinute + firstEnd.clock.second).toBeGreaterThan(
      0,
    );

    const secondKickoff = events.find(
      (event, index) =>
        event.type === "kickoff" &&
        index > 0 &&
        events[index - 1]?.type === "period_end",
    );
    expect(secondKickoff?.clock.period).toBe("second_half");
    expect(secondKickoff?.clock.minute).toBe(45);
    if (secondKickoff?.type === "kickoff") {
      expect(secondKickoff.kickingTeamId).toBe(SEED_MATCHUP.away.team.id);
    }

    const matchEnd = events[events.length - 1];
    if (matchEnd?.type === "match_end") {
      expect(matchEnd.homeGoals).toBe(finalState.score.home);
      expect(matchEnd.awayGoals).toBe(finalState.score.away);
    }
  });

  it("replays the same full match for the same seed", () => {
    const a = run(11).events.map((event) => event.type);
    const b = run(11).events.map((event) => event.type);
    expect(a).toEqual(b);
  });
});
