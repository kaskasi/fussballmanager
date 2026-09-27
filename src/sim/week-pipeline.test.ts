import { describe, expect, it } from "vitest";
import { appendBreakoutNarrativesToEvents } from "./week-pipeline.ts";

describe("week pipeline breakout narratives", () => {
  it("publishes visible player arcs to the club feed", () => {
    const events = appendBreakoutNarrativesToEvents(
      [],
      [{
        playerId: "pl_00042",
        eventId: "late_bloomer_kick",
        narrative: "Max wirkt wie ausgewechselt.",
        week: 12,
      }],
      2,
      12,
    );

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      season: 2,
      week: 12,
      kind: "profile",
      message: "💡 Max wirkt wie ausgewechselt.",
    });
  });
});
