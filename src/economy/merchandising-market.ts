import { phillipMerchSaleMultiplier } from "./phillip-merch-sale.ts";
import { weeklySeed } from "../sim/league-week.ts";
import { MERCH_UNIT_SCALE } from "./merchandising-capacity.ts";
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
/** Rush premium over best visible bulk offer (or reference wholesale). */
export const MERCH_ON_DEMAND_MARKET_PREMIUM = 1.42;

function unitTotal(units: Partial<Record<MerchSkuId, number>>): number {
  return MERCH_SKU_IDS.reduce((sum, id) => sum + (units[id] ?? 0), 0);
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

const STARTER_OFFERS: readonly {
  label: string;
  units: Partial<Record<MerchSkuId, number>>;
  unitCostOverride?: Partial<Record<MerchSkuId, number>>;
}[] = [
  {
    label: merchSkuOfferLabel("socken"),
    units: { socken: 100 * MERCH_UNIT_SCALE },
    unitCostOverride: { socken: 3.5 },
  },
  {
    label: merchSkuOfferLabel("shirts"),
    units: { shirts: 60 * MERCH_UNIT_SCALE },
  },
];

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

function buildStarterOffer(
  template: (typeof STARTER_OFFERS)[number],
  salt: number,
  careerWeek: number,
): MerchBulkOffer {
  const units = { ...template.units };
  let costSum = 0;
  for (const id of MERCH_SKU_IDS) {
    const qty = units[id] ?? 0;
    if (qty <= 0) continue;
    const unit =
      template.unitCostOverride?.[id] ??
      MERCH_SKU_REFERENCE_COST[id] * 0.62;
    costSum += qty * unit;
  }
  const list_price = Math.round(costSum * 1.08);
  const lifetime = 5 + (salt % 3);
  return {
    id: `offer_starter_${careerWeek}_${salt}`,
    label: template.label,
    listed_career_week: careerWeek,
    expires_career_week: careerWeek + lifetime,
    list_price,
    ask_price: list_price,
    units,
  };
}

function buildOffer(
  seed: number,
  salt: number,
  careerWeek: number,
): MerchBulkOffer {
  const sku =
    MERCH_SKU_IDS[Math.floor(seededRoll(seed, salt) * MERCH_SKU_IDS.length)]!;
  const qty = Math.round(
    (30 + Math.floor(seededRoll(seed, salt + 1) * 110)) * MERCH_UNIT_SCALE,
  );
  const units: Partial<Record<MerchSkuId, number>> = { [sku]: qty };
  const unitCost = singleSkuUnitCost(sku);
  const list_price = Math.round(
    qty * unitCost * (1.05 + seededRoll(seed, salt + 20) * 0.22),
  );
  const lifetime = 3 + Math.floor(seededRoll(seed, salt + 21) * 4);
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

export function seedInitialMerchBulkOffers(
  masterSeed: number,
  season: number,
  week: number,
  maxOfferSlots: number,
): MerchBulkOffer[] {
  const careerWeek = merchCareerWeekIndex(season, week);
  const cap = Math.max(MERCH_MIN_BULK_OFFERS, Math.min(5, maxOfferSlots));
  const seed = weeklySeed(masterSeed, season, week);
  const offers: MerchBulkOffer[] = [];
  for (let i = 0; i < Math.min(STARTER_OFFERS.length, cap); i++) {
    offers.push(buildStarterOffer(STARTER_OFFERS[i]!, 100 + i, careerWeek));
  }
  let salt = 200;
  while (offers.length < Math.min(MERCH_MIN_BULK_OFFERS, cap)) {
    offers.push(buildOffer(seed, salt, careerWeek));
    salt += 17;
  }
  return offers.slice(0, cap);
}

export function refreshMerchBulkMarket(
  offers: MerchBulkOffer[],
  season: number,
  week: number,
  masterSeed: number,
  lastRefreshCareerWeek: number | undefined,
  maxOfferSlots: number,
): { offers: MerchBulkOffer[]; refreshWeek: number } {
  const careerWeek = merchCareerWeekIndex(season, week);
  const cap = Math.max(MERCH_MIN_BULK_OFFERS, Math.min(5, maxOfferSlots));
  if (lastRefreshCareerWeek === careerWeek) {
    return {
      offers: ageBulkOffers(offers, careerWeek).slice(0, cap),
      refreshWeek: careerWeek,
    };
  }
  const seed = weeklySeed(masterSeed, season, week);
  let next = ageBulkOffers(offers, careerWeek).slice(0, cap);
  if (next.length === 0) {
    next = seedInitialMerchBulkOffers(masterSeed, season, week, cap);
  }
  const spawnRolls = 2 + Math.floor(seededRoll(seed, 901) * 2);
  for (let i = 0; i < spawnRolls && next.length < cap; i++) {
    if (seededRoll(seed, 902 + i) > 0.12) {
      next = [...next, buildOffer(seed, 910 + i * 17, careerWeek)];
    }
  }
  return { offers: next.slice(0, cap), refreshWeek: careerWeek };
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

export function bulkOfferUnitCost(offer: MerchBulkOffer): number {
  const total = unitTotal(offer.units);
  if (total <= 0) return 0;
  return Math.round((offer.ask_price / total) * 100) / 100;
}
