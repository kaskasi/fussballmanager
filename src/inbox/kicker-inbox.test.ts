import { describe, expect, it } from "vitest";
import {
  applyTuesdayKickerDelivery,
  hasOpenKickerItem,
  injectKickerInbox,
  kickerItemId,
  shouldDeliverKickerOnTuesday,
  TUESDAY,
} from "./kicker-inbox.ts";
import { newGameSession } from "../persistence/game-session.ts";
import { emptyInbox } from "../youth/decision-inbox.ts";

describe("kicker-inbox", () => {
  it("delivers on Tuesday when not consumed and no open item", () => {
    expect(
      shouldDeliverKickerOnTuesday({
        session: { season: 1, week: 3, weekday: TUESDAY, kickerConsumedWeek: undefined },
        inbox: emptyInbox(3),
        targetWeekday: TUESDAY,
      }),
    ).toBe(true);
  });

  it("skips when already consumed this week", () => {
    expect(
      shouldDeliverKickerOnTuesday({
        session: {
          season: 1,
          week: 3,
          weekday: TUESDAY,
          kickerConsumedWeek: { season: 1, week: 3 },
        },
        inbox: emptyInbox(3),
        targetWeekday: TUESDAY,
      }),
    ).toBe(false);
  });

  it("applyTuesdayKickerDelivery injects on Tuesday", () => {
    const session = newGameSession();
    session.weekday = TUESDAY;
    const next = applyTuesdayKickerDelivery(session);
    expect(hasOpenKickerItem(next.youthInbox, next.season, next.week)).toBe(true);
    expect(next.kickerEdition).toBeDefined();
    expect(next.kickerEditionArchive.some((entry) => entry.week === next.week)).toBe(true);
  });

  it("injectKickerInbox is idempotent", () => {
    const once = injectKickerInbox(emptyInbox(3), 1, 3);
    const twice = injectKickerInbox(once, 1, 3);
    expect(once.items.some((item) => item.id === kickerItemId(1, 3))).toBe(true);
    expect(twice.items.filter((item) => item.id === kickerItemId(1, 3))).toHaveLength(1);
  });
});
