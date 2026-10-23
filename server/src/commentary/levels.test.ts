import { SEED_MATCHUP, type MatchEvent } from "@fussballmanager/shared";
import { describe, expect, it } from "vitest";
import { createInitialState, simulate } from "../engine/index.ts";
import { createBroadcastDirector, type DirectorEmittedLine } from "./director.ts";
import { LINE_COPY_VARIANTS } from "./line-copy.ts";
import { commentaryContextFromSquads } from "./render.ts";

const ctx = commentaryContextFromSquads(SEED_MATCHUP.home, SEED_MATCHUP.away);

function playMatch(seed: number): { events: MatchEvent[]; lines: DirectorEmittedLine[] } {
  const initial = createInitialState({ home: SEED_MATCHUP.home, away: SEED_MATCHUP.away, seed });
  const { events } = simulate({
    state: initial,
    homeTactics: initial.homeTactics,
    awayTactics: initial.awayTactics,
  });
  const director = createBroadcastDirector({ seed, homeTeamId: initial.homeTeamId });
  const lines = events.flatMap((event, index) => director.emit(event, events[index - 1], ctx));
  return { events, lines };
}

describe("ADR 0004 — highlight levels and line copy", () => {
  const { events, lines } = playMatch(2026);

  it("tags every line with a level and keeps Key short", () => {
    const counts = { key: 0, extended: 0, full: 0 };
    for (const line of lines) counts[line.level] += 1;
    expect(counts.key).toBeGreaterThan(5);
    expect(counts.key).toBeLessThan(counts.extended);
    expect(counts.full).toBeGreaterThan(20);
  });

  it("puts every goal on the Key level", () => {
    const goals = events.filter((event) => event.type === "goal").length;
    const keyGoals = lines.filter((line) => line.beatId === "shot_goal" && line.level === "key");
    expect(keyGoals.length).toBeGreaterThanOrEqual(goals);
  });

  it("gives every line a locale key, and variants stay inside their pack", () => {
    for (const line of lines) {
      expect(line.i18nKey, line.text).toBeTruthy();
      const variant = /^match\.line\.(\w+)\.(\d+)$/.exec(line.i18nKey ?? "");
      if (variant) {
        const id = variant[1] as keyof typeof LINE_COPY_VARIANTS;
        expect(Number(variant[2])).toBeLessThan(LINE_COPY_VARIANTS[id]);
      }
    }
  });

  it("picks the same variants for the same seed", () => {
    const again = playMatch(2026).lines.map((line) => line.i18nKey);
    expect(again).toEqual(lines.map((line) => line.i18nKey));
  });

  it("only names players who are part of the event (Weizenbaum)", () => {
    const bySeq = new Map(events.map((event) => [event.seq, event]));
    for (const line of lines) {
      const event = bySeq.get(line.seq);
      if (!event || !line.i18nKey?.startsWith("match.line.")) continue;
      const named = new Set(event.involved.map((player) => ctx.playerName(player.playerId)));
      for (const [param, value] of Object.entries(line.i18nParams ?? {})) {
        if (param === "team") continue;
        expect(named.has(value), `${line.i18nKey} ${param}=${value}`).toBe(true);
      }
    }
  });
});
