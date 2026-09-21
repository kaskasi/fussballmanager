import type { PitchPosition, PlayerMatchStatus, Squad, TeamId } from "@fussballmanager/shared";
import {
  nordsternPyramidSquad,
  nordsternSquad,
  rheinwachtSquad,
} from "@fussballmanager/shared";
import { describe, expect, it } from "vitest";
import { createInitialState } from "./initial-state.ts";
import { defendingPressure } from "./pressure.ts";
import { applyShape } from "./shape.ts";
import { simulate } from "./step.ts";

function run(home: Squad, seed: number) {
  const state = createInitialState({ home, away: rheinwachtSquad, seed });
  return simulate({
    state,
    homeTactics: state.homeTactics,
    awayTactics: state.awayTactics,
  });
}

function defendingAt(home: Squad, ball: PitchPosition) {
  const state = createInitialState({ home, away: rheinwachtSquad, seed: 1 });
  const carrier =
    state.players.find(
      (player) =>
        player.teamId === rheinwachtSquad.team.id &&
        player.onPitch &&
        player.role === "ST",
    ) ??
    state.players.find(
      (player) => player.teamId === rheinwachtSquad.team.id && player.onPitch,
    );
  if (!carrier) {
    throw new Error("No away attacker");
  }
  const next = {
    ...state,
    possessionTeamId: rheinwachtSquad.team.id,
    ballCarrierId: carrier.playerId,
    ball,
    players: state.players.map((player) =>
      player.playerId === carrier.playerId ? { ...player, position: ball } : player,
    ),
  };
  const players = applyShape(next, new Set());
  return defendingPressure({ ...next, players }, home.team.id);
}

function defendingInOwnThird(home: Squad): PlayerMatchStatus[] {
  const state = createInitialState({ home, away: rheinwachtSquad, seed: 1 });
  const carrier =
    state.players.find(
      (player) =>
        player.teamId === rheinwachtSquad.team.id &&
        player.onPitch &&
        player.role === "ST",
    ) ??
    state.players.find(
      (player) => player.teamId === rheinwachtSquad.team.id && player.onPitch,
    );
  if (!carrier) {
    throw new Error("No away attacker");
  }
  const ball = { x: 28, y: 50 };
  const next = {
    ...state,
    possessionTeamId: rheinwachtSquad.team.id,
    ballCarrierId: carrier.playerId,
    ball,
    players: state.players.map((player) =>
      player.playerId === carrier.playerId ? { ...player, position: ball } : player,
    ),
  };
  return applyShape(next, new Set());
}

function behind(
  players: readonly PlayerMatchStatus[],
  teamId: TeamId,
  xMax: number,
): number {
  return players.filter(
    (player) =>
      player.teamId === teamId && player.onPitch && player.position.x < xMax,
  ).length;
}

function defendersBehind(
  players: readonly PlayerMatchStatus[],
  teamId: TeamId,
  xMax: number,
): number {
  return players.filter(
    (player) =>
      player.teamId === teamId &&
      player.onPitch &&
      player.position.x < xMax &&
      (player.role === "CB" || player.role === "FB"),
  ).length;
}

describe("2-3-5 pyramid vs a modern back four", () => {
  it("plays a full match in the pyramid", () => {
    const { events, finalState } = run(nordsternPyramidSquad, 2026);
    expect(events[0]?.type).toBe("kickoff");
    expect(events[events.length - 1]?.type).toBe("match_end");
    expect(finalState.score.home + finalState.score.away).toBeGreaterThan(0);
  });

  it("presses with numbers high up, then is thin once the ball is behind the line", () => {
    const pyramidHigh = defendingAt(nordsternPyramidSquad, { x: 72, y: 50 });
    const modernHigh = defendingAt(nordsternSquad, { x: 72, y: 50 });
    const pyramidLow = defendingAt(nordsternPyramidSquad, { x: 22, y: 50 });
    const modernLow = defendingAt(nordsternSquad, { x: 22, y: 50 });
    expect(pyramidHigh.highCount).toBeGreaterThan(modernHigh.highCount);
    expect(pyramidLow.restCovers).toBeLessThan(modernLow.restCovers);
  });

  it("defends the own third with two backs, not a back four", () => {
    const pyramid = defendingInOwnThird(nordsternPyramidSquad);
    const modern = defendingInOwnThird(nordsternSquad);
    expect(defendersBehind(pyramid, nordsternPyramidSquad.team.id, 40)).toBe(2);
    expect(defendersBehind(modern, nordsternSquad.team.id, 40)).toBeGreaterThan(2);
    expect(
      behind(pyramid, nordsternPyramidSquad.team.id, 40),
    ).toBeLessThan(behind(modern, nordsternSquad.team.id, 40));
  });
});
