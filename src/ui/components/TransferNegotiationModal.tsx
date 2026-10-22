import { Fragment, useEffect, useMemo, useState, type ReactNode } from "react";
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
import { ModalShell } from "./primitives/ModalShell.tsx";

/** WIREFRAME: PRD 05.3 — 4-round transfer negotiation with patience bar (design-system modal, design.md §9.6). */
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
  committedFees = 0,
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
  /** Fees reserved for waiting purchases. */
  committedFees?: number;
  week: number;
  season: number;
  scoutEstimate?: AbilityEstimate;
  valueBounds?: ScoutValueBounds | null;
  uiPhase?: "active" | "contract" | "won" | "scheduled" | "lost";
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
    committedFees,
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

  const runwayLines = isSale ? saleProceedLines(offer) : offerRunway ? spendRunwayLines(offerRunway) : [];
  const counterBlocked = isSale ? false : !canSubmit;
  const agreed = uiPhase === "won" || uiPhase === "scheduled";

  const footer = contractPhase ? null : agreed ? (
    <button type="button" className="tc-btn tc-btn--primary" onClick={onWalkAway}>
      {t("transfer.negotiation.closeDone")}
    </button>
  ) : uiPhase === "lost" ? (
    <>
      <button type="button" className="tc-btn tc-btn--ghost" onClick={onWalkAway}>
        {t("transfer.negotiation.walkAway")}
      </button>
      {negotiation.status === "active" ? (
        <button type="button" className="tc-btn tc-btn--primary" onClick={onContinueTalk}>
          {t("transfer.negotiation.continueTalk")}
        </button>
      ) : null}
    </>
  ) : (
    <>
      <button type="button" className="tc-btn tc-btn--ghost" onClick={onWalkAway}>
        {t("transfer.negotiation.walkAway")}
      </button>
      {negotiation.counter_offer && (isSale || counterRunway) ? (
        <button
          type="button"
          className="tc-btn"
          aria-disabled={counterBlocked}
          onClick={() => {
            if (counterBlocked) return;
            onAcceptCounter();
          }}
        >
          {isSale
            ? t("transfer.negotiation.sale.acceptBid", { amount: formatClubCash(negotiation.counter_offer) })
            : t("transfer.negotiation.acceptCounter", {
                amount: formatClubCash(negotiation.counter_offer),
                floorNote: counterRunway?.belowFloor ? t("transfer.negotiation.acceptCounterFloor") : "",
              })}
        </button>
      ) : null}
      <button
        type="button"
        className="tc-btn tc-btn--primary"
        aria-disabled={!canSubmit}
        onClick={() => {
          if (!canSubmit) return;
          onSubmitOffer(offer);
        }}
      >
        {isSale ? t("transfer.negotiation.sale.submit") : t("transfer.negotiation.submit")}
      </button>
    </>
  );

  return (
    <ModalShell
      variant="tc"
      ariaLabel={t("transfer.negotiation.aria", { name: formatPlayerName(player) })}
      onClose={onWalkAway}
      closeOnBackdrop={false}
      panelClassName={contractPhase ? "tc-modal--wide" : ""}
      title={
        <>
          <span className="tc-label">{t("transfer.negotiation.title")}</span>
          <h2 className="tc-modal__title">{formatPlayerName(player)}</h2>
          <p className="tc-modal__sub">{metaText}</p>
        </>
      }
      footer={footer}
    >
      <div className={contractPhase ? "tc-negotiation tc-negotiation--split" : "tc-negotiation"}>
        <div className="tc-negotiation__fee">
          {openError ? (
            <p className="tc-callout tc-callout--no" role="alert">
              {openError}
            </p>
          ) : null}

          {contractPhase && agreedFee != null ? (
            <p className="tc-callout tc-callout--ok">
              {t("transfer.purchase.feeAgreedSummary", { fee: formatClubCash(agreedFee) })}
            </p>
          ) : null}

          {!resolved && !contractPhase ? (
            <section className="tc-negotiation__rules" aria-labelledby="negotiation-rules-title">
              <h3 id="negotiation-rules-title" className="tc-label">
                {isSale ? t("transfer.negotiation.rules.titleSale") : t("transfer.negotiation.rules.title")}
              </h3>
              <ul className="tc-gates">
                {gates.map((gate) => (
                  <li key={gate.id} className={gate.ok ? "tc-gate tc-gate--ok" : "tc-gate tc-gate--no"}>
                    {gate.ok ? <Check className="tc-icon" aria-hidden /> : <X className="tc-icon" aria-hidden />}
                    <span className="tc-gate__copy">
                      <strong>{gate.title}</strong>
                      <span className="tc-sr">{gate.ok ? t("transfer.negotiation.gateOk") : t("transfer.negotiation.gateOpen")}</span>
                      <span className="tc-caption">{gate.detail}</span>
                    </span>
                  </li>
                ))}
              </ul>
              <p className="tc-caption">
                {isSale ? t("transfer.negotiation.rules.footnoteSale") : t("transfer.negotiation.rules.footnote")}
              </p>
            </section>
          ) : null}

          {!resolved && !contractPhase ? (
            <div className="tc-patience">
              <span className="tc-label">{t("transfer.negotiation.patience")}</span>
              <span
                className="tc-patience__dots"
                role="meter"
                aria-label={t("transfer.negotiation.patience")}
                aria-valuemin={0}
                aria-valuemax={MAX_NEGOTIATION_ROUNDS}
                aria-valuenow={negotiation.patience_rounds_left}
              >
                {Array.from({ length: MAX_NEGOTIATION_ROUNDS }, (_, index) => (
                  <span
                    key={index}
                    className={
                      index < negotiation.patience_rounds_left ? "tc-patience__dot tc-patience__dot--full" : "tc-patience__dot"
                    }
                  />
                ))}
              </span>
              <span className="tc-caption">
                {t("transfer.negotiation.round", { round: negotiation.round, max: MAX_NEGOTIATION_ROUNDS })}
              </span>
            </div>
          ) : null}

          {!resolved && !contractPhase && negotiation.counter_offer ? (
            <p className="tc-callout">
              {t("transfer.negotiation.counter", { amount: formatClubCash(negotiation.counter_offer) })}
            </p>
          ) : null}

          {message ? (
            <p
              className={
                agreed ? "tc-callout tc-callout--ok" : uiPhase === "lost" ? "tc-callout tc-callout--no" : "tc-callout"
              }
              role="status"
            >
              {message}
            </p>
          ) : null}

          {!resolved && !contractPhase ? (
            <>
              <label className="tc-range" title={hintText}>
                <span className="tc-range__head">
                  <span>{isSale ? t("transfer.negotiation.sale.minimumFee") : t("transfer.negotiation.yourOffer")}</span>
                  <strong>
                    {formatClubCash(offer)}
                    <span className="tc-caption tc-negotiation__ratio">
                      {ratio !== null
                        ? t("transfer.negotiation.ratio", { percent: Math.round(ratio * 100) })
                        : t("transfer.negotiation.ratioUnknown")}
                    </span>
                  </strong>
                </span>
                <input
                  type="range"
                  min={sliderRange.min}
                  max={sliderRange.max}
                  step={sliderRange.step}
                  value={offer}
                  onChange={(event) => setOffer(Number(event.target.value))}
                  aria-valuetext={formatClubCash(offer)}
                />
              </label>

              <dl className="tc-kv">
                {runwayLines.map((line) => (
                  <Fragment key={line.label}>
                    <dt>{line.label}</dt>
                    <dd className={line.warn ? "tc-attention" : undefined}>{line.value}</dd>
                  </Fragment>
                ))}
              </dl>
              {!isSale && offerRunway?.belowFloor ? (
                <p className="tc-callout tc-callout--warn" role="status">
                  {t("transfer.negotiation.floorWarn")}
                </p>
              ) : null}
            </>
          ) : null}
        </div>
        {contractPhase && contractPanel ? <div className="tc-negotiation__contract">{contractPanel}</div> : null}
      </div>
    </ModalShell>
  );
}

function clampOffer(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
