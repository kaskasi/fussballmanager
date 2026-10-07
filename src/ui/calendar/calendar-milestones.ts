import type { IndividualProgram } from "../../development/individual-training.ts";
import { programLabel } from "../../development/individual-training.ts";
import type { GameSession } from "../../persistence/game-session.ts";
import { SUNDAY } from "../../sim/day-calendar.ts";
import { calendarPointFromIndex } from "../../sim/calendar-days.ts";
import { civilDateFromSession, type CivilDate } from "../../sim/session-civil-date.ts";
import { calendarGridYear } from "../../sim/session-civil-date.ts";
import { careerWeekIndex } from "../../stadium/hospitality.ts";
import { t } from "../../i18n/index.ts";
import type { Player } from "../../types/player.ts";
import { formatPlayerName } from "../../types/player-display.ts";
import {
  advanceCalendarDay,
  CAMP_LEADER_WORKDAYS_REQUIRED,
  isWorkday,
} from "../../youth/camp-leader-hire.ts";
import type { CampDayStamp } from "../../youth/satellite-camps.ts";

export type CalendarMilestoneKind =
  | "individual_retrain"
  | "individual_weak_foot"
  | "individual_stamp"
  | "pro_trial"
  | "injury_return"
  | "camp_leader"
  | "contract_unlock"
  | "restaurant_viral";

export interface CalendarMilestone {
  id: string;
  kind: CalendarMilestoneKind;
  season: number;
  week: number;
  weekday: number;
  label: string;
  shortLabel: string;
  playerId?: string;
  priority: number;
  isPast: boolean;
}

export interface CalendarMilestoneView {
  id: string;
  kind: CalendarMilestoneKind;
  label: string;
  shortLabel: string;
  title: string;
  isPast: boolean;
  /** Spielwoche matches session — used for Monday-week emphasis on chips. */
  isCurrentWeek?: boolean;
}

/** Hide milestone chips for Spielwochen after the current session week (Monday reveal). */
export function filterCalendarMilestonesForReveal(
  milestones: readonly CalendarMilestone[],
  season: number,
  week: number,
): CalendarMilestone[] {
  const cutoff = careerWeekIndex(season, week);
  return milestones.filter((entry) => careerWeekIndex(entry.season, entry.week) <= cutoff);
}

export function individualProgramEndWeek(program: IndividualProgram): number {
  const duration = program.plannedWeeks ?? program.weeksRemaining;
  return program.startedWeek + duration - 1;
}

export function milestoneCivilDate(milestone: Pick<CalendarMilestone, "season" | "week" | "weekday">): CivilDate {
  return civilDateFromSession(milestone.season, milestone.week, milestone.weekday);
}

function careerIndexToSeasonWeek(careerWeek: number): { season: number; week: number } {
  const clamped = Math.max(1, Math.round(careerWeek));
  const season = Math.floor((clamped - 1) / 52) + 1;
  const week = ((clamped - 1) % 52) + 1;
  return { season, week };
}

export function campLeaderCandidatesReadyDay(commissionedAt: CampDayStamp): CampDayStamp {
  let cursor = { ...commissionedAt };
  let workdays = 0;
  for (let guard = 0; guard < 400 && workdays < CAMP_LEADER_WORKDAYS_REQUIRED; guard += 1) {
    cursor = advanceCalendarDay(cursor);
    if (isWorkday(cursor.weekday)) workdays += 1;
  }
  return cursor;
}

function playerById(players: readonly Player[], id: string): Player | undefined {
  return players.find((entry) => entry.id === id);
}

function kindForProgram(program: IndividualProgram): CalendarMilestoneKind {
  if (program.kind === "weak_foot") return "individual_weak_foot";
  if (program.kind === "stamp") return "individual_stamp";
  return "individual_retrain";
}

function shortKindLabel(kind: CalendarMilestoneKind): string {
  switch (kind) {
    case "individual_retrain":
      return t("calendar.milestone.retrain");
    case "individual_weak_foot":
      return t("calendar.milestone.weakFoot");
    case "individual_stamp":
      return t("calendar.milestone.stamp");
    case "pro_trial":
      return t("calendar.milestone.probe");
    case "injury_return":
      return t("calendar.milestone.fit");
    case "camp_leader":
      return t("calendar.milestone.camp");
    case "contract_unlock":
      return t("calendar.milestone.contract");
    case "restaurant_viral":
      return t("calendar.milestone.restaurant");
  }
}

export function collectCalendarMilestones(
  session: Pick<
    GameSession,
    "season" | "week" | "weekday" | "clubId" | "players" | "individualPrograms" | "youthCamps" | "stadium"
  >,
): CalendarMilestone[] {
  const milestones: CalendarMilestone[] = [];
  const nowSeason = session.season;
  const nowWeek = session.week;

  for (const program of session.individualPrograms) {
    if (program.season !== nowSeason) continue;
    const endWeek = individualProgramEndWeek(program);
    const player = playerById(session.players, program.playerId);
    const who = player ? formatPlayerName(player).split(" ").pop() ?? "Spieler" : "Spieler";
    const kind = kindForProgram(program);
    milestones.push({
      id: `program:${program.playerId}:${program.startedWeek}`,
      kind,
      season: program.season,
      week: endWeek,
      weekday: SUNDAY,
      label: player ? programLabel(program) : programLabel(program),
      shortLabel: who,
      playerId: program.playerId,
      priority: kind === "individual_retrain" ? 2 : 3,
      isPast: endWeek < nowWeek,
    });
  }

  for (const player of session.players) {
    if (player.club_id !== session.clubId) continue;
    const trial = player.state.pro_trial;
    if (trial && trial.season === nowSeason) {
      const who = formatPlayerName(player).split(" ").pop() ?? "Spieler";
      milestones.push({
        id: `trial:${player.id}:${trial.started_week}`,
        kind: "pro_trial",
        season: trial.season,
        week: trial.ends_week,
        weekday: SUNDAY,
        label: t("calendar.milestone.proTrialEnd", { who }),
        shortLabel: who,
        playerId: player.id,
        priority: 2,
        isPast: trial.ends_week < nowWeek,
      });
    }
    const injury = player.state.injury;
    if (injury) {
      const returnWeek = nowWeek + injury.weeks_remaining;
      const who = formatPlayerName(player).split(" ").pop() ?? "Spieler";
      milestones.push({
        id: `injury:${player.id}:${returnWeek}`,
        kind: "injury_return",
        season: nowSeason,
        week: returnWeek,
        weekday: SUNDAY,
        label: t("calendar.milestone.injuryReturn", { who }),
        shortLabel: who,
        playerId: player.id,
        priority: 3,
        isPast: returnWeek < nowWeek,
      });
    }
    const lockUntil = player.state.contract_talks_locked_until_day;
    if (lockUntil != null) {
      const unlock = calendarPointFromIndex(lockUntil);
      const who = formatPlayerName(player).split(" ").pop() ?? "Spieler";
      milestones.push({
        id: `contract:${player.id}:${lockUntil}`,
        kind: "contract_unlock",
        season: unlock.season,
        week: unlock.week,
        weekday: unlock.weekday,
        label: t("calendar.milestone.contractUnlock", { who }),
        shortLabel: who,
        playerId: player.id,
        priority: 4,
        isPast:
          unlock.season < nowSeason ||
          (unlock.season === nowSeason && unlock.week < nowWeek) ||
          (unlock.season === nowSeason &&
            unlock.week === nowWeek &&
            unlock.weekday < session.weekday),
      });
    }
  }

  for (const camp of session.youthCamps) {
    if (camp.leader_hire !== "agency_pending" || !camp.agency_commissioned_at) continue;
    const ready = campLeaderCandidatesReadyDay(camp.agency_commissioned_at);
    milestones.push({
      id: `camp:${camp.id}:${ready.season}:${ready.week}:${ready.weekday}`,
      kind: "camp_leader",
      season: ready.season,
      week: ready.week,
      weekday: ready.weekday,
      label: t("calendar.milestone.campLeader"),
      shortLabel: shortKindLabel("camp_leader"),
      priority: 2,
      isPast:
        ready.season < nowSeason ||
        (ready.season === nowSeason && ready.week < nowWeek) ||
        (ready.season === nowSeason && ready.week === nowWeek && ready.weekday < session.weekday),
    });
  }

  const viralUntil = session.stadium.restaurant_viral_until_week;
  if (viralUntil != null && careerWeekIndex(nowSeason, nowWeek) <= viralUntil) {
    const { season, week } = careerIndexToSeasonWeek(viralUntil);
    milestones.push({
      id: `viral:${viralUntil}`,
      kind: "restaurant_viral",
      season,
      week,
      weekday: SUNDAY,
      label: t("calendar.milestone.restaurantViral"),
      shortLabel: shortKindLabel("restaurant_viral"),
      priority: 5,
      isPast: careerWeekIndex(season, week) < careerWeekIndex(nowSeason, nowWeek),
    });
  }

  const byId = new Map<string, CalendarMilestone>();
  for (const entry of milestones) {
    byId.set(entry.id, entry);
  }
  return [...byId.values()].sort((left, right) => {
    if (left.season !== right.season) return left.season - right.season;
    if (left.week !== right.week) return left.week - right.week;
    if (left.weekday !== right.weekday) return left.weekday - right.weekday;
    return left.priority - right.priority;
  });
}

export function attachMilestonesToGrid(
  cells: readonly { key: string; day: number | null; isToday: boolean }[],
  season: number,
  monthIndex: number,
  milestones: readonly CalendarMilestone[],
  maxPerCell = 2,
  sessionWeek?: { season: number; week: number },
): Map<string, CalendarMilestoneView[]> {
  const year = calendarGridYear(season, monthIndex);
  const bucket = new Map<string, CalendarMilestoneView[]>();

  for (const milestone of milestones) {
    const civil = milestoneCivilDate(milestone);
    if (civil.monthIndex !== monthIndex || civil.year !== year) continue;
    const key = `d-${civil.day}`;
    const view: CalendarMilestoneView = {
      id: milestone.id,
      kind: milestone.kind,
      label: milestone.label,
      shortLabel: milestone.shortLabel,
      title: milestone.label,
      isPast: milestone.isPast,
      isCurrentWeek:
        sessionWeek !== undefined &&
        milestone.season === sessionWeek.season &&
        milestone.week === sessionWeek.week,
    };
    const list = bucket.get(key) ?? [];
    list.push(view);
    bucket.set(key, list);
  }

  for (const [key, list] of bucket) {
    list.sort((a, b) => {
      const ma = milestones.find((m) => m.id === a.id);
      const mb = milestones.find((m) => m.id === b.id);
      return (ma?.priority ?? 9) - (mb?.priority ?? 9);
    });
    bucket.set(key, list.slice(0, maxPerCell));
  }

  return bucket;
}

export function milestoneOverflowCount(
  cells: readonly { key: string; day: number | null }[],
  season: number,
  monthIndex: number,
  milestones: readonly CalendarMilestone[],
  maxPerCell = 2,
): Map<string, number> {
  const year = calendarGridYear(season, monthIndex);
  const counts = new Map<string, number>();
  for (const milestone of milestones) {
    const civil = milestoneCivilDate(milestone);
    if (civil.monthIndex !== monthIndex || civil.year !== year) continue;
    const key = `d-${civil.day}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const overflow = new Map<string, number>();
  for (const [key, total] of counts) {
    if (total > maxPerCell) overflow.set(key, total - maxPerCell);
  }
  return overflow;
}
