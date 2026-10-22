import { describe, expect, it } from "vitest";
import { detectAnomalies, runCareerPlaytest } from "./career-playtest.ts";

describe("career playtest", () => {
  it("plays the first weeks of a career through the real week pipeline", async () => {
    const report = await runCareerPlaytest({ strategy: "autopilot", maxWeeks: 3 });
    expect(report.weeks).toHaveLength(3);
    expect(report.final.matchday).toBeGreaterThanOrEqual(1);
    expect(report.final.result).toMatch(/^[WDL] \d+:\d+ (vs|at) /);
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
