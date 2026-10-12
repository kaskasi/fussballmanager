import { describe, expect, it } from "vitest";
import {
  defaultSponsorOffer,
  evaluateSponsorOffer,
  seasonSponsorBonusPayouts,
  signSponsorDeal,
  weeklySponsorInventoryIncome,
} from "./sponsor-deals.ts";

describe("sponsor deals (F6.5)", () => {
  it("rejects a weekly ask above the slot cap", () => {
    const offer = { ...defaultSponsorOffer("shirt"), weeklyAmount: 80_000 };
    expect(evaluateSponsorOffer("shirt", offer).accepted).toBe(false);
  });

  it("default offer is inside the brand cap and accepted", () => {
    const offer = defaultSponsorOffer("board_north_a");
    expect(evaluateSponsorOffer("board_north_a", offer).accepted).toBe(true);
  });

  it("signs a deal and counts it in weekly inventory income", () => {
    const offer = defaultSponsorOffer("board_north_a");
    const deals = signSponsorDeal([], "board_north_a", 1, offer);
    expect(deals).toHaveLength(1);
    expect(weeklySponsorInventoryIncome(deals, 1)).toBe(offer.weeklyAmount);
    expect(weeklySponsorInventoryIncome(deals, 1 + offer.seasons)).toBe(0);
  });

  it("pays the two success bonuses only when the clause is on", () => {
    const offer = { ...defaultSponsorOffer("shirt"), bonusTopScorer: true, bonusLeagueTitle: true };
    const deals = signSponsorDeal([], "shirt", 1, offer);
    expect(seasonSponsorBonusPayouts(deals, 1, true, true)).toHaveLength(2);
    expect(seasonSponsorBonusPayouts(deals, 1, false, false)).toHaveLength(0);
  });
});
