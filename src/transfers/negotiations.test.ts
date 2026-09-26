import { describe, expect, it } from "vitest";
import { clonePlayer } from "../types/__tests__/fixtures.ts";
import {
  attemptPurchase,
  emptyTransferState,
  evaluateOffer,
  sellerAskingPrice,
} from "./negotiations.ts";

describe("transfer negotiations", () => {
  it("accepts offers above 110% of asking price", () => {
    expect(evaluateOffer(1_200_000, 1_000_000)).toBe("accept");
  });

  it("rejects lowball offers", () => {
    expect(evaluateOffer(500_000, 1_000_000)).toBe("reject");
  });

  it("completes a purchase when the seller accepts", () => {
    const player = clonePlayer();
    player.id = "pl_90001";
    const asking = sellerAskingPrice(player, 1);
    const deal = attemptPurchase(emptyTransferState(), player, 1, 30);
    expect(deal.accepted).toBe(asking > 0);
  });
});
