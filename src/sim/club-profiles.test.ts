import { NORDSTERN_ID } from "@fussballmanager/shared";
import { describe, expect, it } from "vitest";
import { defaultLeagueState } from "../persistence/league-state.ts";
import { buildClubProfile } from "./club-profiles.ts";

describe("club profiles", () => {
  it("builds a profile with squad and stadium flavor", () => {
    const league = defaultLeagueState();
    const profile = buildClubProfile(NORDSTERN_ID, {
      playerClubId: league.player_club_id,
      pools: league.league_pools,
    });
    expect(profile?.name).toContain("Nordstern");
    expect(profile?.coach).toBeTruthy();
    expect(profile?.bestPlayers.length).toBeGreaterThan(0);
    expect(profile?.isPlayerClub).toBe(true);
  });
});
