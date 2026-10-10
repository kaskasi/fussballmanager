import type { Player } from "../types/player.ts";
import type { ClubStadium } from "../stadium/club-stadium.ts";
import { weekCommerceOccupancy } from "../stadium/matchday-commerce.ts";
import {
  fanshopMerchLevel,
  isMerchOverCapacity,
  jerseySalesWeights,
  jerseySellersWithWeekly,
  JERSEY_REVENUE_SHARE,
  MERCH_OVERCAP_DISCARD_AFTER_WEEKS,
  merchChannelScale,
  merchMaxBulkOfferSlots,
  normalizeClubMerchandising,
  weeklyMerchandisingEconomics,
} from "./merchandising.ts";
import { MERCH_SKU_IDS, MERCH_SKU_LABEL, type MerchSkuId } from "./merchandising-skus.ts";

export interface MerchandisingAnalyticsView {
  weekNet: number;
  fullOccupancyNet: number;
  occupancyPct: number;
  isHomeMatchWeek: boolean;
  channelScale: number;
  jerseyPoolNet: number;
  topJerseySellers: ReturnType<typeof jerseySellersWithWeekly>;
  skuWeekRows: {
    id: MerchSkuId;
    label: string;
    units: number;
    gross: number;
    profit: number;
  }[];
  fanshopLevel: number;
  maxOfferSlots: number;
  pendingBranding: number;
  activeOffers: number;
  overCapacitySkuCount: number;
  weeksUntilDiscard: number;
}

export function buildMerchandisingAnalytics(
  stadium: ClubStadium,
  players: readonly Player[],
  clubId: string,
  isHomeMatchWeek: boolean,
  week: number,
  season: number,
  masterSeed: number,
): MerchandisingAnalyticsView {
  const occupancy = weekCommerceOccupancy(isHomeMatchWeek, stadium);
  const baseCtx = {
    stadium,
    players,
    clubId,
    occupancy,
    isHomeMatchWeek,
    week,
    season,
    masterSeed,
  };
  const weekEcon = weeklyMerchandisingEconomics(baseCtx);
  const fullEcon = weeklyMerchandisingEconomics({ ...baseCtx, occupancy: 1 });
  const merch = normalizeClubMerchandising(stadium.merchandising);
  const fanshopLevel = fanshopMerchLevel(stadium.precinct);
  const jerseyPoolNet = Math.round(weekEcon.net * JERSEY_REVENUE_SHARE);
  let overCapacitySkuCount = 0;
  for (const id of MERCH_SKU_IDS) {
    const stock = merch.skus[id]?.stock ?? 0;
    if (isMerchOverCapacity(stock, fanshopLevel, id)) overCapacitySkuCount += 1;
  }
  return {
    weekNet: weekEcon.net,
    fullOccupancyNet: fullEcon.net,
    occupancyPct: Math.round(occupancy * 100),
    isHomeMatchWeek,
    channelScale: merchChannelScale(stadium.precinct),
    jerseyPoolNet,
    topJerseySellers: jerseySellersWithWeekly(jerseySalesWeights(players, clubId), jerseyPoolNet),
    skuWeekRows: MERCH_SKU_IDS.map((id) => {
      const sale = merch.last_week_sale;
      const units = sale?.units[id] ?? 0;
      const gross = sale?.gross[id] ?? 0;
      const cogs = sale?.cogs[id] ?? 0;
      return {
        id,
        label: MERCH_SKU_LABEL[id],
        units,
        gross,
        profit: gross - cogs,
      };
    }).sort((a, b) => b.gross - a.gross),
    fanshopLevel,
    maxOfferSlots: merchMaxBulkOfferSlots(fanshopLevel),
    pendingBranding: merch.branding_queue.length,
    activeOffers: merch.bulk_offers.length,
    overCapacitySkuCount,
    weeksUntilDiscard: MERCH_OVERCAP_DISCARD_AFTER_WEEKS,
  };
}
