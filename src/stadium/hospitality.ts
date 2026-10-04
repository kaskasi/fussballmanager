import { DEFAULT_FANBASE } from "./club-stadium.ts";
import {
  buildingDocksStreetNetwork,
  occupiedCells,
  type PrecinctState,
} from "./precinct.ts";

export const HOTEL_FULL_WEEKLY = 8_000;
export const RESTAURANT_FULL_WEEKLY = 3_500;
export const RESTAURANT_OVERTIME_COST = 2_500;
export const RESTAURANT_VIRAL_WEEKS = 12;

export function careerWeekIndex(season: number, week: number): number {
  return (season - 1) * 52 + week;
}

export function hospitalityDocked(state: PrecinctState | undefined, id: "hotel" | "restaurant"): boolean {
  if (!state) return false;
  return occupiedCells(state, id) > 0 && buildingDocksStreetNetwork(state, id);
}

export function hotelOccupancyPct(
  ownFanbase: number,
  isHomeMatchWeek: boolean,
  opponentFanbase: number,
): number {
  const own = Number.isFinite(ownFanbase) ? ownFanbase : DEFAULT_FANBASE;
  const guest = Number.isFinite(opponentFanbase) ? opponentFanbase : DEFAULT_FANBASE;
  const base = Math.min(85, Math.max(20, own * 0.7));
  const homeBoost = isHomeMatchWeek ? guest * 0.45 : 0;
  return Math.round(Math.min(100, Math.max(18, base + homeBoost)));
}

export function restaurantOccupancyPct(
  ownFanbase: number,
  viral: boolean,
): number {
  if (viral) return 100;
  const own = Number.isFinite(ownFanbase) ? ownFanbase : DEFAULT_FANBASE;
  return Math.round(Math.min(92, Math.max(22, own * 0.85)));
}

export function restaurantViralActive(
  viralUntilWeek: number | undefined,
  season: number,
  week: number,
): boolean {
  if (viralUntilWeek == null) return false;
  return careerWeekIndex(season, week) <= viralUntilWeek;
}

export function weeklyHotelIncome(
  precinct: PrecinctState | undefined,
  occupancyPct: number,
): number {
  if (!hospitalityDocked(precinct, "hotel")) return 0;
  return Math.round((occupancyPct / 100) * HOTEL_FULL_WEEKLY);
}

export function weeklyRestaurantIncome(
  precinct: PrecinctState | undefined,
  occupancyPct: number,
): number {
  if (!hospitalityDocked(precinct, "restaurant")) return 0;
  return Math.round((occupancyPct / 100) * RESTAURANT_FULL_WEEKLY);
}
