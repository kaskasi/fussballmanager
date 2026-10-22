import { calendarWeek } from "../sim/game-calendar.ts";

/** Merch-Händler: drei Marktplatz-Archetypen plus Express-Druckerei (On Demand). */
export type MerchVendorId = "grosshaendler" | "restposten" | "insolvenz" | "express";
export type MerchMarketVendorId = Exclude<MerchVendorId, "express">;

export const MERCH_VENDOR_IDS: readonly MerchVendorId[] = [
  "grosshaendler",
  "restposten",
  "insolvenz",
  "express",
] as const;

export const MERCH_MARKET_VENDOR_IDS: readonly MerchMarketVendorId[] = [
  "grosshaendler",
  "restposten",
  "insolvenz",
] as const;

export interface MerchVendorProfile {
  lotMin: number;
  lotMax: number;
  /** Skew toward small lots (1 = uniform, >1 = more small lots). */
  lotSkew: number;
  /** Round lot sizes to this pack size (Großhändler packs in tens, Restposten odd). */
  lotStep: number;
  /** List price × reference wholesale. */
  priceMin: number;
  priceMax: number;
  lifetimeMin: number;
  lifetimeMax: number;
  /** Weekly ask-price decay and its floor (× list price). */
  decay: number;
  floor: number;
}

export const MERCH_VENDOR_PROFILES: Record<MerchMarketVendorId, MerchVendorProfile> = {
  grosshaendler: {
    lotMin: 60,
    lotMax: 3000,
    lotSkew: 2,
    lotStep: 10,
    priceMin: 0.9,
    priceMax: 1.15,
    lifetimeMin: 4,
    lifetimeMax: 7,
    decay: 0.97,
    floor: 0.8,
  },
  restposten: {
    lotMin: 10,
    lotMax: 800,
    lotSkew: 1.5,
    lotStep: 1,
    priceMin: 0.55,
    priceMax: 0.75,
    lifetimeMin: 1,
    lifetimeMax: 2,
    decay: 0.88,
    floor: 0.45,
  },
  insolvenz: {
    lotMin: 4000,
    lotMax: 10000,
    lotSkew: 1,
    lotStep: 100,
    priceMin: 0.4,
    priceMax: 0.5,
    lifetimeMin: 1,
    lifetimeMax: 1,
    decay: 1,
    floor: 1,
  },
};

export interface MerchVendorRelation {
  purchases: number;
}

export type MerchVendorRelations = Partial<Record<MerchVendorId, MerchVendorRelation>>;

export type MerchVendorTier = 0 | 1 | 2 | 3;

/** Käufe bis Neu → Bekannt → Stammkunde → Partner (zählt Käufe, nicht €). */
export const MERCH_VENDOR_TIER_THRESHOLDS = [0, 3, 8, 15] as const;
export const MERCH_VENDOR_MAX_TIER: MerchVendorTier = 3;

export function vendorRelationTier(
  relations: MerchVendorRelations | undefined,
  vendor: MerchVendorId,
): MerchVendorTier {
  const purchases = relations?.[vendor]?.purchases ?? 0;
  let tier: MerchVendorTier = 0;
  for (let index = 1; index < MERCH_VENDOR_TIER_THRESHOLDS.length; index++) {
    if (purchases >= MERCH_VENDOR_TIER_THRESHOLDS[index]!) tier = index as MerchVendorTier;
  }
  return tier;
}

/** Remaining purchases to the next tier, or null at Partner. */
export function merchVendorPurchasesToNextTier(
  relations: MerchVendorRelations | undefined,
  vendor: MerchVendorId,
): number | null {
  const tier = vendorRelationTier(relations, vendor);
  if (tier >= MERCH_VENDOR_MAX_TIER) return null;
  const purchases = relations?.[vendor]?.purchases ?? 0;
  return MERCH_VENDOR_TIER_THRESHOLDS[tier + 1]! - purchases;
}

export function recordMerchVendorPurchase(
  relations: MerchVendorRelations | undefined,
  vendor: MerchVendorId,
): MerchVendorRelations {
  const purchases = (relations?.[vendor]?.purchases ?? 0) + 1;
  return { ...relations, [vendor]: { purchases } };
}

export function normalizeMerchVendorRelations(raw: unknown): MerchVendorRelations | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const out: MerchVendorRelations = {};
  for (const id of MERCH_VENDOR_IDS) {
    const purchases = (raw as Record<string, { purchases?: unknown } | undefined>)[id]?.purchases;
    if (typeof purchases === "number" && purchases > 0) {
      out[id] = { purchases: Math.round(purchases) };
    }
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

/** Legacy whitelabel offers (no vendor) belong to the Großhändler. */
export function normalizeMarketVendorId(raw: unknown): MerchMarketVendorId {
  return MERCH_MARKET_VENDOR_IDS.includes(raw as MerchMarketVendorId)
    ? (raw as MerchMarketVendorId)
    : "grosshaendler";
}

// ── Tier perks ────────────────────────────────────────────────────────────

/** Großhändler: −3 % list price per tier. */
export function grosshaendlerPriceMultiplier(tier: MerchVendorTier): number {
  return 1 - 0.03 * tier;
}

/** Großhändler: Stammkunde+ keeps offers one week longer. */
export function grosshaendlerLifetimeBonus(tier: MerchVendorTier): number {
  return tier >= 2 ? 1 : 0;
}

/** Restposten: share of regular market slots (+8 % per tier). */
export function restpostenPoolShare(tier: MerchVendorTier): number {
  return 0.4 + 0.08 * tier;
}

/** Insolvenzverwalter: weekly chance of a whale lot (+4 % per tier). */
export function insolvenzListingChance(tier: MerchVendorTier): number {
  return 0.08 + 0.04 * tier;
}

/** Express-Druckerei: rush premium over Großhändler price (1.42 → 1.18). */
export function expressPremium(tier: MerchVendorTier): number {
  return Math.round((1.42 - 0.08 * tier) * 100) / 100;
}

/** Headline perk number for the vendor card (percent). */
export function merchVendorPerkPct(vendor: MerchVendorId, tier: MerchVendorTier): number {
  switch (vendor) {
    case "grosshaendler":
      return Math.round((1 - grosshaendlerPriceMultiplier(tier)) * 100);
    case "restposten":
      return Math.round(restpostenPoolShare(tier) * 100);
    case "insolvenz":
      return Math.round(insolvenzListingChance(tier) * 100);
    case "express":
      return Math.round((expressPremium(tier) - 1) * 100);
  }
}

// ── Express promo weeks ───────────────────────────────────────────────────

export const EXPRESS_PROMO_DISCOUNT = 0.33;

/** Season weeks 2–3 (Saisonstart) and calendar weeks 2–3 (January). */
export function isExpressPromoWeek(seasonWeek: number): boolean {
  const week = Math.round(seasonWeek);
  if (week === 2 || week === 3) return true;
  const kw = calendarWeek(week);
  return kw === 2 || kw === 3;
}

/** Only on-demand cost — never the fan-shop retail price. */
export function expressPromoMultiplier(seasonWeek: number): number {
  return isExpressPromoWeek(seasonWeek) ? 1 - EXPRESS_PROMO_DISCOUNT : 1;
}
