import { asPlayerId, SEED_MATCHUP } from "@fussballmanager/shared";
import { describe, expect, it } from "vitest";
import { patchPlayers } from "./helpers.ts";
import { createInitialState } from "./initial-state.ts";
import { step, stepMany } from "./step.ts";

function boxed(seed: number) {
  const initial = createInitialState({
    home: SEED_MATCHUP.home,
    away: SEED_MATCHUP.away,
    seed,
  });
  const kicked = step({
    state: initial,
    homeTactics: initial.homeTactics,
    awayTactics: initial.awayTactics,
  });
  const strikerId = asPlayerId("nord-9");
  const inBox = { x: 88, y: 48 };
  const players = patchPlayers(kicked.state.players, [
    { playerId: strikerId, position: inBox },
  ]).map((player) =>
    player.playerId === strikerId
      ? {
          ...player,
          attributes: { ...player.attributes, shooting: 96 },
          form: 90,
          fatigue: 0,
        }
      : player.role === "GK" && player.teamId === kicked.state.awayTeamId
        ? {
            ...player,
            attributes: { ...player.attributes, goalkeeping: 28 },
            form: 40,
          }
        : player,
  );
  return {
    ...kicked.state,
    phase: "open_play" as const,
    ball: inBox,
    ballCarrierId: strikerId,
    possessionTeamId: kicked.state.homeTeamId,
    players,
    pending: null,
  };
}

describe("chances", () => {
  it("produces shots from the box and follow-up save/goal/restart events", () => {
    const types = new Set<string>();
    let sawGoal = false;
    let scoreAfterGoal = { home: 0, away: 0 };

    for (let seed = 1; seed <= 24; seed += 1) {
      const start = boxed(seed);
      const { events, state } = stepMany(
        {
          state: start,
          homeTactics: start.homeTactics,
          awayTactics: start.awayTactics,
        },
        12,
      );
      for (const event of events) {
        types.add(event.type);
        if (event.type === "goal") {
          sawGoal = true;
          scoreAfterGoal = state.score;
        }
      }
    }

    expect(types.has("shot")).toBe(true);
    expect(types.has("save") || types.has("goal") || types.has("restart")).toBe(
      true,
    );
    if (sawGoal) {
      expect(scoreAfterGoal.home + scoreAfterGoal.away).toBeGreaterThan(0);
    }
  });

  it("increments score on a goal event and restarts with a kickoff", () => {
    for (let seed = 1; seed <= 40; seed += 1) {
      const start = boxed(seed);
      const { events, state } = stepMany(
        {
          state: start,
          homeTactics: start.homeTactics,
          awayTactics: start.awayTactics,
        },
        10,
      );
      const goalIndex = events.findIndex((event) => event.type === "goal");
      if (goalIndex < 0) {
        continue;
      }
      const shot = events[goalIndex - 1];
      expect(shot?.type).toBe("shot");
      if (shot?.type === "shot") {
        expect(shot.outcome).toBe("goal");
      }
      expect(state.score.home + state.score.away).toBeGreaterThan(0);
      const restart = events.slice(goalIndex + 1).find((event) => event.type === "restart");
      expect(restart?.type).toBe("restart");
      if (restart?.type === "restart") {
        expect(restart.phase).toBe("kickoff");
      }
      return;
    }
    throw new Error("No goal in 40 boxed seeds — weights may be too defensive");
  });
});
