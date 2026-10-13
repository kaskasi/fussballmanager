import type { GameSession } from "../persistence/game-session.ts";
import type { KickerEdition } from "../media/kicker-digest.ts";
import { buildTreterEdition } from "../media/kicker-digest.ts";
import type { DecisionInboxItem, YouthInboxState } from "../youth/decision-inbox.ts";
import { archiveKickerEdition } from "./kicker-edition-archive.ts";

/** Der Treter / weekly kicker inbox item — delivered on Thursday (PRD 09 hub desk). */
export const KICKER_DELIVERY_WEEKDAY = 4;

/** @deprecated use KICKER_DELIVERY_WEEKDAY */
export const TUESDAY = KICKER_DELIVERY_WEEKDAY;

export function kickerItemId(season: number, week: number): string {
  return `kicker-${season}-${week}`;
}

export function parseKickerItemId(id: string): { season: number; week: number } | null {
  const match = /^kicker-(\d+)-(\d+)$/.exec(id);
  if (!match) return null;
  return { season: Number(match[1]), week: Number(match[2]) };
}

export function kickerConsumedForWeek(
  session: Pick<GameSession, "season" | "week" | "kickerConsumedWeek">,
): boolean {
  const stamp = session.kickerConsumedWeek;
  return stamp != null && stamp.season === session.season && stamp.week === session.week;
}

export function hasOpenKickerItem(
  inbox: YouthInboxState,
  season: number,
  week: number,
): boolean {
  const id = kickerItemId(season, week);
  return inbox.items.some((item) => item.id === id && !inbox.resolvedIds.includes(item.id));
}

export function shouldDeliverWeeklyKicker(input: {
  session: Pick<GameSession, "season" | "week" | "weekday" | "kickerConsumedWeek">;
  inbox: YouthInboxState;
  targetWeekday: number;
}): boolean {
  if (input.targetWeekday !== KICKER_DELIVERY_WEEKDAY) return false;
  if (kickerConsumedForWeek(input.session)) return false;
  if (hasOpenKickerItem(input.inbox, input.session.season, input.session.week)) return false;
  return true;
}

/** @deprecated use shouldDeliverWeeklyKicker */
export const shouldDeliverKickerOnTuesday = shouldDeliverWeeklyKicker;

export function createKickerInboxItem(season: number, week: number): DecisionInboxItem {
  return {
    id: kickerItemId(season, week),
    playerId: "",
    kind: "kicker_transfer",
    week,
    urgency: "now",
    reason: "kicker_weekly",
  };
}

export function injectKickerInbox(inbox: YouthInboxState, season: number, week: number): YouthInboxState {
  const item = createKickerInboxItem(season, week);
  if (inbox.items.some((entry) => entry.id === item.id)) {
    return inbox;
  }
  return { ...inbox, items: [...inbox.items, item] };
}

export function buildSessionKickerEdition(session: GameSession): KickerEdition {
  return buildTreterEdition(session);
}

/** Inject Kicker edition + inbox item on delivery weekday (idempotent). */
export function applyWeeklyKickerDelivery(session: GameSession): GameSession {
  if (
    !shouldDeliverWeeklyKicker({
      session,
      inbox: session.youthInbox,
      targetWeekday: KICKER_DELIVERY_WEEKDAY,
    })
  ) {
    return session;
  }
  const edition = buildSessionKickerEdition(session);
  return {
    ...session,
    youthInbox: injectKickerInbox(session.youthInbox, session.season, session.week),
    kickerEdition: edition,
    kickerEditionArchive: archiveKickerEdition(session.kickerEditionArchive ?? [], edition),
  };
}

/** @deprecated use applyWeeklyKickerDelivery */
export const applyTuesdayKickerDelivery = applyWeeklyKickerDelivery;

export function weeklyKickerBlocksProgress(
  session: Pick<GameSession, "weekday" | "season" | "week" | "kickerConsumedWeek">,
  inbox: YouthInboxState,
): boolean {
  if (session.weekday !== KICKER_DELIVERY_WEEKDAY) return false;
  if (kickerConsumedForWeek(session)) return false;
  return hasOpenKickerItem(inbox, session.season, session.week);
}

/** @deprecated use weeklyKickerBlocksProgress */
export const tuesdayKickerBlocksProgress = weeklyKickerBlocksProgress;
