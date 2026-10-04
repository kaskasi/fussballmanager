import { useState } from "react";
import { formatClubCash, type ClubFinances } from "../../economy/club-finances.ts";
import { spendRunway, spendRunwayLines } from "../../economy/spend-runway.ts";
import type { Player } from "../../types/player.ts";
import { formatPlayerName } from "../../types/player-display.ts";
import {
  MAX_NEGOTIATION_ROUNDS,
  type TransferNegotiation,
} from "../../transfers/negotiations.ts";
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
  const [offerInput, setOfferInput] = useState(String(negotiation.current_offer));
  const offer = Number.parseInt(offerInput.replace(/\D/g, ""), 10) || 0;
  const canAfford = offer <= transferBudget;
  const ratio = scoutIntelKnown ? offer / Math.max(1, negotiation.asking_price) : null;
  const offerRunway = spendRunway(finances, weeklyWageBill, offer, boardCashFloor);
  const counterRunway = negotiation.counter_offer
    ? spendRunway(finances, weeklyWageBill, negotiation.counter_offer, boardCashFloor)
    : null;

  return (
    <div className="modal-backdrop" role="presentation">
      <dialog className="negotiation-modal" open aria-labelledby="negotiation-title">
        <header className="negotiation-head">
          <p className="eyebrow">Transferverhandlung</p>
          <h2 id="negotiation-title">💰 {formatPlayerName(player)}</h2>
          <p className="negotiation-meta">
            {scoutIntelKnown
              ? `Marktwert Verein: ${formatClubCash(negotiation.asking_price)} · `
              : "Kein Scout-Bericht — Ablöse unbekannt bis zum Abschluss · "}
            Budget: {formatClubCash(transferBudget)}
          </p>
        </header>

        <div className="negotiation-patience" aria-label="Geduld">
          <span>Geduld</span>
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
          <span>Runde {negotiation.round}/{MAX_NEGOTIATION_ROUNDS}</span>
        </div>

        {negotiation.counter_offer ? (
          <p className="negotiation-counter">
            Gegenangebot: <strong>{formatClubCash(negotiation.counter_offer)}</strong>
          </p>
        ) : null}

        {message ? <p className="negotiation-message" role="status">{message}</p> : null}

        <Hint
          text={
            scoutIntelKnown
              ? "Angebot in % des Vereinswerts: unter 70 % = Ablehnung, 100–110 % = oft Zustimmung."
              : "Ohne Scout-Schätzung: nur dein Angebot zählt — Abbuchung erst bei Annahme."
          }
          block
        >
          <label className="negotiation-offer">
            <span>Dein Angebot</span>
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
            Vorstand-Kasse verfehlt, wenn die Saison heute endet. Angebot trotzdem möglich.
          </p>
        ) : null}

        <div className="negotiation-actions">
          <button
            type="button"
            className="negotiation-btn negotiation-btn-primary"
            disabled={!canAfford || offer <= 0}
            onClick={() => onSubmitOffer(offer)}
          >
            Angebot senden
          </button>
          {negotiation.counter_offer && counterRunway ? (
            <button type="button" className="negotiation-btn" onClick={onAcceptCounter}>
              Gegenangebot annehmen ({formatClubCash(negotiation.counter_offer)}
              {counterRunway.belowFloor ? " · unter Vorstand-Kasse" : ""})
            </button>
          ) : null}
          <button type="button" className="negotiation-btn negotiation-btn-muted" onClick={onWalkAway}>
            Abbrechen
          </button>
        </div>
      </dialog>
    </div>
  );
}
