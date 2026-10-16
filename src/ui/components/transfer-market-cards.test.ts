import { describe, expect, it } from "vitest";
import { clonePlayer } from "../../types/__tests__/fixtures.ts";
import { emptyTransferState } from "../../transfers/negotiations.ts";
import { buildTransferMarketCards } from "./transfer-market-cards.ts";

describe("buildTransferMarketCards", () => {
  it("splits incoming rival listings from outgoing own listings", () => {
    const own = clonePlayer();
    own.id = "pl_own";
    own.club_id = "cl_me";
    const rival = clonePlayer();
    rival.id = "pl_rival";
    rival.club_id = "cl_away";
    const state = emptyTransferState();
    state.listings = [
      { player_id: own.id, club_id: "cl_me", asking_price: 100_000, listed_season: 1, listed_week: 2 },
      { player_id: rival.id, club_id: "cl_away", asking_price: 200_000, listed_season: 1, listed_week: 2 },
    ];
    const rows = state.listings!.map((listing) => ({
      listing,
      player: listing.player_id === own.id ? own : rival,
    }));
    const incoming = buildTransferMarketCards({
      flow: "incoming",
      clubId: "cl_me",
      everyone: [own, rival],
      listingRows: rows,
      purchaseTalks: [],
      saleTalks: [],
      inboundOffers: [],
      scoutAssignedByPlayer: new Map(),
    });
    const outgoing = buildTransferMarketCards({
      flow: "outgoing",
      clubId: "cl_me",
      everyone: [own, rival],
      listingRows: rows,
      purchaseTalks: [],
      saleTalks: [],
      inboundOffers: [],
      scoutAssignedByPlayer: new Map(),
    });
    expect(incoming.map((c) => c.playerId)).toEqual(["pl_rival"]);
    expect(outgoing.map((c) => c.playerId)).toEqual(["pl_own"]);
  });
});
