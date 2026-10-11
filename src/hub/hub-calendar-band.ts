import { collectCalendarMilestones, type CalendarMilestone } from "../ui/calendar/calendar-milestones.ts";
import type { GameSession } from "../persistence/game-session.ts";
import type { HubDayOffset } from "./hub-training-window.ts";

export interface HubCalendarChip {
  id: string;
  shortLabel: string;
  label: string;
  weekday: number;
  offset: HubDayOffset;
}

function offsetForWeekday(sessionWeekday: number, milestoneWeekday: number): HubDayOffset | null {
  const delta = milestoneWeekday - sessionWeekday;
  if (delta === -1) return -1;
  if (delta === 0) return 0;
  if (delta === 1) return 1;
  return null;
}

export function hubCalendarBand(
  session: Pick<
    GameSession,
    "season" | "week" | "weekday" | "clubId" | "players" | "individualPrograms" | "youthCamps" | "stadium"
  >,
): HubCalendarChip[] {
  const milestones = collectCalendarMilestones(session);
  const chips: HubCalendarChip[] = [];
  for (const entry of milestones) {
    if (entry.season !== session.season || entry.week !== session.week) continue;
    const offset = offsetForWeekday(session.weekday, entry.weekday);
    if (offset === null) continue;
    chips.push({
      id: entry.id,
      shortLabel: entry.shortLabel,
      label: entry.label,
      weekday: entry.weekday,
      offset,
    });
  }
  return chips.sort((a, b) => a.weekday - b.weekday);
}

export function filterMilestonesForWindow(
  milestones: CalendarMilestone[],
  sessionWeekday: number,
): CalendarMilestone[] {
  return milestones.filter((entry) => {
    const delta = entry.weekday - sessionWeekday;
    return delta >= -1 && delta <= 1;
  });
}
