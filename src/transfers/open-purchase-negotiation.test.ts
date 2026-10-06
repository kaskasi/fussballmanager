import { describe, expect, it } from "vitest";
import { clonePlayer } from "../types/__tests__/fixtures.ts";
import { createScoutBoard } from "../scouting/scout-board.ts";
import { addPlayersToPool, normalizeDiscovery } from "../scouting/scout-discovery.ts";
import { emptyTransferState } from "./negotiations.ts";
import { openPurchaseNegotiation } from "./open-purchase-negotiation.ts";

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
      transferState: emptyTransferState(),
      playerId: player.id,
      season: 1,
      week: 2,
    });
    expect(result.kind).toBe("ok");
    if (result.kind === "ok") {
      expect(result.negotiation.player_id).toBe(player.id);
    }
  });
});
