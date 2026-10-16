/** Public transfer-domain facade (PRD 17). UI imports from here, not deep paths. */

export {
  cannotOpenPurchaseReason,
  cannotPayTransferFeeReason,
  cannotSubmitPurchaseOfferReason,
  transferWindowClosedReason,
} from "./purchase-block.ts";

export { openPurchaseNegotiation } from "./open-purchase-negotiation.ts";
export { finalizePlayerPurchase } from "./finalize-player-purchase.ts";
export {
  abortPendingPurchase,
  commitPendingPurchase,
  stagePendingPurchase,
} from "./pending-player-purchase.ts";
export {
  canSubmitNegotiationOffer,
  negotiationGates,
} from "./negotiation-readiness.ts";

export {
  acceptCounterOffer,
  activeNegotiation,
  draftNegotiationPreview,
  draftSaleNegotiationPreview,
  submitNegotiationRound,
} from "./negotiations.ts";

export { resolvePurchaseTarget } from "./resolve-purchase-target.ts";
