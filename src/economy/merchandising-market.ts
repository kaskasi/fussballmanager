import { weeklySeed } from "../sim/league-week.ts";
import { merchMarketPoolSize } from "./merchandising-capacity.ts";
import {
  MERCH_SKU_IDS,
  MERCH_SKU_LABEL,
  MERCH_SKU_REFERENCE_COST,
  type MerchSkuId,
} from "./merchandising-skus.ts";
import {
  expressPremium,
  expressPromoMultiplier,
  grosshaendlerLifetimeBonus,
  grosshaendlerPriceMultiplier,
  insolvenzListingChance,
  MERCH_VENDOR_PROFILES,
  normalizeMarketVendorId,
  restpostenPoolShare,
  vendorRelationTier,
  type MerchMarketVendorId,
  type MerchVendorRelations,
  type MerchVendorTier,
} from "./merchandising-vendors.ts";

export interface MerchBulkOffer {
  id: string;
  vendor: MerchMarketVendorId;
  label: string;
  listed_career_week: number;
  expires_career_week: number;
  list_price: number;
  ask_price: number;
  units: Partial<Record<MerchSkuId, number>>;
}

export interface MerchBrandingOrder {
  id: string;
  /** Absent on orders placed before the vendor overhaul (Großhändler). */
  vendor?: MerchMarketVendorId;
  ordered_career_week: number;
  arrives_career_week: number;
  units: Partial<Record<MerchSkuId, number>>;
  unit_cost: number;
}

export interface MerchOnDemandOrder {
  id: string;
  sku: MerchSkuId;
  qty: number;
  unit_cost: number;
  ordered_career_day: number;
  arrives_career_day: number;
}

const BRANDING_WEEKS_BASE = 2;
const BRANDING_WEEKS_PER_400_UNITS = 1;
/** Restposten is already blank stock — quick print run. */
const RESTPOSTEN_WEEKS_BASE = 1;
const RESTPOSTEN_UNITS_PER_EXTRA_WEEK = 800;
/** Reference wholesale = reference cost × this (pre-overhaul baseline). */
const REFERENCE_WHOLESALE_RATIO = 0.62;

function seededRoll(seed: number, salt: number): number {
  let hash = seed ^ salt;
  hash = Math.imul(hash ^ (hash >>> 16), 0x7feb352d);
  hash = Math.imul(hash ^ (hash >>> 15), 0x846ca68b);
  hash ^= hash >>> 16;
  return (hash >>> 0) / 0xffffffff;
}

export function merchCareerWeekIndex(season: number, week: number): number {
  return (season - 1) * 52 + week;
}

/** Mon=1 … So=7 — for short lead times (On Demand). */
export function merchCareerDayIndex(season: number, week: number, weekday: number): number {
  return merchCareerWeekIndex(season, week) * 7 + Math.max(1, Math.min(7, weekday));
}

export const MERCH_ON_DEMAND_LEAD_DAYS = 2;
export const MERCH_MIN_BULK_OFFERS = 2;
export const MERCH_MARKET_PAGE_SIZE = 16;
/** Express rush premium at tier Neu (see {@link expressPremium}). */
export const MERCH_ON_DEMAND_MARKET_PREMIUM = expressPremium(0);

function unitTotal(units: Partial<Record<MerchSkuId, number>>): number {
  return MERCH_SKU_IDS.reduce((sum, id) => sum + (units[id] ?? 0), 0);
}

export function offerPrimaryQty(offer: MerchBulkOffer): number {
  const sku = primaryMerchSku(offer.units);
  if (sku == null) return unitTotal(offer.units);
  return offer.units[sku] ?? 0;
}

/** Exactly one SKU per bulk offer / branding order (v1 rule). */
export function primaryMerchSku(
  units: Partial<Record<MerchSkuId, number>>,
): MerchSkuId | null {
  let found: MerchSkuId | null = null;
  for (const id of MERCH_SKU_IDS) {
    const qty = units[id] ?? 0;
    if (qty <= 0) continue;
    if (found != null) return null;
    found = id;
  }
  return found;
}

const VENDOR_SHORT_LABEL: Record<MerchMarketVendorId, string> = {
  grosshaendler: "Großhändler",
  restposten: "Restposten",
  insolvenz: "Insolvenzmasse",
};

/** Stored fallback label; the UI renders vendor + SKU via i18n. */
export function merchSkuOfferLabel(
  sku: MerchSkuId,
  vendor: MerchMarketVendorId = "grosshaendler",
): string {
  return `${MERCH_SKU_LABEL[sku]} · ${VENDOR_SHORT_LABEL[vendor]}`;
}

/** Reference wholesale €/unit (no vendor discount). */
export function merchReferenceWholesale(sku: MerchSkuId): number {
  return MERCH_SKU_REFERENCE_COST[sku] * REFERENCE_WHOLESALE_RATIO;
}

/** Deal vs reference wholesale in percent (−40 = 40 % cheaper). */
export function merchOfferDealPct(offer: MerchBulkOffer): number {
  const sku = primaryMerchSku(offer.units);
  if (sku == null) return 0;
  const ref = merchReferenceWholesale(sku);
  return Math.round((bulkOfferUnitCost(offer) / ref - 1) * 100);
}

export function brandingLeadWeeks(
  units: Partial<Record<MerchSkuId, number>>,
  vendor: MerchMarketVendorId = "grosshaendler",
): number {
  const total = unitTotal(units);
  if (vendor === "restposten") {
    return RESTPOSTEN_WEEKS_BASE + Math.floor(total / RESTPOSTEN_UNITS_PER_EXTRA_WEEK);
  }
  return BRANDING_WEEKS_BASE + Math.floor(total / 400) * BRANDING_WEEKS_PER_400_UNITS;
}

export function ageBulkOffers(
  offers: MerchBulkOffer[],
  careerWeek: number,
): MerchBulkOffer[] {
  return offers
    .filter((offer) => offer.expires_career_week > careerWeek)
    .map((offer) => {
      const vendor = normalizeMarketVendorId(offer.vendor);
      const profile = MERCH_VENDOR_PROFILES[vendor];
      const weeksListed = Math.max(0, careerWeek - offer.listed_career_week);
      const decay = Math.pow(profile.decay, weeksListed);
      const floor = offer.list_price * profile.floor;
      const ask_price = Math.max(Math.round(floor), Math.round(offer.list_price * decay));
      return { ...offer, vendor, ask_price };
    });
}

function rollLotQuantity(vendor: MerchMarketVendorId, seed: number, salt: number): number {
  const p = MERCH_VENDOR_PROFILES[vendor];
  const raw = p.lotMin + Math.pow(seededRoll(seed, salt), p.lotSkew) * (p.lotMax - p.lotMin);
  return Math.max(p.lotMin, Math.round(raw / p.lotStep) * p.lotStep);
}

function buildOffer(
  vendor: MerchMarketVendorId,
  seed: number,
  salt: number,
  careerWeek: number,
  relations: MerchVendorRelations | undefined,
): MerchBulkOffer {
  const p = MERCH_VENDOR_PROFILES[vendor];
  const tier = vendorRelationTier(relations, vendor);
  const sku =
    MERCH_SKU_IDS[Math.floor(seededRoll(seed, salt) * MERCH_SKU_IDS.length)]!;
  const qty = rollLotQuantity(vendor, seed, salt + 1);
  const wholesale = merchReferenceWholesale(sku);
  let priceMult = p.priceMin + seededRoll(seed, salt + 20) * (p.priceMax - p.priceMin);
  let lifetime =
    p.lifetimeMin +
    Math.floor(seededRoll(seed, salt + 22) * (p.lifetimeMax - p.lifetimeMin + 1));
  if (vendor === "grosshaendler") {
    priceMult *= grosshaendlerPriceMultiplier(tier);
    lifetime += grosshaendlerLifetimeBonus(tier);
  }
  const list_price = Math.max(1, Math.round(qty * wholesale * priceMult));
  return {
    id: `offer_${careerWeek}_${salt}`,
    vendor,
    label: merchSkuOfferLabel(sku, vendor),
    listed_career_week: careerWeek,
    expires_career_week: careerWeek + lifetime,
    list_price,
    ask_price: list_price,
    units: { [sku]: qty },
  };
}

function rollRegularVendor(
  seed: number,
  salt: number,
  relations: MerchVendorRelations | undefined,
): MerchMarketVendorId {
  const share = restpostenPoolShare(vendorRelationTier(relations, "restposten"));
  return seededRoll(seed, salt + 30) < share ? "restposten" : "grosshaendler";
}

function buildRegularOffer(
  seed: number,
  salt: number,
  careerWeek: number,
  relations: MerchVendorRelations | undefined,
): MerchBulkOffer {
  return buildOffer(rollRegularVendor(seed, salt, relations), seed, salt, careerWeek, relations);
}

const INSOLVENZ_SALT = 7919;

/** Insolvenzverwalter: at most one whale lot, rolled once per week. */
function maybeInsolvenzOffer(
  seed: number,
  careerWeek: number,
  relations: MerchVendorRelations | undefined,
): MerchBulkOffer | null {
  const tier: MerchVendorTier = vendorRelationTier(relations, "insolvenz");
  if (seededRoll(seed, INSOLVENZ_SALT) >= insolvenzListingChance(tier)) return null;
  const offer = buildOffer("insolvenz", seed, INSOLVENZ_SALT + 1, careerWeek, relations);
  return { ...offer, id: `offer_${careerWeek}_insolvenz` };
}

function poolCap(poolSize: number): number {
  return Math.max(MERCH_MIN_BULK_OFFERS, poolSize);
}

/** Regular pool (Großhändler + Restposten) — Insolvenz lots come on top via refresh. */
export function seedInitialMerchBulkOffers(
  masterSeed: number,
  season: number,
  week: number,
  poolSize: number,
  relations?: MerchVendorRelations,
): MerchBulkOffer[] {
  const careerWeek = merchCareerWeekIndex(season, week);
  const cap = poolCap(poolSize);
  const seed = weeklySeed(masterSeed, season, week);
  const offers: MerchBulkOffer[] = [];
  let salt = 100;
  while (offers.length < cap) {
    offers.push(buildRegularOffer(seed, salt, careerWeek, relations));
    salt += 17;
  }
  return offers;
}

export function refreshMerchBulkMarket(
  offers: MerchBulkOffer[],
  season: number,
  week: number,
  masterSeed: number,
  lastRefreshCareerWeek: number | undefined,
  poolSize: number,
  relations?: MerchVendorRelations,
): { offers: MerchBulkOffer[]; refreshWeek: number } {
  const careerWeek = merchCareerWeekIndex(season, week);
  const cap = poolCap(poolSize);
  const aged = ageBulkOffers(offers, careerWeek);
  const whales = aged.filter((offer) => offer.vendor === "insolvenz");
  let regular = aged.filter((offer) => offer.vendor !== "insolvenz");
  if (lastRefreshCareerWeek === careerWeek) {
    return { offers: [...whales, ...regular.slice(0, cap)], refreshWeek: careerWeek };
  }
  const seed = weeklySeed(masterSeed, season, week);
  if (regular.length === 0) {
    regular = seedInitialMerchBulkOffers(masterSeed, season, week, cap, relations);
  } else {
    regular = regular.slice(0, cap);
  }
  let salt = 1000 + regular.length * 17;
  while (regular.length < cap) {
    regular = [...regular, buildRegularOffer(seed, salt, careerWeek, relations)];
    salt += 17;
  }
  if (whales.length === 0) {
    const whale = maybeInsolvenzOffer(seed, careerWeek, relations);
    if (whale) whales.push(whale);
  }
  return { offers: [...whales, ...regular.slice(0, cap)], refreshWeek: careerWeek };
}

export function bulkOfferUnitCost(offer: MerchBulkOffer): number {
  const total = unitTotal(offer.units);
  if (total <= 0) return 0;
  return Math.round((offer.ask_price / total) * 100) / 100;
}

export function sortBulkOffersByUnitCost(offers: readonly MerchBulkOffer[]): MerchBulkOffer[] {
  return [...offers].sort((a, b) => {
    const diff = bulkOfferUnitCost(a) - bulkOfferUnitCost(b);
    if (diff !== 0) return diff;
    return offerPrimaryQty(a) - offerPrimaryQty(b);
  });
}

export function topBulkOfferDeals(
  offers: readonly MerchBulkOffer[],
  count = 4,
): MerchBulkOffer[] {
  return sortBulkOffersByUnitCost(offers).slice(0, count);
}

export function filterBulkOffersBySku(
  offers: readonly MerchBulkOffer[],
  sku: MerchSkuId | "all",
): MerchBulkOffer[] {
  if (sku === "all") return [...offers];
  return offers.filter((offer) => primaryMerchSku(offer.units) === sku);
}

/** Lowest €/unit among live bulk offers for this SKU (optionally one vendor only). */
export function bestMarketBulkUnitCost(
  sku: MerchSkuId,
  offers: readonly MerchBulkOffer[],
  vendor?: MerchMarketVendorId,
): number | null {
  let best: number | null = null;
  for (const offer of offers) {
    if (vendor != null && offer.vendor !== vendor) continue;
    if (primaryMerchSku(offer.units) !== sku) continue;
    const unit = bulkOfferUnitCost(offer);
    if (unit <= 0) continue;
    best = best == null ? unit : Math.min(best, unit);
  }
  return best;
}

export function customOrderQuote(
  sku: MerchSkuId,
  qty: number,
  avgCost: number,
  seasonWeek?: number,
  bulkOffers?: readonly MerchBulkOffer[],
  expressTier: MerchVendorTier = 0,
): number {
  const unit = customOrderUnitCost(sku, avgCost, seasonWeek, bulkOffers, expressTier);
  return Math.round(unit * qty);
}

/**
 * Express-Druckerei €/unit: Großhändler market price (bargain lots don't count)
 * × rush premium for the relationship tier × promo-week discount.
 */
export function customOrderUnitCost(
  sku: MerchSkuId,
  _avgCost: number,
  seasonWeek?: number,
  bulkOffers?: readonly MerchBulkOffer[],
  expressTier: MerchVendorTier = 0,
): number {
  const basis =
    (bulkOffers != null ? bestMarketBulkUnitCost(sku, bulkOffers, "grosshaendler") : null) ??
    merchReferenceWholesale(sku);
  let unit = basis * expressPremium(expressTier);
  if (seasonWeek != null) {
    unit *= expressPromoMultiplier(seasonWeek);
  }
  return Math.round(unit * 100) / 100;
}

export { merchMarketPoolSize } from "./merchandising-capacity.ts";
export { MERCH_MARKET_POOL_MIN, MERCH_MARKET_POOL_MAX } from "./merchandising-capacity.ts";
