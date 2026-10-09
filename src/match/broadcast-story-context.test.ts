import { describe, expect, it } from "vitest";
import { newGameSession } from "../persistence/game-session.ts";
import { prepareCareerMatch } from "../sim/career-match-setup.ts";
import { buildBroadcastStoryContext } from "./broadcast-story-context.ts";

describe("buildBroadcastStoryContext", () => {
  it("maps fan feed and table facts for career fixtures", () => {
    const session = newGameSession();
    session.week = 1;
    session.storyState.fan_feed = [
      {
        id: "f1",
        week: 1,
        icon: "📣",
        speaker: "Kurvenstand",
        message: "Drei Punkte heute!",
      },
    ];
    const setup = prepareCareerMatch(session);
    expect(setup).not.toBeNull();
    if (!setup) return;

    const ctx = buildBroadcastStoryContext(session, setup);
    expect(ctx.fanFeedHead?.speaker).toBe("Kurvenstand");
    expect(ctx.playerTable?.teams).toBeGreaterThan(0);
    expect(ctx.activeArc).toBe("relegation_battle");
  });
});
