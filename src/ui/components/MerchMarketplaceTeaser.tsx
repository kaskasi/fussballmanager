import { Store } from "lucide-react";
import { formatClubCash } from "../../economy/club-finances.ts";
import {
  bulkOfferUnitCost,
  offerPrimaryQty,
  topBulkOfferDeals,
  type MerchBulkOffer,
} from "../../economy/merchandising.ts";
import { useT } from "../../i18n/react.ts";

/** WIREFRAME: design.md §9 — Marktplatz-Teaser (best €/St.) */
export function MerchMarketplaceTeaser({
  offers,
  onBuyOffer,
  onBrowse,
}: {
  offers: readonly MerchBulkOffer[];
  onBuyOffer: (offerId: string) => void;
  onBrowse: () => void;
}) {
  const t = useT();
  const deals = topBulkOfferDeals(offers, 4);

  return (
    <section
      className="merch-einkauf-panel merch-market-teaser"
      aria-label={t("merch.market.teaserAria")}
    >
      <header className="merch-einkauf-panel-head merch-market-teaser-head">
        <Store size={18} strokeWidth={2.2} aria-hidden />
        <h2 className="merch-section-title">{t("merch.market.title")}</h2>
      </header>
      <div className="merch-einkauf-panel-body">
        {deals.length === 0 ? (
          <p className="merch-muted merch-einkauf-panel-empty">{t("merch.market.empty")}</p>
        ) : (
          <ul className="merch-market-teaser-list">
            {deals.map((offer) => {
              const qty = offerPrimaryQty(offer);
              const unit = bulkOfferUnitCost(offer);
              return (
                <li key={offer.id} className="merch-market-row">
                  <div className="merch-market-row-copy">
                    <strong>{offer.label}</strong>
                    <span className="merch-muted">
                      {t("merch.market.qtyUnit", {
                        qty,
                        unit: formatClubCash(unit),
                      })}
                    </span>
                  </div>
                  <div className="merch-market-row-actions">
                    <span className="merch-market-total">{formatClubCash(offer.ask_price)}</span>
                    <button type="button" className="ui-btn ui-btn--sm" onClick={() => onBuyOffer(offer.id)}>
                      {t("merch.market.buy")}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <footer className="merch-market-teaser-foot">
        <button type="button" className="ui-btn ui-btn--ghost ui-btn--sm" onClick={onBrowse}>
          {t("merch.market.browse", { count: offers.length })}
        </button>
      </footer>
    </section>
  );
}
