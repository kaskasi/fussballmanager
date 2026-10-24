import { describe, expect, it } from "vitest";
import { newGameSession } from "../persistence/game-session.ts";
import type { DecisionInboxItem } from "../youth/decision-inbox.ts";
import { ignoreOpenInbox } from "./ignore-open-inbox.ts";

function item(id: string, kind: DecisionInboxItem["kind"]): DecisionInboxItem {
  return { id, playerId: "", kind, week: 1, urgency: "now", reason: "test" };
}

describe("ignoreOpenInbox", () => {
  it("dismisses routine items but leaves departure risks open", () => {
    const session = newGameSession();
    const withItems = {
      ...session,
      youthInbox: {
        ...session.youthInbox,
        items: [item("kicker", "kicker_transfer"), item("risk", "departure_risk")],
      },
    };
    const next = ignoreOpenInbox(withItems);
    expect(next.youthInbox.resolvedIds).toContain("kicker");
    expect(next.youthInbox.resolvedIds).not.toContain("risk");
  });
});
