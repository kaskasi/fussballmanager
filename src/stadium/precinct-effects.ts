import type { PrecinctState } from "./precinct.ts";
import {
  occupiedCells,
  patchTouchesStreet,
  precinctBuildingLevel,
  precinctHasTrainingHall,
} from "./precinct.ts";

/** Additive fill-rate bonus from Gelände buildings (PRD 14.7). */
export function precinctFillRateBonus(state: PrecinctState | undefined): number {
  if (!state) return 0;
  const parking = occupiedCells(state, "parking");
  const kiosk = occupiedCells(state, "kiosk");
  const beer = occupiedCells(state, "beer_tent");
  const bus = occupiedCells(state, "bus") > 0 && patchTouchesStreet(state, "bus") ? 0.018 : 0;
  const transit =
    occupiedCells(state, "transit") > 0 && patchTouchesStreet(state, "transit") ? 0.032 : 0;
  const fanshop = precinctBuildingLevel(state, "fanshop") * 0.006;
  const shopArea = Math.min(0.012, Math.max(0, occupiedCells(state, "fanshop") - 4) * 0.002);
  const services = occupiedCells(state, "fan_services") > 0 ? 0.012 : 0;
  const clubhouse = occupiedCells(state, "clubhouse") > 0 ? 0.01 : 0;
  const parkingBonus = Math.min(0.04, parking * 0.004);
  const kioskBonus = Math.min(0.018, kiosk * 0.004);
  const beerBonus = Math.min(0.016, beer * 0.003);
  return (
    parkingBonus +
    kioskBonus +
    beerBonus +
    bus +
    transit +
    fanshop +
    shopArea +
    services +
    clubhouse
  );
}

/** Extra weekly fanbase from merch / clubhouse (PRD F7.5, light campus). */
export function precinctWeeklyFanbaseBonus(state: PrecinctState | undefined): number {
  if (!state) return 0;
  const shop = precinctBuildingLevel(state, "fanshop");
  const shopArea = Math.max(0, occupiedCells(state, "fanshop") - 4) * 0.02;
  const clubhouse = occupiedCells(state, "clubhouse") > 0 ? 0.06 : 0;
  const beer = Math.min(0.08, occupiedCells(state, "beer_tent") * 0.015);
  if (shop <= 0 && clubhouse <= 0 && beer <= 0) return 0;
  return shop * 0.12 + shopArea + clubhouse + beer;
}

/**
 * Training environment multiplier from campus (on top of coaching staff).
 * Hall is the big step; extra pitches add a small bump.
 */
export function precinctTrainingEnvironment(state: PrecinctState | undefined): number {
  if (!state) return 1;
  const ground = precinctBuildingLevel(state, "training_ground");
  const hall = precinctHasTrainingHall(state) ? 0.12 : ground > 0 ? 0.05 : 0;
  const extraPitches = Math.min(0.06, occupiedCells(state, "training_pitch") * 0.008);
  const youth = Math.min(0.05, occupiedCells(state, "youth_pitch") * 0.008);
  if (hall + extraPitches + youth <= 0) return 1;
  return 1 + hall + extraPitches + youth;
}

/** Merch COGS multiplier: fanshop upgrade buys cheaper. */
export function precinctMerchCogsMultiplier(state: PrecinctState | undefined): number {
  if (!state) return 1;
  const shop = precinctBuildingLevel(state, "fanshop");
  if (shop <= 0) return 1;
  return Math.max(0.82, 1 - shop * 0.06);
}

/** Weekly merch margin after wholesale (fanshop upgrade = cheaper buying). */
export function weeklyFanshopIncome(state: PrecinctState | undefined): number {
  if (!state) return 0;
  const shop = precinctBuildingLevel(state, "fanshop");
  if (shop <= 0) return 0;
  const cogs = precinctMerchCogsMultiplier(state);
  return Math.round(4_000 * shop * (1.15 - cogs) * (1 + Math.max(0, occupiedCells(state, "fanshop") - 4) * 0.08));
}
