import { formatClubCash, type ClubFinances } from "../economy/club-finances.ts";
import { t } from "../i18n/index.ts";
import { nextTransferWindowStart } from "../sim/game-calendar.ts";
import type { AbilityEstimate } from "../scouting/estimate-model.ts";
import { scoutIntelExactForTransfer, scoutMarketValueBounds } from "../scouting/scout-visibility.ts";
import type { Player } from "../types/player.ts";
import { cannotPayTransferFeeReason } from "./purchase-block.ts";
import { scheduledMoveLabel } from "./scheduled-transfers.ts";

export type NegotiationGateId = "window" | "scout" | "budget";

export interface NegotiationGate {
  id: NegotiationGateId;
  ok: boolean;
  title: string;
  detail: string;
}

export function negotiationGates(input: {
  week: number;
  player: Player;
  estimate: AbilityEstimate | undefined;
  season: number;
  finances: ClubFinances;
  offerFee: number;
  transferWindowOpen: boolean;
  /** Sale to AI / inbound bid — own squad, no scout intel required. */
  isSale?: boolean;
  /** Fees reserved for waiting purchases (not available for this offer). */
  committedFees?: number;
}): NegotiationGate[] {
  const isSale = input.isSale === true;
  const bounds = isSale
    ? { low: input.player.market_value, high: input.player.market_value, exact: true }
    : input.estimate
      ? scoutMarketValueBounds(input.player, input.estimate, input.season, false)
      : null;
  const scoutExact = isSale
    ? true
    : scoutIntelExactForTransfer(input.player, input.estimate, input.season);
  const payReason = isSale
    ? null
    : cannotPayTransferFeeReason(input.finances, input.offerFee, input.committedFees ?? 0);

  let scoutTitle: string;
  let scoutDetail: string;
  if (isSale) {
    scoutTitle = t("transfer.negotiation.gate.scout.sale.title");
    scoutDetail = t("transfer.negotiation.gate.scout.sale.detail");
  } else if (!input.estimate) {
    scoutTitle = t("transfer.negotiation.gate.scout.missing.title");
    scoutDetail = t("transfer.negotiation.gate.scout.missing.detail");
  } else if (!bounds) {
    scoutTitle = t("transfer.negotiation.gate.scout.thin.title");
    scoutDetail = t("transfer.negotiation.gate.scout.thin.detail");
  } else if (!scoutExact) {
    scoutTitle = t("transfer.negotiation.gate.scout.range.title");
    scoutDetail = t("transfer.negotiation.gate.scout.range.detail", {
      low: formatClubCash(bounds.low),
      high: formatClubCash(bounds.high),
    });
  } else {
    scoutTitle = t("transfer.negotiation.gate.scout.ok.title");
    scoutDetail = t("transfer.negotiation.gate.scout.ok.detail");
  }

  return [
    // Information only: deals work all year; outside a window the move waits for the next one.
    {
      id: "window",
      ok: true,
      title: input.transferWindowOpen
        ? t("transfer.negotiation.gate.window.open.title")
        : t("transfer.negotiation.gate.window.later.title"),
      detail: input.transferWindowOpen
        ? isSale
          ? t("transfer.negotiation.gate.window.open.detailSale")
          : t("transfer.negotiation.gate.window.open.detail")
        : t(isSale ? "transfer.negotiation.gate.window.later.detailSale" : "transfer.negotiation.gate.window.later.detail", {
            when: scheduledMoveLabel(nextTransferWindowStart(input.season, input.week), input.season),
          }),
    },
    {
      id: "scout",
      ok: scoutExact,
      title: scoutTitle,
      detail: scoutDetail,
    },
    {
      id: "budget",
      ok: !payReason,
      title: isSale
        ? t("transfer.negotiation.gate.budget.sale.title")
        : payReason
          ? t("transfer.negotiation.gate.budget.block.title")
          : t("transfer.negotiation.gate.budget.ok.title"),
      detail: isSale
        ? t("transfer.negotiation.gate.budget.sale.detail")
        : payReason
          ? payReason
          : t("transfer.negotiation.gate.budget.ok.detail"),
    },
  ];
}

export function canSubmitNegotiationOffer(gates: NegotiationGate[]): boolean {
  return gates.every((gate) => gate.ok);
}
