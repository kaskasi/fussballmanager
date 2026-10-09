import {
  asMatchId,
  asPlayerId,
  asTeamId,
  SEED_MATCHUP,
  type MatchEvent,
} from "@fussballmanager/shared";
import { describe, expect, it } from "vitest";
import { formatMatchLog, parseSeed } from "./match-log.ts";

const matchId = asMatchId("match-sample");
const homeId = asTeamId("fc-nordstern");
const pos = { x: 50, y: 50 };
const passer = {
  playerId: asPlayerId("nord-8"),
  teamId: homeId,
  position: pos,
};
const scorer = {
  playerId: asPlayerId("nord-9"),
  teamId: homeId,
  position: pos,
};

function event(partial: MatchEvent): MatchEvent {
  return partial;
}

describe("formatMatchLog", () => {
  it("prints broadcast lines, running score, HT and FT", () => {
    const events: MatchEvent[] = [
      event({
        type: "kickoff",
        seq: 1,
        matchId,
        clock: {
          period: "first_half",
          minute: 0,
          second: 1,
          stoppageMinute: 0,
        },
        ball: pos,
        involved: [scorer],
        possessionTeamId: homeId,
        kickingTeamId: homeId,
      }),
      event({
        type: "pass",
        seq: 2,
        matchId,
        clock: {
          period: "first_half",
          minute: 12,
          second: 18,
          stoppageMinute: 0,
        },
        ball: pos,
        involved: [passer, scorer],
        possessionTeamId: homeId,
        from: passer,
        to: scorer,
        complete: true,
      }),
      event({
        type: "goal",
        seq: 3,
        matchId,
        clock: {
          period: "first_half",
          minute: 12,
          second: 22,
          stoppageMinute: 0,
        },
        ball: pos,
        involved: [scorer],
        possessionTeamId: homeId,
        scorer,
      }),
      event({
        type: "period_end",
        seq: 4,
        matchId,
        clock: {
          period: "first_half",
          minute: 45,
          second: 12,
          stoppageMinute: 1,
        },
        ball: pos,
        involved: [],
        possessionTeamId: null,
        period: "first_half",
      }),
      event({
        type: "match_end",
        seq: 5,
        matchId,
        clock: {
          period: "full_time",
          minute: 90,
          second: 0,
          stoppageMinute: 1,
        },
        ball: pos,
        involved: [],
        possessionTeamId: null,
        homeGoals: 1,
        awayGoals: 0,
      }),
    ];

    const log = formatMatchLog({
      home: SEED_MATCHUP.home,
      away: SEED_MATCHUP.away,
      seed: 2026,
      events,
      finalScore: { home: 1, away: 0 },
    });

    expect(log).toContain("Kieler FC vs SV Rheinwacht");
    expect(log).toContain("seed 2026");
    expect(log).not.toContain("Theo Brandt findet Juri Holm.");
    expect(log).toContain("TOR! Juri Holm!  (1–0)");
    expect(log).toContain("HT Kieler FC 1–0 SV Rheinwacht");
    expect(log).toContain("FT Kieler FC 1–0 SV Rheinwacht");
    expect(log).toContain("5 events");
    expect(log.split("\n").some((line) => line.includes("12'22"))).toBe(true);
  });

  it("reads an optional seed from argv", () => {
    expect(parseSeed(["node", "play-match.ts"])).toBe(2026);
    expect(parseSeed(["node", "play-match.ts", "11"])).toBe(11);
    expect(parseSeed(["node", "play-match.ts", "nope"])).toBe(2026);
    expect(parseSeed(["node", "play-match.ts", "--formation=2-3-5", "11"])).toBe(
      11,
    );
  });
});
