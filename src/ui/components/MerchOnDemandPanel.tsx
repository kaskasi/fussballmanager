import { formatClubCash } from "../../economy/club-finances.ts";
import {
  MERCH_ON_DEMAND_LEAD_DAYS,
  MERCH_SKU_IDS,
  MERCH_SKU_LABEL,
  vendorRelationTier,
  type MerchSkuId,
  type MerchVendorRelations,
} from "../../economy/merchandising.ts";
import { useT } from "../../i18n/react.ts";
import {
  MERCH_VENDOR_ICON,
  MerchVendorTierPips,
  merchVendorPerkLabel,
  merchVendorProgressLabel,
} from "./MerchVendorStrip.tsx";

/** WIREFRAME: design.md §9 — Express-Druckerei / On Demand (Preise-Tab, rechte Spalte) */
export function MerchOnDemandPanel({
  customSku,
  customQty,
  onDemandUnit,
  onDemandQuote,
  onDemandMarketUnit,
  relations,
  promoActive,
  promoPct,
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
  relations: MerchVendorRelations | undefined;
  promoActive: boolean;
  promoPct: number;
  onSkuChange: (sku: MerchSkuId) => void;
  onQtyDecrement: () => void;
  onQtyIncrement: () => void;
  onOrder: () => void;
}) {
  const t = useT();
  const Icon = MERCH_VENDOR_ICON.express;
  const tier = vendorRelationTier(relations, "express");

  return (
    <section className="merch-on-demand merch-on-demand--preise" aria-label={t("merch.vendor.type.express")}>
      <header className="merch-on-demand-head merch-express-head">
        <span className="merch-vendor-card__head">
          <Icon size={18} strokeWidth={2.2} aria-hidden />
          <span className="merch-vendor-card__name">
            <strong>{t("merch.vendor.name.express")}</strong>
            <span className="tc-label">{t("merch.vendor.type.express")}</span>
          </span>
        </span>
        {promoActive ? (
          <span className="merch-express-promo">{t("merch.vendor.promoTag", { pct: promoPct })}</span>
        ) : null}
      </header>
      <div className="merch-express-relation">
        <MerchVendorTierPips tier={tier} />
        <span className="merch-vendor-card__perk">
          {merchVendorPerkLabel(t, "express", tier)}
        </span>
        <span className="tc-caption">{merchVendorProgressLabel(t, relations, "express")}</span>
      </div>
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
