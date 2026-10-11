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
  opponentClubId: string | null;
}

/** Calendar weekday 1=Mo … 7=So; wraps so Monday −1 → Sunday, not duplicate Monday. */
function weekdayForOffset(sessionWeekday: number, offset: HubDayOffset): number {
  const wrapped = ((sessionWeekday - 1 + offset) % 7 + 7) % 7;
  return wrapped + 1;
}

function hubSlotLabel(slot: TrainingSlot): string {
  if (isTrainingSlotEmpty(slot)) return "—";
  try {
    return trainingUnit(slot.unitId).label;
  } catch {
    return "—";
  }
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
        label: hubSlotLabel(slot),
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
    const isSaturdayMatchToday =
      offset === 0 &&
      weekday === SATURDAY &&
      matchWeek &&
      !session.matchPlayedThisWeek &&
      Boolean(matchSetup);

    return {
      offset,
      weekday,
      weekdayLabel: weekdayLabel(weekday),
      slots: slots.slice(0, UNITS_PER_DAY),
      isMatchPreview: isFridayBeforeMatch || isSaturdayMatch || isSaturdayMatchToday,
      opponentShortName: isFridayBeforeMatch || isSaturdayMatch ? matchSetup?.opponentShortName ?? null : null,
      opponentClubId:
        isFridayBeforeMatch || isSaturdayMatch
          ? matchSetup
            ? matchSetup.isHome
              ? matchSetup.awayTeamId
              : matchSetup.homeTeamId
            : null
          : null,
    };
  });
}
