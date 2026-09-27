import { describe, expect, it } from "vitest";
import { defaultLeagueState } from "../persistence/league-state.ts";
import { defaultLeaguePools } from "./league-divisions.ts";
import {
  applyPromotionRelegation,
  leagueStateAfterMovement,
  promotionZoneRank,
  simulateFullDivisionSeason,
} from "./promotion-relegation.ts";

describe("promotion and relegation", () => {
  it("labels promotion and relegation zones", () => {
    expect(promotionZoneRank(0, 6)).toBe("promoted");
    expect(promotionZoneRank(1, 6)).toBe("playoff");
    expect(promotionZoneRank(3, 6)).toBe("safe");
    expect(promotionZoneRank(4, 6)).toBe("playoff");
    expect(promotionZoneRank(5, 6)).toBe("relegated");
  });

  it("swaps champion and relegated club after a full season", () => {
    const pools = defaultLeaguePools();
    const regIds = pools["regionalliga-nord"];
    const oberIds = pools["oberliga-nord"];
    const results = simulateFullDivisionSeason(regIds, 2, 4242);
    const league = {
      ...defaultLeagueState(),
      results,
      season_complete: true,
    };
    const movement = applyPromotionRelegation(league, pools, 4242, 1);
    const nextReg = movement.pools["regionalliga-nord"];
    const nextOber = movement.pools["oberliga-nord"];
    expect(nextReg.length).toBe(18);
    expect(nextOber.length).toBe(18);
    expect(new Set([...nextReg, ...nextOber]).size).toBe(36);
    expect(movement.messages.length).toBeGreaterThan(0);
  });

  it("moves the player club into the correct division pool", () => {
    const pools = defaultLeaguePools();
    const league = defaultLeagueState();
    const relegated = pools["regionalliga-nord"].at(-1)!;
    const promoted = pools["oberliga-nord"][0]!;
    const swappedPools = {
      ...pools,
      "regionalliga-nord": pools["regionalliga-nord"].map((id) =>
        id === relegated ? promoted : id,
      ),
      "oberliga-nord": pools["oberliga-nord"].map((id) => (id === promoted ? relegated : id)),
    };
    const next = leagueStateAfterMovement(
      { ...league, player_club_id: promoted },
      swappedPools,
      promoted,
    );
    expect(next.division_id).toBe("regionalliga-nord");
    expect(next.club_ids).toContain(promoted);
  });
});
