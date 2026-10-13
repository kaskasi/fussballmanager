/** PRD 14.15 — 3-day slice of Training Stundenplan on Manager Desk */
import { useMemo } from "react";
import {
  currentTrainingSlotIndex,
  isTrainingDayFullyPastForSession,
  isTrainingSlotPastForSession,
  slotPeriodLabel,
  type TrainingSlot,
} from "../../development/training-units.ts";
import { trainingSlotOutcomeAt, type TrainingSlotOutcome } from "../../development/training-unit-result.ts";
import {
  hubThreeDayTimetableColumns,
  hubTimetableColumnsForDisplay,
} from "../../hub/hub-training-timetable.ts";
import { useMobileNarrow } from "../hooks/use-mobile-narrow.ts";
import type { GameSession } from "../../persistence/game-session.ts";
import type { LeagueState } from "../../persistence/league-state.ts";
import type { ScoutBoard } from "../../scouting/scout-board.ts";
import {
  activeTripCivilDayKeys,
  civilDateKey,
  countActiveScoutTrips,
} from "../../scouting/scout-calendar-day.ts";
import { calendarGridYear, civilDateFromSession } from "../../sim/session-civil-date.ts";
import { calendarCellForSessionWeekday } from "../calendar/month-grid.ts";
import type { CalendarMilestone } from "../calendar/calendar-milestones.ts";
import { t } from "../../i18n/index.ts";
import { useT } from "../../i18n/react.ts";
import { SUNDAY } from "../../sim/day-calendar.ts";
import { CalendarMonthGridCell } from "./CalendarMonthGridCell.tsx";
import { HubTrainingDayPlaceholder } from "./HubTrainingDayPlaceholder.tsx";
import { TrainingSlotCard } from "./TrainingSlotCard.tsx";
import { COACH_TARGET } from "../../tutorial/index.ts";

type HubColumnBody = "match" | "sunday-off" | "slots";

function hubColumnBodyKind(column: {
  weekday: number;
  dayIndex: number | null;
  isMatchPreview: boolean;
  opponentShortName: string | null;
}): HubColumnBody {
  if (column.isMatchPreview && column.opponentShortName) return "match";
  if (column.weekday === SUNDAY || column.dayIndex === null) return "sunday-off";
  return "slots";
}

function HubDayCalendarCell({
  season,
  week,
  weekday,
  league,
  milestones,
  todayWeek,
  todayWeekday,
  scoutBoard,
  hideMatchChip = false,
}: {
  season: number;
  week: number;
  weekday: number;
  league: LeagueState;
  milestones: readonly CalendarMilestone[];
  todayWeek: number;
  todayWeekday: number;
  scoutBoard?: ScoutBoard;
  hideMatchChip?: boolean;
}) {
  const cell = useMemo(
    () =>
      calendarCellForSessionWeekday(season, week, weekday, league, milestones, {
        week: todayWeek,
        weekday: todayWeekday,
      }),
    [season, week, weekday, league, milestones, todayWeek, todayWeekday],
  );
  const activeTrips = scoutBoard?.active_scout_trips ?? [];
  const scoutTripCount = countActiveScoutTrips(activeTrips);
  const scoutBusyDayKeys = useMemo(
    () => activeTripCivilDayKeys(season, week, activeTrips),
    [activeTrips, season, week],
  );
  const civil = civilDateFromSession(season, week, weekday);
  const gridYear = calendarGridYear(season, civil.monthIndex);
  const scoutBusy =
    cell.day != null &&
    scoutTripCount > 0 &&
    scoutBusyDayKeys.has(civilDateKey({ year: gridYear, monthIndex: civil.monthIndex, day: cell.day }));

  return (
    <div className="manager-desk__day-calendar">
      <CalendarMonthGridCell
        cell={cell}
        scoutBusy={scoutBusy}
        scoutTripCount={scoutTripCount}
        hideMatchChip={hideMatchChip}
      />
    </div>
  );
}

export function HubThreeDayTrainingCalendar({
  session,
  plan,
  useTrainingUnitProgress,
  milestones = [],
  scoutBoard,
  onOpenTraining,
}: {
  session: Pick<
    GameSession,
    | "season"
    | "week"
    | "weekday"
    | "league"
    | "matchPlayedThisWeek"
    | "trainingUnitsCompleted"
    | "trainingUnitOutcomes"
  >;
  plan: TrainingSlot[];
  useTrainingUnitProgress: boolean;
  milestones?: readonly CalendarMilestone[];
  scoutBoard?: ScoutBoard;
  onOpenTraining: () => void;
}) {
  useT();
  const { season, week, weekday, trainingUnitsCompleted, trainingUnitOutcomes, league } = session;

  const mobileSingleDay = useMobileNarrow();
  const columns = useMemo(
    () =>
      hubTimetableColumnsForDisplay(
        hubThreeDayTimetableColumns(session, plan),
        mobileSingleDay,
      ),
    [session, plan, mobileSingleDay],
  );

  const nextSlotIndex = currentTrainingSlotIndex(trainingUnitsCompleted, useTrainingUnitProgress);
  const dayCalendar = (columnWeekday: number, hideMatchChip: boolean) => (
    <HubDayCalendarCell
      season={season}
      week={week}
      weekday={columnWeekday}
      league={league}
      milestones={milestones}
      todayWeek={week}
      todayWeekday={weekday}
      scoutBoard={scoutBoard}
      hideMatchChip={hideMatchChip}
    />
  );

  return (
    <div
      className={[
        "manager-desk__timetable-scroll",
        "training-timetable-scroll",
        mobileSingleDay ? "is-single-day" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      data-coach-target={COACH_TARGET.hubTrainingCalendar}
    >
      <div
        className="training-timetable manager-desk__timetable"
        aria-label={t("training.timetable.aria")}
      >
        {columns.map((column) => {
          const bodyKind = hubColumnBodyKind(column);
          const dayPast =
            bodyKind === "slots" &&
            column.dayIndex !== null &&
            isTrainingDayFullyPastForSession(
              column.dayIndex,
              weekday,
              trainingUnitsCompleted,
              useTrainingUnitProgress,
            );

          return (
            <div
              key={column.offset}
              className={[
                "training-day-column",
                bodyKind === "sunday-off" ? "is-rest" : "",
                bodyKind === "match" ? "manager-desk__match-column" : "",
                dayPast ? "is-past" : "",
                column.offset === 0 ? "is-today" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {dayCalendar(column.weekday, bodyKind === "match")}
              {bodyKind === "match" ? (
                <HubTrainingDayPlaceholder
                  variant="match"
                  opponentShortName={column.opponentShortName ?? undefined}
                  opponentClubId={column.opponentClubId}
                />
              ) : null}
              {bodyKind === "sunday-off" ? <HubTrainingDayPlaceholder variant="sunday-off" /> : null}
              {bodyKind === "slots"
                ? column.slotIndices.map((slotIndex) => {
                const slot = plan[slotIndex]!;
                const slotPast = isTrainingSlotPastForSession(
                  slotIndex,
                  weekday,
                  trainingUnitsCompleted,
                  useTrainingUnitProgress,
                );
                const slotCurrent = nextSlotIndex === slotIndex;
                const outcome: TrainingSlotOutcome | null = trainingSlotOutcomeAt(
                  trainingUnitOutcomes,
                  slotIndex,
                );
                return (
                  <TrainingSlotCard
                    key={slotIndex}
                    slotIndex={slotIndex}
                    periodLabel={slotPeriodLabel(slotIndex)}
                    slot={slot}
                    past={slotPast}
                    current={slotCurrent}
                    active={false}
                    outcome={outcome}
                    readOnly
                    onOpenPicker={onOpenTraining}
                    onShowOutcome={onOpenTraining}
                    onToggleFocus={() => undefined}
                    focusToggleDisabled
                  />
                );
              })
                : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
