import { isOnPitch, SEED_MATCHUP } from "@fussballmanager/shared";
import { describe, expect, it } from "vitest";
import { createInitialState } from "./initial-state.ts";
import { step, stepMany } from "./step.ts";

const OPEN_PLAY = new Set([
  "pass",
  "carry",
  "duel",
  "turnover",
  "shot",
  "save",
  "goal",
  "restart",
]);

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
  it("starts with kickoff then open-play events", () => {
    const { events } = play(7, 8);
    expect(events[0]?.type).toBe("kickoff");
    expect(
      events.slice(1).every((event) => OPEN_PLAY.has(event.type)),
    ).toBe(true);
    expect(events.every((event, index) => event.seq === index)).toBe(true);
  });

  it("emits pass, carry, and duel across a longer stretch", () => {
    const types = new Set<string>();
    for (let seed = 1; seed <= 12; seed += 1) {
      for (const event of play(seed, 40).events) {
        types.add(event.type);
      }
    }
    expect(types.has("pass")).toBe(true);
    expect(types.has("carry")).toBe(true);
    expect(types.has("duel")).toBe(true);
  });

  it("keeps event positions in sync with match state", () => {
    const { events, state } = play(11, 20);
    for (const event of events) {
      expect(isOnPitch(event.ball)).toBe(true);
      for (const player of event.involved) {
        expect(isOnPitch(player.position)).toBe(true);
      }
    }
    const last = events[events.length - 1];
    expect(last).toBeDefined();
    if (!last) {
      return;
    }
    expect(state.ball).toEqual(last.ball);
    for (const involved of last.involved) {
      const live = state.players.find((p) => p.playerId === involved.playerId);
      expect(live?.position).toEqual(involved.position);
    }
    if (last.type === "carry") {
      expect(state.ballCarrierId).toBe(last.player.playerId);
      expect(last.to).toEqual(last.ball);
    }
    if (last.type === "duel") {
      expect(state.ballCarrierId).toBe(last.winnerId);
    }
  });

  it("replays the same sequence for the same seed", () => {
    const a = play(99, 16).events.map((event) => ({
      type: event.type,
      seq: event.seq,
      ball: event.ball,
      involved: event.involved.map((player) => player.playerId),
    }));
    const b = play(99, 16).events.map((event) => ({
      type: event.type,
      seq: event.seq,
      ball: event.ball,
      involved: event.involved.map((player) => player.playerId),
    }));
    expect(a).toEqual(b);
  });

  it("can diverge for a different seed", () => {
    const fingerprint = (seed: number) =>
      play(seed, 16).events.map((event) => ({
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
