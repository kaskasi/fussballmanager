import { describe, expect, it } from "vitest";
import { newGameSession, type GameSession } from "../persistence/game-session.ts";
import {
  addPlayersToPool,
  ensureTargetsForPool,
  normalizeDiscovery,
} from "../scouting/scout-discovery.ts";
import { clonePlayer } from "../types/__tests__/fixtures.ts";
import {
  abortPendingPurchase,
  commitPendingPurchase,
  stagePendingPurchase,
} from "./pending-player-purchase.ts";
import { defaultContractOffer } from "./contract-talks.ts";
import { isTransferWindowOpen } from "../sim/transfer-windows.ts";

function sessionWithRival(): GameSession {
  const session = newGameSession();
  const rival = clonePlayer();
  rival.id = "pl_99999";
  rival.club_id = "cl_rival_a";
  const discovery = addPlayersToPool(normalizeDiscovery(session.scoutBoard.discovery), [
    rival.id,
  ]);
  const targets = ensureTargetsForPool(session.scoutBoard.targets, discovery, [rival]);
  return {
    ...session,
    week: isTransferWindowOpen(session.week) ? session.week : 2,
    rivalPlayers: [rival],
    players: [],
    scoutBoard: { ...session.scoutBoard, discovery, targets },
    transferState: { ...session.transferState, negotiations: [] },
  };
}

describe("pending purchase", () => {
  it("stages without moving player or charging fee", () => {
    const session = sessionWithRival();
    const staged = stagePendingPurchase(session, "pl_99999", 500_000, "neg_1");
    expect(staged.kind).toBe("ok");
    if (staged.kind !== "ok") return;
    expect(staged.session.players).toHaveLength(0);
    expect(staged.session.finances.cash).toBe(session.finances.cash);
    expect(staged.session.transferState.pending_purchases).toHaveLength(1);
  });

  it("commits after contract accept", () => {
    let session: GameSession = sessionWithRival();
    const staged = stagePendingPurchase(session, "pl_99999", 400_000, "neg_1");
    if (staged.kind !== "ok") throw new Error("stage failed");
    session = staged.session;
    const rival = session.rivalPlayers[0]!;
    const offer = defaultContractOffer(rival, session.season);
    const committed = commitPendingPurchase(session, "pl_99999", {
      ...offer,
      wageWeekly: Math.round(offer.wageWeekly * 1.5),
      bonusAppearance: offer.bonusAppearance * 2,
    });
    expect(committed.kind).toBe("ok");
    if (committed.kind !== "ok") return;
    expect(committed.session.players.some((player) => player.id === "pl_99999")).toBe(true);
    expect(committed.session.transferState.history.length).toBeGreaterThan(0);
  });

  it("aborts without roster or history", () => {
    let session = sessionWithRival();
    const staged = stagePendingPurchase(session, "pl_99999", 400_000, "neg_1");
    if (staged.kind !== "ok") throw new Error("stage failed");
    const aborted = abortPendingPurchase(staged.session, "pl_99999");
    expect(aborted.session.transferState.pending_purchases).toHaveLength(0);
    expect(aborted.session.players).toHaveLength(0);
  });
});
