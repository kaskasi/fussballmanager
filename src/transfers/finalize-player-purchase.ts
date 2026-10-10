import type { GameSession } from "../persistence/game-session.ts";
import { stagePendingPurchase } from "./pending-player-purchase.ts";
import { activeNegotiation } from "./negotiations.ts";

export type FinalizePlayerPurchaseResult =
  | { kind: "ok"; session: GameSession; summary: string }
  | { kind: "blocked"; reason: string }
  | { kind: "pending_contract"; session: GameSession; fee: number };

/** Fee agreed — stage contract talks; roster and fee apply only after sign (PRD 05.4). */
export function finalizePlayerPurchase(
  current: GameSession,
  playerId: string,
  fee: number,
): FinalizePlayerPurchaseResult {
  const negotiation = activeNegotiation(current.transferState, playerId);
  const negotiationId = negotiation?.id ?? `neg_${playerId}_${current.season}_${current.week}`;
  const staged = stagePendingPurchase(current, playerId, fee, negotiationId);
  if (staged.kind === "blocked") {
    return { kind: "blocked", reason: staged.reason };
  }
  return {
    kind: "pending_contract",
    session: staged.session,
    fee,
  };
}
