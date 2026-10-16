import { formatClubCash } from "../../economy/club-finances.ts";
import { t } from "../../i18n/index.ts";
import { formatPlayerName } from "../../types/player-display.ts";
import type { Player } from "../../types/player.ts";
import { MarketValueBreakdownStrip } from "./MarketValueBreakdownStrip.tsx";

/** Confirm before listing a player on the transfer list. */
export function SaleConfirmModal({
  player,
  offerEstimate,
  season,
  onConfirm,
  onCancel,
}: {
  player: Player;
  offerEstimate: number;
  season?: number;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="modal-backdrop" role="presentation">
      <dialog className="negotiation-modal sale-confirm-modal" open aria-labelledby="sale-confirm-title">
        <header className="negotiation-head">
          <p className="eyebrow">{t("transfer.listConfirm.eyebrow")}</p>
          <h2 id="sale-confirm-title">{t("transfer.listConfirm.title")}</h2>
          <p className="negotiation-meta">{formatPlayerName(player)}</p>
        </header>
        {season !== undefined ? (
          <MarketValueBreakdownStrip player={player} season={season} />
        ) : null}
        <p className="transfer-risk-copy">
          {t("transfer.listConfirm.body", { amount: formatClubCash(offerEstimate) })}
        </p>
        <p className="transfer-risk-copy transfer-risk-copy-muted">
          {t("transfer.listConfirm.hint")}
        </p>
        <footer className="negotiation-actions">
          <button type="button" className="ui-btn ui-btn--ghost" onClick={onCancel}>
            {t("transfer.listConfirm.cancel")}
          </button>
          <button type="button" className="ui-btn ui-btn--primary" onClick={onConfirm}>
            {t("transfer.listConfirm.confirm")}
          </button>
        </footer>
      </dialog>
    </div>
  );
}
