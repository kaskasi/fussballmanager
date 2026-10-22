import { useMemo, useState } from "react";
import { Store } from "lucide-react";
import { formatClubCash } from "../../economy/club-finances.ts";
import {
  brandingLeadWeeks,
  bulkOfferUnitCost,
  MERCH_MARKET_VENDOR_IDS,
  MERCH_SKU_IDS,
  MERCH_SKU_LABEL,
  merchOfferDealPct,
  offerPrimaryQty,
  primaryMerchSku,
  type MerchBulkOffer,
  type MerchSkuId,
} from "../../economy/merchandising.ts";
import { useT } from "../../i18n/react.ts";
import { MERCH_SKU_ICON } from "../merch/merch-sku-icons.ts";
import { SquadSortHeader } from "./SquadSortHeader.tsx";
import { MERCH_VENDOR_ICON, type MerchVendorFilter } from "./MerchVendorStrip.tsx";

type SortKey = "deal" | "unit" | "total" | "qty" | "expires";
type SortDirection = "asc" | "desc";

function sortValue(offer: MerchBulkOffer, key: SortKey): number {
  switch (key) {
    case "deal":
      return merchOfferDealPct(offer);
    case "unit":
      return bulkOfferUnitCost(offer);
    case "total":
      return offer.ask_price;
    case "qty":
      return offerPrimaryQty(offer);
    case "expires":
      return offer.expires_career_week;
  }
}

function dealClassName(deal: number): string {
  if (deal <= -30) return "merch-deal tc-delta--up tc-strong";
  if (deal < 0) return "merch-deal tc-delta--up";
  return "merch-deal tc-trend--flat";
}

/** WIREFRAME: design.md §9 — Einkauf Markttabelle (alle Händler, sortier- und filterbar). */
export function MerchVendorMarketTable({
  offers,
  careerWeek,
  vendorFilter,
  onVendorFilterChange,
  onBuyOffer,
}: {
  offers: readonly MerchBulkOffer[];
  careerWeek: number;
  vendorFilter: MerchVendorFilter;
  onVendorFilterChange: (vendor: MerchVendorFilter) => void;
  onBuyOffer: (offerId: string) => void;
}) {
  const t = useT();
  const [skuFilter, setSkuFilter] = useState<MerchSkuId | "all">("all");
  const [sortKey, setSortKey] = useState<SortKey>("deal");
  const [direction, setDirection] = useState<SortDirection>("asc");

  const rows = useMemo(() => {
    const sign = direction === "asc" ? 1 : -1;
    return offers
      .filter((offer) => vendorFilter === "all" || offer.vendor === vendorFilter)
      .filter((offer) => skuFilter === "all" || primaryMerchSku(offer.units) === skuFilter)
      .sort((a, b) => sign * (sortValue(a, sortKey) - sortValue(b, sortKey)));
  }, [offers, vendorFilter, skuFilter, sortKey, direction]);

  function onSort(key: SortKey) {
    if (key === sortKey) {
      setDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setDirection("asc");
    }
  }

  const header = (key: SortKey, label: string) => (
    <SquadSortHeader label={label} sortKey={key} activeKey={sortKey} direction={direction} onSort={onSort} />
  );

  return (
    <section className="merch-vendor-market tc-panel" aria-label={t("merch.vendor.tableAria")}>
      <header className="merch-vendor-market__head">
        <h2 className="merch-vendor-market__title">
          <Store size={18} strokeWidth={2.2} aria-hidden /> {t("merch.market.title")}
        </h2>
        <div className="tc-chips" role="group" aria-label={t("merch.vendor.filterAria")}>
          {(["all", ...MERCH_MARKET_VENDOR_IDS] as const).map((vendor) => (
            <button
              key={vendor}
              type="button"
              className="tc-chip tc-chip--dense"
              aria-pressed={vendorFilter === vendor}
              onClick={() => onVendorFilterChange(vendor)}
            >
              {vendor === "all" ? t("merch.vendor.filterAll") : t(`merch.vendor.type.${vendor}`)}
            </button>
          ))}
        </div>
        <label className="merch-vendor-market__sku">
          <span className="tc-label">{t("merch.market.filterSku")}</span>
          <select
            className="tc-select"
            value={skuFilter}
            onChange={(event) => setSkuFilter(event.target.value as MerchSkuId | "all")}
          >
            <option value="all">{t("merch.market.filterAll")}</option>
            {MERCH_SKU_IDS.map((sku) => (
              <option key={sku} value={sku}>
                {MERCH_SKU_LABEL[sku]}
              </option>
            ))}
          </select>
        </label>
      </header>

      {rows.length === 0 ? (
        <p className="tc-empty">{t("merch.market.empty")}</p>
      ) : (
        <div className="tc-table-wrap merch-vendor-market__scroll">
          <table className="tc-table tc-table--compact">
            <thead>
              <tr>
                <th scope="col">{t("merch.vendor.col.vendor")}</th>
                <th scope="col">{t("merch.vendor.col.item")}</th>
                {header("qty", t("merch.vendor.col.qty"))}
                {header("unit", t("merch.vendor.col.unit"))}
                {header("deal", t("merch.vendor.col.deal"))}
                {header("total", t("merch.vendor.col.total"))}
                {header("expires", t("merch.vendor.col.expires"))}
                <th scope="col" className="tc-num merch-col-lead">
                  {t("merch.vendor.col.lead")}
                </th>
                <th scope="col">
                  <span className="tc-sr">{t("merch.market.buy")}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((offer) => {
                const sku = primaryMerchSku(offer.units);
                const SkuIcon = sku != null ? MERCH_SKU_ICON[sku] : null;
                const VendorIcon = MERCH_VENDOR_ICON[offer.vendor];
                const qty = offerPrimaryQty(offer);
                const deal = merchOfferDealPct(offer);
                const weeksLeft = offer.expires_career_week - careerWeek;
                const skuLabel = sku != null ? MERCH_SKU_LABEL[sku] : offer.label;
                return (
                  <tr
                    key={offer.id}
                    className={offer.vendor === "insolvenz" ? "merch-vendor-row--whale" : undefined}
                  >
                    <td>
                      <span className="merch-vendor-cell" title={t(`merch.vendor.name.${offer.vendor}`)}>
                        <VendorIcon size={16} strokeWidth={2.2} aria-hidden />
                        <span className="merch-vendor-cell__name">{t(`merch.vendor.type.${offer.vendor}`)}</span>
                      </span>
                    </td>
                    <td>
                      <span className="tc-namecell">
                        {SkuIcon ? <SkuIcon size={16} strokeWidth={2.2} aria-hidden /> : null}
                        {skuLabel}
                      </span>
                    </td>
                    <td className="tc-num">{qty}</td>
                    <td className="tc-num">{formatClubCash(bulkOfferUnitCost(offer))}</td>
                    <td className="tc-num" title={t("merch.vendor.dealTitle")}>
                      <span className={dealClassName(deal)}>
                        {deal > 0 ? "+" : deal < 0 ? "−" : "±"}
                        {Math.abs(deal)} %
                      </span>
                    </td>
                    <td className="tc-num">
                      <span className="tc-strong">{formatClubCash(offer.ask_price)}</span>
                      {offer.ask_price < offer.list_price ? (
                        <s className="merch-list-price tc-caption">{formatClubCash(offer.list_price)}</s>
                      ) : null}
                    </td>
                    <td className="tc-num">
                      {weeksLeft <= 1 ? (
                        <span className="tc-state tc-state--mid">{t("merch.vendor.lastWeek")}</span>
                      ) : (
                        t("merch.vendor.weeks", { weeks: weeksLeft })
                      )}
                    </td>
                    <td className="tc-num merch-col-lead">
                      {t("merch.vendor.weeks", { weeks: brandingLeadWeeks(offer.units, offer.vendor) })}
                    </td>
                    <td className="tc-num">
                      <button
                        type="button"
                        className="tc-btn tc-btn--sm"
                        aria-label={t("merch.vendor.buyAria", {
                          qty,
                          sku: skuLabel,
                          vendor: t(`merch.vendor.name.${offer.vendor}`),
                        })}
                        onClick={() => onBuyOffer(offer.id)}
                      >
                        {t("merch.market.buy")}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
