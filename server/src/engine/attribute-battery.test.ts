import type { Player, PlayerAttributes, Squad } from "@fussballmanager/shared";
import { nordsternSquad, rheinwachtSquad } from "@fussballmanager/shared";
import { describe, expect, it } from "vitest";
import { createInitialState } from "./initial-state.ts";
import { simulate } from "./step.ts";

const SEEDS = [3, 7, 11, 19, 23, 29, 31, 37, 41, 43, 47, 53];

const LOW = 22;
const HIGH = 78;

function mapSquad(squad: Squad, paint: (player: Player) => Player): Squad {
  return {
    ...squad,
    starters: squad.starters.map((place) => ({
      ...place,
      player: paint(place.player),
    })),
    bench: squad.bench.map(paint),
  };
}

function withAttrs(
  player: Player,
  patch: Partial<PlayerAttributes>,
): Player {
  return { ...player, attributes: { ...player.attributes, ...patch } };
}

function paceCheese(player: Player): Player {
  if (player.role === "GK") {
    return player;
  }
  return withAttrs(player, {
    pace: 99,
    passing: LOW,
    tackling: LOW,
    shooting: LOW,
    stamina: 70,
    positioning: LOW,
    aerial: LOW,
    dribbling: LOW,
    goalkeeping: 8,
    heightCm: 180,
  });
}

function specialists(player: Player): Player {
  if (player.role === "GK") {
    return player;
  }
  return withAttrs(player, {
    pace: LOW,
    passing: HIGH,
    tackling: HIGH,
    shooting: HIGH,
    stamina: 70,
    positioning: HIGH,
    aerial: HIGH,
    dribbling: HIGH,
    goalkeeping: 8,
    heightCm: 180,
  });
}

function withHeight(heightCm: number) {
  return (player: Player): Player => withAttrs(player, { heightCm, aerial: 55 });
}

function tally(home: Squad) {
  let homeGoals = 0;
  let shots = 0;
  let completedPasses = 0;
  let aerials = 0;
  let aerialWins = 0;
  const homeIds = new Set(
    [...home.starters.map((place) => place.player.id), ...home.bench.map((p) => p.id)],
  );
  for (const seed of SEEDS) {
    const state = createInitialState({
      home,
      away: rheinwachtSquad,
      seed,
    });
    const { events, finalState } = simulate({
      state,
      homeTactics: state.homeTactics,
      awayTactics: state.awayTactics,
    });
    homeGoals += finalState.score.home;
    for (const event of events) {
      if (event.type === "shot" && homeIds.has(event.shooter.playerId)) {
        shots += 1;
      }
      if (
        event.type === "pass" &&
        event.complete &&
        homeIds.has(event.from.playerId)
      ) {
        completedPasses += 1;
      }
      if (event.type === "duel" && event.kind === "aerial") {
        aerials += 1;
        if (homeIds.has(event.winnerId)) {
          aerialWins += 1;
        }
      }
    }
  }
  return { homeGoals, shots, completedPasses, aerials, aerialWins };
}

describe("attribute match battery", () => {
  it("does not let a pace-only XI outscore a skilled, slow XI over 12 seeds", () => {
    const cheese = tally(mapSquad(nordsternSquad, paceCheese));
    const skilled = tally(mapSquad(nordsternSquad, specialists));
    expect(skilled.completedPasses).toBeGreaterThan(cheese.completedPasses);
  });

  it("gives 2m players more aerial wins than A-Jugend height at equal aerial skill", () => {
    const giants = tally(mapSquad(nordsternSquad, withHeight(200)));
    const youth = tally(mapSquad(nordsternSquad, withHeight(165)));
    expect(giants.aerials + youth.aerials).toBeGreaterThan(8);
    expect(giants.aerialWins).toBeGreaterThan(youth.aerialWins);
  });
});
