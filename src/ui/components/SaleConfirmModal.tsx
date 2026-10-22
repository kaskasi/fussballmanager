import { formatClubCash } from "../../economy/club-finances.ts";
import { t } from "../../i18n/index.ts";
import { formatPlayerName } from "../../types/player-display.ts";
import type { Player } from "../../types/player.ts";
import { MarketValueBreakdownStrip } from "./MarketValueBreakdownStrip.tsx";
import { ModalShell } from "./primitives/ModalShell.tsx";

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
    <ModalShell
      variant="tc"
      ariaLabel={t("transfer.listConfirm.title")}
      onClose={onCancel}
      title={
        <>
          <span className="tc-label">{t("transfer.listConfirm.eyebrow")}</span>
          <h2 className="tc-modal__title">{t("transfer.listConfirm.title")}</h2>
          <p className="tc-modal__sub">{formatPlayerName(player)}</p>
        </>
      }
      footer={
        <>
          <button type="button" className="tc-btn tc-btn--ghost" onClick={onCancel}>
            {t("transfer.listConfirm.cancel")}
          </button>
          <button type="button" className="tc-btn tc-btn--primary" onClick={onConfirm}>
            {t("transfer.listConfirm.confirm")}
          </button>
        </>
      }
    >
      {season !== undefined ? <MarketValueBreakdownStrip player={player} season={season} /> : null}
      <p>{t("transfer.listConfirm.body", { amount: formatClubCash(offerEstimate) })}</p>
      <p className="tc-caption">{t("transfer.listConfirm.hint")}</p>
    </ModalShell>
  );
}
