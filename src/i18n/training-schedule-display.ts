import { MONDAY } from "../sim/day-calendar.ts";
import { weekdayShortDisplay } from "./calendar-display.ts";
import { t } from "./index.ts";

/** Mo–Fr column header (uses active locale). */
export function trainingDayShortLabel(dayIndex: number): string {
  return weekdayShortDisplay(MONDAY + dayIndex);
}

export function trainingPeriodShortLabel(periodIndex: number): string {
  return t("training.period.short", { n: periodIndex + 1 });
}

export function trainingSlotDayUnitLabel(dayIndex: number, periodIndex: number): string {
  return t("training.slot.dayUnit", {
    day: trainingDayShortLabel(dayIndex),
    unit: t("training.period.unit", { n: periodIndex + 1 }),
  });
}
