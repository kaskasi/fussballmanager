import { formatClubCash } from "../../economy/club-finances.ts";
import type { JobOffer } from "../../board/job-offers.ts";

/**
 * WIREFRAME: F9.2 — Bewerbungsphase nach Entlassung
 */
export function JobOffersModal({
  offers,
  onAccept,
}: {
  offers: readonly JobOffer[];
  onAccept: (clubId: JobOffer["clubId"]) => void;
}) {
  return (
    <div className="job-offers-backdrop" role="presentation">
      <div className="job-offers-modal" role="dialog" aria-modal="true" aria-label="Neue Vereine">
        <header className="job-offers-head">
          <p className="eyebrow">F9.2 · Kein Game Over</p>
          <h2>Neuer Job</h2>
          <p>Der Vorstand hat dich entlassen. Wähle einen neuen Verein — dein Savegame läuft weiter.</p>
        </header>
        <ul className="job-offers-list">
          {offers.map((offer) => (
            <li key={offer.clubId}>
              <button
                type="button"
                className="job-offer-card"
                onClick={() => onAccept(offer.clubId)}
              >
                <span className="job-offer-club">{offer.clubName}</span>
                <span className="job-offer-preview">{offer.objectivePreview}</span>
                <span className="job-offer-bonus">Startbonus {formatClubCash(offer.signingBonus)}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
