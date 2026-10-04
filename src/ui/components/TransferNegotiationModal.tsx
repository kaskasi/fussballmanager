import { useState } from "react";
import { formatClubCash, type ClubFinances } from "../../economy/club-finances.ts";
import { spendRunway, spendRunwayLines } from "../../economy/spend-runway.ts";
import { cannotPayTransferFeeReason } from "../../transfers/purchase-block.ts";
import type { Player } from "../../types/player.ts";
import { formatPlayerName } from "../../types/player-display.ts";
import {
  MAX_NEGOTIATION_ROUNDS,
  type TransferNegotiation,
} from "../../transfers/negotiations.ts";
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
  scoutIntelKnown = true,
  onSubmitOffer,
  onAcceptCounter,
  onWalkAway,
}: {
  player: Player;
  negotiation: TransferNegotiation;
  transferBudget: number;
  finances: ClubFinances;
  weeklyWageBill: number;
  boardCashFloor: number;
  message: string | null;
  scoutIntelKnown?: boolean;
  onSubmitOffer: (fee: number) => void;
  onAcceptCounter: () => void;
  onWalkAway: () => void;
}) {
  const t = useT();
  const [offerInput, setOfferInput] = useState(String(negotiation.current_offer));
  const offer = Number.parseInt(offerInput.replace(/\D/g, ""), 10) || 0;
  const ratio = scoutIntelKnown ? offer / Math.max(1, negotiation.asking_price) : null;
  const offerRunway = spendRunway(finances, weeklyWageBill, offer, boardCashFloor);
  const counterRunway = negotiation.counter_offer
    ? spendRunway(finances, weeklyWageBill, negotiation.counter_offer, boardCashFloor)
    : null;
  const payReason = cannotPayTransferFeeReason(finances, offer);

  return (
    <div className="modal-backdrop" role="presentation">
      <dialog className="negotiation-modal" open aria-labelledby="negotiation-title">
        <header className="negotiation-head">
          <p className="eyebrow">{t("transfer.negotiation.title")}</p>
          <h2 id="negotiation-title">💰 {formatPlayerName(player)}</h2>
          <p className="negotiation-meta">
            {scoutIntelKnown
              ? t("transfer.negotiation.meta.scout", {
                  asking: formatClubCash(negotiation.asking_price),
                  budget: formatClubCash(transferBudget),
                })
              : t("transfer.negotiation.meta.blind", {
                  budget: formatClubCash(transferBudget),
                })}
          </p>
        </header>

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

        {negotiation.counter_offer ? (
          <p className="negotiation-counter">
            {t("transfer.negotiation.counter", {
              amount: formatClubCash(negotiation.counter_offer),
            })}
          </p>
        ) : null}

        {message ? <p className="negotiation-message" role="status">{message}</p> : null}

        <Hint
          text={
            scoutIntelKnown
              ? t("transfer.negotiation.hint.scout")
              : t("transfer.negotiation.hint.blind")
          }
          block
        >
          <label className="negotiation-offer">
            <span>{t("transfer.negotiation.yourOffer")}</span>
            <input
              type="text"
              inputMode="numeric"
              value={offerInput}
              onChange={(event) => setOfferInput(event.target.value)}
            />
            {ratio !== null ? (
              <span className="negotiation-ratio">{Math.round(ratio * 100)} %</span>
            ) : (
              <span className="negotiation-ratio">?</span>
            )}
          </label>
        </Hint>

        <ul className="spend-confirm-lines negotiation-runway">
          {spendRunwayLines(offerRunway).map((line) => (
            <li key={line.label} className={line.warn ? "is-warn" : undefined}>
              <span>{line.label}</span>
              <strong>{line.value}</strong>
            </li>
          ))}
        </ul>
        {offerRunway.belowFloor ? (
          <p className="spend-confirm-warn" role="status">
            {t("transfer.negotiation.floorWarn")}
          </p>
        ) : null}
        {payReason ? (
          <p className="spend-confirm-warn" role="status">
            {payReason}
          </p>
        ) : null}

        <div className="negotiation-actions">
          <button
            type="button"
            className="negotiation-btn negotiation-btn-primary"
            disabled={offer <= 0}
            onClick={() => onSubmitOffer(offer)}
          >
            {t("transfer.negotiation.submit")}
          </button>
          {negotiation.counter_offer && counterRunway ? (
            <button type="button" className="negotiation-btn" onClick={onAcceptCounter}>
              {t("transfer.negotiation.acceptCounter", {
                amount: formatClubCash(negotiation.counter_offer),
                floorNote: counterRunway.belowFloor
                  ? t("transfer.negotiation.acceptCounterFloor")
                  : "",
              })}
            </button>
          ) : null}
          <button type="button" className="negotiation-btn negotiation-btn-muted" onClick={onWalkAway}>
            {t("transfer.negotiation.walkAway")}
          </button>
        </div>
      </dialog>
    </div>
  );
}
