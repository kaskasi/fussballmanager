import { describe, expect, it } from "vitest";
import { asMatchId, asPlayerId, asTeamId } from "./ids.ts";
import type { MatchEvent } from "./match-event.ts";
import {
  applyMatchStatEvent,
  emptyPairStats,
  isShotOnTarget,
  passCompletionPct,
} from "./match-stats.ts";

const home = asTeamId("home");
const away = asTeamId("away");
const clock = {
  period: "first_half" as const,
  minute: 12,
  second: 0,
  stoppageMinute: 0,
};
const involved = {
  playerId: asPlayerId("p"),
  teamId: home,
  position: { x: 50, y: 50 },
};

function fold(events: MatchEvent[]) {
  return events.reduce(
    (stats, event) => applyMatchStatEvent(stats, event, home),
    emptyPairStats(),
  );
}

describe("match stats", () => {
  it("counts goals, shots on target, corners, and open-play pass completion", () => {
    const stats = fold([
      {
        type: "pass",
        seq: 1,
        matchId: asMatchId("m"),
        clock,
        ball: { x: 40, y: 50 },
        involved: [involved],
        possessionTeamId: home,
        from: involved,
        to: involved,
        complete: true,
        kind: "short",
      },
      {
        type: "pass",
        seq: 2,
        matchId: asMatchId("m"),
        clock,
        ball: { x: 40, y: 50 },
        involved: [involved],
        possessionTeamId: home,
        from: involved,
        to: involved,
        complete: false,
        kind: "through",
      },
      {
        type: "pass",
        seq: 3,
        matchId: asMatchId("m"),
        clock,
        ball: { x: 10, y: 50 },
        involved: [involved],
        possessionTeamId: home,
        from: involved,
        to: involved,
        complete: true,
        kind: "restart",
      },
      {
        type: "shot",
        seq: 4,
        matchId: asMatchId("m"),
        clock,
        ball: { x: 95, y: 50 },
        involved: [involved],
        possessionTeamId: home,
        shooter: involved,
        target: { x: 100, y: 50 },
        outcome: "save",
      },
      {
        type: "shot",
        seq: 5,
        matchId: asMatchId("m"),
        clock,
        ball: { x: 95, y: 40 },
        involved: [involved],
        possessionTeamId: home,
        shooter: involved,
        target: { x: 100, y: 40 },
        outcome: "wide",
      },
      {
        type: "goal",
        seq: 6,
        matchId: asMatchId("m"),
        clock,
        ball: { x: 100, y: 50 },
        involved: [involved],
        possessionTeamId: home,
        scorer: involved,
      },
      {
        type: "restart",
        seq: 7,
        matchId: asMatchId("m"),
        clock,
        ball: { x: 99, y: 5 },
        involved: [involved],
        possessionTeamId: away,
        phase: "corner",
        takingTeamId: away,
      },
    ]);

    expect(stats.home.goals).toBe(1);
    expect(stats.home.shots).toBe(2);
    expect(stats.home.shotsOnTarget).toBe(1);
    expect(stats.home.passes).toBe(2);
    expect(stats.home.passesComplete).toBe(1);
    expect(passCompletionPct(stats.home)).toBe(50);
    expect(stats.away.corners).toBe(1);
    expect(isShotOnTarget("woodwork")).toBe(false);
    expect(isShotOnTarget("goal")).toBe(true);
  });
});
