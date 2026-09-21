import {
  asMatchId,
  asPlayerId,
  asTeamId,
  SEED_MATCHUP,
  type MatchClock,
  type MatchEvent,
} from "@fussballmanager/shared";
import { describe, expect, it } from "vitest";
import { createInitialState, simulate } from "../engine/index.ts";
import {
  commentate,
  commentaryContextFromSquads,
  formatClock,
} from "./render.ts";

const homeId = asTeamId("fc-nordstern");
const awayId = asTeamId("sv-rheinwacht");
const matchId = asMatchId("match-sample");
const clock: MatchClock = {
  period: "first_half",
  minute: 12,
  second: 18,
  stoppageMinute: 0,
};
const pos = { x: 50, y: 50 };

const ctx = commentaryContextFromSquads(SEED_MATCHUP.home, SEED_MATCHUP.away);

function player(id: string, teamId = homeId) {
  return { playerId: asPlayerId(id), teamId, position: pos };
}

describe("template commentary", () => {
  it("formats stoppage clocks", () => {
    expect(formatClock(clock)).toBe("12'18");
    expect(
      formatClock({
        period: "first_half",
        minute: 45,
        second: 7,
        stoppageMinute: 1,
      }),
    ).toBe("45+1'07");
    expect(
      formatClock({
        period: "second_half",
        minute: 90,
        second: 2,
        stoppageMinute: 0,
      }),
    ).toBe("90+0'02");
  });

  it("turns named players into sentences", () => {
    const from = player("nord-8");
    const to = player("nord-9");
    const pass: MatchEvent = {
      type: "pass",
      seq: 13,
      matchId,
      clock,
      ball: pos,
      involved: [from, to],
      possessionTeamId: homeId,
      from,
      to,
      complete: true,
    };
    const shot: MatchEvent = {
      type: "shot",
      seq: 14,
      matchId,
      clock,
      ball: pos,
      involved: [to],
      possessionTeamId: homeId,
      shooter: to,
      target: { x: 100, y: 48 },
      outcome: "save",
    };
    expect(commentate(pass, ctx)).toBe("Theo Brandt finds Juri Holm.");
    expect(commentate(shot, ctx)).toBe("Juri Holm forces a save.");
  });

  it("covers every event type with a non-empty template", () => {
    const nord = player("nord-8");
    const rhein = player("rhein-5", awayId);
    const keeper = player("rhein-1", awayId);
    const bench = player("nord-12");
    const events: MatchEvent[] = [
      {
        type: "kickoff",
        seq: 1,
        matchId,
        clock,
        ball: pos,
        involved: [nord],
        possessionTeamId: homeId,
        kickingTeamId: homeId,
      },
      {
        type: "pass",
        seq: 2,
        matchId,
        clock,
        ball: pos,
        involved: [nord, player("nord-9")],
        possessionTeamId: homeId,
        from: nord,
        to: player("nord-9"),
        complete: false,
      },
      {
        type: "carry",
        seq: 3,
        matchId,
        clock,
        ball: pos,
        involved: [nord],
        possessionTeamId: homeId,
        player: nord,
        from: pos,
        to: pos,
      },
      {
        type: "duel",
        seq: 4,
        matchId,
        clock,
        ball: pos,
        involved: [nord, rhein],
        possessionTeamId: awayId,
        kind: "tackle",
        attacker: nord,
        defender: rhein,
        winnerId: rhein.playerId,
      },
      {
        type: "shot",
        seq: 5,
        matchId,
        clock,
        ball: pos,
        involved: [nord],
        possessionTeamId: homeId,
        shooter: nord,
        target: { x: 100, y: 50 },
        outcome: "woodwork",
      },
      {
        type: "goal",
        seq: 6,
        matchId,
        clock,
        ball: pos,
        involved: [nord, player("nord-9")],
        possessionTeamId: homeId,
        scorer: nord,
        assist: player("nord-9"),
      },
      {
        type: "save",
        seq: 7,
        matchId,
        clock,
        ball: pos,
        involved: [keeper, nord],
        possessionTeamId: homeId,
        keeper,
        shooter: nord,
      },
      {
        type: "turnover",
        seq: 8,
        matchId,
        clock,
        ball: pos,
        involved: [nord],
        possessionTeamId: awayId,
        fromTeamId: homeId,
        toTeamId: awayId,
        reason: "interception",
      },
      {
        type: "foul",
        seq: 9,
        matchId,
        clock,
        ball: pos,
        involved: [rhein, nord],
        possessionTeamId: homeId,
        fouler: rhein,
        fouled: nord,
        card: "yellow",
      },
      {
        type: "card",
        seq: 10,
        matchId,
        clock,
        ball: pos,
        involved: [rhein],
        possessionTeamId: homeId,
        player: rhein,
        color: "second_yellow",
      },
      {
        type: "injury",
        seq: 11,
        matchId,
        clock,
        ball: pos,
        involved: [nord],
        possessionTeamId: homeId,
        player: nord,
        severity: "stretcher",
      },
      {
        type: "substitution",
        seq: 12,
        matchId,
        clock,
        ball: pos,
        involved: [nord, bench],
        possessionTeamId: homeId,
        teamId: homeId,
        playerOff: nord,
        playerOn: bench,
      },
      {
        type: "restart",
        seq: 13,
        matchId,
        clock,
        ball: pos,
        involved: [nord],
        possessionTeamId: homeId,
        phase: "free_kick",
        takingTeamId: homeId,
      },
      {
        type: "period_end",
        seq: 14,
        matchId,
        clock,
        ball: pos,
        involved: [],
        possessionTeamId: null,
        period: "first_half",
      },
      {
        type: "match_end",
        seq: 15,
        matchId,
        clock: { ...clock, period: "full_time", minute: 90 },
        ball: pos,
        involved: [],
        possessionTeamId: null,
        homeGoals: 2,
        awayGoals: 1,
      },
    ];

    const types = new Set(events.map((event) => event.type));
    expect(types.size).toBe(events.length);

    for (const event of events) {
      const line = commentate(event, ctx);
      expect(line.length).toBeGreaterThan(8);
      expect(line).not.toContain("undefined");
    }

    expect(commentate(events[9]!, ctx)).toContain("Second yellow");
    expect(commentate(events[14]!, ctx)).toBe(
      "Full time. FC Nordstern 2–1 SV Rheinwacht.",
    );
    const restartKickoff: MatchEvent = {
      type: "kickoff",
      seq: 40,
      matchId,
      clock: { period: "first_half", minute: 5, second: 41, stoppageMinute: 0 },
      ball: pos,
      involved: [nord],
      possessionTeamId: homeId,
      kickingTeamId: homeId,
    };
    expect(commentate(restartKickoff, ctx)).toBe(
      "Theo Brandt restarts from the centre spot.",
    );
  });

  it("renders every event from a simulated match without throwing", () => {
    const initial = createInitialState({
      home: SEED_MATCHUP.home,
      away: SEED_MATCHUP.away,
      seed: 2026,
    });
    const { events } = simulate({
      state: initial,
      homeTactics: initial.homeTactics,
      awayTactics: initial.awayTactics,
    });
    expect(events.length).toBeGreaterThan(100);
    for (const event of events) {
      expect(commentate(event, ctx).length).toBeGreaterThan(0);
    }
  });
});
