import { describe, expect, it } from "vitest";
import { detectAnomalies, runCareerPlaytest } from "./career-playtest.ts";
import { detectStoryAnomalies } from "./story-playtest.ts";
import { storyModeAct1StoryState } from "../narrative/story-state.ts";

describe("career playtest", () => {
  it("plays the first weeks of a career through the real week pipeline", async () => {
    const report = await runCareerPlaytest({ strategy: "autopilot", maxWeeks: 3 });
    expect(report.weeks).toHaveLength(3);
    expect(report.final.matchday).toBeGreaterThanOrEqual(1);
    expect(report.final.result).toMatch(/^[WDL] \d+:\d+ (vs|at) /);
  });

  it("plays Story Mode weeks with the Act 1 curtain and no story anomalies", async () => {
    const report = await runCareerPlaytest({ strategy: "autopilot", mode: "story_mode", maxWeeks: 3 });
    expect(report.mode).toBe("story_mode");
    expect(report.weeks.every((row) => row.phase === "act1_nordstern")).toBe(true);
    expect(report.anomalies.some((entry) => entry.id.startsWith("story_"))).toBe(false);
  });

  it("flags Story Mode runs that never leave Act 1 or unlock silently", () => {
    const story = { ...storyModeAct1StoryState(), curtain_unlocks: ["transfers" as const] };
    const ids = detectStoryAnomalies({ weeks: [], story, seasons: 2 }).map((entry) => entry.id);
    expect(ids).toEqual(["story_no_transition", "story_unlock_without_chronicle"]);
  });

  it("flags a player who changes clubs every week", () => {
    const events = [1, 2, 3].map((week) => ({
      id: `e${week}`,
      season: 2026,
      week,
      kind: "transfer" as const,
      message: `Liga: Enno Arslan · A${week} → B${week} (1.1M)`,
    }));
    const anomalies = detectAnomalies({ weeks: [], events, placeTarget: null, clubCount: 18 });
    expect(anomalies.map((entry) => entry.id)).toContain("ai_transfer_churn");
  });
});
