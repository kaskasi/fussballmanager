import { describe, expect, it } from "vitest";
import { clonePlayer } from "../types/__tests__/fixtures.ts";
import { emptyTransferState, startNegotiation, submitNegotiationRound } from "./negotiations.ts";
import { cannotOpenPurchaseReason } from "./purchase-block.ts";
import { resolvePurchaseTarget } from "./resolve-purchase-target.ts";
import { createScoutBoard } from "../scouting/scout-board.ts";
import {
  addPlayersToPool,
  ensureTargetsForPool,
  normalizeDiscovery,
} from "../scouting/scout-discovery.ts";
import { transferWindowKind } from "../sim/transfer-windows.ts";
import { sellerAskingPrice } from "./negotiations.ts";

describe("purchase flow — pre-season summer window", () => {
  it("keeps the transfer window open in the pre-season (PRD 35: week 4)", () => {
    expect(transferWindowKind(4)).toBe("summer");
    expect(cannotOpenPurchaseReason(4, true)).toBeNull();
  });

  it("resolves a rival player only when they are in the scout pool", () => {
    const player = clonePlayer();
    player.id = "pl_rival_1";
    player.club_id = "cl_away";
    const empty = createScoutBoard();
    expect(resolvePurchaseTarget(empty, player.id, [player])).toBeNull();
    const discovery = addPlayersToPool(normalizeDiscovery(empty.discovery), [player.id]);
    const targets = ensureTargetsForPool(empty.targets, discovery, [player]);
    const board = { ...empty, discovery, targets };
    const target = resolvePurchaseTarget(board, player.id, [player]);
    expect(target?.player.id).toBe("pl_rival_1");
  });

  it("completes negotiation acceptance during week 2", () => {
    const player = clonePlayer();
    player.id = "pl_buy_me";
    player.club_id = "cl_seller";
    const asking = sellerAskingPrice(player, 1);
    const opened = startNegotiation(emptyTransferState(), player, "cl_seller", 1, 2);
    const round = submitNegotiationRound(opened.state, player.id, Math.round(asking * 1.15));
    expect(round.accepted).toBe(true);
  });
});
