import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { formatClubCash } from "../../economy/club-finances.ts";
import {
  MERCH_MARKET_PAGE_SIZE,
  MERCH_SKU_IDS,
  MERCH_SKU_LABEL,
  bulkOfferUnitCost,
  filterBulkOffersBySku,
  offerPrimaryQty,
  sortBulkOffersByUnitCost,
  type MerchBulkOffer,
  type MerchSkuId,
} from "../../economy/merchandising.ts";
import { ModalShell } from "./primitives/ModalShell.tsx";
import { useT } from "../../i18n/react.ts";

type SkuFilter = MerchSkuId | "all";

export function MerchMarketplaceModal({
  offers,
  onBuyOffer,
  onClose,
}: {
  offers: readonly MerchBulkOffer[];
  onBuyOffer: (offerId: string) => void;
  onClose: () => void;
}) {
  const t = useT();
  const [page, setPage] = useState(0);
  const [skuFilter, setSkuFilter] = useState<SkuFilter>("all");

  const sorted = useMemo(
    () => sortBulkOffersByUnitCost(filterBulkOffersBySku(offers, skuFilter)),
    [offers, skuFilter],
  );

  const pageCount = Math.max(1, Math.ceil(sorted.length / MERCH_MARKET_PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const slice = sorted.slice(
    safePage * MERCH_MARKET_PAGE_SIZE,
    safePage * MERCH_MARKET_PAGE_SIZE + MERCH_MARKET_PAGE_SIZE,
  );

  return (
    <ModalShell
      ariaLabel={t("merch.market.modalAria")}
      panelClassName="merch-market-modal"
      title={<h3 className="merch-market-modal-title">{t("merch.market.modalTitle")}</h3>}
      onClose={onClose}
    >
      <div className="merch-market-modal-toolbar">
        <label className="merch-market-filter">
          <span className="merch-muted">{t("merch.market.filterSku")}</span>
          <select
            value={skuFilter}
            onChange={(event) => {
              setSkuFilter(event.target.value as SkuFilter);
              setPage(0);
            }}
          >
            <option value="all">{t("merch.market.filterAll")}</option>
            {MERCH_SKU_IDS.map((sku) => (
              <option key={sku} value={sku}>
                {MERCH_SKU_LABEL[sku]}
              </option>
            ))}
          </select>
        </label>
        <span className="merch-muted">{t("merch.market.sortUnitPrice")}</span>
      </div>

      {slice.length === 0 ? (
        <p className="merch-muted">{t("merch.market.empty")}</p>
      ) : (
        <ul className="merch-market-modal-list">
          {slice.map((offer) => {
            const qty = offerPrimaryQty(offer);
            const unit = bulkOfferUnitCost(offer);
            return (
              <li key={offer.id} className="merch-market-row merch-market-row--modal">
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

      <footer className="merch-market-modal-pager">
        <button
          type="button"
          className="ui-btn ui-btn--ghost ui-btn--sm"
          disabled={safePage <= 0}
          onClick={() => setPage((p) => Math.max(0, p - 1))}
        >
          <ChevronLeft size={16} aria-hidden /> {t("merch.market.prev")}
        </button>
        <span className="merch-muted">
          {t("merch.market.page", { current: safePage + 1, total: pageCount })}
        </span>
        <button
          type="button"
          className="ui-btn ui-btn--ghost ui-btn--sm"
          disabled={safePage >= pageCount - 1}
          onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
        >
          {t("merch.market.next")} <ChevronRight size={16} aria-hidden />
        </button>
      </footer>
    </ModalShell>
  );
}
