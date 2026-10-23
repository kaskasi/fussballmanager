import { describe, expect, it } from "vitest";
import { asMatchId } from "./ids.ts";
import { SEED_MATCHUP } from "./seed-clubs.ts";
import { buildMatchReport } from "./match-report.ts";
import type { MatchEvent } from "./match-event.ts";

describe("buildMatchReport", () => {
  it("collects goals, assists, and cards", () => {
    const home = SEED_MATCHUP.home;
    const away = SEED_MATCHUP.away;
    const scorer = home.starters[9]!.player;
    const assist = home.starters[8]!.player;
    const fouler = away.starters[2]!.player;
    const events: MatchEvent[] = [
      {
        type: "goal",
        seq: 10,
        matchId: asMatchId("m1"),
        clock: { period: "first_half", minute: 23, second: 12, stoppageMinute: 0 },
        ball: { x: 0.9, y: 0.5 },
        involved: [],
        possessionTeamId: home.team.id,
        scorer: {
          playerId: scorer.id,
          teamId: home.team.id,
          position: { x: 0.9, y: 0.5 },
        },
        assist: {
          playerId: assist.id,
          teamId: home.team.id,
          position: { x: 0.7, y: 0.5 },
        },
      },
      {
        type: "card",
        seq: 20,
        matchId: asMatchId("m1"),
        clock: { period: "second_half", minute: 67, second: 0, stoppageMinute: 0 },
        ball: { x: 0.5, y: 0.5 },
        involved: [],
        possessionTeamId: away.team.id,
        player: {
          playerId: fouler.id,
          teamId: away.team.id,
          position: { x: 0.5, y: 0.5 },
        },
        color: "yellow",
      },
    ];
    const report = buildMatchReport(events, home, away, 42, {
      playerName: (id) => (id === scorer.id ? "Scorer" : id === assist.id ? "Assist" : "Fouler"),
    });
    expect(report.goals).toHaveLength(1);
    expect(report.goals[0]?.scorerName).toBe("Scorer");
    expect(report.goals[0]?.assistName).toBe("Assist");
    expect(report.cards).toHaveLength(1);
    expect(report.playerStats.find((row) => row.playerId === scorer.id)?.goals).toBe(1);
  });

  it("lists a carded foul once (foul event plus its card event)", () => {
    const home = SEED_MATCHUP.home;
    const away = SEED_MATCHUP.away;
    const fouler = away.starters[2]!.player;
    const fouled = home.starters[4]!.player;
    const base = {
      matchId: asMatchId("m1"),
      clock: { period: "second_half" as const, minute: 62, second: 0, stoppageMinute: 0 },
      ball: { x: 0.5, y: 0.5 },
      involved: [],
      possessionTeamId: home.team.id,
    };
    const foulerRef = { playerId: fouler.id, teamId: away.team.id, position: { x: 0.5, y: 0.5 } };
    const events: MatchEvent[] = [
      {
        ...base,
        type: "foul",
        seq: 1,
        fouler: foulerRef,
        fouled: { playerId: fouled.id, teamId: home.team.id, position: { x: 0.5, y: 0.5 } },
        card: "yellow",
      },
      { ...base, type: "card", seq: 2, player: foulerRef, color: "yellow" },
    ];
    const report = buildMatchReport(events, home, away, 42, { playerName: () => "Fouler" });
    expect(report.cards).toHaveLength(1);
  });
});
