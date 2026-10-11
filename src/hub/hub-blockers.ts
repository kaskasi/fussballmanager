import { validateWeeklyPlan } from "../development/weekly-plan.ts";
import { planToSessions } from "../development/training-units.ts";
import type { GameSession } from "../persistence/game-session.ts";
import type { Player } from "../types/player.ts";
import { pendingInboxItems, type YouthInboxState } from "../youth/decision-inbox.ts";
import { hasInboxBlockerForNext } from "../ui/nav-next-flow.ts";
import {
  isTrainingCalendarGatePending,
  isTrainingNextActive,
  runTrainingNextStep,
} from "../sim/training-next.ts";
import { resolveHubCommerceFocus } from "./hub-finance-merch.ts";
import { boardCashFloor } from "../economy/spend-runway.ts";

export type HubBlockerKind =
  | "inbox"
  | "training_plan"
  | "training_slot"
  | "finance"
  | "merch";

export interface HubBlocker {
  kind: HubBlockerKind;
  id: string;
  priority: number;
}

export function listHubBlockers(input: {
  session: GameSession;
  youthInbox: YouthInboxState;
  players: readonly Player[];
}): HubBlocker[] {
  const { session, youthInbox, players } = input;
  const blockers: HubBlocker[] = [];

  if (hasInboxBlockerForNext(session, youthInbox, players)) {
    blockers.push({ kind: "inbox", id: "inbox_monday", priority: 0 });
  }

  const planCheck = validateWeeklyPlan(planToSessions(session.trainingPlan));
  if (!planCheck.valid && !isTrainingCalendarGatePending(session)) {
    blockers.push({ kind: "training_plan", id: "training_plan_invalid", priority: 1 });
  }

  if (isTrainingNextActive(session)) {
    const preview = runTrainingNextStep(session);
    if (
      preview.toast.key === "training.next.invalidPlan" ||
      preview.toast.key === "training.next.slotEmpty"
    ) {
      blockers.push({
        kind: preview.toast.key === "training.next.slotEmpty" ? "training_slot" : "training_plan",
        id: preview.toast.key,
        priority: 1,
      });
    }
  }

  const floor = boardCashFloor(session.board);
  if (session.finances.cash < floor) {
    blockers.push({ kind: "finance", id: "cash_below_floor", priority: 2 });
  }

  const commerce = resolveHubCommerceFocus(session.finances, session.board, session.stadium);
  if (commerce.mode === "merchandising" && commerce.merchAlerts.some((a) => a.stock <= 0)) {
    blockers.push({ kind: "merch", id: "merch_out_of_stock", priority: 3 });
  }

  return blockers.sort((a, b) => a.priority - b.priority);
}

export function hubBlockerCount(input: {
  session: GameSession;
  youthInbox: YouthInboxState;
  players: readonly Player[];
}): number {
  return listHubBlockers(input).length;
}
