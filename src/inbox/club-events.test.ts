import { describe, expect, it } from "vitest";
import { appendClubEvent, emptyClubEvents, MAX_CLUB_EVENTS, withClubEvent } from "./club-events.ts";

describe("club events", () => {
  it("prepends new events and caps the list", () => {
    let events = emptyClubEvents();
    events = withClubEvent(events, 1, 5, "transfer", "Zugang Test");
    expect(events[0]?.message).toBe("Zugang Test");
    expect(events).toHaveLength(1);

    for (let index = 0; index < MAX_CLUB_EVENTS + 5; index++) {
      events = withClubEvent(events, 1, 5, "info", `Ereignis ${index}`);
    }
    expect(events.length).toBe(MAX_CLUB_EVENTS);
    expect(events[0]?.message).toBe(`Ereignis ${MAX_CLUB_EVENTS + 4}`);
  });

  it("keeps stable ids when provided", () => {
    const events = appendClubEvent(emptyClubEvents(), {
      id: "evt_fixed",
      season: 1,
      week: 2,
      kind: "profile",
      message: "Spieler entlassen",
    });
    expect(events[0]?.id).toBe("evt_fixed");
  });
});
