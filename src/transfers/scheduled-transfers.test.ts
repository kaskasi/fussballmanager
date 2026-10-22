import { describe, expect, it } from "vitest";
import { newGameSession, type GameSession } from "../persistence/game-session.ts";
import { simulateGameWeek } from "../sim/week-pipeline.ts";
import { transferBudget } from "../economy/club-finances.ts";
import { defaultContractOffer } from "./contract-talks.ts";
import {
  committedTransferFees,
  executeScheduledTransfers,
  scheduledTransferReason,
  scheduleTransfer,
} from "./scheduled-transfers.ts";
import { applyListedSale } from "./transfer-listings.ts";
import { commitPendingPurchase } from "./pending-player-purchase.ts";

function rivalTarget(session: GameSession) {
  const player = session.rivalPlayers.find((entry) => entry.squad_status === "pro" && entry.club_id);
  if (!player) throw new Error("no rival pro");
  return player;
}

describe("scheduled transfers (PRD 05 — deals outside a window)", () => {
  it("waits for the next window, keeps the player at his club and reserves the fee", () => {
    const session = newGameSession();
    const target = rivalTarget(session);
    const scheduled = scheduleTransfer({
      state: session.transferState,
      player: target,
      direction: "in",
      otherClubId: target.club_id!,
      fee: 400_000,
      contract: defaultContractOffer(target, session.season),
      season: session.season,
      week: 6,
    });
    expect(scheduled.entry.effective_week).toBe(20);
    expect(committedTransferFees(scheduled.state)).toBe(400_000);
    expect(scheduled.state.history[0]).toMatchObject({ pending: true, kind: "in", effective_week: 20 });
    expect(scheduledTransferReason(scheduled.state, target.id, session.season)).toBeTruthy();

    const done = executeScheduledTransfers({
      players: session.players,
      rivalPlayers: session.rivalPlayers,
      finances: session.finances,
      transferState: scheduled.state,
      clubId: session.clubId,
      season: session.season,
      week: 20,
      masterSeed: session.masterSeed,
      boardCashFloor: 0,
    });
    expect(done.players.some((player) => player.id === target.id && player.club_id === session.clubId)).toBe(true);
    expect(done.rivalPlayers.some((player) => player.id === target.id)).toBe(false);
    expect(transferBudget(done.finances)).toBe(transferBudget(session.finances) - 400_000);
    expect(done.transferState.scheduled_transfers).toEqual([]);
    expect(done.transferState.history[0]).toMatchObject({ kind: "in", week: 20 });
    expect(done.transferState.history[0]?.pending).toBeUndefined();
  });

  it("signs a bought player for the next window when terms are agreed outside one", () => {
    const base = newGameSession();
    const target = rivalTarget(base);
    const session: GameSession = {
      ...base,
      week: 6,
      transferState: {
        ...base.transferState,
        pending_purchases: [
          {
            id: "pp_test",
            player_id: target.id,
            fee: 300_000,
            seller_club_id: target.club_id!,
            season: base.season,
            week: 6,
            negotiation_id: "neg_test",
          },
        ],
      },
    };
    session.transferState = {
      ...session.transferState,
      listings: [
        ...(session.transferState.listings ?? []),
        {
          player_id: target.id,
          club_id: target.club_id!,
          asking_price: 300_000,
          listed_season: base.season,
          listed_week: 6,
        },
      ],
    };
    const offer = { ...defaultContractOffer(target, session.season), wageWeekly: 1_000_000 };
    const result = commitPendingPurchase(session, target.id, offer);
    expect(result.kind).toBe("scheduled");
    if (result.kind !== "scheduled") return;
    expect(result.session.players.some((player) => player.id === target.id)).toBe(false);
    expect(result.session.finances.cash).toBe(session.finances.cash);
    expect(result.session.transferState.pending_purchases).toEqual([]);
    expect(committedTransferFees(result.session.transferState)).toBe(300_000);
  });

  it("lets a sold player keep playing until the window, then moves him in the week pipeline", async () => {
    const base = newGameSession();
    const seller = base.players.find((player) => player.squad_status === "pro")!;
    const sale = applyListedSale({
      players: base.players,
      rivalPlayers: base.rivalPlayers,
      finances: base.finances,
      transferState: base.transferState,
      playerId: seller.id,
      fee: 750_000,
      buyerClubId: "cl_ai_buyer",
      season: base.season,
      week: 19,
      userClubId: base.clubId,
      boardCashFloor: 0,
    });
    expect(sale.scheduled?.effective_week).toBe(20);
    expect(sale.players.some((player) => player.id === seller.id)).toBe(true);
    expect(sale.finances.cash).toBe(base.finances.cash);

    const before: GameSession = { ...base, week: 19, transferState: sale.transferState };
    const after = (await simulateGameWeek(before)).session;
    expect(after.week).toBe(20);
    expect(after.players.some((player) => player.id === seller.id)).toBe(false);
    expect(after.rivalPlayers.find((player) => player.id === seller.id)?.club_id).toBe("cl_ai_buyer");
    expect(after.transferState.scheduled_transfers).toEqual([]);
    expect(after.transferState.history.find((record) => record.player_id === seller.id)).toMatchObject({
      kind: "out",
      week: 20,
    });
  }, 120_000);
});
