import { describe, expect, it } from "vitest";
import { clonePlayer } from "../types/__tests__/fixtures.ts";
import {
  acceptCounterOffer,
  attemptPurchase,
  emptyTransferState,
  evaluateOffer,
  sellerAskingPrice,
  startNegotiation,
  submitNegotiationRound,
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

  it("runs a multi-round negotiation with patience", () => {
    const player = clonePlayer();
    player.id = "pl_90002";
    const asking = sellerAskingPrice(player, 1);
    const started = startNegotiation(emptyTransferState(), player, "cl_rival", 1, 30);
    expect(started.negotiation.patience_rounds_left).toBe(4);
    const lowball = submitNegotiationRound(started.state, player.id, Math.round(asking * 0.88));
    expect(lowball.accepted).toBe(false);
    expect(lowball.negotiation.status).toBe("active");
    expect(lowball.negotiation.counter_offer).toBeGreaterThan(0);
    const generous = submitNegotiationRound(lowball.state, player.id, Math.round(asking * 1.12));
    expect(generous.accepted).toBe(true);
  });

  it("accepts the seller counter even when the fee is below 110% of asking", () => {
    const player = clonePlayer();
    player.id = "pl_counter_accept";
    const asking = sellerAskingPrice(player, 1);
    const started = startNegotiation(emptyTransferState(), player, "cl_rival", 1, 30);
    const counterRound = submitNegotiationRound(
      started.state,
      player.id,
      Math.round(asking * 0.95),
    );
    expect(counterRound.negotiation.counter_offer).toBeGreaterThan(0);
    const accepted = acceptCounterOffer(counterRound.state, player.id);
    expect(accepted.accepted).toBe(true);
    expect(accepted.negotiation.status).toBe("accepted");
  });
});
