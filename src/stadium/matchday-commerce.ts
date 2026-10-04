import {
  DEFAULT_FANBASE,
  stadiumAttendanceFill,
  stadiumMatchdayIncome,
  type ClubStadium,
} from "./club-stadium.ts";
import {
  precinctVisitFill,
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
  if (isHomeMatchWeek) return stadiumAttendanceFill(stadium);
  return precinctVisitFill(stadium.fanbase ?? DEFAULT_FANBASE, stadium.precinct);
}

export function matchdayCashBreakdown(
  stadium: ClubStadium | undefined,
  isHomeMatchWeek: boolean,
): MatchdayCashBreakdown {
  const occupancy = weekCommerceOccupancy(isHomeMatchWeek, stadium);
  const precinct = stadium?.precinct;
  const tickets = isHomeMatchWeek && stadium ? stadiumMatchdayIncome(stadium) : 0;
  const kiosk = weeklyKioskIncome(precinct, occupancy);
  const beer = weeklyBeerIncome(precinct, occupancy);
  const shop = weeklyFanshopIncome(precinct, occupancy);
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
