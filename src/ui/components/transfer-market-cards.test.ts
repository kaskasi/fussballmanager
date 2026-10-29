import { describe, expect, it } from "vitest";
import { clonePlayer } from "../../types/__tests__/fixtures.ts";
import { emptyTransferState } from "../../transfers/negotiations.ts";
import { buildOwnListingCards, buildTransferTargetCards } from "./transfer-market-cards.ts";

describe("transfer market cards", () => {
  it("splits own listings (slots) from rival listings (targets)", () => {
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
    const slots = buildOwnListingCards({
      clubId: "cl_me",
      everyone: [own, rival],
      listingRows: rows,
      saleTalks: [],
      inboundOffers: [],
    });
    const targets = buildTransferTargetCards({
      clubId: "cl_me",
      everyone: [own, rival],
      listingRows: rows,
      purchaseTalks: [],
      scoutAssignedByPlayer: new Map(),
    });
    expect(slots.map((c) => [c.playerId, c.kind])).toEqual([["pl_own", "own_listing"]]);
    expect(targets.map((c) => c.playerId)).toEqual(["pl_rival"]);
  });

  it("shows an open bid in the listed player's slot instead of a second card", () => {
    const own = clonePlayer();
    own.id = "pl_own";
    own.club_id = "cl_me";
    const listing = { player_id: own.id, club_id: "cl_me", asking_price: 100_000, listed_season: 1, listed_week: 2 };
    const slots = buildOwnListingCards({
      clubId: "cl_me",
      everyone: [own],
      listingRows: [{ listing, player: own }],
      saleTalks: [],
      inboundOffers: [
        {
          id: "io_1",
          player_id: own.id,
          buyer_club_id: "cl_away",
          fee: 120_000,
          season: 1,
          week: 3,
          status: "pending",
        },
      ],
    });
    expect(slots.map((c) => c.kind)).toEqual(["inbound_offer"]);
  });
});
