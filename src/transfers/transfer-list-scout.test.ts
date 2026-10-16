import { describe, expect, it } from "vitest";
import { clonePlayer } from "../types/__tests__/fixtures.ts";
import { scoutIntelExactForTransfer } from "../scouting/scout-visibility.ts";
import { createScoutBoard } from "../scouting/scout-board.ts";
import { listPlayerForSale } from "./transfer-listings.ts";
import { emptyTransferState } from "./negotiations.ts";
import { applyTransferListScoutOnAssign } from "./transfer-list-scout.ts";

describe("transfer-list-scout", () => {
  it("firms intel enough to bid after scout from the transfer list", () => {
    const player = clonePlayer();
    player.id = "pl_list_scout";
    player.club_id = "cl_away";
    const board = createScoutBoard();
    board.discovery = { ...board.discovery!, scout_pool: [player.id] };
    board.targets[player.id] = {
      playerId: player.id,
      assigned: true,
      estimate: { estimatedAbilityMean: 65, uncertaintyRange: 40, sampleSize: 0 },
    };
    const transferState = listPlayerForSale(emptyTransferState(), player, 1, 2);
    const next = applyTransferListScoutOnAssign(board, player.id, player, transferState, 1);
    const estimate = next.targets[player.id]?.estimate;
    expect(estimate).toBeDefined();
    expect(scoutIntelExactForTransfer(player, estimate, 1)).toBe(true);
  });
});
