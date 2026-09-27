import { describe, expect, it } from "vitest";
import type { LeagueState } from "../persistence/league-state.ts";
import { asTeamId, NORDSTERN_ID, type FixtureResult } from "@fussballmanager/shared";
import { defaultClubStadium, fillRateForTicketPrice } from "./club-stadium.ts";
import {
  advanceClubFanbase,
  formatFanbase,
  fanbaseFillMultiplier,
  roundFanbase,
  matchResultFanbaseDelta,
  seasonEndFanbaseBonus,
  weeklyFanbaseDelta,
} from "./fanbase.ts";

function leagueWithResults(results: FixtureResult[]): LeagueState {
  return {
    division_id: "regionalliga-nord",
    player_club_id: NORDSTERN_ID,
    club_ids: [NORDSTERN_ID, asTeamId("cl_rival_a"), asTeamId("cl_rival_b")],
    meetings_per_opponent: 6,
    matchday: results.length + 1,
    results,
    player_stats: [],
  };
}

describe("fanbase", () => {
  it("rounds float artifacts for display and storage", () => {
    expect(formatFanbase(51.879999999999995)).toBe("51.88");
    expect(roundFanbase(51.879999999999995)).toBe(51.88);
  });

  it("raises baseline fill rates with a stronger fanbase", () => {
    const low = fillRateForTicketPrice("north", 12, 35);
    const high = fillRateForTicketPrice("north", 12, 80);
    expect(high).toBeGreaterThan(low);
    expect(fanbaseFillMultiplier(80)).toBeGreaterThan(fanbaseFillMultiplier(35));
  });

  it("reacts positively to home wins", () => {
    const win: FixtureResult = {
      homeTeamId: NORDSTERN_ID,
      awayTeamId: asTeamId("cl_rival_a"),
      homeGoals: 2,
      awayGoals: 0,
    };
    expect(matchResultFanbaseDelta(win, NORDSTERN_ID)).toBeGreaterThan(0);
    expect(matchResultFanbaseDelta(win, asTeamId("cl_rival_a"))).toBeLessThan(0);
  });

  it("advances fanbase and refreshes stadium fill rates", () => {
    const stadium = defaultClubStadium();
    const next = advanceClubFanbase(stadium, 2.5);
    expect(next.fanbase).toBeGreaterThan(stadium.fanbase!);
    expect(next.fanbase_last_delta).toBe(2.5);
    expect(next.blocks[0]?.fill_rate).toBeGreaterThanOrEqual(stadium.blocks[0]!.fill_rate);
  });

  it("combines match results and table drift each match week", () => {
    const league = leagueWithResults([
      {
        homeTeamId: NORDSTERN_ID,
        awayTeamId: asTeamId("cl_rival_a"),
        homeGoals: 3,
        awayGoals: 1,
      },
    ]);
    expect(weeklyFanbaseDelta(league, NORDSTERN_ID, true)).toBeGreaterThan(0);
  });

  it("applies a season-end bonus from final league position", () => {
    const league = leagueWithResults([
      {
        homeTeamId: NORDSTERN_ID,
        awayTeamId: asTeamId("cl_rival_a"),
        homeGoals: 2,
        awayGoals: 0,
      },
      {
        homeTeamId: asTeamId("cl_rival_b"),
        awayTeamId: NORDSTERN_ID,
        homeGoals: 0,
        awayGoals: 1,
      },
    ]);
    expect(seasonEndFanbaseBonus(league)).toBeGreaterThan(0);
  });
});
