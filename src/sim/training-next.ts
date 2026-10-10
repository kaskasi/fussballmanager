import { environmentFromCoachingStaff } from "../staff/coaching-staff.ts";
import { precinctTrainingEnvironment } from "../stadium/precinct-effects.ts";
import { applyTrainingUnit } from "../development/pipeline-week.ts";
import { ensureTrainingWeekBaselines } from "../player/growth-history.ts";
import {
  collectTrainingUnitGains,
  formatTrainingDelta,
  highlightTrainingUnitResult,
  type TrainingSlotOutcome,
} from "../development/training-unit-result.ts";
import {
  isTrainingSlotEmpty,
  planToSessions,
  slotLabel,
  slotPeriodLabel,
  trainingSlotWeekday,
  trainingUnit,
  type TrainingSlot,
} from "../development/training-units.ts";
import { resolveFeatureCurtain } from "../narrative/career-presentation.ts";
import type { StoryState } from "../narrative/story-state.ts";
import type { GameSession } from "../persistence/game-session.ts";
import { SATURDAY } from "./day-calendar.ts";
import { SLOT_COUNT, validateWeeklyPlan } from "../development/weekly-plan.ts";

export function usesTrainingNextNexus(storyState: StoryState): boolean {
  return !resolveFeatureCurtain(storyState).auto_training;
}

export function trainingWeekSlotsRemaining(
  session: Pick<GameSession, "trainingUnitsCompleted">,
): number {
  return Math.max(0, SLOT_COUNT - session.trainingUnitsCompleted);
}

export function isTrainingCalendarGatePending(
  session: Pick<
    GameSession,
    "storyState" | "trainingUnitsCompleted" | "trainingCalendarGateDone"
  >,
): boolean {
  if (!usesTrainingNextNexus(session.storyState)) return false;
  if (session.trainingUnitsCompleted > 0) return false;
  return session.trainingCalendarGateDone === false;
}

export function isTrainingNextActive(
  session: Pick<
    GameSession,
    "trainingUnitsCompleted" | "storyState" | "trainingCalendarGateDone"
  >,
): boolean {
  if (isTrainingCalendarGatePending(session)) return false;
  return usesTrainingNextNexus(session.storyState) && session.trainingUnitsCompleted < SLOT_COUNT;
}

export function buildTrainingWeekContext(session: GameSession) {
  const leagueMatchdaysPlayed = Math.max(0, session.league.matchday - 1);
  return {
    season: session.season,
    week: session.week,
    masterSeed: session.masterSeed,
    intensity: session.trainingIntensity,
    leagueMatchdaysPlayed,
    environmentFactor:
      environmentFromCoachingStaff(session.coachingStaff) *
      precinctTrainingEnvironment(session.stadium.precinct),
  };
}

export interface TrainingNextStepResult {
  session: GameSession;
  /** i18n key + params for flash toast */
  toast:
    | { key: "training.next.unitResult"; params: Record<string, string> }
    | { key: "training.next.unitResultQuiet"; params: Record<string, string> }
    | { key: "training.next.slotEmpty"; params?: Record<string, string> }
    | { key: "training.next.invalidPlan" };
  openTrainingScreen: boolean;
}

function slotAt(plan: readonly TrainingSlot[], index: number): TrainingSlot | undefined {
  return plan[index];
}

export function runTrainingNextStep(session: GameSession): TrainingNextStepResult {
  const weekSessions = planToSessions(session.trainingPlan);
  const planCheck = validateWeeklyPlan(weekSessions);
  if (!planCheck.valid) {
    return {
      session,
      toast: { key: "training.next.invalidPlan" },
      openTrainingScreen: true,
    };
  }

  const slotIndex = session.trainingUnitsCompleted;
  const slot = slotAt(session.trainingPlan, slotIndex);
  const day = slotLabel(slotIndex);
  const period = slotPeriodLabel(slotIndex);

  if (!slot || isTrainingSlotEmpty(slot)) {
    return {
      session,
      toast: { key: "training.next.slotEmpty", params: { day, period } },
      openTrainingScreen: true,
    };
  }

  const unit = trainingUnit(slot.unitId);
  const context = buildTrainingWeekContext(session);
  const playersBefore = ensureTrainingWeekBaselines(
    session.players,
    session.season,
    session.week,
  );
  const playersAfter = playersBefore.map((player) =>
    applyTrainingUnit(player, weekSessions, slotIndex, context, unit),
  );
  const highlight = highlightTrainingUnitResult(playersBefore, playersAfter, unit);
  const gains = collectTrainingUnitGains(playersBefore, playersAfter, unit);
  const completed = slotIndex + 1;
  const weekday =
    completed >= SLOT_COUNT ? SATURDAY : trainingSlotWeekday(completed);

  const nextOutcomes: (TrainingSlotOutcome | null)[] = [
    ...(session.trainingUnitOutcomes ?? []),
  ];
  while (nextOutcomes.length < SLOT_COUNT) nextOutcomes.push(null);
  nextOutcomes[slotIndex] = {
    slotIndex,
    unitId: slot.unitId,
    highlight,
    gains,
  };

  const nextSession: GameSession = {
    ...session,
    players: playersAfter,
    trainingUnitsCompleted: completed,
    trainingUnitOutcomes: nextOutcomes,
    weekday,
  };

  const toastParams: Record<string, string> = {
    day,
    period,
    unit: unit.label,
  };
  const toastKey = highlight
    ? "training.next.unitResult"
    : "training.next.unitResultQuiet";
  if (highlight) {
    toastParams.player = highlight.playerName;
    toastParams.attribute =
      highlight.metric === "fitness" ? "Fitness" : String(highlight.metric);
    toastParams.delta = formatTrainingDelta(highlight.delta);
  }

  return {
    session: nextSession,
    toast: { key: toastKey, params: toastParams },
    openTrainingScreen: false,
  };
}
