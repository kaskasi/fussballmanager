import { formatPlayerName } from "../../types/player-display.ts";
import type { Player } from "../../types/player.ts";

/** Warn before negotiating without scout intel (PRD 04 — own risk). */
export function BlindPurchaseWarningModal({
  player,
  onConfirm,
  onCancel,
}: {
  player: Player;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="modal-backdrop" role="presentation">
      <dialog className="negotiation-modal transfer-risk-modal" open aria-labelledby="blind-buy-title">
        <header className="negotiation-head">
          <p className="eyebrow">Unbekanntes Zertifikat</p>
          <h2 id="blind-buy-title">⚠️ {formatPlayerName(player)}</h2>
        </header>
        <p className="transfer-risk-copy">
          Du hast keinen Scout-Bericht — CA, Vertrag und die echte Ablöse sind für dich im Dunkeln.
          Einen Spieler zu kaufen, über den du nichts weißt, ist dumm.
        </p>
        <p className="transfer-risk-copy">
          Wenn du unbedingt willst: Du verhandelst blind. Der Betrag wird erst beim finalen
          Abschluss (Annehmen / Zustimmung) vom Transfer-Topf abgebucht — nicht vorher.
        </p>
        <footer className="negotiation-actions">
          <button type="button" className="ui-btn ui-btn--ghost" onClick={onCancel}>
            Abbrechen
          </button>
          <button type="button" className="ui-btn ui-btn--primary" onClick={onConfirm}>
            Trotzdem verhandeln
          </button>
        </footer>
      </dialog>
    </div>
  );
}
