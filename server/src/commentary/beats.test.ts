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
  beatForCommentary,
  classifyBeat,
  type BroadcastBeatId,
} from "./beats.ts";

const homeId = asTeamId("fc-nordstern");
const matchId = asMatchId("match-beats");
const pos = { x: 50, y: 50 };
const clock: MatchClock = {
  period: "first_half",
  minute: 12,
  second: 0,
  stoppageMinute: 0,
};

function player(id: string) {
  return { playerId: asPlayerId(id), teamId: homeId, position: pos };
}

describe("classifyBeat", () => {
  it("maps structural and set-piece events", () => {
    const opening: MatchEvent = {
      type: "kickoff",
      seq: 1,
      matchId,
      clock: { period: "first_half", minute: 0, second: 1, stoppageMinute: 0 },
      ball: pos,
      involved: [player("a")],
      possessionTeamId: homeId,
      kickingTeamId: homeId,
    };
    expect(classifyBeat(opening)).toBe("match_opening");

    expect(
      classifyBeat({
        type: "period_end",
        seq: 2,
        matchId,
        clock,
        ball: pos,
        involved: [],
        possessionTeamId: null,
        period: "first_half",
      }),
    ).toBe("half_time");

    expect(
      classifyBeat({
        type: "restart",
        seq: 3,
        matchId,
        clock,
        ball: pos,
        involved: [],
        possessionTeamId: homeId,
        phase: "free_kick",
        takingTeamId: homeId,
      }),
    ).toBe("restart_free_kick");
  });

  it("maps shots by outcome", () => {
    const shooter = player("st");
    const base = {
      seq: 10,
      matchId,
      clock,
      ball: pos,
      involved: [shooter],
      possessionTeamId: homeId,
      shooter,
      target: { x: 100, y: 50 },
    };
    expect(
      classifyBeat({ type: "shot", ...base, outcome: "woodwork" }),
    ).toBe("shot_woodwork");
    expect(classifyBeat({ type: "shot", ...base, outcome: "save" })).toBe(
      "shot_saved",
    );
    expect(classifyBeat({ type: "goal", ...base, scorer: shooter })).toBe(
      "shot_goal",
    );
  });

  it("maps discipline and turnovers", () => {
    const a = player("a");
    const b = player("b");
    expect(
      classifyBeat({
        type: "turnover",
        seq: 4,
        matchId,
        clock,
        ball: pos,
        involved: [a],
        possessionTeamId: homeId,
        fromTeamId: homeId,
        toTeamId: asTeamId("sv-rheinwacht"),
        reason: "offside",
      }),
    ).toBe("offside");

    expect(
      classifyBeat({
        type: "foul",
        seq: 5,
        matchId,
        clock,
        ball: pos,
        involved: [a, b],
        possessionTeamId: homeId,
        fouler: a,
        fouled: b,
        card: "yellow",
      }),
    ).toBe("card_yellow");
  });

  it("returns null for unworthy carries", () => {
    const nord = player("nord-8");
    const first: MatchEvent = {
      type: "carry",
      seq: 1,
      matchId,
      clock,
      ball: { x: 62, y: 50 },
      involved: [nord],
      possessionTeamId: homeId,
      player: nord,
      from: { x: 50, y: 50 },
      to: { x: 62, y: 50 },
    };
    const follow: MatchEvent = {
      ...first,
      seq: 2,
      from: { x: 62, y: 50 },
      to: { x: 70, y: 50 },
    };
    expect(beatForCommentary(first, undefined)).toBe("carry_progress");
    expect(beatForCommentary(follow, first)).toBeNull();
  });
});

describe("beatForCommentary golden stream", () => {
  function worthyBeats(seed: number): { seq: number; beat: BroadcastBeatId }[] {
    const initial = createInitialState({
      home: SEED_MATCHUP.home,
      away: SEED_MATCHUP.away,
      seed,
    });
    const { events } = simulate({
      state: initial,
      homeTactics: initial.homeTactics,
      awayTactics: initial.awayTactics,
    });
    const out: { seq: number; beat: BroadcastBeatId }[] = [];
    for (let i = 0; i < events.length; i += 1) {
      const event = events[i];
      if (!event) continue;
      const beat = beatForCommentary(event, events[i - 1]);
      if (beat) {
        out.push({ seq: event.seq, beat });
      }
    }
    return out;
  }

  it("classifies every worthy tick on seed 2026", () => {
    const rows = worthyBeats(2026);
    expect(rows.length).toBeGreaterThan(80);
    expect(rows.some((row) => row.beat === "match_opening")).toBe(true);
    expect(rows.some((row) => row.beat.startsWith("shot_"))).toBe(true);
    expect(rows.some((row) => row.beat === "full_time")).toBe(true);
    const keys = rows.map((row) => `${row.seq}:${row.beat}`);
    expect(keys.slice(0, 12)).toMatchInlineSnapshot(`
      [
        "0:match_opening",
        "1:pass_complete",
        "2:carry_progress",
        "3:duel_won",
        "4:pass_incomplete",
        "5:pass_key",
        "6:duel_won",
        "7:pass_complete",
        "8:pass_key",
        "9:pass_incomplete",
        "10:pass_key",
        "11:pass_key",
      ]
    `);
  });
});
