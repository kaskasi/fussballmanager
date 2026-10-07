import { describe, expect, it } from "vitest";
import { buildPostfachQueueIds, firstPostfachQueueId } from "./postfach-queue.ts";
import { campLeaderPostfachItemId } from "./postfach-camp-leader.ts";

describe("buildPostfachQueueIds", () => {
  it("orders youth, camp leader, then scout jobs", () => {
    const ids = buildPostfachQueueIds(
      [
        {
          id: "y1",
          kind: "promotion",
          playerId: "p1",
          week: 1,
          reason: "ready_for_pro",
          urgency: "now",
        },
      ],
      [{ id: "camp-br", staffed: true, purchased_season: 1, leader_hire: "candidates_ready" }],
      [{ id: "job1", kind: "club_complete", season: 1, week: 2, consumed: false, clubName: "X" }],
    );
    expect(ids).toEqual(["y1", campLeaderPostfachItemId("camp-br"), "job1"]);
    expect(firstPostfachQueueId(ids)).toBe("y1");
  });
});
