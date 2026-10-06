import { asTeamId, NORDSTERN_ID } from "@fussballmanager/shared";
import { describe, expect, it } from "vitest";
import { defaultLeagueState } from "../persistence/league-state.ts";
import { newGameSession } from "../persistence/game-session.ts";
import { buildClubProfile } from "./club-profiles.ts";
import { defaultLeaguePools, squadForLeagueClub } from "./league-divisions.ts";

describe("club profiles", () => {
  it("builds a profile with squad and stadium flavor", () => {
    const session = newGameSession();
    const league = defaultLeagueState();
    const profile = buildClubProfile(NORDSTERN_ID, {
      playerClubId: league.player_club_id,
      careerPlayers: session.players,
      pools: league.league_pools,
      worldClubs: session.world.clubs,
    });
    expect(profile?.name).toContain("Nordstern");
    expect(profile?.place).toBe("Kiel");
    expect(profile?.coach).toBeTruthy();
    expect(profile?.bestPlayers.length).toBeGreaterThan(0);
    expect(profile?.isPlayerClub).toBe(true);
    expect(profile?.squadStrength).toBeGreaterThan(0);
    expect(profile?.bestPlayers[0]?.ca).toBeGreaterThan(0);
  });

  it("uses career CA for rival clubs", () => {
    const session = newGameSession();
    const rivalId = defaultLeaguePools()["regionalliga-nord"][1]!;
    const profile = buildClubProfile(rivalId, {
      rivalPlayers: session.rivalPlayers,
      worldClubs: session.world.clubs,
    });
    expect(profile?.place.length).toBeGreaterThan(0);
    expect(profile?.squadStrength).toBeGreaterThan(50);
    expect(profile?.bestPlayers[0]?.ca).toBeGreaterThan(50);
  });

  it("keeps old six-club saves playable through legacy squad templates", () => {
    const legacy = squadForLeagueClub(asTeamId("spvgg-kuestenholz"));
    expect(legacy?.team.shortName).toBe("KUS");
    expect(legacy?.starters).toHaveLength(11);
  });
});
