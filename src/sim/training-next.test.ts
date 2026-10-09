import { describe, expect, it } from "vitest";
import { clonePlayer } from "../types/__tests__/fixtures.ts";
import { fullGameStoryState, normalizeStoryState } from "../narrative/story-state.ts";
import { newGameSession } from "../persistence/game-session.ts";
import { act1AssistantTrainingPlan } from "../narrative/career-presentation.ts";
import { planToSessions } from "../development/training-units.ts";
import { applyTrainingUnit, applyTrainingWeek } from "../development/pipeline-week.ts";
import { SLOT_COUNT } from "../development/weekly-plan.ts";
import {
  isTrainingCalendarGatePending,
  isTrainingNextActive,
  runTrainingNextStep,
} from "./training-next.ts";

describe("training NEXT nexus", () => {
  it("is active for manual training careers", () => {
    const session = newGameSession();
    session.storyState = fullGameStoryState(normalizeStoryState(session.storyState, 1));
    session.trainingCalendarGateDone = true;
    expect(isTrainingNextActive(session)).toBe(true);
  });

  it("waits for calendar gate before unit NEXT", () => {
    const session = newGameSession();
    session.storyState = fullGameStoryState(normalizeStoryState(session.storyState, 1));
    session.trainingCalendarGateDone = false;
    expect(isTrainingCalendarGatePending(session)).toBe(true);
    expect(isTrainingNextActive(session)).toBe(false);
  });

  it("runs fifteen units with toasts and lands on Saturday", () => {
    const session = newGameSession();
    session.storyState = fullGameStoryState(normalizeStoryState(session.storyState, 1));
    session.trainingPlan = act1AssistantTrainingPlan();
    session.trainingUnitsCompleted = 0;
    session.trainingCalendarGateDone = true;
    let current = session;
    for (let index = 0; index < SLOT_COUNT; index++) {
      const step = runTrainingNextStep(current);
      expect(step.openTrainingScreen).toBe(false);
      current = step.session;
    }
    expect(current.trainingUnitsCompleted).toBe(SLOT_COUNT);
    expect(current.weekday).toBe(6);
    expect(current.trainingUnitOutcomes.filter(Boolean)).toHaveLength(SLOT_COUNT);
  });

  it("stores slot outcomes for the training timetable", () => {
    const session = newGameSession();
    session.storyState = fullGameStoryState(normalizeStoryState(session.storyState, 1));
    session.trainingPlan = act1AssistantTrainingPlan();
    session.trainingCalendarGateDone = true;
    const step = runTrainingNextStep(session);
    expect(step.session.trainingUnitOutcomes[0]?.slotIndex).toBe(0);
    expect(step.session.trainingUnitOutcomes[0]?.gains.length).toBeGreaterThan(0);
  });

  it("blocks NEXT when the weekly plan has too many focus slots", () => {
    const session = newGameSession();
    session.storyState = fullGameStoryState(normalizeStoryState(session.storyState, 1));
    session.trainingPlan = act1AssistantTrainingPlan();
    session.trainingPlan[0] = { ...session.trainingPlan[0]!, focus: true };
    session.trainingPlan[1] = { ...session.trainingPlan[1]!, focus: true };
    session.trainingPlan[2] = { ...session.trainingPlan[2]!, focus: true };
    const step = runTrainingNextStep(session);
    expect(step.toast.key).toBe("training.next.invalidPlan");
    expect(step.openTrainingScreen).toBe(true);
    expect(step.session.trainingUnitsCompleted).toBe(0);
  });

  it("applies meaningful growth across fifteen NEXT units", () => {
    const player = clonePlayer();
    const plan = act1AssistantTrainingPlan();
    const sessions = planToSessions(plan);
    const context = { season: 1, week: 3, masterSeed: 2026 };
    let stepped = player;
    for (let slot = 0; slot < SLOT_COUNT; slot++) {
      stepped = applyTrainingUnit(stepped, sessions, slot, context);
    }
    const steppedDelta = stepped.attributes.passing - player.attributes.passing;
    expect(steppedDelta).toBeGreaterThan(0.04);
    expect(steppedDelta).toBeLessThan(0.2);
  });
});
