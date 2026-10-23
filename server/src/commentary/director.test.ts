import {
  asMatchId,
  asPlayerId,
  asTeamId,
  SEED_MATCHUP,
  type MatchEvent,
} from "@fussballmanager/shared";
import { describe, expect, it } from "vitest";
import { createInitialState, simulate } from "../engine/index.ts";
import { createBroadcastDirector } from "./director.ts";
import { commentaryContextFromSquads } from "./render.ts";

const homeId = asTeamId("fc-nordstern");
const awayId = asTeamId("sv-rheinwacht");
const matchId = asMatchId("match-director");
const ctx = commentaryContextFromSquads(SEED_MATCHUP.home, SEED_MATCHUP.away);

function player(id: string, teamId = homeId, x = 50, y = 50) {
  return { playerId: asPlayerId(id), teamId, position: { x, y } };
}

describe("createBroadcastDirector", () => {
  it("emits PBP for worthy ticks and tracks set_piece mode", () => {
    const director = createBroadcastDirector({ seed: 1, homeTeamId: homeId });
    const opening: MatchEvent = {
      type: "kickoff",
      seq: 0,
      matchId,
      clock: { period: "first_half", minute: 0, second: 1, stoppageMinute: 0 },
      ball: { x: 50, y: 50 },
      involved: [player("a")],
      possessionTeamId: homeId,
      kickingTeamId: homeId,
    };
    const lines = director.emit(opening, undefined, ctx);
    expect(lines).toHaveLength(1);
    expect(lines[0]?.voice).toBe("pbp");
    expect(director.snapshot().mode).toBe("idle");

    const corner: MatchEvent = {
      type: "restart",
      seq: 5,
      matchId,
      clock: { period: "first_half", minute: 10, second: 0, stoppageMinute: 0 },
      ball: { x: 95, y: 10 },
      involved: [],
      possessionTeamId: homeId,
      phase: "corner",
      takingTeamId: homeId,
    };
    const cornerLines = director.emit(corner, opening, ctx);
    expect(director.snapshot().mode).toBe("set_piece");
    expect(cornerLines.some((line) => line.voice === "moment")).toBe(true);
  });

  it("adds color on macro_counter after defensive turnover and shot", () => {
    const director = createBroadcastDirector({ seed: 99, homeTeamId: homeId });
    const awaySt = player("away-st", awayId, 85, 50);

    const turnover: MatchEvent = {
      type: "turnover",
      seq: 10,
      matchId,
      clock: { period: "first_half", minute: 20, second: 0, stoppageMinute: 0 },
      ball: { x: 20, y: 50 },
      involved: [player("h1")],
      possessionTeamId: awayId,
      fromTeamId: homeId,
      toTeamId: awayId,
      reason: "interception",
    };
    director.emit(turnover, undefined, ctx);

    const shot: MatchEvent = {
      type: "shot",
      seq: 14,
      matchId,
      clock: { period: "first_half", minute: 20, second: 8, stoppageMinute: 0 },
      ball: { x: 88, y: 50 },
      involved: [awaySt],
      possessionTeamId: awayId,
      shooter: awaySt,
      target: { x: 100, y: 50 },
      outcome: "save",
    };
    const lines = director.emit(shot, turnover, ctx);
    expect(lines.some((line) => line.voice === "pbp")).toBe(true);
    const color = lines.find((line) => line.voice === "color");
    expect(color?.macroId).toBe("macro_counter");
    expect(color?.text).toMatch(/Konter|Schneller Umschalt/);
  });

  it("adds story color on match_opening when fan facts are present", () => {
    const director = createBroadcastDirector({
      seed: 4,
      homeTeamId: homeId,
      story: {
        fanFeedHead: { speaker: "Kurvenstand", message: "Heute drei Punkte!" },
      },
    });
    const opening: MatchEvent = {
      type: "kickoff",
      seq: 0,
      matchId,
      clock: { period: "first_half", minute: 0, second: 1, stoppageMinute: 0 },
      ball: { x: 50, y: 50 },
      involved: [player("a")],
      possessionTeamId: homeId,
      kickingTeamId: homeId,
    };
    const lines = director.emit(opening, undefined, ctx);
    const storyColor = lines.find((line) => line.storySlot === "fan_mood");
    expect(storyColor?.voice).toBe("color");
    expect(storyColor?.text).toContain("Kurvenstand");
  });

  it("skips P3 pass_complete PBP while still tracking attack state", () => {
    const director = createBroadcastDirector({ seed: 1, homeTeamId: homeId });
    const pass: MatchEvent = {
      type: "pass",
      seq: 1,
      matchId,
      clock: { period: "first_half", minute: 5, second: 0, stoppageMinute: 0 },
      ball: { x: 50, y: 50 },
      involved: [player("p1")],
      possessionTeamId: homeId,
      from: player("p1", homeId, 40, 50),
      to: player("p2", homeId, 45, 50),
      complete: true,
      kind: "short",
    };
    expect(director.emit(pass, undefined, ctx)).toHaveLength(0);
    expect(director.snapshot().lastBeatId).toBe("pass_complete");
  });

  it("adds color lines on a full simulated match without breaking PBP", () => {
    const initial = createInitialState({
      home: SEED_MATCHUP.home,
      away: SEED_MATCHUP.away,
      seed: 2026,
    });
    const { events } = simulate({
      state: initial,
      homeTactics: initial.homeTactics,
      awayTactics: initial.awayTactics,
    });
    const director = createBroadcastDirector({
      seed: 2026,
      homeTeamId: homeId,
    });
    let pbp = 0;
    let color = 0;
    for (let i = 0; i < events.length; i += 1) {
      const event = events[i];
      if (!event) continue;
      for (const line of director.emit(event, events[i - 1], ctx)) {
        if (line.voice === "pbp") pbp += 1;
        if (line.voice === "color") color += 1;
        expect(line.text.length).toBeGreaterThan(5);
      }
    }
    // Sparse PBP follows shots; a calibrated match has ~25 of them (ADR 0003).
    expect(pbp).toBeGreaterThan(30);
    expect(pbp).toBeLessThan(220);
    expect(color).toBeGreaterThan(0);
  });
});
