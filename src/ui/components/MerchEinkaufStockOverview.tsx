import type { ComponentType } from "react";
import {
  Bath,
  BedDouble,
  Footprints,
  Shirt,
  ShoppingBag,
  Tag,
  Wind,
} from "lucide-react";
import {
  MERCH_SKU_IDS,
  MERCH_SKU_LABEL,
  merchBrandingInboundQtyBySku,
  merchMaxStockForSku,
  type ClubMerchandising,
  type MerchSkuId,
} from "../../economy/merchandising.ts";
import { useT } from "../../i18n/react.ts";

const SKU_ICON: Record<MerchSkuId, ComponentType<{ size?: number; strokeWidth?: number }>> = {
  trikots: Shirt,
  shirts: ShoppingBag,
  caps: Tag,
  schals: Wind,
  socken: Footprints,
  bettwaesche: BedDouble,
  handtuecher: Bath,
};

/** WIREFRAME: design.md §9 — Einkauf Bestellungen (SKU-Grid: Unterwegs vs. Kapazität) */
export function MerchEinkaufStockOverview({
  merch,
  fanshopLevel,
}: {
  merch: ClubMerchandising;
  fanshopLevel: number;
}) {
  const t = useT();
  const inboundBySku = merchBrandingInboundQtyBySku(merch);

  return (
    <section
      className="merch-einkauf-panel merch-sku-overview"
      aria-label={t("merch.overview.aria")}
    >
      <header className="merch-einkauf-panel-head">
        <h2 className="merch-section-title">{t("merch.overview.title")}</h2>
      </header>
      <div className="merch-sku-overview-grid">
        {MERCH_SKU_IDS.map((sku) => {
          const maxStock = merchMaxStockForSku(fanshopLevel, sku);
          const inbound = inboundBySku[sku] ?? 0;
          const orderFill = maxStock > 0 ? inbound / maxStock : 0;
          const Icon = SKU_ICON[sku];
          return (
            <article key={sku} className="merch-sku-overview-cell">
              <Icon size={18} strokeWidth={2.2} aria-hidden />
              <h3>{MERCH_SKU_LABEL[sku]}</h3>
              <span
                className={`merch-fill-bar merch-fill-bar--compact${orderFill > 1 ? " is-over" : ""}`}
                aria-hidden
              >
                <span style={{ width: `${Math.min(100, orderFill * 100)}%` }} />
              </span>
              <p className="merch-sku-overview-ordered">
                {inbound > 0 ? (
                  <>
                    <strong>{inbound}</strong>
                    <span className="merch-muted"> {t("merch.overview.orderedUnit")}</span>
                  </>
                ) : (
                  <span className="merch-muted">{t("merch.overview.inboundNone")}</span>
                )}
              </p>
              <p className="merch-sku-overview-capacity merch-muted">
                {t("merch.overview.capacity", { max: maxStock })}
              </p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
