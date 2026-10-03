import { formatClubCash } from "../../economy/club-finances.ts";
import { formatPlayerName } from "../../types/player-display.ts";
import type { Player } from "../../types/player.ts";

/** Stufe 1 — confirm before instant AI sale. */
export function SaleConfirmModal({
  player,
  offerEstimate,
  onConfirm,
  onCancel,
}: {
  player: Player;
  offerEstimate: number;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="modal-backdrop" role="presentation">
      <dialog className="negotiation-modal sale-confirm-modal" open aria-labelledby="sale-confirm-title">
        <header className="negotiation-head">
          <p className="eyebrow">Transfer</p>
          <h2 id="sale-confirm-title">Verkauf anbieten</h2>
          <p className="negotiation-meta">{formatPlayerName(player)}</p>
        </header>
        <p className="transfer-risk-copy">
          Ein Liga-Verein wird mit ca. <strong>{formatClubCash(offerEstimate)}</strong> gehandelt.
          Bei Zusage erhältst du die Ablöse; <strong>50&nbsp;%</strong> fließen in den Transfer-Topf.
        </p>
        <p className="transfer-risk-copy transfer-risk-copy-muted">
          Es gibt kein Garantie-Angebot — der Käufer kann ablehnen. Du kannst es im nächsten Fenster erneut versuchen.
        </p>
        <footer className="negotiation-actions">
          <button type="button" className="ui-btn ui-btn--ghost" onClick={onCancel}>
            Abbrechen
          </button>
          <button type="button" className="ui-btn ui-btn--primary" onClick={onConfirm}>
            Angebot senden
          </button>
        </footer>
      </dialog>
    </div>
  );
}
