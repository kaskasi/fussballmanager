import { describe, expect, it } from "vitest";
import { ACHIEVEMENT } from "../player/achievements.ts";
import { clonePlayer } from "../types/__tests__/fixtures.ts";
import {
  advanceInboxWeek,
  applyInboxDecision,
  generateWeeklyInbox,
  inboxSummary,
  MAX_INBOX_ITEMS,
  pendingInboxItems,
  type YouthInboxState,
} from "./decision-inbox.ts";

function youthPlayer(id: string, age: number, status: "u17" | "u19" = "u17") {
  const player = clonePlayer();
  player.id = id;
  player.age = age;
  player.squad_status = status;
  player.contract = null;
  return player;
}

describe("decision inbox", () => {
  it("caps the weekly queue at four items", () => {
    const players = Array.from({ length: 24 }, (_, index) => youthPlayer(`pl_${index}`, 15 + (index % 3)));
    const inbox = generateWeeklyInbox(players, 34, 2026);
    expect(inbox.items.length).toBeLessThanOrEqual(MAX_INBOX_ITEMS);
    expect(inbox.items.length).toBeGreaterThan(0);
  });

  it("prioritises departure risks in the queue", () => {
    const players = [
      youthPlayer("pl_focus", 15),
      youthPlayer("pl_dep", 17),
      youthPlayer("pl_promo", 15),
    ];
    players[2]!.attributes.passing = 120;
    const inbox = generateWeeklyInbox(players, 40, 99_001);
    const departureIndex = inbox.items.findIndex((item) => item.kind === "departure_risk");
    if (departureIndex >= 0) {
      expect(departureIndex).toBeLessThan(inbox.items.length);
    }
  });

  it("applies a promotion decision to U19 players into the pro squad", () => {
    const player = youthPlayer("pl_pro", 18, "u19");
    const inbox: YouthInboxState = {
      week: 34,
      items: [
        {
          id: "pro1_pl_pro_34",
          playerId: player.id,
          kind: "promotion",
          week: 34,
          urgency: "now",
          reason: "ready_for_pro",
        },
      ],
      resolvedIds: [],
      overflowDropped: 0,
      coachIcons: { [player.id]: "🚀" },
      lastReport: null,
    };
    const result = applyInboxDecision(inbox, [player], "pro1_pl_pro_34", "promote", 1);
    expect(result.players[0]?.squad_status).toBe("pro");
    expect(result.players[0]?.history.achievements).toContain(ACHIEVEMENT.promotedPro);
  });

  it("applies a promotion decision to U17 players", () => {
    const player = youthPlayer("pl_promo", 16);
    const inbox: YouthInboxState = {
      week: 34,
      items: [
        {
          id: "pro_pl_promo_34",
          playerId: player.id,
          kind: "promotion",
          week: 34,
          urgency: "now",
          reason: "ready_for_u19",
        },
      ],
      resolvedIds: [],
      overflowDropped: 0,
      coachIcons: { [player.id]: "🚀" },
      lastReport: null,
    };
    const result = applyInboxDecision(inbox, [player], "pro_pl_promo_34", "promote", 1);
    expect(result.players[0]?.squad_status).toBe("u19");
    expect(result.players[0]?.history.achievements).toContain(ACHIEVEMENT.promotedU19);
    expect(pendingInboxItems(result.inbox)).toHaveLength(0);
  });

  it("drops players who ignore a departure warning", () => {
    const player = youthPlayer("pl_leave", 17);
    const inbox: YouthInboxState = {
      week: 34,
      items: [
        {
          id: "dep_pl_leave_34",
          playerId: player.id,
          kind: "departure_risk",
          week: 34,
          urgency: "now",
          reason: "no_game_time",
        },
      ],
      resolvedIds: [],
      overflowDropped: 0,
      coachIcons: {},
      lastReport: null,
    };
    const advanced = advanceInboxWeek(inbox, [player], 35, 2026);
    expect(advanced.lostPlayerIds).toEqual([player.id]);
    expect(advanced.players).toHaveLength(0);
    expect(advanced.inbox.week).toBe(35);
  });

  it("summarises open recommendations and departure risks", () => {
    const inbox: YouthInboxState = {
      week: 34,
      items: [
        {
          id: "a",
          playerId: "p1",
          kind: "departure_risk",
          week: 34,
          urgency: "now",
          reason: "no_game_time",
        },
        {
          id: "b",
          playerId: "p2",
          kind: "promotion",
          week: 34,
          urgency: "now",
          reason: "ready_for_u19",
        },
      ],
      resolvedIds: [],
      overflowDropped: 2,
      coachIcons: {},
      lastReport: null,
    };
    expect(inboxSummary(inbox)).toEqual({
      pending: 2,
      recommendations: 1,
      departureRisks: 1,
      overflowDropped: 2,
    });
  });
});
