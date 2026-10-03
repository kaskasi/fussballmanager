import { describe, expect, it } from "vitest";
import { leadershipCandidates } from "./captain.ts";
import { completeOpening, isManagerNameReady, normalizeManagerName } from "./opening.ts";
import { newGameSession } from "../persistence/game-session.ts";

describe("manager name onboarding", () => {
  it("trims and caps the typed name", () => {
    expect(normalizeManagerName("  Kim  Müller  ")).toBe("Kim Müller");
    expect(isManagerNameReady("K")).toBe(false);
    expect(isManagerNameReady("Kim")).toBe(true);
  });

  it("writes the chosen name into the session and chronicle", () => {
    const session = newGameSession(new Date("2026-09-22T14:00:00Z"));
    const captainId = leadershipCandidates(session.players, session.clubId)[0]?.player.id;
    expect(captainId).toBeTruthy();
    const opened = completeOpening(session, "raffle", captainId!, "  Kim  ");
    expect(opened.managerName).toBe("Kim");
    expect(opened.storyState.opening_complete).toBe(true);
    expect(opened.storyState.chronicle_entries.some((entry) => entry.body.includes("Kim"))).toBe(true);
    expect(opened.storyState.chronicle_entries.some((entry) => entry.body.includes("Jan"))).toBe(false);
  });
});
