import { describe, expect, it } from "vitest";
import { newGameSession } from "../persistence/game-session.ts";
import { refreshAiListings } from "./transfer-listings.ts";
import { buildOpeningTransferMarket, openingMarketListings } from "./opening-transfer-market.ts";
import { worldCareerClubId } from "../world/world-generator.ts";
import { applyOpeningTransferMarket } from "./opening-transfer-market.ts";

describe("opening transfer market", () => {
  it("seeds curated listings on a new career", () => {
    const session = newGameSession(new Date("2026-08-10T12:00:00Z"));
    const ids = session.transferState.opening_market_player_ids ?? [];
    expect(ids.length).toBeGreaterThanOrEqual(3);
    expect(session.transferState.listings?.length).toBeGreaterThanOrEqual(ids.length);
    expect(session.clubEvents.some((event) => event.kind === "inbox")).toBe(true);
    for (const playerId of ids) {
      expect(session.scoutBoard.discovery?.scout_pool).toContain(playerId);
    }
  });

  it("preserves opening listings through weekly AI refresh", () => {
    const session = newGameSession(new Date("2026-08-10T12:00:00Z"));
    const before = openingMarketListings(
      session.transferState,
      session.rivalPlayers,
      session.clubId,
    );
    expect(before.length).toBeGreaterThan(0);
    const refreshed = refreshAiListings({
      state: session.transferState,
      players: [...session.players, ...session.rivalPlayers],
      userClubId: session.clubId,
      season: session.season,
      week: session.week,
      masterSeed: session.masterSeed,
      leagueClubIds: session.league.club_ids,
    });
    const after = openingMarketListings(refreshed, session.rivalPlayers, session.clubId);
    expect(after.map((row) => row.player_id).sort()).toEqual(before.map((row) => row.player_id).sort());
  });

  it("includes an Oberliga and a Regionalliga archetype", () => {
    const session = newGameSession(new Date("2026-08-10T12:00:00Z"));
    const built = buildOpeningTransferMarket({
      rivalPlayers: session.rivalPlayers,
      worldClubs: session.world.clubs,
      userClubId: session.clubId,
      season: session.season,
      week: session.week,
      masterSeed: session.masterSeed + 1,
      scoutBoard: session.scoutBoard,
      clubEvents: [],
    });
    expect(built).not.toBeNull();
    const divisions = new Set(
      built!.archetypes.map((row) => {
        const player = session.rivalPlayers.find((p) => p.id === row.playerId);
        const club = session.world.clubs.find(
          (c) => worldCareerClubId(c.id) === player?.club_id,
        );
        return club?.division_id;
      }),
    );
    expect(divisions.has("oberliga-nord")).toBe(true);
    expect(divisions.has("regionalliga-nord")).toBe(true);
  });

  it("buildOpeningTransferMarket returns null outside transfer window", () => {
    const session = newGameSession();
    const built = buildOpeningTransferMarket({
      rivalPlayers: session.rivalPlayers,
      worldClubs: session.world.clubs,
      userClubId: session.clubId,
      season: session.season,
      week: 10,
      masterSeed: session.masterSeed,
      scoutBoard: session.scoutBoard,
      clubEvents: [],
    });
    expect(built).toBeNull();
  });

  it("applyOpeningTransferMarket is idempotent", () => {
    const session = newGameSession();
    const ids = session.transferState.opening_market_player_ids;
    const again = applyOpeningTransferMarket(session);
    expect(again.transferState.opening_market_player_ids).toEqual(ids);
  });
});
