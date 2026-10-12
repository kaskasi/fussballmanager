import { MONDAY } from "../sim/day-calendar.ts";
import { UNITS_PER_DAY } from "../development/weekly-plan.ts";
import { buildHubTrainingWindow, type HubDayOffset } from "./hub-training-window.ts";
import type { GameSession } from "../persistence/game-session.ts";
import type { TrainingSlot } from "../development/training-units.ts";

const TRAINING_WEEKDAY_LAST = 5;

export interface HubTimetableDayColumn {
  offset: HubDayOffset;
  weekday: number;
  weekdayLabel: string;
  dayIndex: number | null;
  isMatchPreview: boolean;
  opponentShortName: string | null;
  opponentClubId: string | null;
  slotIndices: readonly number[];
}

/** Manager Desk mobile: one column (session weekday), not the −1/0/+1 strip. */
export function hubTimetableColumnsForDisplay(
  columns: readonly HubTimetableDayColumn[],
  mobileSingleDay: boolean,
): HubTimetableDayColumn[] {
  if (!mobileSingleDay) return [...columns];
  const today = columns.find((column) => column.offset === 0);
  return today ? [today] : [...columns];
}

export function hubThreeDayTimetableColumns(
  session: Pick<GameSession, "season" | "week" | "weekday" | "league" | "matchPlayedThisWeek">,
  _plan: TrainingSlot[],
): HubTimetableDayColumn[] {
  const window = buildHubTrainingWindow(session, _plan);
  return window.map((day) => {
    const dayIndex =
      day.weekday >= MONDAY && day.weekday <= TRAINING_WEEKDAY_LAST
        ? day.weekday - MONDAY
        : null;
    const slotIndices =
      dayIndex === null
        ? []
        : ([0, 1, 2].map((period) => dayIndex * UNITS_PER_DAY + period) as number[]);
    return {
      offset: day.offset,
      weekday: day.weekday,
      weekdayLabel: day.weekdayLabel,
      dayIndex,
      isMatchPreview: day.isMatchPreview,
      opponentShortName: day.opponentShortName,
      opponentClubId: day.opponentClubId,
      slotIndices,
    };
  });
}
