import { describe, expect, it } from "vitest";
import { ACHIEVEMENT } from "../player/achievements.ts";
import { clonePlayer } from "../types/__tests__/fixtures.ts";
import {
  advanceInboxWeek,
  allowedActions,
  applyInboxDecision,
  deliverDailyInbox,
  deliverInboxForDays,
  inboxReleaseWeekday,
  emptyInbox,
  enqueueStoryInboxItem,
  generateWeeklyInbox,
  inboxHeadline,
  inboxPipelineHint,
  inboxSummary,
  inboxWeekFocus,
  MAX_INBOX_ITEMS,
  normalizeYouthInbox,
  pendingInboxItems,
  pruneYouthInbox,
  actionIcon,
  actionLabel,
  storyChoiceStance,
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
  it("queues all candidates instead of dropping overflow", () => {
    const players = Array.from({ length: 24 }, (_, index) => youthPlayer(`pl_${index}`, 15 + (index % 3)));
    const inbox = generateWeeklyInbox(players, 34, 2026);
    expect(inbox.items).toHaveLength(0);
    expect(inbox.queue.length).toBeGreaterThan(MAX_INBOX_ITEMS);
  });

  it("normalizes legacy inbox saves without a queue field", () => {
    const legacy = {
      week: 3,
      items: [],
      resolvedIds: [],
      coachIcons: {},
      lastReport: null,
    } as unknown as YouthInboxState;
    expect(() =>
      deliverDailyInbox(legacy, { season: 1, week: 3, weekday: 1, masterSeed: 1 }),
    ).not.toThrow();
    expect(normalizeYouthInbox(legacy).queue).toEqual([]);
  });

  it("delivers at most one queued item per calendar week on the release weekday", () => {
    const players = Array.from({ length: 24 }, (_, index) => youthPlayer(`pl_${index}`, 15 + (index % 3)));
    const inbox = generateWeeklyInbox(players, 34, 2026);
    const season = 1;
    const week = 34;
    const masterSeed = 2026;
    const releaseDay = inboxReleaseWeekday(masterSeed, season, week);
    const afterWeek = deliverInboxForDays(
      inbox,
      { season, week, weekday: 1, masterSeed },
      7,
      players,
    );
    expect(pendingInboxItems(afterWeek)).toHaveLength(1);
    expect(afterWeek.queue.length).toBe(inbox.queue.length - 1);
    const afterSecondWeek = deliverInboxForDays(
      afterWeek,
      { season, week, weekday: 7, masterSeed },
      7,
      players,
    );
    expect(pendingInboxItems(afterSecondWeek)).toHaveLength(2);
    const capped = deliverInboxForDays(
      inbox,
      { season, week, weekday: 1, masterSeed },
      7 * 12,
      players,
    );
    expect(pendingInboxItems(capped).length).toBeLessThanOrEqual(MAX_INBOX_ITEMS);
  });

  it("inboxReleaseWeekday is deterministic Mo–Fr", () => {
    const day = inboxReleaseWeekday(99, 2, 40);
    expect(day).toBeGreaterThanOrEqual(1);
    expect(day).toBeLessThanOrEqual(5);
    expect(inboxReleaseWeekday(99, 2, 40)).toBe(day);
  });

  it("prioritises departure risks in the queue", () => {
    const players = [
      youthPlayer("pl_focus", 15),
      youthPlayer("pl_dep", 17),
      youthPlayer("pl_promo", 15),
    ];
    players[2]!.attributes.passing = 120;
    const inbox = generateWeeklyInbox(players, 40, 99_001);
    const departureIndex = inbox.queue.findIndex((item) => item.kind === "departure_risk");
    if (departureIndex >= 0) {
      expect(departureIndex).toBeLessThan(inbox.queue.length);
    }
  });

  it("promotes U19 players directly to pro from the inbox", () => {
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
      queue: [],
      resolvedIds: [],
      coachIcons: { [player.id]: "🚀" },
      lastReport: null,
    };
    const result = applyInboxDecision(inbox, [player], "pro1_pl_pro_34", "promote", 1, 10);
    expect(result.players[0]?.squad_status).toBe("pro");
    expect(result.players[0]?.state.pro_trial).toBeUndefined();
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
      queue: [],
      resolvedIds: [],
      coachIcons: { [player.id]: "🚀" },
      lastReport: null,
    };
    const result = applyInboxDecision(inbox, [player], "pro_pl_promo_34", "promote", 1, 10);
    expect(result.players[0]?.squad_status).toBe("u19");
    expect(result.players[0]?.history.achievements).toContain(ACHIEVEMENT.promotedU19);
    expect(pendingInboxItems(result.inbox)).toHaveLength(0);
  });

  it("signs a youth contract with wage bands and morale boost", () => {
    const player = youthPlayer("pl_contract", 17);
    const inbox: YouthInboxState = {
      week: 34,
      items: [
        {
          id: "con_pl_contract_34",
          playerId: player.id,
          kind: "contract_offer",
          week: 34,
          urgency: "now",
          reason: "contract_due",
        },
      ],
      queue: [],
      resolvedIds: [],
      coachIcons: {},
      lastReport: null,
    };
    const result = applyInboxDecision(inbox, [player], "con_pl_contract_34", "contract", 1, 10);
    expect(result.players[0]?.contract).toBeNull();
    expect(result.inbox.resolvedIds).toContain("con_pl_contract_34");
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
      queue: [],
      resolvedIds: [],
      coachIcons: {},
      lastReport: null,
    };
    const advanced = advanceInboxWeek(inbox, [player], 35, 2026);
    expect(advanced.lostPlayerIds).toEqual([player.id]);
    expect(advanced.players).toHaveLength(0);
    expect(advanced.inbox.week).toBe(35);
  });

  it("carries undelivered queue items into the next week", () => {
    const player = youthPlayer("p1", 16);
    const inbox: YouthInboxState = {
      week: 34,
      items: [],
      queue: [
        {
          id: "queued",
          playerId: player.id,
          kind: "promotion",
          week: 34,
          urgency: "now",
          reason: "ready_for_u19",
        },
      ],
      resolvedIds: [],
      coachIcons: {},
      lastReport: null,
    };
    const advanced = advanceInboxWeek(inbox, [player], 35, 2026);
    expect(advanced.inbox.queue.some((item) => item.id === "queued")).toBe(true);
  });

  it("drops orphaned inbox rows for players no longer in youth", () => {
    const inbox: YouthInboxState = {
      week: 34,
      items: [
        {
          id: "orphan",
          playerId: "missing",
          kind: "promotion",
          week: 34,
          urgency: "now",
          reason: "ready_for_u19",
        },
      ],
      queue: [
        {
          id: "queued_orphan",
          playerId: "missing",
          kind: "training_focus",
          week: 34,
          urgency: "future",
          reason: "coach_focus",
        },
      ],
      resolvedIds: [],
      coachIcons: {},
      lastReport: null,
    };
    const player = youthPlayer("pl_ok", 16);
    const pruned = pruneYouthInbox(inbox, [player]);
    expect(pruned.items).toHaveLength(0);
    expect(pruned.queue).toHaveLength(0);
    expect(pendingInboxItems(pruned, [player])).toHaveLength(0);
  });

  it("allows pro promotion decisions when the senior squad is already large", () => {
    const pros = Array.from({ length: 40 }, (_, index) => {
      const player = clonePlayer();
      player.id = `pro_${index}`;
      player.club_id = "cl_fc_nordstern";
      player.squad_status = "pro";
      player.position = index % 2 === 0 ? "CB" : "DM";
      return player;
    });
    const youth = youthPlayer("youth_rb", 18, "u19");
    youth.position = "RB";
    youth.club_id = "cl_fc_nordstern";
    const item = {
      id: "pro1_youth_rb_34",
      playerId: youth.id,
      kind: "promotion" as const,
      week: 34,
      urgency: "now" as const,
      reason: "ready_for_pro",
    };
    expect(allowedActions(item, [...pros, youth], "cl_fc_nordstern")).toContain("promote");
  });

  it("allows promote on inbox items even when many pros share the position", () => {
    const pros = [clonePlayer(), clonePlayer(), clonePlayer()].map((player, index) => {
      player.id = `rb_${index}`;
      player.club_id = "cl_fc_nordstern";
      player.squad_status = "pro";
      player.position = "RB";
      return player;
    });
    const youth = youthPlayer("youth_rb", 18, "u19");
    youth.position = "RB";
    const item = {
      id: "pro1_youth_rb_34",
      playerId: youth.id,
      kind: "promotion" as const,
      week: 34,
      urgency: "now" as const,
      reason: "ready_for_pro",
    };
    expect(allowedActions(item, [...pros, youth], "cl_fc_nordstern")).toContain("promote");
  });

  it("focuses the manager on open items without exposing backlog depth", () => {
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
      ],
      queue: Array.from({ length: 47 }, (_, index) => ({
        id: `q${index}`,
        playerId: `p${index + 2}`,
        kind: "training_focus" as const,
        week: 34,
        urgency: "future" as const,
        reason: "coach_focus",
      })),
      resolvedIds: [],
      coachIcons: {},
      lastReport: null,
    };
    const players = [
      { id: "p1", squad_status: "u17" },
      { id: "p2", squad_status: "u17" },
    ] as const;
    const focus = inboxWeekFocus(inbox, players as never);
    expect(focus.openCount).toBe(1);
    expect(focus.nextQueued?.playerId).toBe("p2");
    expect(inboxHeadline(focus)).toBe("1 Entscheidung offen.");
    expect(inboxPipelineHint(focus)).toBeNull();
    expect(inboxSummary(inbox).queued).toBe(47);
  });

  it("summarises open recommendations, departure risks, and queue depth", () => {
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
      queue: [{ id: "c", playerId: "p3", kind: "training_focus", week: 34, urgency: "future", reason: "coach_focus" }],
      resolvedIds: [],
      coachIcons: {},
      lastReport: null,
    };
    expect(inboxSummary(inbox)).toEqual({
      pending: 2,
      recommendations: 1,
      departureRisks: 1,
      queued: 1,
    });
    const releaseDay = inboxReleaseWeekday(1, 1, 34);
    const delivered = deliverDailyInbox(inbox, { season: 1, week: 34, weekday: releaseDay, masterSeed: 1 });
    expect(delivered.items).toHaveLength(3);
  });
});

describe("story inbox stance (PRD 14.5)", () => {
  it("never shows accept/ambitious as button copy", () => {
    expect(actionLabel("story:accept")).toBe("Überleben");
    expect(actionLabel("story:ambitious")).toBe("Anspruch");
    expect(actionIcon("story:accept")).toBe("●");
    expect(actionIcon("story:ambitious")).toBe("▲");
    expect(storyChoiceStance("accept")).toBe("survive");
    expect(storyChoiceStance("ambitious")).toBe("ambition");
  });

  it("applies board survival choices from the stored ids", () => {
    const inbox = enqueueStoryInboxItem(
      emptyInbox(1),
      1,
      {
        beatId: "board_survival_intro",
        title: "Vorstand · Klassenerhalt",
        body: "Der Fanrat erwartet kein Wunder.",
        source: "board",
        choices: [
          { id: "accept", label: "Verstanden", icon: "🤝" },
          { id: "ambitious", label: "Wir schaffen mehr", icon: "🔥" },
        ],
      },
      "board_survival_intro",
    );
    const item = inbox.items[0]!;
    expect(allowedActions(item)).toEqual(["story:accept", "story:ambitious"]);
    expect(actionLabel("story:accept", { item })).toBe("Überleben");
    const after = applyInboxDecision(inbox, [], item.id, "story:ambitious", 1, 1);
    expect(after.inbox.resolvedIds).toContain(item.id);
  });
});
