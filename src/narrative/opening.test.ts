import { describe, expect, it } from "vitest";
import { leadershipCandidates } from "./captain.ts";
import {
  chooseNewCareerMode,
  completeOpening,
  isManagerNameReady,
  modePickPending,
  normalizeManagerName,
} from "./opening.ts";
import { act1AssistantTrainingPlan } from "./career-presentation.ts";
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

describe("new-game mode card (PRD 24)", () => {
  const now = new Date("2026-09-22T14:00:00Z");

  it("a fresh UI save waits for the mode card only while the picker is enabled", () => {
    const session = newGameSession(now);
    expect(session.storyState.game_mode_confirmed).toBe(false);
    expect(modePickPending(session, true)).toBe(true);
    expect(modePickPending(session, false)).toBe(false);
  });

  it("saves without the field and opened careers never show the card", () => {
    const session = newGameSession(now);
    const legacy = { storyState: { ...session.storyState, game_mode_confirmed: undefined } };
    expect(modePickPending(legacy, true)).toBe(false);
    const opened = { storyState: { ...session.storyState, opening_complete: true } };
    expect(modePickPending(opened, true)).toBe(false);
  });

  it("picking Regionalliga Manager only confirms the mode", () => {
    const session = newGameSession(now);
    const picked = chooseNewCareerMode(session, "regionalliga_manager");
    expect(picked.storyState.game_mode_confirmed).toBe(true);
    expect(picked.storyState.game_mode).toBe("regionalliga_manager");
    expect(picked.storyState.career_phase).toBe("full");
    expect(picked.trainingPlan).toEqual(session.trainingPlan);
  });

  it("picking Story Mode starts Act 1 with the assistant plan and keeps the cast", () => {
    const session = newGameSession(now);
    const picked = chooseNewCareerMode(session, "story_mode");
    expect(picked.storyState.game_mode).toBe("story_mode");
    expect(picked.storyState.career_phase).toBe("act1_nordstern");
    expect(picked.storyState.cast).toEqual(session.storyState.cast);
    expect(picked.storyState.opening_complete).toBe(false);
    expect(picked.trainingPlan).toEqual(act1AssistantTrainingPlan());
    expect(picked.trainingCalendarGateDone).toBe(true);
    expect(modePickPending(picked, true)).toBe(false);
  });
});
