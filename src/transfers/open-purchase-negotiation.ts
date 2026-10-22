import { t } from "../i18n/index.ts";
import type { ScoutBoard } from "../scouting/scout-board.ts";
import type { Player } from "../types/player.ts";
import { cannotOpenPurchaseReason } from "./purchase-block.ts";
import { resolvePurchaseTarget } from "./resolve-purchase-target.ts";
import { unsolicitedRefusalReason } from "./unsolicited-approach.ts";
import {
  startNegotiation,
  type TransferNegotiation,
  type TransferState,
} from "./negotiations.ts";

export type OpenPurchaseNegotiationResult =
  | { kind: "ok"; transferState: TransferState; negotiation: TransferNegotiation }
  | { kind: "blocked"; reason: string };

/** Synchronous open — UI must not rely on patchSession side effects for success. */
export function openPurchaseNegotiation(input: {
  scoutBoard: ScoutBoard;
  rivalPlayers: readonly Player[];
  transferState: TransferState;
  playerId: string;
  season: number;
  week: number;
}): OpenPurchaseNegotiationResult {
  const target = resolvePurchaseTarget(
    input.scoutBoard,
    input.playerId,
    input.rivalPlayers,
    input.transferState,
  );
  const reason = cannotOpenPurchaseReason(input.week, Boolean(target));
  if (reason) {
    return { kind: "blocked", reason };
  }
  if (!target) {
    return { kind: "blocked", reason: t("transfer.purchase.targetUnavailable") };
  }
  const listed = (input.transferState.listings ?? []).some((row) => row.player_id === input.playerId);
  if (!listed) {
    const refusal = unsolicitedRefusalReason(target.player, input.rivalPlayers);
    if (refusal) return { kind: "blocked", reason: refusal };
  }
  const deal = startNegotiation(
    input.transferState,
    target.player,
    target.player.club_id ?? "cl_rival_pool",
    input.season,
    input.week,
    undefined,
    { unsolicited: !listed },
  );
  return { kind: "ok", transferState: deal.state, negotiation: deal.negotiation };
}
