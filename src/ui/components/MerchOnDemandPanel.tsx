import { formatClubCash } from "../../economy/club-finances.ts";
import {
  MERCH_ON_DEMAND_LEAD_DAYS,
  MERCH_SKU_IDS,
  MERCH_SKU_LABEL,
  type MerchSkuId,
} from "../../economy/merchandising.ts";
import { useT } from "../../i18n/react.ts";

/** WIREFRAME: design.md §9 — On-Demand Produktion (Preise-Tab, rechte Spalte) */
export function MerchOnDemandPanel({
  customSku,
  customQty,
  onDemandUnit,
  onDemandQuote,
  onDemandMarketUnit,
  phillipSaleActive,
  phillipDiscountPct,
  onSkuChange,
  onQtyDecrement,
  onQtyIncrement,
  onOrder,
}: {
  customSku: MerchSkuId;
  customQty: number;
  onDemandUnit: number;
  onDemandQuote: number;
  onDemandMarketUnit: number | null;
  phillipSaleActive: boolean;
  phillipDiscountPct: number;
  onSkuChange: (sku: MerchSkuId) => void;
  onQtyDecrement: () => void;
  onQtyIncrement: () => void;
  onOrder: () => void;
}) {
  const t = useT();

  return (
    <section className="merch-on-demand merch-on-demand--preise" aria-label="On Demand Produktion">
      <header className="merch-on-demand-head">
        <h2 className="merch-section-title">On Demand Produktion</h2>
        <p className="merch-on-demand-tag">
          {phillipSaleActive
            ? t("merch.phillipSale.onDemandTag", { pct: phillipDiscountPct })
            : t("merch.onDemand.supplierTag")}
        </p>
      </header>
      <p className="merch-on-demand-copy">
        {t("merch.onDemand.marketCopy", { days: MERCH_ON_DEMAND_LEAD_DAYS })}
      </p>
      <p className="merch-on-demand-meta merch-muted">
        {onDemandMarketUnit != null
          ? t("merch.onDemand.marketBasis", {
              unit: formatClubCash(onDemandMarketUnit),
              total: formatClubCash(onDemandUnit),
            })
          : t("merch.onDemand.marketBasisFallback", {
              total: formatClubCash(onDemandUnit),
            })}
      </p>
      <div className="merch-custom-row merch-custom-row--stacked">
        <select
          value={customSku}
          onChange={(event) => onSkuChange(event.target.value as MerchSkuId)}
        >
          {MERCH_SKU_IDS.map((sku) => (
            <option key={sku} value={sku}>
              {MERCH_SKU_LABEL[sku]}
            </option>
          ))}
        </select>
        <div className="merch-price-stepper">
          <button
            type="button"
            className="merch-step-btn"
            aria-label="Menge verringern"
            onClick={onQtyDecrement}
          >
            −
          </button>
          <span className="merch-step-value">{customQty} St.</span>
          <button
            type="button"
            className="merch-step-btn"
            aria-label="Menge erhöhen"
            onClick={onQtyIncrement}
          >
            +
          </button>
        </div>
        <button type="button" className="merch-on-demand-action" onClick={onOrder}>
          Bestellen · {formatClubCash(onDemandQuote)}
        </button>
      </div>
    </section>
  );
}
