import { Gavel, PackageOpen, Printer, Warehouse, type LucideIcon } from "lucide-react";
import {
  MERCH_VENDOR_IDS,
  merchVendorPerkPct,
  merchVendorPurchasesToNextTier,
  vendorRelationTier,
  type MerchBulkOffer,
  type MerchMarketVendorId,
  type MerchVendorId,
  type MerchVendorRelations,
  type MerchVendorTier,
} from "../../economy/merchandising.ts";
import { useT } from "../../i18n/react.ts";

export const MERCH_VENDOR_ICON: Record<MerchVendorId, LucideIcon> = {
  grosshaendler: Warehouse,
  restposten: PackageOpen,
  insolvenz: Gavel,
  express: Printer,
};

export type MerchVendorFilter = MerchMarketVendorId | "all";

/** Three pips: Bekannt ●○○ … Partner ●●●. */
export function MerchVendorTierPips({ tier }: { tier: MerchVendorTier }) {
  const t = useT();
  return (
    <span className="merch-vendor-pips" role="img" aria-label={t("merch.vendor.tierAria", { tier: t(`merch.vendor.tier.${tier}`) })}>
      {[1, 2, 3].map((step) => (
        <span key={step} className={step <= tier ? "merch-vendor-pip is-on" : "merch-vendor-pip"} />
      ))}
      <span className="merch-vendor-tier-name">{t(`merch.vendor.tier.${tier}`)}</span>
    </span>
  );
}

/** Next-tier hint, shared by the strip and the Express panel. */
export function merchVendorProgressLabel(
  t: ReturnType<typeof useT>,
  relations: MerchVendorRelations | undefined,
  vendor: MerchVendorId,
): string {
  const left = merchVendorPurchasesToNextTier(relations, vendor);
  if (left == null) return t("merch.vendor.maxTier");
  const next = vendorRelationTier(relations, vendor) + 1;
  return t("merch.vendor.nextTier", { count: left, tier: t(`merch.vendor.tier.${next}`) });
}

/** Current tier perk, e.g. "Listenpreis −6 %" (no "−0 %" for a new Großhändler). */
export function merchVendorPerkLabel(
  t: ReturnType<typeof useT>,
  vendor: MerchVendorId,
  tier: MerchVendorTier,
): string {
  const pct = merchVendorPerkPct(vendor, tier);
  if (vendor === "grosshaendler" && pct === 0) return t("merch.vendor.perk.grosshaendlerNone");
  return t(`merch.vendor.perk.${vendor}`, { pct });
}

/** WIREFRAME: design.md §9 — Einkauf Händler-Leiste (filtert die Markttabelle). */
export function MerchVendorStrip({
  offers,
  relations,
  active,
  onSelect,
}: {
  offers: readonly MerchBulkOffer[];
  relations: MerchVendorRelations | undefined;
  active: MerchVendorFilter;
  onSelect: (vendor: MerchVendorFilter) => void;
}) {
  const t = useT();

  return (
    <section className="merch-vendor-strip" aria-label={t("merch.vendor.stripAria")}>
      {MERCH_VENDOR_IDS.map((vendor) => {
        const Icon = MERCH_VENDOR_ICON[vendor];
        const tier = vendorRelationTier(relations, vendor);
        const body = (
          <>
            <span className="merch-vendor-card__head">
              <Icon size={18} strokeWidth={2.2} aria-hidden />
              <span className="merch-vendor-card__name">
                <strong>{t(`merch.vendor.name.${vendor}`)}</strong>
                <span className="tc-label">{t(`merch.vendor.type.${vendor}`)}</span>
              </span>
            </span>
            <span className="tc-caption">{t(`merch.vendor.tagline.${vendor}`)}</span>
            <MerchVendorTierPips tier={tier} />
            <span className="merch-vendor-card__perk">
              {merchVendorPerkLabel(t, vendor, tier)}
            </span>
            <span className="tc-caption">{merchVendorProgressLabel(t, relations, vendor)}</span>
            <span className="merch-vendor-card__foot tc-caption">
              {vendor === "express"
                ? t("merch.vendor.expressHint")
                : t("merch.vendor.offers", {
                    count: offers.filter((offer) => offer.vendor === vendor).length,
                  })}
            </span>
          </>
        );
        if (vendor === "express") {
          return (
            <div key={vendor} className="merch-vendor-card merch-vendor-card--express">
              {body}
            </div>
          );
        }
        const selected = active === vendor;
        return (
          <button
            key={vendor}
            type="button"
            className={`merch-vendor-card merch-vendor-card--${vendor}${selected ? " is-active" : ""}`}
            aria-pressed={selected}
            onClick={() => onSelect(selected ? "all" : vendor)}
          >
            {body}
          </button>
        );
      })}
    </section>
  );
}
