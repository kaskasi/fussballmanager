import { NORDSTERN_ID, asTeamId } from "@fussballmanager/shared";
import { describe, expect, it } from "vitest";
import { defaultLeagueState } from "../persistence/league-state.ts";
import {
  advanceLeagueWeek,
  applyProMatchMinutes,
  simulateQuickMatchday,
  weeklySeed,
} from "./league-week.ts";
import { clonePlayer } from "../types/__tests__/fixtures.ts";

describe("league week", () => {
  it("plays a deterministic quick matchday", () => {
    const league = defaultLeagueState();
    const first = simulateQuickMatchday(1, weeklySeed(2026, 1, 35), league.club_ids);
    const second = simulateQuickMatchday(1, weeklySeed(2026, 1, 35), league.club_ids);
    expect(first).toEqual(second);
    expect(first.length).toBe(3);
  });

  it("advances league state offline", async () => {
    const league = defaultLeagueState();
    const advanced = await advanceLeagueWeek(league, 1, 35, 2026);
    expect(advanced.league.results.length).toBeGreaterThan(0);
    expect(advanced.league.matchday).toBe(2);
    expect(advanced.playerFixture).not.toBeNull();
  });

  it("assigns pro minutes after a club fixture", () => {
    const player = clonePlayer();
    player.squad_status = "pro";
    const fixture = {
      homeTeamId: NORDSTERN_ID,
      awayTeamId: asTeamId("tsv-holzweg"),
      homeGoals: 2,
      awayGoals: 1,
    };
    const next = applyProMatchMinutes([player], fixture, NORDSTERN_ID)[0];
    expect(next?.state.weekly_minutes).toBeGreaterThan(50);
  });
});
