import { isCareerTransitionPending } from "../narrative/career-acts.ts";
import type { GameSession } from "../persistence/game-session.ts";
import {
  civilDateFromSession,
  calendarGridYear,
  type CivilDate,
} from "./session-civil-date.ts";
import { MONDAY, resolveSmartSkip, SUNDAY } from "./day-calendar.ts";
import { isLeagueMatchWeek } from "./game-calendar.ts";
import { SLOT_COUNT } from "../development/weekly-plan.ts";
import {
  isTrainingCalendarGatePending,
  isTrainingNextActive,
  runTrainingNextStep,
  usesTrainingNextNexus,
} from "./training-next.ts";

export type FastForwardStopReason =
  | "reached"
  | "limit"
  | "training_plan"
  | "season_complete"
  | "stall"
  /** Story Mode Act 1 ended — the employer pick blocks time (PRD 19). */
  | "story_transition";

export interface FastForwardResult {
  session: GameSession;
  steps: number;
  reason: FastForwardStopReason;
}

export interface FastForwardDeps {
  simulateWeek: (session: GameSession) => Promise<GameSession>;
  advanceSessionDays: (
    session: GameSession,
    daysAdvanced: number,
    targetWeekday: number,
  ) => GameSession;
  /** Optional: transform the session before every step (e.g. auto-ignore open inbox items). */
  beforeStep?: (session: GameSession) => GameSession;
  /** Optional: yield to the UI thread between heavy steps. */
  onProgress?: (session: GameSession, steps: number) => void | Promise<void>;
}

function civilSortKey(date: CivilDate): number {
  return date.year * 10_000 + date.monthIndex * 100 + date.day;
}

export function compareCivilDates(left: CivilDate, right: CivilDate): number {
  return civilSortKey(left) - civilSortKey(right);
}

export function civilDateEndOfMonth(season: number, monthIndex: number): CivilDate {
  const year = calendarGridYear(season, monthIndex);
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();
  return { year, monthIndex, day: lastDay };
}

export function daysBetweenCivil(from: CivilDate, to: CivilDate): number {
  const start = Date.UTC(from.year, from.monthIndex, from.day);
  const end = Date.UTC(to.year, to.monthIndex, to.day);
  return Math.round((end - start) / 86_400_000);
}

export function fastForwardTargetDate(
  season: number,
  week: number,
  weekday: number,
  targetMonthIndex: number,
): CivilDate {
  const current = civilDateFromSession(season, week, weekday);
  const end = civilDateEndOfMonth(season, targetMonthIndex);
  if (compareCivilDates(current, end) >= 0) {
    return current;
  }
  return end;
}

export type SimulateUntil = "next_week" | "next_month";

/** "Simulate until" presets: Monday of the next season week, or the 1st of the next month. */
export function simulateUntilTarget(
  kind: SimulateUntil,
  season: number,
  week: number,
  weekday: number,
): CivilDate {
  if (kind === "next_week") {
    return civilDateFromSession(season, week + 1, MONDAY);
  }
  const current = civilDateFromSession(season, week, weekday);
  const first = new Date(current.year, current.monthIndex + 1, 1);
  return { year: first.getFullYear(), monthIndex: first.getMonth(), day: 1 };
}

export function hasReachedFastForwardTarget(
  season: number,
  week: number,
  weekday: number,
  target: CivilDate,
): boolean {
  const current = civilDateFromSession(season, week, weekday);
  return compareCivilDates(current, target) >= 0;
}

function sessionProgressKey(session: GameSession): string {
  return `${session.season}:${session.week}:${session.weekday}:${session.league.season_complete}`;
}

/** Playtest fast-forward must not hang on empty training slots (Training-NEXT loop). */
export function bypassTrainingNextForPlaytest(session: GameSession): GameSession {
  if (!usesTrainingNextNexus(session.storyState)) {
    return session;
  }
  return {
    ...session,
    trainingCalendarGateDone: true,
    trainingUnitsCompleted: SLOT_COUNT,
  };
}

function applyTrainingGateAndUnits(session: GameSession): {
  session: GameSession;
  blocked: boolean;
} {
  let next = bypassTrainingNextForPlaytest(session);
  if (isTrainingCalendarGatePending(next)) {
    next = { ...next, trainingCalendarGateDone: true };
  }
  let guard = 0;
  while (isTrainingNextActive(next)) {
    if (guard++ > SLOT_COUNT + 2) {
      next = bypassTrainingNextForPlaytest(next);
      break;
    }
    const before = sessionProgressKey(next);
    const step = runTrainingNextStep(next);
    if (step.toast.key === "training.next.invalidPlan") {
      return { session: next, blocked: true };
    }
    if (
      step.toast.key === "training.next.slotEmpty" ||
      sessionProgressKey(step.session) === before
    ) {
      next = bypassTrainingNextForPlaytest(next);
      break;
    }
    next = step.session;
  }
  return { session: next, blocked: false };
}

const DEFAULT_MAX_STEPS = 120;

/** Playtest: advance time until civil date reaches target month end (inclusive). */
export async function fastForwardToMonthEnd(
  sessionInput: GameSession,
  target: number | CivilDate,
  deps: FastForwardDeps,
  maxSteps = DEFAULT_MAX_STEPS,
): Promise<FastForwardResult> {
  const targetDate =
    typeof target === "number"
      ? fastForwardTargetDate(
          sessionInput.season,
          sessionInput.week,
          sessionInput.weekday,
          target,
        )
      : target;
  return fastForwardToDate(sessionInput, targetDate, deps, maxSteps);
}

export async function fastForwardToDate(
  sessionInput: GameSession,
  target: CivilDate,
  deps: FastForwardDeps,
  maxSteps = DEFAULT_MAX_STEPS,
): Promise<FastForwardResult> {

  if (
    hasReachedFastForwardTarget(
      sessionInput.season,
      sessionInput.week,
      sessionInput.weekday,
      target,
    )
  ) {
    return { session: sessionInput, steps: 0, reason: "reached" };
  }

  let session = sessionInput;
  let steps = 0;

  while (steps < maxSteps) {
    if (hasReachedFastForwardTarget(session.season, session.week, session.weekday, target)) {
      return { session, steps, reason: "reached" };
    }
    if (isCareerTransitionPending(session.storyState)) {
      return { session, steps, reason: "story_transition" };
    }
    if (deps.beforeStep) {
      session = deps.beforeStep(session);
    }

    const trainingStep = applyTrainingGateAndUnits(session);
    session = trainingStep.session;
    if (trainingStep.blocked) {
      return { session, steps, reason: "training_plan" };
    }

    const beforeKey = sessionProgressKey(session);
    const current = civilDateFromSession(session.season, session.week, session.weekday);
    const daysLeft = daysBetweenCivil(current, target);
    if (daysLeft <= 0) {
      return { session, steps, reason: "reached" };
    }

    const skip = resolveSmartSkip(session, false);

    if (skip.action === "match") {
      session = { ...session, weekday: SUNDAY, matchPlayedThisWeek: true };
      steps += 1;
      await deps.onProgress?.(session, steps);
      continue;
    }

    if (skip.action === "simulate_week") {
      if (
        isLeagueMatchWeek(session.week) &&
        !session.league.season_complete &&
        !session.matchPlayedThisWeek
      ) {
        session = { ...session, matchPlayedThisWeek: true };
      }
      session = await deps.simulateWeek(session);
      steps += 1;
      await deps.onProgress?.(session, steps);
      continue;
    }

    if (skip.action === "inbox" || skip.action === "advance") {
      const daysToSunday = session.weekday < SUNDAY ? SUNDAY - session.weekday : 0;
      const jump = Math.min(daysLeft, daysToSunday > 0 ? daysToSunday : 1);
      const targetWeekday = Math.min(SUNDAY, session.weekday + jump);
      session = deps.advanceSessionDays(session, jump, targetWeekday);
      steps += 1;
      await deps.onProgress?.(session, steps);
    }

    if (sessionProgressKey(session) === beforeKey) {
      return { session, steps, reason: "stall" };
    }
  }

  if (hasReachedFastForwardTarget(session.season, session.week, session.weekday, target)) {
    return { session, steps, reason: "reached" };
  }
  return { session, steps, reason: "limit" };
}

/** After week sim, align to Monday start-of-week UI state (matches App week advance). */
export function sessionAfterWeekSimulation(session: GameSession): GameSession {
  return {
    ...session,
    weekday: MONDAY,
    trainingUnitsCompleted: 0,
    trainingUnitOutcomes: [],
    matchPlayedThisWeek: false,
  };
}
