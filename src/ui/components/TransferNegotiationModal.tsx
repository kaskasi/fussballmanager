import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Check, X } from "lucide-react";
import {
  formatClubCash,
  formatSignedCash,
  type ClubFinances,
} from "../../economy/club-finances.ts";
import {
  formatWeeksOfWages,
  spendRunway,
  spendRunwayLines,
  weeksOfWages,
} from "../../economy/spend-runway.ts";
import type { Player } from "../../types/player.ts";
import { formatPlayerName } from "../../types/player-display.ts";
import {
  MAX_NEGOTIATION_ROUNDS,
  type TransferNegotiation,
} from "../../transfers/negotiations.ts";
import type { ScoutValueBounds } from "../../scouting/scout-visibility.ts";
import type { AbilityEstimate } from "../../scouting/estimate-model.ts";
import {
  canSubmitNegotiationOffer,
  negotiationGates,
} from "../../transfers/negotiation-readiness.ts";
import { useT } from "../../i18n/react.ts";
import { Hint } from "./Hint.tsx";

/** WIREFRAME: PRD 05.3 — 4-round transfer negotiation with patience bar. */
export function TransferNegotiationModal({
  player,
  negotiation,
  transferBudget,
  finances,
  weeklyWageBill,
  boardCashFloor,
  message,
  openError,
  transferWindowOpen,
  week,
  season,
  scoutEstimate,
  valueBounds = null,
  uiPhase = "active",
  agreedFee,
  contractPanel,
  onSubmitOffer,
  onAcceptCounter,
  onContinueTalk,
  onWalkAway,
}: {
  player: Player;
  negotiation: TransferNegotiation;
  transferBudget: number;
  finances: ClubFinances;
  weeklyWageBill: number;
  boardCashFloor: number;
  message: string | null;
  openError?: string | null;
  transferWindowOpen: boolean;
  week: number;
  season: number;
  scoutEstimate?: AbilityEstimate;
  valueBounds?: ScoutValueBounds | null;
  uiPhase?: "active" | "contract" | "won" | "lost";
  agreedFee?: number;
  contractPanel?: ReactNode;
  onSubmitOffer: (fee: number) => void;
  onAcceptCounter: () => void;
  onContinueTalk: () => void;
  onWalkAway: () => void;
}) {
  const t = useT();
  const asking = negotiation.asking_price;

  const sliderRange = useMemo(() => {
    if (valueBounds && !valueBounds.exact) {
      const min = Math.min(valueBounds.low, valueBounds.high);
      const max = Math.max(valueBounds.low, valueBounds.high);
      const span = Math.max(1, max - min);
      return { min, max, step: Math.max(1_000, Math.round(span / 100)) };
    }
    const min = Math.max(1, Math.round(asking * 0.5));
    const max = Math.max(min + 1, Math.round(asking * 1.5));
    const span = max - min;
    return { min, max, step: Math.max(1_000, Math.round(span / 100)) };
  }, [asking, valueBounds]);

  const [offer, setOffer] = useState(() =>
    clampOffer(negotiation.current_offer, sliderRange.min, sliderRange.max),
  );

  useEffect(() => {
    setOffer(clampOffer(negotiation.current_offer, sliderRange.min, sliderRange.max));
  }, [negotiation.id, negotiation.current_offer, sliderRange.min, sliderRange.max]);

  const referencePrice =
    valueBounds && !valueBounds.exact
      ? Math.round((valueBounds.low + valueBounds.high) / 2)
      : asking;
  const ratio = referencePrice > 0 ? offer / referencePrice : null;
  const isSale = negotiation.side === "sell";
  const offerRunway = isSale
    ? null
    : spendRunway(finances, weeklyWageBill, offer, boardCashFloor);
  const counterRunway =
    !isSale && negotiation.counter_offer
      ? spendRunway(finances, weeklyWageBill, negotiation.counter_offer, boardCashFloor)
      : null;
  const saleProceedLines = (fee: number) => {
    const cashAfter = finances.cash + fee;
    const belowFloor = cashAfter < boardCashFloor;
    return [
      { label: t("transfer.negotiation.sale.proceeds"), value: formatClubCash(fee) },
      {
        label: t("transfer.negotiation.sale.cashAfter"),
        value: formatSignedCash(cashAfter),
      },
      {
        label: t("transfer.negotiation.sale.wages"),
        value: formatWeeksOfWages(weeksOfWages(cashAfter, weeklyWageBill)),
      },
      {
        label: t("transfer.negotiation.sale.boardCash"),
        value: belowFloor
          ? t("transfer.negotiation.sale.belowFloor", { floor: formatClubCash(boardCashFloor) })
          : formatSignedCash(cashAfter - boardCashFloor),
        warn: belowFloor,
      },
    ];
  };
  const gates = negotiationGates({
    week,
    player,
    estimate: scoutEstimate,
    season,
    finances,
    offerFee: offer,
    transferWindowOpen,
    isSale,
  });
  const canSubmit =
    uiPhase === "active" && canSubmitNegotiationOffer(gates) && !openError;
  const resolved = uiPhase !== "active";
  const contractPhase = uiPhase === "contract";

  const metaText = (() => {
    if (isSale) {
      return t("transfer.negotiation.meta.sale", {
        value: formatClubCash(player.market_value),
        bid: formatClubCash(negotiation.counter_offer ?? negotiation.current_offer),
      });
    }
    if (valueBounds && !valueBounds.exact) {
      return t("transfer.negotiation.meta.range", {
        low: formatClubCash(valueBounds.low),
        high: formatClubCash(valueBounds.high),
        budget: formatClubCash(transferBudget),
      });
    }
    if (valueBounds?.exact || valueBounds) {
      return t("transfer.negotiation.meta.scout", {
        asking: formatClubCash(asking),
        budget: formatClubCash(transferBudget),
      });
    }
    return t("transfer.negotiation.meta.blind", {
      budget: formatClubCash(transferBudget),
    });
  })();

  const hintText = isSale
    ? t("transfer.negotiation.hint.sale")
    : t("transfer.negotiation.hint.offerGuide");

  return (
    <div className="modal-backdrop" role="presentation">
      <dialog
        className={
          contractPhase
            ? "negotiation-modal negotiation-modal--purchase-contract"
            : "negotiation-modal"
        }
        open
        aria-labelledby="negotiation-title"
      >
        <div className={contractPhase ? "negotiation-modal-split" : undefined}>
          <div className="negotiation-modal-fee">
        <header className="negotiation-head">
          <p className="eyebrow">{t("transfer.negotiation.title")}</p>
          <h2 id="negotiation-title">{formatPlayerName(player)}</h2>
          <p className="negotiation-meta">{metaText}</p>
        </header>

        {openError ? (
          <p className="negotiation-open-error" role="alert">
            {openError}
          </p>
        ) : null}

        {contractPhase && agreedFee != null ? (
          <p className="negotiation-resolution is-success">
            {t("transfer.purchase.feeAgreedSummary", { fee: formatClubCash(agreedFee) })}
          </p>
        ) : null}

        {!resolved && !contractPhase ? (
        <section className="negotiation-rules" aria-labelledby="negotiation-rules-title">
          <h3 id="negotiation-rules-title" className="negotiation-rules-title">
            {isSale
              ? t("transfer.negotiation.rules.titleSale")
              : t("transfer.negotiation.rules.title")}
          </h3>
          <ul className="negotiation-rules-list">
            {gates.map((gate) => (
              <li
                key={gate.id}
                className={gate.ok ? "negotiation-rule is-ok" : "negotiation-rule is-blocked"}
              >
                <span className="negotiation-rule-icon" aria-hidden="true">
                  {gate.ok ? <Check size={16} strokeWidth={2.5} /> : <X size={16} strokeWidth={2.5} />}
                </span>
                <span className="negotiation-rule-body">
                  <strong>{gate.title}</strong>
                  <span>{gate.detail}</span>
                </span>
              </li>
            ))}
          </ul>
          <p className="negotiation-rules-footnote">
            {isSale
              ? t("transfer.negotiation.rules.footnoteSale")
              : t("transfer.negotiation.rules.footnote")}
          </p>
        </section>
        ) : null}

        {!resolved && !contractPhase ? (
        <div className="negotiation-patience" aria-label={t("transfer.negotiation.patience")}>
          <span>{t("transfer.negotiation.patience")}</span>
          <div className="negotiation-patience-bar">
            {Array.from({ length: MAX_NEGOTIATION_ROUNDS }, (_, index) => (
              <span
                key={index}
                className={
                  index < negotiation.patience_rounds_left
                    ? "negotiation-patience-dot is-full"
                    : "negotiation-patience-dot"
                }
                aria-hidden="true"
              />
            ))}
          </div>
          <span>
            {t("transfer.negotiation.round", {
              round: negotiation.round,
              max: MAX_NEGOTIATION_ROUNDS,
            })}
          </span>
        </div>
        ) : null}

        {!resolved && !contractPhase && negotiation.counter_offer ? (
          <p className="negotiation-counter">
            {t("transfer.negotiation.counter", {
              amount: formatClubCash(negotiation.counter_offer),
            })}
          </p>
        ) : null}

        {message ? (
          <p
            className={
              uiPhase === "won"
                ? "negotiation-resolution is-success"
                : uiPhase === "lost"
                  ? "negotiation-resolution is-failure"
                  : "negotiation-message"
            }
            role="status"
          >
            {message}
          </p>
        ) : null}

        {!resolved && !contractPhase ? (
          <>
            <Hint text={hintText} block>
              <div className="negotiation-offer">
                <span>
                  {isSale
                    ? t("transfer.negotiation.sale.minimumFee")
                    : t("transfer.negotiation.yourOffer")}
                </span>
                <strong className="negotiation-offer-amount">{formatClubCash(offer)}</strong>
                <input
                  type="range"
                  className="negotiation-offer-slider"
                  min={sliderRange.min}
                  max={sliderRange.max}
                  step={sliderRange.step}
                  value={offer}
                  onChange={(event) => setOffer(Number(event.target.value))}
                  aria-valuemin={sliderRange.min}
                  aria-valuemax={sliderRange.max}
                  aria-valuenow={offer}
                />
                {ratio !== null ? (
                  <span className="negotiation-ratio">{Math.round(ratio * 100)} %</span>
                ) : (
                  <span className="negotiation-ratio">?</span>
                )}
              </div>
            </Hint>

            <ul className="spend-confirm-lines negotiation-runway">
              {(isSale ? saleProceedLines(offer) : offerRunway ? spendRunwayLines(offerRunway) : []).map(
                (line) => (
                  <li key={line.label} className={line.warn ? "is-warn" : undefined}>
                    <span>{line.label}</span>
                    <strong>{line.value}</strong>
                  </li>
                ),
              )}
            </ul>
            {!isSale && offerRunway?.belowFloor ? (
              <p className="spend-confirm-warn" role="status">
                {t("transfer.negotiation.floorWarn")}
              </p>
            ) : null}
          </>
        ) : null}

        {!contractPhase ? (
        <div className="negotiation-actions">
          {uiPhase === "won" ? (
            <button
              type="button"
              className="negotiation-btn negotiation-btn-primary"
              onClick={onWalkAway}
            >
              {t("transfer.negotiation.closeDone")}
            </button>
          ) : uiPhase === "lost" ? (
            <>
              {negotiation.status === "active" ? (
                <button
                  type="button"
                  className="negotiation-btn negotiation-btn-primary"
                  onClick={onContinueTalk}
                >
                  {t("transfer.negotiation.continueTalk")}
                </button>
              ) : null}
              <button type="button" className="negotiation-btn negotiation-btn-muted" onClick={onWalkAway}>
                {t("transfer.negotiation.walkAway")}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className={[
                  "negotiation-btn",
                  "negotiation-btn-primary",
                  canSubmit ? "" : "is-disabled",
                ]
                  .filter(Boolean)
                  .join(" ")}
                aria-disabled={!canSubmit}
                onClick={() => {
                  if (!canSubmit) return;
                  onSubmitOffer(offer);
                }}
              >
                {isSale ? t("transfer.negotiation.sale.submit") : t("transfer.negotiation.submit")}
              </button>
              {negotiation.counter_offer && (isSale || counterRunway) ? (
                <button
                  type="button"
                  className={[
                    "negotiation-btn",
                    "negotiation-btn-primary",
                    isSale
                      ? transferWindowOpen
                        ? ""
                        : "is-disabled"
                      : canSubmit && transferWindowOpen
                        ? ""
                        : "is-disabled",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  aria-disabled={
                    isSale ? !transferWindowOpen : !canSubmit || !transferWindowOpen
                  }
                  onClick={() => {
                    if (isSale) {
                      if (!transferWindowOpen) return;
                      onAcceptCounter();
                      return;
                    }
                    if (!canSubmit || !transferWindowOpen) return;
                    onAcceptCounter();
                  }}
                >
                  {isSale
                    ? t("transfer.negotiation.sale.acceptBid", {
                        amount: formatClubCash(negotiation.counter_offer),
                      })
                    : t("transfer.negotiation.acceptCounter", {
                        amount: formatClubCash(negotiation.counter_offer),
                        floorNote: counterRunway?.belowFloor
                          ? t("transfer.negotiation.acceptCounterFloor")
                          : "",
                      })}
                </button>
              ) : null}
              <button type="button" className="negotiation-btn negotiation-btn-muted" onClick={onWalkAway}>
                {t("transfer.negotiation.walkAway")}
              </button>
            </>
          )}
        </div>
        ) : null}
          </div>
          {contractPhase && contractPanel ? (
            <div className="negotiation-modal-contract">{contractPanel}</div>
          ) : null}
        </div>
      </dialog>
    </div>
  );
}

function clampOffer(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
