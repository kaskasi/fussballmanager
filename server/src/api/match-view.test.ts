import { SEED_MATCHUP, sandboxPlanFromTactics } from "@fussballmanager/shared";
import { describe, expect, it } from "vitest";
import { buildApp } from "../app.ts";
import { buildMatchView, parseViewSeed } from "./match-view.ts";

describe("buildMatchView", () => {
  it("projects one stream into commentary lines and pitch frames", () => {
    const view = buildMatchView({
      seed: 2026,
      home: SEED_MATCHUP.home,
      away: SEED_MATCHUP.away,
    });
    expect(view.frames.length).toBe(view.eventCount);
    expect(view.kickoff.dots).toHaveLength(22);
    const holm = view.roster.find((player) => player.name === "Juri Holm");
    expect(holm?.shirt).toBe(9);
    const shirts = view.roster
      .filter((player) => player.teamId === view.home.id && player.starter)
      .map((player) => player.shirt);
    expect(new Set(shirts).size).toBe(11);
    expect(view.frames.at(-1)?.dots.length).toBeGreaterThanOrEqual(20);
    expect(view.lines.length).toBeGreaterThan(20);
    expect(view.lines.length).toBeLessThan(view.eventCount);
    const seqs = new Set(view.frames.map((frame) => frame.seq));
    for (const line of view.lines) {
      expect(seqs.has(line.seq)).toBe(true);
    }
    expect(view.kickoff.cue).toBeNull();
    expect(view.frames.some((frame) => frame.cue === "throw_in")).toBe(true);
    expect(view.frames.some((frame) => frame.cue === "goal")).toBe(true);
    expect(view.kickoff.stats.home.shots).toBe(0);
    const last = view.frames.at(-1);
    expect(last?.stats.home.goals).toBe(view.finalScore.home);
    expect(last?.stats.away.goals).toBe(view.finalScore.away);
    expect((last?.stats.home.shots ?? 0) + (last?.stats.away.shots ?? 0)).toBeGreaterThan(0);
    expect(last?.stats.home.passes ?? 0).toBeGreaterThan(0);
    expect(view.finalScore.home + view.finalScore.away).toBeGreaterThanOrEqual(0);
  });

  it("parses a seed query", () => {
    expect(parseViewSeed("7")).toBe(7);
    expect(parseViewSeed("nope")).toBe(2026);
  });

  it("reseats Nordstern in a 2-3-5 for the sandbox", () => {
    const view = buildMatchView({
      seed: 2026,
      homePlan: {
        ...sandboxPlanFromTactics(SEED_MATCHUP.home.tactics),
        formation: "2-3-5",
      },
    });
    expect(view.home.formation).toBe("2-3-5");
    const home = view.kickoff.dots.filter(
      (dot) => dot.teamId === view.home.id,
    );
    const high = home.filter((dot) => dot.x > 55).length;
    expect(high).toBeGreaterThan(3);
  });
});

describe("match API", () => {
  it("serves a match view over HTTP", async () => {
    const app = await buildApp();
    const response = await app.inject({
      method: "GET",
      url: "/api/match?seed=2026",
    });
    expect(response.statusCode).toBe(200);
    const body = response.json() as { eventCount: number; home: { shortName: string } };
    expect(body.eventCount).toBeGreaterThan(100);
    expect(body.home.shortName).toBeTruthy();
    await app.close();
  });

  it("accepts a 2-3-5 sandbox POST", async () => {
    const app = await buildApp();
    const response = await app.inject({
      method: "POST",
      url: "/api/match",
      payload: {
        seed: 2026,
        home: { formation: "2-3-5" },
        away: { formation: "4-4-2" },
      },
    });
    expect(response.statusCode).toBe(200);
    const body = response.json() as { home: { formation: string } };
    expect(body.home.formation).toBe("2-3-5");
    await app.close();
  });
});
