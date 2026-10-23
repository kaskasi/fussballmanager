import { describe, expect, it } from "vitest";
import { asPlayerId, asTeamId } from "./ids.ts";
import { aggregatePlayerMatchStats, mergePlayerSeasonStats, topByStat } from "./match-player-stats.ts";
import type { Squad } from "./squad.ts";
import { FORMATION_PRESETS } from "./tactics.ts";

function miniSquad(teamId: string, playerId: string, name: string): Squad {
  const id = asTeamId(teamId);
  const pid = asPlayerId(playerId);
  const preset = FORMATION_PRESETS["4-4-2"];
  const player = {
    id: pid,
    teamId: id,
    name,
    role: "ST" as const,
    attributes: {
      passing: 50,
      tackling: 50,
      shooting: 70,
      pace: 50,
      stamina: 50,
      positioning: 50,
      aerial: 50,
      dribbling: 50,
      goalkeeping: 8,
      heightCm: 180,
    },
    form: 50,
    fatigue: 0,
    shirt: 9,
  };
  return {
    team: { id, name: teamId, shortName: teamId.slice(0, 3).toUpperCase() },
    tactics: {
      teamId: id,
      formation: "4-4-2",
      mentality: 50,
      width: 50,
      tempo: 50,
      marking: "zonal",
      pressing: preset.pressing,
      lineHeight: preset.lineHeight,
      intensity: preset.intensity,
      fluidity: preset.fluidity,
      keeperDuty: preset.keeperDuty,
      fullbackDuty: preset.fullbackDuty,
      dmDuty: preset.dmDuty,
      cmDuty: preset.cmDuty,
      wideDuty: preset.wideDuty,
      strikerDuty: preset.strikerDuty,
    },
    starters: [{ player, slot: "ST" }],
    bench: [],
  };
}

describe("match player stats", () => {
  it("counts goals, assists, and yellow cards from events", () => {
    const home = miniSquad("fc-home", "pl-home-9", "Striker Home");
    const away = miniSquad("fc-away", "pl-away-4", "Defender Away");
    const stats = aggregatePlayerMatchStats(
      [
        {
          type: "goal",
          seq: 1,
          matchId: "m1" as never,
          clock: { period: "first_half", minute: 12, second: 0, stoppageMinute: 0 },
          ball: { x: 0, y: 0 },
          involved: [],
          possessionTeamId: home.team.id,
          scorer: { playerId: home.starters[0]!.player.id, teamId: home.team.id, position: { x: 0, y: 0 } },
          assist: { playerId: away.starters[0]!.player.id, teamId: away.team.id, position: { x: 0, y: 0 } },
        },
        {
          type: "card",
          seq: 2,
          matchId: "m1" as never,
          clock: { period: "first_half", minute: 40, second: 0, stoppageMinute: 0 },
          ball: { x: 0, y: 0 },
          involved: [],
          possessionTeamId: home.team.id,
          player: { playerId: away.starters[0]!.player.id, teamId: away.team.id, position: { x: 0, y: 0 } },
          color: "yellow",
        },
      ],
      home,
      away,
    );
    expect(stats.find((row) => row.playerId === home.starters[0]!.player.id)?.goals).toBe(1);
    expect(stats.find((row) => row.playerId === away.starters[0]!.player.id)?.assists).toBe(1);
    expect(stats.find((row) => row.playerId === away.starters[0]!.player.id)?.yellowCards).toBe(1);
  });

  it("counts a carded foul once (the foul carries the card, the card event follows)", () => {
    const home = miniSquad("fc-home", "pl-home-9", "Striker Home");
    const away = miniSquad("fc-away", "pl-away-4", "Defender Away");
    const clock = { period: "first_half" as const, minute: 30, second: 0, stoppageMinute: 0 };
    const fouler = { playerId: away.starters[0]!.player.id, teamId: away.team.id, position: { x: 0, y: 0 } };
    const fouled = { playerId: home.starters[0]!.player.id, teamId: home.team.id, position: { x: 0, y: 0 } };
    const stats = aggregatePlayerMatchStats(
      [
        {
          type: "foul",
          seq: 1,
          matchId: "m1" as never,
          clock,
          ball: { x: 0, y: 0 },
          involved: [fouler, fouled],
          possessionTeamId: home.team.id,
          fouler,
          fouled,
          card: "yellow",
        },
        {
          type: "card",
          seq: 2,
          matchId: "m1" as never,
          clock,
          ball: { x: 0, y: 0 },
          involved: [fouler],
          possessionTeamId: home.team.id,
          player: fouler,
          color: "yellow",
        },
      ],
      home,
      away,
    );
    expect(stats.find((row) => row.playerId === fouler.playerId)?.yellowCards).toBe(1);
  });

  it("merges matchday stats into a season total", () => {
    const merged = mergePlayerSeasonStats(
      [{ playerId: asPlayerId("pl_1"), teamId: asTeamId("fc-a"), name: "A", goals: 2, assists: 0, yellowCards: 0 }],
      [{ playerId: asPlayerId("pl_1"), teamId: asTeamId("fc-a"), name: "A", goals: 1, assists: 1, yellowCards: 1 }],
    );
    expect(merged[0]).toEqual({
      playerId: asPlayerId("pl_1"),
      teamId: asTeamId("fc-a"),
      name: "A",
      goals: 3,
      assists: 1,
      yellowCards: 1,
      redCards: 0,
    });
  });

  it("ranks top scorers", () => {
    const top = topByStat(
      [
        { playerId: asPlayerId("pl_1"), teamId: asTeamId("fc-a"), name: "A", goals: 2, assists: 0, yellowCards: 0 },
        { playerId: asPlayerId("pl_2"), teamId: asTeamId("fc-b"), name: "B", goals: 5, assists: 1, yellowCards: 0 },
      ],
      "goals",
      1,
    );
    expect(top[0]?.name).toBe("B");
  });
});
