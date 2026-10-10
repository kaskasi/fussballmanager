import { calendarWeek } from "../sim/game-calendar.ts";

/** Story-mode Phillip on-demand supplier — two sale windows per season. */
export const PHILLIP_MERCH_SALE_DISCOUNT = 0.33;

/** Spieltag 2–3 (Saisonstart) and calendar KW 2–3 (January). */
export function isPhillipMerchSaleWeek(seasonWeek: number): boolean {
  const week = Math.round(seasonWeek);
  if (week === 2 || week === 3) return true;
  const kw = calendarWeek(week);
  return kw === 2 || kw === 3;
}

export function phillipMerchSaleMultiplier(seasonWeek: number): number {
  return isPhillipMerchSaleWeek(seasonWeek) ? 1 - PHILLIP_MERCH_SALE_DISCOUNT : 1;
}
