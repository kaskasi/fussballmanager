import { KICKER_DELIVERY_WEEKDAY, shouldDeliverWeeklyKicker } from "../inbox/kicker-inbox.ts";
import type { GameSession } from "../persistence/game-session.ts";
import type { Player } from "../types/player.ts";
import { pendingInboxItems, type YouthInboxState } from "../youth/decision-inbox.ts";
import { MANAGER_DESK_HUB_ENABLED } from "../hub/config.ts";
import { hasInboxBlockerForNext } from "../ui/nav-next-flow.ts";
import { resolveSmartSkip } from "./day-calendar.ts";
import {
  isTrainingCalendarGatePending,
  isTrainingNextActive,
  runTrainingNextStep,
} from "./training-next.ts";

export const TRAINING_AUTO_NEXT_INTERVAL_MS = 2000;

export function shouldPauseTrainingAutoNext(input: {
  session: GameSession;
  youthInbox: YouthInboxState;
  players: readonly Player[];
  screen: string;
  simulating: boolean;
  careerMatchActive: boolean;
}): boolean {
  if (input.simulating || input.careerMatchActive) return true;
  if (MANAGER_DESK_HUB_ENABLED) {
    if (input.screen !== "training" && input.screen !== "hub") return true;
  } else if (input.screen !== "training") {
    return true;
  }
  if (hasInboxBlockerForNext(input.session, input.youthInbox, input.players)) return true;
  if (isTrainingCalendarGatePending(input.session)) return true;

  if (isTrainingNextActive(input.session)) {
    const preview = runTrainingNextStep(input.session);
    if (
      preview.toast.key === "training.next.invalidPlan" ||
      preview.toast.key === "training.next.slotEmpty"
    ) {
      return true;
    }
  }

  const hasInbox = pendingInboxItems(input.youthInbox, input.players).length > 0;
  const skip = resolveSmartSkip(input.session, hasInbox);
  if (skip.action === "inbox" || skip.action === "match" || skip.action === "simulate_week") {
    return true;
  }

  if (
    skip.action === "advance" &&
    skip.weekday === KICKER_DELIVERY_WEEKDAY &&
    shouldDeliverWeeklyKicker({
      session: { ...input.session, weekday: KICKER_DELIVERY_WEEKDAY },
      inbox: input.youthInbox,
      targetWeekday: KICKER_DELIVERY_WEEKDAY,
    })
  ) {
    return true;
  }

  return false;
}
