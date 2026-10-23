import { NORDSTERN_ID, asTeamId } from "@fussballmanager/shared";
import { describe, expect, it } from "vitest";
import { listJobOffers } from "./job-offers.ts";
import { defaultLeaguePools } from "../sim/league-divisions.ts";
import { divisionLabel } from "../sim/league-divisions.ts";
import type { LeagueState } from "../persistence/league-state.ts";

describe("listJobOffers", () => {
  it("only offers clubs from the manager's current division", () => {
    const pools = defaultLeaguePools();
    const relegatedPools = {
      ...pools,
      "regionalliga-nord": pools["regionalliga-nord"].filter((id) => id !== NORDSTERN_ID),
      "oberliga-nord": [NORDSTERN_ID, ...pools["oberliga-nord"].filter((id) => id !== NORDSTERN_ID)],
    };
    const league: Pick<LeagueState, "league_pools" | "player_club_id"> = {
      league_pools: relegatedPools,
      player_club_id: NORDSTERN_ID,
    };
    const offers = listJobOffers(NORDSTERN_ID, 2, league);
    expect(offers.length).toBeGreaterThan(0);
    expect(offers.every((offer) => offer.divisionId === "oberliga-nord")).toBe(true);
    expect(offers.some((offer) => offer.clubId === asTeamId("union-elbstrand"))).toBe(false);
    expect(offers[0]?.divisionLabel).toBe(divisionLabel("oberliga-nord"));
  });
});

describe("listJobOffers options (Story Mode Act 2)", () => {
  it("offers the 3 weakest clubs of a named division, never the excluded club", () => {
    const pools = defaultLeaguePools();
    const relegatedPools = {
      ...pools,
      "regionalliga-nord": pools["regionalliga-nord"].filter((id) => id !== NORDSTERN_ID),
      "oberliga-nord": [NORDSTERN_ID, ...pools["oberliga-nord"].filter((id) => id !== NORDSTERN_ID)],
    };
    const offers = listJobOffers(
      NORDSTERN_ID,
      2,
      { league_pools: relegatedPools, player_club_id: NORDSTERN_ID },
      { divisionId: "oberliga-nord", excludeTeamIds: [NORDSTERN_ID] },
    );
    expect(offers).toHaveLength(3);
    expect(offers.every((offer) => offer.divisionId === "oberliga-nord")).toBe(true);
    expect(offers.some((offer) => offer.clubId === NORDSTERN_ID)).toBe(false);
  });

  it("can offer Oberliga clubs while the manager's club is still in the Regionalliga", () => {
    const pools = defaultLeaguePools();
    const offers = listJobOffers(
      NORDSTERN_ID,
      2,
      { league_pools: pools, player_club_id: NORDSTERN_ID },
      { divisionId: "oberliga-nord" },
    );
    expect(offers).toHaveLength(3);
    expect(offers.every((offer) => pools["oberliga-nord"].includes(offer.clubId))).toBe(true);
  });
});
