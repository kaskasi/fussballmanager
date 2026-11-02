import { describe, expect, it } from "vitest";
import { defaultLeagueState } from "../persistence/league-state.ts";
import { defaultLeaguePools } from "./league-divisions.ts";
import { applyPromotionRelegation, simulateFullDivisionSeason } from "./promotion-relegation.ts";

/**
 * PRD 32 slice 1 — recorded before the registry refactor: the generic N-tier
 * code must give the same pools, movements and playoff as the two-tier code.
 */
describe("promotion and relegation golden (PRD 32 §4)", () => {
  it.each([
    [4242, 1, "regionalliga-nord"],
    [2026, 3, "oberliga-nord"],
    [7, 12, "regionalliga-nord"],
  ] as const)("seed %i season %i, player in %s", (seed, season, divisionId) => {
    const pools = defaultLeaguePools();
    const results = simulateFullDivisionSeason(pools[divisionId], 2, seed ^ 5);
    const league = { ...defaultLeagueState(), division_id: divisionId, club_ids: pools[divisionId], results };
    const outcome = applyPromotionRelegation(league, pools, seed, season);
    // Tiers 4–5 only. Recorded on the two-tier code; re-recorded in slice 3 when the
    // Nationalliga boundary opened: only the Regionalliga pool changed (two clubs up,
    // two down), the Regionalliga ↔ Oberliga movements and playoff did not.
    const lower = new Set(["regionalliga-nord", "oberliga-nord"]);
    const playoff = outcome.playoffs.find((match) => match.upperDivisionId === "regionalliga-nord");
    expect({
      pools: { "regionalliga-nord": outcome.pools["regionalliga-nord"], "oberliga-nord": outcome.pools["oberliga-nord"] },
      movements: outcome.movements.filter((entry) => lower.has(entry.from) && lower.has(entry.to)),
      playoff: playoff && {
        homeTeamId: playoff.homeTeamId,
        awayTeamId: playoff.awayTeamId,
        homeGoals: playoff.homeGoals,
        awayGoals: playoff.awayGoals,
        winnerId: playoff.winnerId,
      },
    }).toMatchSnapshot();
  });
});
