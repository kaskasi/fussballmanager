import { DEFAULT_FANBASE } from "../stadium/club-stadium.ts";
import { defaultClubStadium } from "../stadium/club-stadium.ts";
import { weekCommerceOccupancy } from "../stadium/matchday-commerce.ts";
import {
  fanshopMerchThroughput,
  scaleMerchFootfallIncome,
} from "../stadium/precinct-effects.ts";
import {
  emptyPrecinct,
  pathBuildingToCity,
  placePrecinctBuilding,
  placeStreetRun,
  PRECINCT_CORE,
  precinctBuildingLevel,
  upgradePrecinctBuilding,
  type PrecinctBuilding,
  type PrecinctState,
} from "../stadium/precinct.ts";
import {
  MERCH_SALES_DEMAND_MULTIPLIER,
  MERCH_SKU_DEMAND_WEIGHT,
  MERCH_UNIT_SCALE,
  type MerchSkuId,
} from "./merchandising-skus.ts";

/** Full warehouse at Fanshop Stufe 1 ≈ this many reference-demand weeks. */
export const MERCH_WEEKS_AT_FULL_STOCK = 8;

/** New game / fresh inventory template. */
export const MERCH_START_STOCK_FILL = 0.25;

function merchChannelAtLevel(fanshopLevel: number, extraFanshopCells = 0): number {
  if (fanshopLevel <= 0) return 0.45;
  const physical =
    1 + (fanshopLevel - 1) * 0.12 + Math.max(0, extraFanshopCells) * 0.04;
  const online =
    fanshopLevel >= 2 ? 0.35 + (fanshopLevel - 2) * 0.18 : 0.12;
  return physical + online;
}

function dockBuildingToCity(
  state: PrecinctState,
  building: PrecinctBuilding,
): PrecinctState {
  const path = pathBuildingToCity(state, building);
  if (!path || path.length === 0) return state;
  return placeStreetRun(state, path, 1_000_000).state;
}

function referencePrecinctAtFanshopLevel(level: number): PrecinctState | undefined {
  if (level <= 0) return undefined;
  let precinct = dockBuildingToCity(
    placePrecinctBuilding(
      emptyPrecinct(),
      PRECINCT_CORE.x,
      PRECINCT_CORE.y,
      "fanshop",
    ),
    "fanshop",
  );
  while (precinctBuildingLevel(precinct, "fanshop") < level) {
    precinct = upgradePrecinctBuilding(precinct, "fanshop");
  }
  return precinct;
}

/** Typical weekly unit pool (all SKUs) for capacity sizing — home/away blend. */
export function referenceMerchUnitPool(fanshopLevel: number): number {
  const level = Math.max(0, Math.min(5, fanshopLevel));
  const precinct = level > 0 ? referencePrecinctAtFanshopLevel(level) : undefined;
  const stadium = { ...defaultClubStadium(), precinct };
  const throughput = fanshopMerchThroughput(precinct);
  const homeFoot = scaleMerchFootfallIncome(
    throughput,
    weekCommerceOccupancy(true, stadium),
    DEFAULT_FANBASE,
    precinct,
    true,
  );
  const awayFoot = scaleMerchFootfallIncome(
    throughput,
    weekCommerceOccupancy(false, stadium),
    DEFAULT_FANBASE,
    precinct,
    false,
  );
  const footfall = (homeFoot + awayFoot) / 2;
  const channel = merchChannelAtLevel(level);
  return Math.max(
    1,
    Math.round((footfall / 24) * channel * MERCH_UNIT_SCALE),
  );
}

/** Expected weekly sell-through for one SKU (no trikot star boost). */
export function referenceWeeklySkuDemandUnits(
  sku: MerchSkuId,
  fanshopLevel: number,
): number {
  const pool = referenceMerchUnitPool(fanshopLevel);
  const weight = MERCH_SKU_DEMAND_WEIGHT[sku];
  return Math.max(
    1,
    Math.round(pool * weight * MERCH_SALES_DEMAND_MULTIPLIER),
  );
}
