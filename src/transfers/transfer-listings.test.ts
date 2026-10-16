import { describe, expect, it } from "vitest";
import { clonePlayer } from "../types/__tests__/fixtures.ts";
import { emptyTransferState } from "./negotiations.ts";
import { listPlayerForSale, refreshAiListings } from "./transfer-listings.ts";

describe("refreshAiListings", () => {
  it("keeps rival listings across weekly refresh until the player leaves the club", () => {
    const player = clonePlayer();
    player.id = "pl_persist_list";
    player.club_id = "cl_rival_a";
    const listed = listPlayerForSale(emptyTransferState(), player, 1, 2);
    const refreshed = refreshAiListings({
      state: listed,
      players: [player],
      userClubId: "cl_fc_nordstern",
      season: 1,
      week: 3,
      masterSeed: 42,
      leagueClubIds: ["cl_fc_nordstern", "cl_rival_a"],
    });
    expect(refreshed.listings?.some((row) => row.player_id === player.id)).toBe(true);
  });
});
