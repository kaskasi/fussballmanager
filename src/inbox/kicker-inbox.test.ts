import { describe, expect, it } from "vitest";
import {
  applyWeeklyKickerDelivery,
  hasOpenKickerItem,
  injectKickerInbox,
  kickerItemId,
  KICKER_DELIVERY_WEEKDAY,
  shouldDeliverWeeklyKicker,
} from "./kicker-inbox.ts";
import { newGameSession } from "../persistence/game-session.ts";
import { emptyInbox } from "../youth/decision-inbox.ts";

describe("kicker-inbox", () => {
  it("delivers on Thursday when not consumed and no open item", () => {
    expect(
      shouldDeliverWeeklyKicker({
        session: {
          season: 1,
          week: 3,
          weekday: KICKER_DELIVERY_WEEKDAY,
          kickerConsumedWeek: undefined,
        },
        inbox: emptyInbox(3),
        targetWeekday: KICKER_DELIVERY_WEEKDAY,
      }),
    ).toBe(true);
  });

  it("skips when already consumed this week", () => {
    expect(
      shouldDeliverWeeklyKicker({
        session: {
          season: 1,
          week: 3,
          weekday: KICKER_DELIVERY_WEEKDAY,
          kickerConsumedWeek: { season: 1, week: 3 },
        },
        inbox: emptyInbox(3),
        targetWeekday: KICKER_DELIVERY_WEEKDAY,
      }),
    ).toBe(false);
  });

  it("applyWeeklyKickerDelivery injects on delivery weekday", () => {
    const session = newGameSession();
    session.weekday = KICKER_DELIVERY_WEEKDAY;
    const next = applyWeeklyKickerDelivery(session);
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
