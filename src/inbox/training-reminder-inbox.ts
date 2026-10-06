import type { GameSession } from "../persistence/game-session.ts";
import type { TrainingSlot } from "../development/training-units.ts";
import {
  isTrainingSlotConfigured,
  isTrainingWeekday,
} from "../development/training-plan-state.ts";
import type { AssistantDelegation } from "../staff/assistant-delegation.ts";
import type { DecisionInboxItem, YouthInboxState } from "../youth/decision-inbox.ts";

export function trainingReminderItemId(season: number, week: number): string {
  return `training-reminder-${season}-${week}`;
}

export function trainingReminderConsumedForWeek(
  session: Pick<GameSession, "season" | "week" | "trainingReminderWeek">,
): boolean {
  const stamp = session.trainingReminderWeek;
  return stamp != null && stamp.season === session.season && stamp.week === session.week;
}

export function shouldInjectTrainingReminderBeforeAdvance(input: {
  delegation: AssistantDelegation;
  trainingPlan: readonly TrainingSlot[];
  youthInbox: YouthInboxState;
  session: Pick<GameSession, "season" | "week" | "weekday" | "trainingReminderWeek">;
}): boolean {
  if (!input.delegation.training) return false;
  if (!isTrainingWeekday(input.session.weekday)) return false;
  if (isTrainingSlotConfigured(input.trainingPlan, input.session.weekday)) return false;
  if (trainingReminderConsumedForWeek(input.session)) return false;
  const id = trainingReminderItemId(input.session.season, input.session.week);
  if (
    input.youthInbox.items.some(
      (item) => item.id === id && !input.youthInbox.resolvedIds.includes(item.id),
    )
  ) {
    return false;
  }
  return true;
}

export function createTrainingReminderInboxItem(
  season: number,
  week: number,
): DecisionInboxItem {
  return {
    id: trainingReminderItemId(season, week),
    playerId: "",
    kind: "assistant_training_reminder",
    week,
    urgency: "now",
    reason: "training_plan_missing",
  };
}

export function injectTrainingReminderInbox(
  inbox: YouthInboxState,
  season: number,
  week: number,
): YouthInboxState {
  const item = createTrainingReminderInboxItem(season, week);
  if (inbox.items.some((entry) => entry.id === item.id)) {
    return inbox;
  }
  return { ...inbox, items: [...inbox.items, item] };
}
