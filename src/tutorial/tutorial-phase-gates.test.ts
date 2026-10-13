import { describe, expect, it } from "vitest";
import { defaultStoryState } from "../narrative/story-state.ts";
import type { GameSession } from "../persistence/game-session.ts";
import { markStepCompleted } from "./tutorial-progress.ts";
import { phase1DeskTrackComplete, phase2Eligible, PHASE2_MIN_WEEK } from "./tutorial-phase-gates.ts";

function minimalSession(overrides: Partial<GameSession> = {}): GameSession {
  return {
    week: 1,
    storyState: defaultStoryState(),
    youthInbox: { items: [], resolvedIds: [], week: 1, lastReport: null },
    players: [],
  } as unknown as GameSession;
}

describe("tutorial-phase-gates", () => {
  it("phase2 opens after desk track or week threshold", () => {
    const session = minimalSession();
    expect(phase2Eligible(session)).toBe(false);
    expect(phase2Eligible({ ...session, week: PHASE2_MIN_WEEK })).toBe(true);
    let story = markStepCompleted(defaultStoryState(), "hub.top_development");
    expect(phase1DeskTrackComplete(story)).toBe(true);
    expect(phase2Eligible({ ...session, storyState: story })).toBe(true);
  });
});
