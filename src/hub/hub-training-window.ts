import {
  isTrainingSlotEmpty,
  trainingSlotWeekday,
  trainingUnit,
  type TrainingSlot,
} from "../development/training-units.ts";
import { UNITS_PER_DAY } from "../development/weekly-plan.ts";
import { isMatchSaturday, weekdayLabel, SATURDAY } from "../sim/day-calendar.ts";

const FRIDAY = 5;
import { prepareCareerMatch } from "../sim/career-match-setup.ts";
import type { GameSession } from "../persistence/game-session.ts";

export type HubDayOffset = -1 | 0 | 1;

export interface HubTrainingSlotView {
  slotIndex: number;
  label: string;
  empty: boolean;
  focus: boolean;
}

export interface HubTrainingDayColumn {
  offset: HubDayOffset;
  weekday: number;
  weekdayLabel: string;
  slots: HubTrainingSlotView[];
  isMatchPreview: boolean;
  opponentShortName: string | null;
}

function weekdayForOffset(sessionWeekday: number, offset: HubDayOffset): number {
  const next = sessionWeekday + offset;
  if (next < 1) return 1;
  if (next > 7) return 7;
  return next;
}

export function buildHubTrainingWindow(
  session: Pick<GameSession, "season" | "week" | "weekday" | "league" | "matchPlayedThisWeek">,
  trainingPlan: TrainingSlot[],
): HubTrainingDayColumn[] {
  const matchWeek = isMatchSaturday(session.week);
  const matchSetup =
    matchWeek && !session.league.season_complete && !session.matchPlayedThisWeek
      ? prepareCareerMatch(session as GameSession)
      : null;

  const offsets: HubDayOffset[] = [-1, 0, 1];
  return offsets.map((offset) => {
    const weekday = weekdayForOffset(session.weekday, offset);
    const slots: HubTrainingSlotView[] = [];
    for (let i = 0; i < trainingPlan.length; i += 1) {
      if (trainingSlotWeekday(i) !== weekday) continue;
      const slot = trainingPlan[i]!;
      slots.push({
        slotIndex: i,
        label: isTrainingSlotEmpty(slot) ? "—" : trainingUnit(slot.unitId).label,
        empty: isTrainingSlotEmpty(slot),
        focus: slot.focus,
      });
    }
    while (slots.length < UNITS_PER_DAY) {
      slots.push({
        slotIndex: -1,
        label: "—",
        empty: true,
        focus: false,
      });
    }
    const isFridayBeforeMatch =
      offset === 1 &&
      weekday === FRIDAY &&
      matchWeek &&
      !session.matchPlayedThisWeek &&
      Boolean(matchSetup);
    const isSaturdayMatch =
      offset === 1 && weekday === SATURDAY && matchWeek && !session.matchPlayedThisWeek;

    return {
      offset,
      weekday,
      weekdayLabel: weekdayLabel(weekday),
      slots: slots.slice(0, UNITS_PER_DAY),
      isMatchPreview: isFridayBeforeMatch || isSaturdayMatch,
      opponentShortName: isFridayBeforeMatch || isSaturdayMatch ? matchSetup?.opponentShortName ?? null : null,
    };
  });
}
