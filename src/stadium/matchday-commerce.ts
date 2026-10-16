import { resolveConcessionPrices } from "./concession-prices.ts";
import {
  DEFAULT_FANBASE,
  stadiumAttendanceFill,
  stadiumMatchdayIncome,
  type ClubStadium,
} from "./club-stadium.ts";
import { precinctAwayWeekCommerceFill, weeklyBeerIncome, weeklyKioskIncome } from "./precinct-effects.ts";

export interface MatchdayCashBreakdown {
  home: boolean;
  occupancy: number;
  tickets: number;
  kiosk: number;
  beer: number;
  /** Always 0 — merch lives in F6.7 ledger line. */
  shop: number;
  total: number;
}

export function weekCommerceOccupancy(
  isHomeMatchWeek: boolean,
  stadium: ClubStadium | undefined,
  season?: number,
  week?: number,
): number {
  if (!stadium) return isHomeMatchWeek ? 0.72 : 0.06;
  const fanbase = stadium.fanbase ?? DEFAULT_FANBASE;
  if (isHomeMatchWeek) return stadiumAttendanceFill(stadium, season, week);
  return precinctAwayWeekCommerceFill(fanbase, stadium.precinct);
}

export function matchdayCashBreakdown(
  stadium: ClubStadium | undefined,
  isHomeMatchWeek: boolean,
  season?: number,
  week?: number,
): MatchdayCashBreakdown {
  const occupancy = weekCommerceOccupancy(isHomeMatchWeek, stadium, season, week);
  const precinct = stadium?.precinct;
  const fanbase = stadium?.fanbase ?? DEFAULT_FANBASE;
  const prices = resolveConcessionPrices(stadium);
  const tickets =
    isHomeMatchWeek && stadium ? stadiumMatchdayIncome(stadium, season, week) : 0;
  const kiosk = weeklyKioskIncome(precinct, occupancy, fanbase, isHomeMatchWeek, prices);
  const beer = weeklyBeerIncome(precinct, occupancy, fanbase, isHomeMatchWeek, prices);
  return {
    home: isHomeMatchWeek,
    occupancy,
    tickets,
    kiosk,
    beer,
    shop: 0,
    total: tickets + kiosk + beer,
  };
}
