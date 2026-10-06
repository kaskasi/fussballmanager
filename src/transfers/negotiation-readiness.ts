import { formatClubCash, type ClubFinances } from "../economy/club-finances.ts";
import { t, transferWindowHint } from "../i18n/index.ts";
import type { AbilityEstimate } from "../scouting/estimate-model.ts";
import { scoutIntelExactForTransfer, scoutMarketValueBounds } from "../scouting/scout-visibility.ts";
import type { Player } from "../types/player.ts";
import { cannotPayTransferFeeReason, transferWindowClosedReason } from "./purchase-block.ts";

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
}): NegotiationGate[] {
  const windowReason = transferWindowClosedReason(input.week);
  const bounds = input.estimate
    ? scoutMarketValueBounds(input.player, input.estimate, input.season, false)
    : null;
  const scoutExact = scoutIntelExactForTransfer(input.player, input.estimate, input.season);
  const payReason = cannotPayTransferFeeReason(input.finances, input.offerFee);

  let scoutTitle: string;
  let scoutDetail: string;
  if (!input.estimate) {
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
    {
      id: "window",
      ok: input.transferWindowOpen,
      title: input.transferWindowOpen
        ? t("transfer.negotiation.gate.window.open.title")
        : t("transfer.negotiation.gate.window.closed.title"),
      detail: input.transferWindowOpen
        ? t("transfer.negotiation.gate.window.open.detail")
        : (windowReason ?? t("transfer.negotiation.gate.window.closed.detail", { hint: transferWindowHint() })),
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
      title: payReason
        ? t("transfer.negotiation.gate.budget.block.title")
        : t("transfer.negotiation.gate.budget.ok.title"),
      detail: payReason ? payReason : t("transfer.negotiation.gate.budget.ok.detail"),
    },
  ];
}

export function canSubmitNegotiationOffer(gates: NegotiationGate[]): boolean {
  return gates.every((gate) => gate.ok);
}
