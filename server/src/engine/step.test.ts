import { SEED_MATCHUP } from "@fussballmanager/shared";
import { describe, expect, it } from "vitest";
import { createInitialState } from "./initial-state.ts";
import { step, stepMany } from "./step.ts";

function play(seed: number, count: number) {
  const state = createInitialState({
    home: SEED_MATCHUP.home,
    away: SEED_MATCHUP.away,
    seed,
  });
  return stepMany(
    {
      state,
      homeTactics: state.homeTactics,
      awayTactics: state.awayTactics,
    },
    count,
  );
}

describe("step()", () => {
  it("starts with kickoff then pass or turnover events", () => {
    const { events } = play(7, 6);
    expect(events[0]?.type).toBe("kickoff");
    expect(events.slice(1).every((event) => event.type === "pass" || event.type === "turnover")).toBe(
      true,
    );
    expect(events.every((event, index) => event.seq === index)).toBe(true);
    expect(events.some((event) => event.type === "pass")).toBe(true);
  });

  it("replays the same sequence for the same seed", () => {
    const a = play(99, 10).events.map((event) => ({
      type: event.type,
      seq: event.seq,
      ball: event.ball,
      involved: event.involved.map((player) => player.playerId),
    }));
    const b = play(99, 10).events.map((event) => ({
      type: event.type,
      seq: event.seq,
      ball: event.ball,
      involved: event.involved.map((player) => player.playerId),
    }));
    expect(a).toEqual(b);
  });

  it("can diverge for a different seed", () => {
    const fingerprint = (seed: number) =>
      play(seed, 12).events.map((event) => ({
        type: event.type,
        ball: event.ball,
        involved: event.involved.map((player) => player.playerId),
      }));
    expect(fingerprint(99)).not.toEqual(fingerprint(100));
  });

  it("applies explicit tactics from StepInput", () => {
    const state = createInitialState({
      home: SEED_MATCHUP.home,
      away: SEED_MATCHUP.away,
      seed: 3,
    });
    const kicked = step({
      state,
      homeTactics: { ...state.homeTactics, pressing: 90 },
      awayTactics: state.awayTactics,
    });
    expect(kicked.state.homeTactics.pressing).toBe(90);
    expect(kicked.event.type).toBe("kickoff");
  });
});
