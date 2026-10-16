import { describe, expect, it } from "vitest";
import { asTeamId } from "@fussballmanager/shared";
import { clonePlayer } from "../types/__tests__/fixtures.ts";
import { emptyTransferState } from "./negotiations.ts";
import {
  LISTING_BID_CHANCE,
  listPlayerForSale,
  refreshAiListings,
  scanListingBids,
} from "./transfer-listings.ts";

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
      leagueClubIds: [asTeamId("cl_fc_nordstern"), asTeamId("cl_rival_a")],
    });
    expect(refreshed.listings?.some((row) => row.player_id === player.id)).toBe(true);
  });
});

describe("scanListingBids", () => {
  it("can open multiple sale talks for a long transfer list in one week", () => {
    const userClubId = "cl_fc_nordstern";
    let state = emptyTransferState();
    const players = Array.from({ length: 8 }, (_, index) => {
      const player = clonePlayer();
      player.id = `pl_list_${index}`;
      player.club_id = userClubId;
      player.squad_status = "pro";
      state = listPlayerForSale(state, player, 1, 2);
      return player;
    });
    const leagueClubIds = [
      asTeamId("fc-nordstern"),
      asTeamId("world-aaaa-2"),
      asTeamId("world-bbbb-3"),
    ];
    let total = 0;
    for (let week = 2; week <= 4; week++) {
      const step = scanListingBids({
        state,
        players,
        userClubId,
        season: 1,
        week,
        masterSeed: 99_001,
        leagueClubIds,
      });
      state = step.state;
      total += step.opened.length;
    }
    expect(LISTING_BID_CHANCE).toBeGreaterThan(0.3);
    expect(total).toBeGreaterThanOrEqual(2);
  });
});
