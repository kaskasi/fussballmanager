import type { GameSession } from "../persistence/game-session.ts";
import type { Player } from "../types/player.ts";
import { pendingInboxItems, type YouthInboxState } from "../youth/decision-inbox.ts";
import { isMatchSaturday, SATURDAY, type SmartSkipTarget } from "../sim/day-calendar.ts";
import { MANAGER_DESK_HUB_ENABLED } from "../hub/config.ts";
import { isTrainingCalendarGatePending, isTrainingNextActive } from "../sim/training-next.ts";

/** Open Postfach decisions that block week progress — not Der Treter (handled on NEXT). */
export function pendingDecisionInboxItems(
  youthInbox: YouthInboxState,
  players?: readonly Player[],
) {
  return pendingInboxItems(youthInbox, players).filter((item) => item.kind !== "kicker_transfer");
}

/** Offene Jugend-Inbox blockiert NEXT (jeder Wochentag). Der Treter blockiert nicht. */
export function hasInboxBlockerForNext(
  _session: Pick<GameSession, "weekday">,
  youthInbox: YouthInboxState,
  players: readonly Player[],
): boolean {
  return pendingDecisionInboxItems(youthInbox, players).length > 0;
}

/** Kalender-NEXT: Spiel einleiten (Aufstellung), inkl. Fr→Sa in Spielwoche. */
export function shouldOpenLineupFromCalendar(
  skip: SmartSkipTarget,
  session: Pick<GameSession, "week" | "matchPlayedThisWeek" | "league">,
): boolean {
  if (session.league.season_complete) return false;
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
    "trainingUnitsCompleted" | "storyState" | "trainingCalendarGateDone" | "league"
  >,
): boolean {
  if (inboxBlocked) return false;
  if (MANAGER_DESK_HUB_ENABLED && screen === "hub") {
    return false;
  }
  if (session && isTrainingCalendarGatePending(session)) {
    return screen !== "calendar";
  }
  if (session && isTrainingNextActive(session)) return false;
  return screen !== "calendar";
}
