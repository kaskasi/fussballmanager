import type { GameSession } from "../persistence/game-session.ts";
import type { Player } from "../types/player.ts";
import { pendingInboxItems, type YouthInboxState } from "../youth/decision-inbox.ts";
import {
  isMatchSaturday,
  MONDAY,
  SATURDAY,
  type SmartSkipTarget,
} from "../sim/day-calendar.ts";
import { isTrainingCalendarGatePending, isTrainingNextActive } from "../sim/training-next.ts";

/** Montag + offene Jugend-Inbox — NEXT öffnet Postfach (PRD 09.3). Der Treter blockiert nicht. */
export function hasInboxBlockerForNext(
  session: Pick<GameSession, "weekday">,
  youthInbox: YouthInboxState,
  players: readonly Player[],
): boolean {
  return session.weekday === MONDAY && pendingInboxItems(youthInbox, players).length > 0;
}

/** Kalender-NEXT: Spiel einleiten (Aufstellung), inkl. Fr→Sa in Spielwoche. */
export function shouldOpenLineupFromCalendar(
  skip: SmartSkipTarget,
  session: Pick<GameSession, "week" | "matchPlayedThisWeek">,
): boolean {
  if (skip.action === "match") return true;
  if (skip.action !== "advance") return false;
  if (skip.weekday !== SATURDAY) return false;
  return isMatchSaturday(session.week) && !session.matchPlayedThisWeek;
}

export function shouldNavigateToCalendarBeforeTimeStep(
  screen: string,
  inboxBlocked: boolean,
  session?: Pick<
    GameSession,
    "trainingUnitsCompleted" | "storyState" | "trainingCalendarGateDone"
  >,
): boolean {
  if (inboxBlocked) return false;
  if (session && isTrainingCalendarGatePending(session)) {
    return screen !== "calendar";
  }
  if (session && isTrainingNextActive(session)) return false;
  return screen !== "calendar";
}
