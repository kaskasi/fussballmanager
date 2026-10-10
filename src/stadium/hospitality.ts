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

export type HospitalityVenueId = "hotel" | "restaurant" | "museum";

export function hospitalityDocked(
  state: PrecinctState | undefined,
  id: HospitalityVenueId,
): boolean {
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

export const MUSEUM_FULL_WEEKLY = 2_400;

export function museumVisitPct(ownFanbase: number): number {
  const own = Number.isFinite(ownFanbase) ? ownFanbase : DEFAULT_FANBASE;
  return Math.round(Math.min(90, Math.max(18, own * 0.48)));
}

export function weeklyMuseumIncome(precinct: PrecinctState | undefined, ownFanbase: number): number {
  if (!hospitalityDocked(precinct, "museum")) return 0;
  const pct = museumVisitPct(ownFanbase);
  return Math.round((pct / 100) * MUSEUM_FULL_WEEKLY);
}

export function restaurantOvertimeDueThisWeek(
  restaurantOvertimeWeek: number | undefined,
  season: number,
  week: number,
): boolean {
  if (restaurantOvertimeWeek == null) return false;
  return restaurantOvertimeWeek === careerWeekIndex(season, week);
}

export function hospitalityOvertimeCost(
  restaurantOvertimeWeek: number | undefined,
  season: number,
  week: number,
): number {
  return restaurantOvertimeDueThisWeek(restaurantOvertimeWeek, season, week)
    ? RESTAURANT_OVERTIME_COST
    : 0;
}

export type HospitalityPreviewInput = {
  precinct: PrecinctState | undefined;
  ownFanbase: number;
  isHomeMatchWeek: boolean;
  opponentFanbase: number;
  season: number;
  week: number;
  restaurantViralUntilWeek?: number;
  restaurantOvertimeWeek?: number;
};

export type HospitalityVenuePreview = {
  placed: boolean;
  docked: boolean;
  occupancyPct: number;
  weeklyIncome: number;
};

export type RestaurantVenuePreview = HospitalityVenuePreview & {
  viral: boolean;
  overtimeDueThisWeek: boolean;
};

export type HospitalityPreview = {
  hotel: HospitalityVenuePreview | null;
  restaurant: RestaurantVenuePreview | null;
  totalWeeklyIncome: number;
  overtimeCostThisWeek: number;
};

export function computeHospitalityPreview(input: HospitalityPreviewInput): HospitalityPreview {
  const viral = restaurantViralActive(
    input.restaurantViralUntilWeek,
    input.season,
    input.week,
  );
  const hotelOcc = hotelOccupancyPct(
    input.ownFanbase,
    input.isHomeMatchWeek,
    input.opponentFanbase,
  );
  const restOcc = restaurantOccupancyPct(input.ownFanbase, viral);
  const overtimeCostThisWeek = hospitalityOvertimeCost(
    input.restaurantOvertimeWeek,
    input.season,
    input.week,
  );

  let hotel: HospitalityVenuePreview | null = null;
  let restaurant: RestaurantVenuePreview | null = null;

  if (input.precinct && occupiedCells(input.precinct, "hotel") > 0) {
    const docked = hospitalityDocked(input.precinct, "hotel");
    hotel = {
      placed: true,
      docked,
      occupancyPct: hotelOcc,
      weeklyIncome: weeklyHotelIncome(input.precinct, hotelOcc),
    };
  }

  if (input.precinct && occupiedCells(input.precinct, "restaurant") > 0) {
    const docked = hospitalityDocked(input.precinct, "restaurant");
    restaurant = {
      placed: true,
      docked,
      occupancyPct: restOcc,
      weeklyIncome: weeklyRestaurantIncome(input.precinct, restOcc),
      viral,
      overtimeDueThisWeek: restaurantOvertimeDueThisWeek(
        input.restaurantOvertimeWeek,
        input.season,
        input.week,
      ),
    };
  }

  const museumWeeklyIncome = weeklyMuseumIncome(input.precinct, input.ownFanbase);
  const totalWeeklyIncome =
    (hotel?.weeklyIncome ?? 0) + (restaurant?.weeklyIncome ?? 0) + museumWeeklyIncome;

  return { hotel, restaurant, totalWeeklyIncome, overtimeCostThisWeek };
}
