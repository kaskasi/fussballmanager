import { resolveConcessionPrices } from "./concession-prices.ts";
import {
  DEFAULT_FANBASE,
  stadiumAttendanceFill,
  stadiumMatchdayIncome,
  type ClubStadium,
} from "./club-stadium.ts";
import {
  precinctAwayWeekCommerceFill,
  weeklyBeerIncome,
  weeklyFanshopIncome,
  weeklyKioskIncome,
} from "./precinct-effects.ts";

export interface MatchdayCashBreakdown {
  home: boolean;
  occupancy: number;
  tickets: number;
  kiosk: number;
  beer: number;
  shop: number;
  total: number;
}

export function weekCommerceOccupancy(
  isHomeMatchWeek: boolean,
  stadium: ClubStadium | undefined,
): number {
  if (!stadium) return isHomeMatchWeek ? 0.72 : 0.06;
  const fanbase = stadium.fanbase ?? DEFAULT_FANBASE;
  if (isHomeMatchWeek) return stadiumAttendanceFill(stadium);
  return precinctAwayWeekCommerceFill(fanbase, stadium.precinct);
}

export function matchdayCashBreakdown(
  stadium: ClubStadium | undefined,
  isHomeMatchWeek: boolean,
): MatchdayCashBreakdown {
  const occupancy = weekCommerceOccupancy(isHomeMatchWeek, stadium);
  const precinct = stadium?.precinct;
  const fanbase = stadium?.fanbase ?? DEFAULT_FANBASE;
  const prices = resolveConcessionPrices(stadium);
  const tickets = isHomeMatchWeek && stadium ? stadiumMatchdayIncome(stadium) : 0;
  const kiosk = weeklyKioskIncome(precinct, occupancy, fanbase, isHomeMatchWeek, prices);
  const beer = weeklyBeerIncome(precinct, occupancy, fanbase, isHomeMatchWeek, prices);
  const shop = weeklyFanshopIncome(precinct, occupancy, fanbase, isHomeMatchWeek);
  return {
    home: isHomeMatchWeek,
    occupancy,
    tickets,
    kiosk,
    beer,
    shop,
    total: tickets + kiosk + beer + shop,
  };
}
