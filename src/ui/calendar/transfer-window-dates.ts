/** Civil calendar transfer windows: first 4 weeks of August and January (PRD 05, calendar UI). */
export const TRANSFER_WINDOW_WEEKS = 4;
export const TRANSFER_WINDOW_DAYS = TRANSFER_WINDOW_WEEKS * 7;

export const AUGUST_MONTH_INDEX = 7;
export const JANUARY_MONTH_INDEX = 0;

export type CivilTransferWindow = "summer" | "winter";

export function civilTransferWindow(monthIndex: number, day: number): CivilTransferWindow | null {
  if (monthIndex === AUGUST_MONTH_INDEX && day >= 1 && day <= TRANSFER_WINDOW_DAYS) {
    return "summer";
  }
  if (monthIndex === JANUARY_MONTH_INDEX && day >= 1 && day <= TRANSFER_WINDOW_DAYS) {
    return "winter";
  }
  return null;
}

export function isCivilTransferWindowLastDay(monthIndex: number, day: number): boolean {
  return (
    (monthIndex === AUGUST_MONTH_INDEX && day === TRANSFER_WINDOW_DAYS) ||
    (monthIndex === JANUARY_MONTH_INDEX && day === TRANSFER_WINDOW_DAYS)
  );
}
