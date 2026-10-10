import { describe, expect, it } from "vitest";
import { defaultLeagueState } from "../persistence/league-state.ts";
import { weeklySeed } from "./league-week.ts";
import { runEngineMatchdayLocal } from "./run-matchday-local.ts";
import { squadForLeagueClub } from "./league-divisions.ts";
import { fixtureStatMismatches } from "./league-player-stats-integrity.ts";
import { initializeRivalPlayers } from "./rival-growth.ts";
import { squadWithRivalRoster } from "./rival-engine-squad.ts";

describe("league player stats integrity", () => {
  it("engine matchday stats sum to each fixture score", async () => {
    const league = defaultLeagueState();
    const rivals = initializeRivalPlayers(2026);
    const squads = league.club_ids.map((teamId) => {
      const template = squadForLeagueClub(teamId, rivals);
      if (!template) throw new Error(`missing squad ${teamId}`);
      return squadWithRivalRoster(template, rivals) ?? template;
    });
    const baseSeed = weeklySeed(2026, 1, 22);
    const payload = await runEngineMatchdayLocal(1, baseSeed, squads);
    expect(fixtureStatMismatches(payload.results, payload.playerStats)).toEqual([]);
  });
});
