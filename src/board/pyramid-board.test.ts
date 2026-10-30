import { NORDSTERN_ID, matchdayFixtures, type FixtureResult, type TeamId } from "@fussballmanager/shared";
import { describe, expect, it } from "vitest";
import { defaultLeagueState, type LeagueState } from "../persistence/league-state.ts";
import { defaultLeaguePools } from "../sim/league-divisions.ts";
import { clubStandingTier, standingTierAfterMovement } from "./club-standing-tier.ts";
import { JOB_OFFER_SUCCESS_MIN_MATCHDAYS, listJobOffers } from "./job-offers.ts";

/** `matchdays` rounds in which `club` wins 2:0 and every other match ends 1:1. */
function results(clubIds: readonly TeamId[], club: TeamId, matchdays: number, clubWins: boolean): FixtureResult[] {
  return Array.from({ length: matchdays }, (_, index) =>
    matchdayFixtures(clubIds, index + 1).map((fixture) => {
      const involved = fixture.homeTeamId === club || fixture.awayTeamId === club;
      const clubHome = fixture.homeTeamId === club;
      const [home, away] = !involved ? [1, 1] : clubWins === clubHome ? [2, 0] : [0, 2];
      return { ...fixture, homeGoals: home, awayGoals: away };
    }),
  ).flat();
}

describe("board and job offers across the pyramid (PRD 32 §8)", () => {
  const base = defaultLeagueState();
  const played = JOB_OFFER_SUCCESS_MIN_MATCHDAYS;

  it("offers two clubs from the division above after a top-four season so far", () => {
    const league: LeagueState = {
      ...base,
      matchday: played + 1,
      results: results(base.club_ids, NORDSTERN_ID, played, true),
    };
    const offers = listJobOffers(NORDSTERN_ID, 1, league);
    expect(offers.map((offer) => offer.divisionId)).toEqual(["nationalliga", "nationalliga", "regionalliga-nord"]);
  });

  it("keeps offers inside the division after a weak season", () => {
    const league: LeagueState = {
      ...base,
      matchday: played + 1,
      results: results(base.club_ids, NORDSTERN_ID, played, false),
    };
    expect(listJobOffers(NORDSTERN_ID, 1, league).every((offer) => offer.divisionId === "regionalliga-nord")).toBe(true);
  });

  it("asks a promoted club to stay up and a relegated one to bounce back", () => {
    expect(
      standingTierAfterMovement(NORDSTERN_ID, [
        { teamId: NORDSTERN_ID, from: "regionalliga-nord", to: "nationalliga", reason: "promoted" },
      ]),
    ).toBe("survival_mid");
    expect(
      standingTierAfterMovement(NORDSTERN_ID, [
        { teamId: NORDSTERN_ID, from: "regionalliga-nord", to: "oberliga-nord", reason: "playoff_lost" },
      ]),
    ).toBe("ambition");
    expect(standingTierAfterMovement(NORDSTERN_ID, [])).toBeUndefined();
  });

  it("ranks a club outside the manager's table by reputation in its own division", () => {
    const pools = defaultLeaguePools();
    const tiers = pools.meisterliga.map((teamId) => clubStandingTier(base, teamId));
    expect(tiers.filter((tier) => tier === "ambition")).toHaveLength(4);
    expect(tiers.filter((tier) => tier === "survival_low").length).toBeGreaterThan(0);
  });
});
