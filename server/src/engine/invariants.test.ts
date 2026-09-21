import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { isOnPitch, SEED_MATCHUP } from "@fussballmanager/shared";
import { describe, expect, it } from "vitest";
import { createInitialState } from "./initial-state.ts";
import { invariantErrors } from "./invariants.ts";
import { simulate, step } from "./step.ts";

type GoldenMatch = {
  seed: number;
  eventCount: number;
  score: { home: number; away: number };
  types: string[];
};

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

function playChecking(seed: number) {
  let current = createInitialState({
    home: SEED_MATCHUP.home,
    away: SEED_MATCHUP.away,
    seed,
  });
  const types: string[] = [];
  for (let i = 0; i < 20_000; i += 1) {
    const result = step({
      state: current,
      homeTactics: current.homeTactics,
      awayTactics: current.awayTactics,
    });
    types.push(result.event.type);
    expect(result.event.seq).toBe(i);
    expect(invariantErrors(result.state, result.event)).toEqual([]);
    current = result.state;
    if (result.event.type === "match_end") {
      return { events: types, finalState: current, lastEvent: result.event };
    }
  }
  throw new Error(`seed ${seed} did not finish`);
}

describe("engine safety net", () => {
  it("replays seed 2026 against the golden event types and score", () => {
    const goldenPath = join(
      dirname(fileURLToPath(import.meta.url)),
      "golden",
      "seed-2026.json",
    );
    const { events, finalState } = run(2026);
    const snapshot = {
      seed: 2026,
      eventCount: events.length,
      score: finalState.score,
      types: events.map((event) => event.type),
    };
    if (process.env.UPDATE_GOLDEN === "1") {
      writeFileSync(goldenPath, `${JSON.stringify(snapshot)}\n`);
    }
    const golden = JSON.parse(readFileSync(goldenPath, "utf8")) as GoldenMatch;
    expect(snapshot.types).toEqual(golden.types);
    expect(snapshot.eventCount).toBe(golden.eventCount);
    expect(snapshot.score).toEqual(golden.score);
    const matchEnd = events[events.length - 1];
    expect(matchEnd?.type).toBe("match_end");
    if (matchEnd?.type === "match_end") {
      expect(matchEnd.homeGoals).toBe(golden.score.home);
      expect(matchEnd.awayGoals).toBe(golden.score.away);
    }
  });

  it("keeps pitch, seq, and on-pitch counts valid through a full match", () => {
    const { events, finalState, lastEvent } = playChecking(2026);
    expect(events[0]).toBe("kickoff");
    expect(events[events.length - 1]).toBe("match_end");
    expect(isOnPitch(finalState.ball)).toBe(true);
    if (lastEvent.type === "match_end") {
      expect(lastEvent.homeGoals).toBe(finalState.score.home);
      expect(lastEvent.awayGoals).toBe(finalState.score.away);
    }
  });

  it("holds invariants across many seeds without a score explosion", () => {
    let homeGoals = 0;
    let awayGoals = 0;
    let minTotal = Number.POSITIVE_INFINITY;
    let maxTotal = 0;
    for (let seed = 1; seed <= 20; seed += 1) {
      const { finalState, lastEvent } = playChecking(seed);
      homeGoals += finalState.score.home;
      awayGoals += finalState.score.away;
      const total = finalState.score.home + finalState.score.away;
      minTotal = Math.min(minTotal, total);
      maxTotal = Math.max(maxTotal, total);
      expect(total).toBeGreaterThanOrEqual(0);
      expect(finalState.score.home).toBeLessThanOrEqual(40);
      expect(finalState.score.away).toBeLessThanOrEqual(40);
      if (lastEvent.type === "match_end") {
        expect(lastEvent.homeGoals).toBe(finalState.score.home);
      }
    }
    expect(homeGoals + awayGoals).toBeGreaterThan(0);
    expect(minTotal).toBeGreaterThanOrEqual(0);
    expect(maxTotal).toBeLessThanOrEqual(80);
  });
});
