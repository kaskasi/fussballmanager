import { useState } from "react";
import { formatClubCash } from "../../economy/club-finances.ts";
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
  message,
  scoutIntelKnown = true,
  onSubmitOffer,
  onAcceptCounter,
  onWalkAway,
}: {
  player: Player;
  negotiation: TransferNegotiation;
  transferBudget: number;
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

        <div className="negotiation-actions">
          <button
            type="button"
            className="negotiation-btn negotiation-btn-primary"
            disabled={!canAfford || offer <= 0}
            onClick={() => onSubmitOffer(offer)}
          >
            Angebot senden
          </button>
          {negotiation.counter_offer ? (
            <button type="button" className="negotiation-btn" onClick={onAcceptCounter}>
              Gegenangebot annehmen ({formatClubCash(negotiation.counter_offer)})
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
