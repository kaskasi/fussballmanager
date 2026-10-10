import type { Player } from "../types/player.ts";
import { DEFAULT_FANBASE, type ClubStadium } from "../stadium/club-stadium.ts";
import {
  dockedOccupiedCells,
  precinctBuildingLevel,
  type PrecinctState,
} from "../stadium/precinct.ts";
import {
  fanshopMerchThroughput,
  scaleMerchFootfallIncome,
} from "../stadium/precinct-effects.ts";
import type { ClubFinances } from "./club-finances.ts";
import {
  ageBulkOffers,
  brandingLeadWeeks,
  bulkOfferUnitCost,
  customOrderQuote,
  customOrderUnitCost,
  merchCareerDayIndex,
  merchCareerWeekIndex,
  MERCH_ON_DEMAND_LEAD_DAYS,
  refreshMerchBulkMarket,
  type MerchBrandingOrder,
  type MerchBulkOffer,
  type MerchOnDemandOrder,
} from "./merchandising-market.ts";
import {
  defaultMerchStartStock,
  fanshopMerchLevel,
  isMerchOverCapacity,
  MERCH_SALES_DEMAND_MULTIPLIER,
  MERCH_UNIT_SCALE,
  merchMarketPoolSize,
  merchMaxBulkOfferSlots,
  merchMaxStockForSku,
  merchStockFillRatio,
} from "./merchandising-capacity.ts";
import {
  defaultSkuInventory,
  emptySkuState,
  MERCH_SKU_DEMAND_WEIGHT,
  MERCH_SKU_IDS,
  MERCH_SKU_REFERENCE_RETAIL,
  mergeStock,
  type MerchSkuId,
  type MerchSkuState,
} from "./merchandising-skus.ts";
import { phillipMerchSaleMultiplier } from "./phillip-merch-sale.ts";

export {
  fanshopMerchLevel,
  isMerchOverCapacity,
  MERCH_SALES_DEMAND_MULTIPLIER,
  MERCH_UNIT_SCALE,
  merchMarketPoolSize,
  merchMaxBulkOfferSlots,
  merchMaxStockForSku,
  merchStockFillRatio,
} from "./merchandising-capacity.ts";

export interface MerchSkuWeekSale {
  units: Partial<Record<MerchSkuId, number>>;
  gross: Partial<Record<MerchSkuId, number>>;
  cogs: Partial<Record<MerchSkuId, number>>;
}

export interface MerchSaleSummary {
  sku: MerchSkuId;
  units: number;
  gross: number;
  cogs: number;
  net: number;
}

export interface MerchStockDisposal {
  sku: MerchSkuId;
  unitsDiscarded: number;
  writeOff: number;
}

/** Consecutive weeks with stock above Fanshop capacity before staff discard excess. */
export const MERCH_OVERCAP_DISCARD_AFTER_WEEKS = 4;

export type {
  MerchSkuId,
  MerchSkuState,
} from "./merchandising-skus.ts";
export {
  MERCH_SKU_IDS,
  MERCH_SKU_LABEL,
  MERCH_SKU_REFERENCE_RETAIL,
} from "./merchandising-skus.ts";
export type {
  MerchBulkOffer,
  MerchBrandingOrder,
  MerchOnDemandOrder,
} from "./merchandising-market.ts";
export {
  MERCH_ON_DEMAND_LEAD_DAYS,
  merchCareerDayIndex,
  merchSkuOfferLabel,
  primaryMerchSku,
  seedInitialMerchBulkOffers,
} from "./merchandising-market.ts";
export {
  customOrderQuote,
  customOrderUnitCost,
  bestMarketBulkUnitCost,
  MERCH_ON_DEMAND_MARKET_PREMIUM,
  MERCH_MARKET_PAGE_SIZE,
  brandingLeadWeeks,
  bulkOfferUnitCost,
  filterBulkOffersBySku,
  offerPrimaryQty,
  sortBulkOffersByUnitCost,
  topBulkOfferDeals,
} from "./merchandising-market.ts";
export {
  isPhillipMerchSaleWeek,
  PHILLIP_MERCH_SALE_DISCOUNT,
  phillipMerchSaleMultiplier,
} from "./phillip-merch-sale.ts";

/** Share of trikot revenue explained by star names (UI). */
export const JERSEY_REVENUE_SHARE = 0.7;

export interface ClubMerchandising {
  skus: Record<MerchSkuId, MerchSkuState>;
  bulk_offers: MerchBulkOffer[];
  branding_queue: MerchBrandingOrder[];
  last_market_refresh_career_week?: number;
  /** SKUs über Lager 100 % — Fire-Sale-Entscheid offen. */
  firesale_prompts?: MerchSkuId[];
  last_week_sale?: MerchSkuWeekSale;
  on_demand_queue?: MerchOnDemandOrder[];
  /** Laufende Überfüllung pro SKU (Karriere-Wochen in Folge). */
  over_capacity_weeks?: Partial<Record<MerchSkuId, number>>;
  /** UI-Modal nach Sale-Ende (Postfach-Mail zusätzlich via Wochen-Pipeline). */
  pending_sale_summaries?: MerchSaleSummary[];
  /** F6.6-C — limited digi drop demand boost until career week index. */
  limited_drop_until_career_week?: number;
  limited_drop_demand_multiplier?: number;
}

export interface MerchandisingEconomics {
  gross: number;
  cogs: number;
  net: number;
  /** Entsorgung überfüllter Lagerbestand (COGS-Abschreibung). */
  inventoryWriteOff: number;
  fanbaseDelta: number;
  unitsSold: Partial<Record<MerchSkuId, number>>;
  skuGross: Partial<Record<MerchSkuId, number>>;
  skuCogs: Partial<Record<MerchSkuId, number>>;
}

export interface WeeklyMerchandisingContext {
  stadium: ClubStadium | undefined;
  players: readonly Player[];
  clubId: string;
  occupancy: number;
  isHomeMatchWeek: boolean;
  week?: number;
  season?: number;
  masterSeed?: number;
}

export interface AdvanceMerchandisingContext extends WeeklyMerchandisingContext {
  season: number;
  week: number;
  masterSeed: number;
}

export function defaultClubMerchandising(): ClubMerchandising {
  const skus = defaultSkuInventory();
  for (const id of MERCH_SKU_IDS) {
    skus[id] = { ...skus[id]!, stock: defaultMerchStartStock(id) };
  }
  return {
    skus,
    bulk_offers: [],
    branding_queue: [],
    on_demand_queue: [],
  };
}

function normalizeSkus(
  skus: Partial<Record<MerchSkuId, MerchSkuState>> | undefined,
): Record<MerchSkuId, MerchSkuState> {
  const base = defaultSkuInventory();
  if (!skus) return base;
  for (const id of MERCH_SKU_IDS) {
    const row = skus[id];
    if (!row) continue;
    const retail_price = Math.max(1, row.retail_price ?? base[id].retail_price);
    const retail_price_normal =
      row.retail_price_normal != null
        ? Math.max(1, Math.round(row.retail_price_normal))
        : undefined;
    const sale_until_career_week =
      row.sale_until_career_week != null
        ? Math.round(row.sale_until_career_week)
        : undefined;
    base[id] = {
      stock: Math.max(0, Math.round(row.stock ?? 0)),
      avg_cost: Math.max(0, row.avg_cost ?? base[id].avg_cost),
      retail_price,
      ...(retail_price_normal != null ? { retail_price_normal } : {}),
      ...(sale_until_career_week != null ? { sale_until_career_week } : {}),
      ...(row.sale_period_units != null
        ? { sale_period_units: Math.max(0, Math.round(row.sale_period_units)) }
        : {}),
      ...(row.sale_period_gross != null
        ? { sale_period_gross: Math.max(0, Math.round(row.sale_period_gross)) }
        : {}),
      ...(row.sale_period_cogs != null
        ? { sale_period_cogs: Math.max(0, Math.round(row.sale_period_cogs)) }
        : {}),
    };
  }
  return base;
}

/** Legacy v79 → inventory model. */
export function migrateLegacyMerchandising(raw: unknown): ClubMerchandising {
  if (raw && typeof raw === "object" && "skus" in raw) {
    const typed = raw as ClubMerchandising;
    return {
      skus: normalizeSkus(typed.skus),
      bulk_offers: typed.bulk_offers ?? [],
      branding_queue: typed.branding_queue ?? [],
      last_market_refresh_career_week: typed.last_market_refresh_career_week,
      firesale_prompts: typed.firesale_prompts,
      last_week_sale: typed.last_week_sale,
      on_demand_queue: typed.on_demand_queue ?? [],
      over_capacity_weeks: typed.over_capacity_weeks,
      pending_sale_summaries: typed.pending_sale_summaries,
    };
  }
  return defaultClubMerchandising();
}

export function normalizeClubMerchandising(
  merchandising: ClubMerchandising | undefined,
): ClubMerchandising {
  if (!merchandising) return defaultClubMerchandising();
  return migrateLegacyMerchandising(merchandising);
}

/** Fanshop floor + online extension (level ≥ 2 scales web). */
export function merchChannelScale(precinct: PrecinctState | undefined): number {
  if (!precinct) return 0.45;
  const cells = dockedOccupiedCells(precinct, "fanshop");
  const level = cells > 0 ? precinctBuildingLevel(precinct, "fanshop") : 0;
  if (level <= 0) return 0.45;
  const physical = 1 + (level - 1) * 0.12 + Math.max(0, cells - 4) * 0.04;
  const online = level >= 2 ? 0.35 + (level - 2) * 0.18 : 0.12;
  return physical + online;
}

function priceDemandMultiplier(retail: number, reference: number): number {
  if (reference <= 0) return 1;
  const ratio = retail / reference;
  return Math.pow(Math.max(0.55, ratio), -0.62);
}

function trikotStarBoost(players: readonly Player[], clubId: string): number {
  const pros = players.filter(
    (player) => player.club_id === clubId && player.squad_status === "pro",
  );
  if (pros.length === 0) return 1;
  const top = Math.max(...pros.map((player) => player.market_value));
  return 1 + Math.min(0.35, top / 8_000_000);
}

function simulateWeeklySales(
  merch: ClubMerchandising,
  ctx: WeeklyMerchandisingContext,
  mutate: boolean,
): MerchandisingEconomics {
  const precinct = ctx.stadium?.precinct;
  const fanbase = ctx.stadium?.fanbase ?? DEFAULT_FANBASE;
  const footfall = scaleMerchFootfallIncome(
    fanshopMerchThroughput(precinct),
    ctx.occupancy,
    fanbase,
    precinct,
    ctx.isHomeMatchWeek,
  );
  const channel = merchChannelScale(precinct);
  const unitPool = Math.max(
    0,
    Math.round((footfall / 24) * channel * MERCH_UNIT_SCALE),
  );
  const starBoost = trikotStarBoost(ctx.players, ctx.clubId);
  let limitedDropScale = 1;
  if (
    ctx.season != null &&
    ctx.week != null &&
    merch.limited_drop_until_career_week != null &&
    merch.limited_drop_demand_multiplier != null
  ) {
    const now = merchCareerWeekIndex(ctx.season, ctx.week);
    if (now <= merch.limited_drop_until_career_week) {
      limitedDropScale = merch.limited_drop_demand_multiplier;
    }
  }

  let gross = 0;
  let cogs = 0;
  const unitsSold: Partial<Record<MerchSkuId, number>> = {};
  const skuGross: Partial<Record<MerchSkuId, number>> = {};
  const skuCogs: Partial<Record<MerchSkuId, number>> = {};
  const skus = mutate
    ? { ...merch.skus }
    : normalizeSkus(merch.skus);

  const careerWeekNow =
    ctx.season != null && ctx.week != null
      ? merchCareerWeekIndex(ctx.season, ctx.week)
      : 0;
  const seasonWeek = ctx.week ?? 0;

  for (const id of MERCH_SKU_IDS) {
    const row = skus[id]!;
    if (row.stock <= 0 || unitPool <= 0) continue;
    const unitRetail =
      ctx.week != null
        ? effectiveMerchCustomerRetail(row, seasonWeek, careerWeekNow)
        : row.retail_price;
    let weight = MERCH_SKU_DEMAND_WEIGHT[id];
    if (id === "trikots") weight *= starBoost;
    let demandScale = priceDemandMultiplier(unitRetail, MERCH_SKU_REFERENCE_RETAIL[id]);
    if (isMerchSkuOnSale(row, careerWeekNow)) {
      demandScale *= merchFiresaleDemandMultiplier(
        row.retail_price,
        merchSkuNormalRetail(row),
      );
    }
    const want = Math.round(
      unitPool * weight * MERCH_SALES_DEMAND_MULTIPLIER * limitedDropScale * demandScale,
    );
    const sold = Math.min(row.stock, Math.max(0, want));
    if (sold <= 0) continue;
    unitsSold[id] = sold;
    const lineGross = sold * unitRetail;
    const lineCogs = sold * row.avg_cost;
    skuGross[id] = lineGross;
    skuCogs[id] = lineCogs;
    gross += lineGross;
    cogs += lineCogs;
    if (mutate) {
      skus[id] = { ...row, stock: row.stock - sold };
    }
  }

  if (mutate) {
    merch.skus = skus;
  }

  return {
    gross: Math.round(gross),
    cogs: Math.round(cogs),
    net: Math.max(0, Math.round(gross - cogs)),
    inventoryWriteOff: 0,
    fanbaseDelta: 0,
    unitsSold,
    skuGross,
    skuCogs,
  };
}

export const MERCH_SALE_DURATION_WEEKS = 2;
export const MERCH_FIRESALE_SUGGESTED_DISCOUNT = 0.18;
/** VK ≤ 50 % of normal → this factor on top of regular price elasticity. */
export const MERCH_FIRESALE_MAX_DEMAND_MULTIPLIER = 10;
export const MERCH_FIRESALE_DEEP_DISCOUNT_RATIO = 0.5;

/** Fire Sale only — steep demand vs. normal retail (1× at full price, 10× at half price or less). */
export function merchFiresaleDemandMultiplier(
  saleRetail: number,
  normalRetail: number,
): number {
  if (normalRetail <= 0 || saleRetail >= normalRetail) return 1;
  const ratio = saleRetail / normalRetail;
  if (ratio <= MERCH_FIRESALE_DEEP_DISCOUNT_RATIO) {
    return MERCH_FIRESALE_MAX_DEMAND_MULTIPLIER;
  }
  const span = 1 - MERCH_FIRESALE_DEEP_DISCOUNT_RATIO;
  const t = (ratio - MERCH_FIRESALE_DEEP_DISCOUNT_RATIO) / span;
  return MERCH_FIRESALE_MAX_DEMAND_MULTIPLIER + t * (1 - MERCH_FIRESALE_MAX_DEMAND_MULTIPLIER);
}

export function isMerchSkuOnSale(row: MerchSkuState, careerWeek: number): boolean {
  return (
    row.sale_until_career_week != null &&
    careerWeek < row.sale_until_career_week &&
    row.retail_price_normal != null
  );
}

export function merchSaleWeeksRemaining(row: MerchSkuState, careerWeek: number): number {
  if (!isMerchSkuOnSale(row, careerWeek)) return 0;
  return Math.max(0, row.sale_until_career_week! - careerWeek);
}

export function merchSkuNormalRetail(row: MerchSkuState): number {
  return row.retail_price_normal ?? row.retail_price;
}

/** Fan-facing VK this week (Phillip seasonal sale or active Fire Sale). */
export function effectiveMerchCustomerRetail(
  row: MerchSkuState,
  seasonWeek: number,
  careerWeek: number,
): number {
  if (isMerchSkuOnSale(row, careerWeek)) {
    return row.retail_price;
  }
  const base = merchSkuNormalRetail(row);
  return Math.max(1, Math.round(base * phillipMerchSaleMultiplier(seasonWeek)));
}

export function suggestedMerchSalePrice(normalRetail: number): number {
  return Math.max(
    1,
    Math.round(normalRetail * (1 - MERCH_FIRESALE_SUGGESTED_DISCOUNT)),
  );
}

export function activeMerchSaleSkus(
  merch: ClubMerchandising,
  careerWeek: number,
): MerchSkuId[] {
  return MERCH_SKU_IDS.filter((id) => isMerchSkuOnSale(merch.skus[id]!, careerWeek));
}

function accumulateSalePeriodStats(
  merch: ClubMerchandising,
  economics: MerchandisingEconomics,
  careerWeek: number,
): void {
  for (const id of MERCH_SKU_IDS) {
    const row = merch.skus[id]!;
    if (!isMerchSkuOnSale(row, careerWeek)) continue;
    const units = economics.unitsSold[id] ?? 0;
    const lineGross = economics.skuGross[id] ?? 0;
    const lineCogs = economics.skuCogs[id] ?? 0;
    if (units <= 0 && lineGross <= 0) continue;
    merch.skus[id] = {
      ...row,
      sale_period_units: (row.sale_period_units ?? 0) + units,
      sale_period_gross: (row.sale_period_gross ?? 0) + lineGross,
      sale_period_cogs: (row.sale_period_cogs ?? 0) + lineCogs,
    };
  }
}

function expireMerchSales(
  merch: ClubMerchandising,
  careerWeek: number,
): MerchSaleSummary[] {
  const summaries: MerchSaleSummary[] = [];
  for (const id of MERCH_SKU_IDS) {
    const row = merch.skus[id]!;
    if (
      row.sale_until_career_week == null ||
      careerWeek < row.sale_until_career_week ||
      row.retail_price_normal == null
    ) {
      continue;
    }
    const units = row.sale_period_units ?? 0;
    const gross = row.sale_period_gross ?? 0;
    const cogs = row.sale_period_cogs ?? 0;
    summaries.push({
      sku: id,
      units,
      gross,
      cogs,
      net: gross - cogs,
    });
    merch.skus[id] = {
      ...row,
      retail_price: row.retail_price_normal,
      retail_price_normal: undefined,
      sale_until_career_week: undefined,
      sale_period_units: undefined,
      sale_period_gross: undefined,
      sale_period_cogs: undefined,
    };
  }
  return summaries;
}

function applyMerchWarehousePressure(
  merch: ClubMerchandising,
  fanshopLevel: number,
): { disposals: MerchStockDisposal[]; writeOff: number } {
  const streaks: Partial<Record<MerchSkuId, number>> = {
    ...(merch.over_capacity_weeks ?? {}),
  };
  const prompts = new Set(merch.firesale_prompts ?? []);
  const disposals: MerchStockDisposal[] = [];
  let writeOff = 0;

  for (const id of MERCH_SKU_IDS) {
    const row = merch.skus[id]!;
    const maxStock = merchMaxStockForSku(fanshopLevel, id);
    if (row.stock > maxStock) {
      const streak = (streaks[id] ?? 0) + 1;
      streaks[id] = streak;
      prompts.add(id);
      if (streak > MERCH_OVERCAP_DISCARD_AFTER_WEEKS) {
        const unitsDiscarded = row.stock - maxStock;
        const loss = Math.round(unitsDiscarded * row.avg_cost);
        writeOff += loss;
        disposals.push({ sku: id, unitsDiscarded, writeOff: loss });
        merch.skus[id] = { ...row, stock: maxStock };
        streaks[id] = 0;
      }
    } else {
      delete streaks[id];
      prompts.delete(id);
    }
  }

  merch.over_capacity_weeks = streaks;
  merch.firesale_prompts = [...prompts];
  return { disposals, writeOff };
}

export function dismissMerchSaleSummaries(stadium: ClubStadium): ClubStadium {
  const merch = normalizeClubMerchandising(stadium.merchandising);
  if (!merch.pending_sale_summaries?.length) return stadium;
  return {
    ...stadium,
    merchandising: { ...merch, pending_sale_summaries: undefined },
  };
}

export function trikotWeekStats(merch: ClubMerchandising): {
  units: number;
  avgPrice: number;
  profit: number;
} {
  const sale = merch.last_week_sale;
  const units = sale?.units.trikots ?? 0;
  const gross = sale?.gross.trikots ?? 0;
  const cogs = sale?.cogs.trikots ?? 0;
  return {
    units,
    avgPrice: units > 0 ? Math.round(gross / units) : 0,
    profit: gross - cogs,
  };
}

function deliverBrandingOrders(merch: ClubMerchandising, careerWeek: number): void {
  const remaining: MerchBrandingOrder[] = [];
  for (const order of merch.branding_queue) {
    if (order.arrives_career_week <= careerWeek) {
      for (const id of MERCH_SKU_IDS) {
        const qty = order.units[id] ?? 0;
        if (qty <= 0) continue;
        merch.skus[id] = mergeStock(merch.skus[id]!, qty, order.unit_cost);
      }
    } else {
      remaining.push(order);
    }
  }
  merch.branding_queue = remaining;
}

function deliverOnDemandOrders(merch: ClubMerchandising, careerDay: number): void {
  const queue = merch.on_demand_queue ?? [];
  if (queue.length === 0) return;
  const remaining: MerchOnDemandOrder[] = [];
  for (const order of queue) {
    if (order.arrives_career_day <= careerDay) {
      const row = merch.skus[order.sku] ?? emptySkuState(order.sku);
      merch.skus[order.sku] = mergeStock(row, order.qty, order.unit_cost);
    } else {
      remaining.push(order);
    }
  }
  merch.on_demand_queue = remaining;
}

/** Branding (Wochen) + On Demand (Tage) — bei Tages- und Wochenwechsel aufrufen. */
export function deliverMerchandisingOrders(
  stadium: ClubStadium,
  season: number,
  week: number,
  weekday: number,
): ClubStadium {
  const merch = normalizeClubMerchandising(stadium.merchandising);
  const brandingBefore = merch.branding_queue.length;
  const onDemandBefore = merch.on_demand_queue?.length ?? 0;
  deliverBrandingOrders(merch, merchCareerWeekIndex(season, week));
  deliverOnDemandOrders(merch, merchCareerDayIndex(season, week, weekday));
  const brandingAfter = merch.branding_queue.length;
  const onDemandAfter = merch.on_demand_queue?.length ?? 0;
  if (brandingBefore === brandingAfter && onDemandBefore === onDemandAfter) {
    return stadium;
  }
  return { ...stadium, merchandising: merch };
}

export interface AdvanceMerchandisingResult {
  stadium: ClubStadium;
  economics: MerchandisingEconomics;
  saleSummaries: MerchSaleSummary[];
  stockDisposals: MerchStockDisposal[];
}

export function advanceMerchandisingWeek(
  stadium: ClubStadium,
  ctx: AdvanceMerchandisingContext,
): AdvanceMerchandisingResult {
  const merch = normalizeClubMerchandising(stadium.merchandising);
  const careerWeek = merchCareerWeekIndex(ctx.season, ctx.week);
  const fanshopLevel = fanshopMerchLevel(stadium.precinct);

  deliverBrandingOrders(merch, careerWeek);
  deliverOnDemandOrders(merch, merchCareerDayIndex(ctx.season, ctx.week, 7));

  const market = refreshMerchBulkMarket(
    merch.bulk_offers,
    ctx.season,
    ctx.week,
    ctx.masterSeed,
    merch.last_market_refresh_career_week,
    merchMarketPoolSize(fanshopLevel),
  );
  merch.bulk_offers = market.offers;
  merch.last_market_refresh_career_week = market.refreshWeek;

  const economics = simulateWeeklySales(merch, ctx, true);
  accumulateSalePeriodStats(merch, economics, careerWeek);
  merch.last_week_sale = {
    units: { ...economics.unitsSold },
    gross: { ...economics.skuGross },
    cogs: { ...economics.skuCogs },
  };

  const saleSummaries = expireMerchSales(merch, careerWeek);
  if (saleSummaries.length > 0) {
    merch.pending_sale_summaries = [
      ...(merch.pending_sale_summaries ?? []),
      ...saleSummaries,
    ];
  }

  const { disposals, writeOff } = applyMerchWarehousePressure(merch, fanshopLevel);
  if (writeOff > 0) {
    economics.inventoryWriteOff = writeOff;
    economics.cogs += writeOff;
    economics.net = Math.max(0, economics.net - writeOff);
  }

  return {
    stadium: { ...stadium, merchandising: merch },
    economics,
    saleSummaries,
    stockDisposals: disposals,
  };
}

export function ensureMerchBulkMarket(
  stadium: ClubStadium,
  season: number,
  week: number,
  masterSeed: number,
): ClubStadium {
  const merch = normalizeClubMerchandising(stadium.merchandising);
  const fanshopLevel = fanshopMerchLevel(stadium.precinct);
  const market = refreshMerchBulkMarket(
    merch.bulk_offers,
    season,
    week,
    masterSeed,
    merch.last_market_refresh_career_week,
    merchMarketPoolSize(fanshopLevel),
  );
  if (
    market.refreshWeek === merch.last_market_refresh_career_week &&
    market.offers.length === merch.bulk_offers.length &&
    market.offers.every((offer, index) => offer.id === merch.bulk_offers[index]?.id)
  ) {
    return stadium;
  }
  return {
    ...stadium,
    merchandising: {
      ...merch,
      bulk_offers: market.offers,
      last_market_refresh_career_week: market.refreshWeek,
    },
  };
}

/** Preview for Finanzen / header (no stock mutation). */
export function weeklyMerchandisingEconomics(
  ctx: WeeklyMerchandisingContext,
): MerchandisingEconomics {
  const merch = normalizeClubMerchandising(ctx.stadium?.merchandising);
  if (ctx.season != null && ctx.week != null && ctx.masterSeed != null) {
    const careerWeek = merchCareerWeekIndex(ctx.season, ctx.week);
    const fanshopLevel = fanshopMerchLevel(ctx.stadium?.precinct);
    const market = refreshMerchBulkMarket(
      merch.bulk_offers,
      ctx.season,
      ctx.week,
      ctx.masterSeed,
      merch.last_market_refresh_career_week,
      merchMarketPoolSize(fanshopLevel),
    );
    const aged = {
      ...merch,
      bulk_offers: market.offers,
    };
    return simulateWeeklySales(aged, ctx, false);
  }
  return simulateWeeklySales(merch, ctx, false);
}

/** @deprecated Use advanceMerchandisingWeek — kept for call sites during pipeline merge. */
export function tickMerchandisingWeek(
  stadium: ClubStadium,
  _week: number,
): ClubStadium {
  return stadium;
}

export interface JerseySellerRow {
  playerId: string;
  name: string;
  marketValue: number;
  share: number;
  weeklyEur: number;
}

export function jerseySalesWeights(
  players: readonly Player[],
  clubId: string,
): JerseySellerRow[] {
  const pros = players.filter(
    (player) => player.club_id === clubId && player.squad_status === "pro",
  );
  if (pros.length === 0) return [];
  const values = pros.map((player) => Math.max(50_000, player.market_value));
  const max = Math.max(...values);
  const exp = values.map((value) => Math.exp((value - max) / (max * 0.35 + 1)));
  const sum = exp.reduce((acc, value) => acc + value, 0);
  return pros
    .map((player, index) => ({
      playerId: player.id,
      name: `${player.name.first ?? ""} ${player.name.last ?? ""}`.trim(),
      marketValue: player.market_value,
      share: exp[index]! / sum,
      weeklyEur: 0,
    }))
    .sort((left, right) => right.share - left.share);
}

export function jerseySellersWithWeekly(
  rows: JerseySellerRow[],
  jerseyPoolNet: number,
  limit = 8,
): JerseySellerRow[] {
  return rows.slice(0, limit).map((row) => ({
    ...row,
    weeklyEur: Math.round(jerseyPoolNet * row.share),
  }));
}

export function updateSkuRetailPrice(
  stadium: ClubStadium,
  sku: MerchSkuId,
  retail_price: number,
): ClubStadium {
  const merch = normalizeClubMerchandising(stadium.merchandising);
  const row = merch.skus[sku] ?? emptySkuState(sku);
  return {
    ...stadium,
    merchandising: {
      ...merch,
      skus: {
        ...merch.skus,
        [sku]: { ...row, retail_price: Math.max(1, Math.round(retail_price)) },
      },
    },
  };
}

export function buyBulkOffer(
  stadium: ClubStadium,
  offerId: string,
  season: number,
  week: number,
): { stadium: ClubStadium; cost: number } | null {
  const merch = normalizeClubMerchandising(stadium.merchandising);
  const offer = merch.bulk_offers.find((entry) => entry.id === offerId);
  if (!offer) return null;
  const cost = offer.ask_price;
  const careerWeek = merchCareerWeekIndex(season, week);
  const order: MerchBrandingOrder = {
    id: `brand_${offer.id}`,
    ordered_career_week: careerWeek,
    arrives_career_week: careerWeek + brandingLeadWeeks(offer.units),
    units: { ...offer.units },
    unit_cost: bulkOfferUnitCost(offer),
  };
  return {
    cost,
    stadium: {
      ...stadium,
      merchandising: {
        ...merch,
        bulk_offers: merch.bulk_offers.filter((entry) => entry.id !== offerId),
        branding_queue: [...merch.branding_queue, order],
      },
    },
  };
}

/** On Demand Produktion — Lieferung nach {@link MERCH_ON_DEMAND_LEAD_DAYS} Tagen. */
export function orderMerchOnDemand(
  stadium: ClubStadium,
  sku: MerchSkuId,
  qty: number,
  season: number,
  week: number,
  weekday: number,
): { stadium: ClubStadium; cost: number } | null {
  if (qty <= 0) return null;
  const merch = normalizeClubMerchandising(stadium.merchandising);
  const row = merch.skus[sku] ?? emptySkuState(sku);
  const cost = customOrderQuote(sku, qty, row.avg_cost, week, merch.bulk_offers);
  const unitCost = customOrderUnitCost(sku, row.avg_cost, week, merch.bulk_offers);
  const orderedDay = merchCareerDayIndex(season, week, weekday);
  const order: MerchOnDemandOrder = {
    id: `od_${sku}_${orderedDay}_${merch.on_demand_queue?.length ?? 0}`,
    sku,
    qty,
    unit_cost: unitCost,
    ordered_career_day: orderedDay,
    arrives_career_day: orderedDay + MERCH_ON_DEMAND_LEAD_DAYS,
  };
  return {
    cost,
    stadium: {
      ...stadium,
      merchandising: {
        ...merch,
        on_demand_queue: [...(merch.on_demand_queue ?? []), order],
      },
    },
  };
}

/** @deprecated Use orderMerchOnDemand */
export function buyCustomStock(
  stadium: ClubStadium,
  sku: MerchSkuId,
  qty: number,
): { stadium: ClubStadium; cost: number } | null {
  return orderMerchOnDemand(stadium, sku, qty, 1, 1, 1);
}

/** Fire Sale: zeitlich begrenzt (2 Wo.), danach VK = Normalpreis. */
export function startMerchSkuSale(
  stadium: ClubStadium,
  sku: MerchSkuId,
  salePrice: number,
  season: number,
  week: number,
): ClubStadium {
  const merch = normalizeClubMerchandising(stadium.merchandising);
  const row = merch.skus[sku] ?? emptySkuState(sku);
  const careerWeek = merchCareerWeekIndex(season, week);
  const normal = isMerchSkuOnSale(row, careerWeek)
    ? (row.retail_price_normal ?? row.retail_price)
    : merchSkuNormalRetail(row);
  const prompts = new Set(merch.firesale_prompts ?? []);
  prompts.delete(sku);
  return {
    ...stadium,
    merchandising: {
      ...merch,
      firesale_prompts: [...prompts],
      skus: {
        ...merch.skus,
        [sku]: {
          ...row,
          retail_price: Math.max(1, Math.round(salePrice)),
          retail_price_normal: normal,
          sale_until_career_week: careerWeek + MERCH_SALE_DURATION_WEEKS,
          sale_period_units: 0,
          sale_period_gross: 0,
          sale_period_cogs: 0,
        },
      },
    },
  };
}

export function canAffordMerchPurchase(finances: ClubFinances, cost: number): boolean {
  return finances.cash >= cost;
}

/** Mindestens eine SKU ohne Lager (Header-Hinweis). */
export function hasMerchStockout(stadium: ClubStadium | undefined): boolean {
  const merch = normalizeClubMerchandising(stadium?.merchandising);
  return MERCH_SKU_IDS.some((id) => (merch.skus[id]?.stock ?? 0) <= 0);
}
