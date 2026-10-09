import { Flame } from "lucide-react";
import { formatClubCash } from "../../economy/club-finances.ts";
import {
  MERCH_SKU_LABEL,
  type MerchSaleSummary,
} from "../../economy/merchandising.ts";
import { useT } from "../../i18n/react.ts";

export function MerchSaleSummaryModal({
  summaries,
  onDismiss,
}: {
  summaries: readonly MerchSaleSummary[];
  onDismiss: () => void;
}) {
  const t = useT();
  if (summaries.length === 0) return null;

  return (
    <div className="modal-backdrop" role="presentation" onClick={onDismiss}>
      <dialog
        className="negotiation-modal merch-sale-summary-modal"
        open
        aria-labelledby="merch-sale-summary-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="negotiation-head merch-firesale-modal-head">
          <p className="eyebrow merch-firesale-eyebrow">
            <Flame size={16} strokeWidth={2.4} aria-hidden />
            {t("merch.saleSummary.modalKicker")}
          </p>
          <h2 id="merch-sale-summary-title">{t("merch.saleSummary.modalTitle")}</h2>
        </header>
        <ul className="merch-sale-summary-list">
          {summaries.map((summary) => {
            const netPositive = summary.net >= 0;
            return (
              <li key={summary.sku} className="merch-sale-summary-row">
                <strong>{MERCH_SKU_LABEL[summary.sku]}</strong>
                <span>
                  {t("merch.saleSummary.units", { count: summary.units })}
                  {" · "}
                  {t("merch.saleSummary.revenue", { amount: formatClubCash(summary.gross) })}
                  {" · "}
                  <span className={netPositive ? "merch-sale-net-pos" : "merch-sale-net-neg"}>
                    {netPositive
                      ? t("merch.saleSummary.profit", { amount: formatClubCash(summary.net) })
                      : t("merch.saleSummary.loss", { amount: formatClubCash(Math.abs(summary.net)) })}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
        <footer className="negotiation-actions">
          <button type="button" className="ui-btn ui-btn--primary" onClick={onDismiss}>
            {t("merch.saleSummary.dismiss")}
          </button>
        </footer>
      </dialog>
    </div>
  );
}
