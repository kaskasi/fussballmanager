import { phillipMerchSaleMultiplier } from "./phillip-merch-sale.ts";
import { weeklySeed } from "../sim/league-week.ts";
import { merchMarketPoolSize } from "./merchandising-capacity.ts";
import {
  MERCH_SKU_IDS,
  MERCH_SKU_LABEL,
  MERCH_SKU_REFERENCE_COST,
  type MerchSkuId,
} from "./merchandising-skus.ts";

export interface MerchBulkOffer {
  id: string;
  label: string;
  listed_career_week: number;
  expires_career_week: number;
  list_price: number;
  ask_price: number;
  units: Partial<Record<MerchSkuId, number>>;
}

export interface MerchBrandingOrder {
  id: string;
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

const PRICE_DECAY = 0.93;
const MIN_PRICE_RATIO = 0.52;
const BRANDING_WEEKS_BASE = 2;
const BRANDING_WEEKS_PER_400_UNITS = 1;

const LOT_TIERS = [
  { min: 10, max: 50, weight: 0.35 },
  { min: 60, max: 200, weight: 0.25 },
  { min: 250, max: 800, weight: 0.2 },
  { min: 1000, max: 3000, weight: 0.12 },
  { min: 4000, max: 10000, weight: 0.08 },
] as const;

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
/** Rush premium over best visible bulk offer (or reference wholesale). */
export const MERCH_ON_DEMAND_MARKET_PREMIUM = 1.42;

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

export function merchSkuOfferLabel(sku: MerchSkuId): string {
  return `${MERCH_SKU_LABEL[sku]} · Whitelabel`;
}

function singleSkuUnitCost(sku: MerchSkuId, override?: number): number {
  return override ?? MERCH_SKU_REFERENCE_COST[sku] * 0.62;
}

function pickLotQuantity(seed: number, salt: number): number {
  const roll = seededRoll(seed, salt);
  let acc = 0;
  for (const tier of LOT_TIERS) {
    acc += tier.weight;
    if (roll <= acc) {
      const inner = seededRoll(seed, salt + 2);
      return Math.round(tier.min + inner * (tier.max - tier.min));
    }
  }
  return 100;
}

export function brandingLeadWeeks(units: Partial<Record<MerchSkuId, number>>): number {
  const total = unitTotal(units);
  return BRANDING_WEEKS_BASE + Math.floor(total / 400) * BRANDING_WEEKS_PER_400_UNITS;
}

export function ageBulkOffers(
  offers: MerchBulkOffer[],
  careerWeek: number,
): MerchBulkOffer[] {
  return offers
    .filter((offer) => offer.expires_career_week > careerWeek)
    .map((offer) => {
      const weeksListed = Math.max(0, careerWeek - offer.listed_career_week);
      const decay = Math.pow(PRICE_DECAY, weeksListed);
      const floor = offer.list_price * MIN_PRICE_RATIO;
      const ask_price = Math.max(floor, Math.round(offer.list_price * decay));
      return { ...offer, ask_price };
    });
}

function buildOffer(
  seed: number,
  salt: number,
  careerWeek: number,
): MerchBulkOffer {
  const sku =
    MERCH_SKU_IDS[Math.floor(seededRoll(seed, salt) * MERCH_SKU_IDS.length)]!;
  const qty = pickLotQuantity(seed, salt + 1);
  const units: Partial<Record<MerchSkuId, number>> = { [sku]: qty };
  const wholesale = singleSkuUnitCost(sku);
  const whale = qty >= 4000;
  const bargainRoll = seededRoll(seed, salt + 20);
  const sizeBias = whale ? 0.06 + seededRoll(seed, salt + 21) * 0.28 : 0;
  const priceMult = 0.76 + bargainRoll * 0.42 + sizeBias;
  const list_price = Math.max(Math.round(qty * wholesale * priceMult), Math.round(wholesale * qty * 0.55));
  const lifetime = 3 + Math.floor(seededRoll(seed, salt + 22) * 5);
  return {
    id: `offer_${careerWeek}_${salt}`,
    label: merchSkuOfferLabel(sku),
    listed_career_week: careerWeek,
    expires_career_week: careerWeek + lifetime,
    list_price,
    ask_price: list_price,
    units,
  };
}

function poolCap(poolSize: number): number {
  return Math.max(MERCH_MIN_BULK_OFFERS, poolSize);
}

export function seedInitialMerchBulkOffers(
  masterSeed: number,
  season: number,
  week: number,
  poolSize: number,
): MerchBulkOffer[] {
  const careerWeek = merchCareerWeekIndex(season, week);
  const cap = poolCap(poolSize);
  const seed = weeklySeed(masterSeed, season, week);
  const offers: MerchBulkOffer[] = [];
  let salt = 100;
  while (offers.length < cap) {
    offers.push(buildOffer(seed, salt, careerWeek));
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
): { offers: MerchBulkOffer[]; refreshWeek: number } {
  const careerWeek = merchCareerWeekIndex(season, week);
  const cap = poolCap(poolSize);
  if (lastRefreshCareerWeek === careerWeek) {
    return {
      offers: ageBulkOffers(offers, careerWeek).slice(0, cap),
      refreshWeek: careerWeek,
    };
  }
  const seed = weeklySeed(masterSeed, season, week);
  let next = ageBulkOffers(offers, careerWeek);
  if (next.length === 0) {
    next = seedInitialMerchBulkOffers(masterSeed, season, week, cap);
  } else {
    next = next.slice(0, cap);
  }
  let salt = 1000 + next.length * 17;
  while (next.length < cap) {
    next = [...next, buildOffer(seed, salt, careerWeek)];
    salt += 17;
  }
  return { offers: next.slice(0, cap), refreshWeek: careerWeek };
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

/** Lowest €/unit among live bulk offers for this SKU (whitelabel packs). */
export function bestMarketBulkUnitCost(
  sku: MerchSkuId,
  offers: readonly MerchBulkOffer[],
): number | null {
  let best: number | null = null;
  for (const offer of offers) {
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
  _avgCost: number,
  seasonWeek?: number,
  bulkOffers?: readonly MerchBulkOffer[],
): number {
  const unit = customOrderUnitCost(sku, _avgCost, seasonWeek, bulkOffers);
  return Math.round(unit * qty);
}

export function customOrderUnitCost(
  sku: MerchSkuId,
  _avgCost: number,
  seasonWeek?: number,
  bulkOffers?: readonly MerchBulkOffer[],
): number {
  const wholesale =
    (bulkOffers != null ? bestMarketBulkUnitCost(sku, bulkOffers) : null) ??
    singleSkuUnitCost(sku);
  let unit = wholesale * MERCH_ON_DEMAND_MARKET_PREMIUM;
  if (seasonWeek != null) {
    unit *= phillipMerchSaleMultiplier(seasonWeek);
  }
  return Math.round(unit * 100) / 100;
}

export { merchMarketPoolSize } from "./merchandising-capacity.ts";
export { MERCH_MARKET_POOL_MIN, MERCH_MARKET_POOL_MAX } from "./merchandising-capacity.ts";
