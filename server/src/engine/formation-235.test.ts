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

function settle(state: Parameters<typeof applyShape>[0], ticks = 24) {
  let players = state.players;
  for (let i = 0; i < ticks; i += 1) {
    players = applyShape({ ...state, players }, new Set());
  }
  return players;
}

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
    homeTactics: { ...state.homeTactics, fluidity: 0 },
    awayTactics: { ...state.awayTactics, fluidity: 0 },
    possessionTeamId: rheinwachtSquad.team.id,
    ballCarrierId: carrier.playerId,
    ball,
    players: state.players.map((player) =>
      player.playerId === carrier.playerId ? { ...player, position: ball } : player,
    ),
  };
  const players = settle(next);
  return defendingPressure({ ...next, players }, home.team.id);
}

function defendingInOwnThird(home: Squad): readonly PlayerMatchStatus[] {
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
    homeTactics: { ...state.homeTactics, fluidity: 0 },
    awayTactics: { ...state.awayTactics, fluidity: 0 },
    possessionTeamId: rheinwachtSquad.team.id,
    ballCarrierId: carrier.playerId,
    ball,
    players: state.players.map((player) =>
      player.playerId === carrier.playerId ? { ...player, position: ball } : player,
    ),
  };
  return settle(next);
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

  it("attacks in two-three-five bands, not a back three plus a front five", () => {
    const state = createInitialState({
      home: nordsternPyramidSquad,
      away: rheinwachtSquad,
      seed: 1,
    });
    const dm = state.players.find(
      (player) =>
        player.teamId === nordsternPyramidSquad.team.id && player.role === "DM",
    );
    if (!dm) {
      throw new Error("missing DM");
    }
    const ball = { x: 48, y: 50 };
    let current = {
      ...state,
      ball,
      possessionTeamId: nordsternPyramidSquad.team.id,
      ballCarrierId: dm.playerId,
      players: state.players.map((player) =>
        player.playerId === dm.playerId ? { ...player, position: ball } : player,
      ),
    };
    for (let i = 0; i < 24; i += 1) {
      current = {
        ...current,
        players: applyShape(current, new Set()),
      };
    }
    const home = current.players.filter(
      (player) =>
        player.teamId === nordsternPyramidSquad.team.id && player.onPitch,
    );
    const xs = (role: PlayerMatchStatus["role"]) =>
      home.filter((player) => player.role === role).map((player) => player.position.x);
    const backs = xs("FB");
    const halves = [...xs("DM"), ...xs("CM")];
    const front = [...xs("W"), ...xs("ST")];
    expect(Math.max(...backs)).toBeLessThan(Math.min(...halves));
    expect(Math.max(...halves)).toBeLessThan(Math.min(...front));
    const backYs = home
      .filter((player) => player.role === "FB")
      .map((player) => player.position.y);
    expect(Math.max(...backYs) - Math.min(...backYs)).toBeLessThan(36);
  });
});
