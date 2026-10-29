import { describe, expect, it } from "vitest";
import { asTeamId } from "@fussballmanager/shared";
import { clonePlayer } from "../types/__tests__/fixtures.ts";
import { emptyTransferState } from "./negotiations.ts";
import {
  LISTING_BID_CHANCE,
  MAX_OWN_LISTINGS,
  isPlayerListed,
  listPlayerForSale,
  ownListingLimitReason,
  refreshAiListings,
  scanListingBids,
} from "./transfer-listings.ts";

describe("listPlayerForSale", () => {
  it("caps the user's own transfer list at MAX_OWN_LISTINGS", () => {
    const userClubId = "cl_fc_nordstern";
    let state = emptyTransferState();
    const players = Array.from({ length: MAX_OWN_LISTINGS + 2 }, (_, index) => {
      const player = clonePlayer();
      player.id = `pl_cap_${index}`;
      player.club_id = userClubId;
      return player;
    });
    for (const player of players) state = listPlayerForSale(state, player, 1, 2);
    const own = (state.listings ?? []).filter((row) => row.club_id === userClubId);
    expect(own).toHaveLength(MAX_OWN_LISTINGS);
    expect(isPlayerListed(state, players[MAX_OWN_LISTINGS]!.id)).toBe(false);
    expect(ownListingLimitReason(state, userClubId, players[MAX_OWN_LISTINGS]!.id)).not.toBeNull();
    expect(ownListingLimitReason(state, userClubId, players[0]!.id)).toBeNull();
  });
});

describe("refreshAiListings", () => {
  it("lists rival players when the league carries world team ids", () => {
    const squads = ["world-aaaa-2", "world-bbbb-3", "world-cccc-4"].map((teamId, clubIndex) =>
      (["GK", "CB", "CM", "CF"] as const).map((position, index) => {
        const player = clonePlayer();
        player.id = `pl_${clubIndex}_${index}`;
        player.club_id = `cl_${teamId.replace(/-/g, "_")}`;
        player.squad_status = "pro";
        player.position = position;
        player.age = 30;
        return player;
      }),
    );
    const players = squads.flat();
    let listed = 0;
    for (let week = 1; week <= 6 && listed === 0; week++) {
      const refreshed = refreshAiListings({
        state: emptyTransferState(),
        players,
        userClubId: "cl_fc_nordstern",
        season: 1,
        week,
        masterSeed: 7,
        leagueClubIds: [asTeamId("fc-nordstern"), asTeamId("world-aaaa-2"), asTeamId("world-bbbb-3"), asTeamId("world-cccc-4")],
      });
      listed = refreshed.listings?.length ?? 0;
    }
    expect(listed).toBeGreaterThan(0);
  });

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
