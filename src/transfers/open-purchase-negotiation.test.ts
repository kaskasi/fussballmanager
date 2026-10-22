import { describe, expect, it } from "vitest";
import { clonePlayer } from "../types/__tests__/fixtures.ts";
import { createScoutBoard } from "../scouting/scout-board.ts";
import { addPlayersToPool, normalizeDiscovery } from "../scouting/scout-discovery.ts";
import { emptyTransferState } from "./negotiations.ts";
import { listPlayerForSale } from "./transfer-listings.ts";
import { openPurchaseNegotiation } from "./open-purchase-negotiation.ts";
import { sellerAskingPrice } from "./negotiations.ts";
import { UNSOLICITED_PREMIUM } from "./unsolicited-approach.ts";
import type { Player } from "../types/player.ts";

function boardWith(player: Player) {
  const base = createScoutBoard();
  const board = {
    ...base,
    discovery: addPlayersToPool(normalizeDiscovery(base.discovery), [player.id]),
  };
  board.targets[player.id] = {
    playerId: player.id,
    assigned: false,
    estimate: { estimatedAbilityMean: 80, uncertaintyRange: 6, sampleSize: 3 },
  };
  return board;
}

function teammate(id: string, clubId: string, delta: number): Player {
  const player = clonePlayer();
  player.id = id;
  player.club_id = clubId;
  player.attributes = Object.fromEntries(
    Object.entries(player.attributes).map(([key, value]) => [
      key,
      typeof value === "number" ? Math.max(1, value + delta) : value,
    ]),
  ) as Player["attributes"];
  return player;
}

describe("openPurchaseNegotiation", () => {
  it("opens synchronously for a rival on the board", () => {
    const player = clonePlayer();
    player.id = "pl_open_sync";
    player.club_id = "cl_away";
    const base = createScoutBoard();
    const board = {
      ...base,
      discovery: addPlayersToPool(normalizeDiscovery(base.discovery), [player.id]),
    };
    board.targets[player.id] = {
      playerId: player.id,
      assigned: false,
      estimate: { estimatedAbilityMean: 80, uncertaintyRange: 6, sampleSize: 3 },
    };
    const result = openPurchaseNegotiation({
      scoutBoard: board,
      rivalPlayers: [player],
      transferState: listPlayerForSale(emptyTransferState(), player, 1, 2),
      playerId: player.id,
      season: 1,
      week: 2,
    });
    expect(result.kind).toBe("ok");
    if (result.kind === "ok") {
      expect(result.negotiation.player_id).toBe(player.id);
    }
  });

  it("opens for a listed rival without scout pool entry", () => {
    const player = clonePlayer();
    player.id = "pl_listed_only";
    player.club_id = "cl_away";
    const transferState = listPlayerForSale(emptyTransferState(), player, 1, 2);
    const result = openPurchaseNegotiation({
      scoutBoard: createScoutBoard(),
      rivalPlayers: [player],
      transferState,
      playerId: player.id,
      season: 1,
      week: 2,
    });
    expect(result.kind).toBe("ok");
  });

  it("given an unlisted squad player, when the buyer approaches, then the club negotiates at a premium", () => {
    const player = teammate("pl_unlisted", "cl_away", 0);
    const better = [1, 2, 3].map((n) => teammate(`pl_better_${n}`, "cl_away", 15));
    const result = openPurchaseNegotiation({
      scoutBoard: boardWith(player),
      rivalPlayers: [player, ...better],
      transferState: emptyTransferState(),
      playerId: player.id,
      season: 1,
      week: 20,
    });
    expect(result.kind).toBe("ok");
    if (result.kind === "ok") {
      expect(result.negotiation.unsolicited).toBe(true);
      expect(result.negotiation.asking_price).toBe(
        Math.round(sellerAskingPrice(player, 1) * UNSOLICITED_PREMIUM),
      );
    }
  });

  it("given an unlisted key player, when the buyer approaches, then the club refuses", () => {
    const player = teammate("pl_star", "cl_away", 15);
    const weaker = [1, 2, 3].map((n) => teammate(`pl_weaker_${n}`, "cl_away", -10));
    const result = openPurchaseNegotiation({
      scoutBoard: boardWith(player),
      rivalPlayers: [player, ...weaker],
      transferState: emptyTransferState(),
      playerId: player.id,
      season: 1,
      week: 20,
    });
    expect(result.kind).toBe("blocked");
  });

  it("keeps the plain asking price for a listed player", () => {
    const player = teammate("pl_listed_price", "cl_away", 15);
    const result = openPurchaseNegotiation({
      scoutBoard: boardWith(player),
      rivalPlayers: [player],
      transferState: listPlayerForSale(emptyTransferState(), player, 1, 2),
      playerId: player.id,
      season: 1,
      week: 2,
    });
    expect(result.kind).toBe("ok");
    if (result.kind === "ok") {
      expect(result.negotiation.unsolicited).toBeUndefined();
      expect(result.negotiation.asking_price).toBe(sellerAskingPrice(player, 1));
    }
  });
});
