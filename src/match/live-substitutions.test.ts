import { describe, expect, it } from "vitest";
import { SEED_MATCHUP } from "@fussballmanager/shared";
import { buildMatchView } from "../../server/src/api/match-view.ts";
import {
  halfTimeSeq,
  liveSubstitutionState,
  MAX_LIVE_SUBSTITUTIONS,
  substituteSuggestions,
} from "./live-substitutions.ts";

const humanTeamId = SEED_MATCHUP.home.team.id;
const base = { seed: 2026, home: SEED_MATCHUP.home, away: SEED_MATCHUP.away, humanTeamId };

describe("live substitution state (PRD 27)", () => {
  it("lists the XI with fatigue, a fresh bench and the half-time stop", () => {
    const view = buildMatchView(base);
    const half = halfTimeSeq(view);
    expect(half).not.toBeNull();
    const index = view.frames.findIndex((frame) => frame.seq === half);
    const state = liveSubstitutionState(view, index, humanTeamId);
    expect(state.onPitch.length).toBeGreaterThanOrEqual(10);
    expect(state.onPitch.every((row) => typeof row.fatigue === "number")).toBe(true);
    expect(state.bench.length).toBe(SEED_MATCHUP.home.bench.length);
    expect(state.used).toBe(0);
    expect(state.left).toBe(MAX_LIVE_SUBSTITUTIONS);
  });

  it("shows a requested change as planned until it happens, then takes both players out of the lists", () => {
    const plain = buildMatchView(base);
    const pausedIndex = plain.frames.findIndex((frame) => frame.clock.period === "second_half" && frame.clock.minute >= 55);
    const paused = plain.frames[pausedIndex]!;
    const off = SEED_MATCHUP.home.starters.find((place) => place.slot === "ST")!.player;
    const on = SEED_MATCHUP.home.bench.find((player) => player.role === "ST") ?? SEED_MATCHUP.home.bench[1]!;
    const view = buildMatchView({ ...base, substitutions: [{ afterSeq: paused.seq, playerOffId: off.id, playerOnId: on.id }] });

    const before = liveSubstitutionState(view, pausedIndex, humanTeamId);
    expect(before.planned).toEqual([expect.objectContaining({ offId: off.id, onId: on.id })]);
    expect(before.used).toBe(1);
    expect(before.bench.some((row) => row.id === on.id)).toBe(false);
    expect(before.onPitch.some((row) => row.id === off.id)).toBe(false);

    const after = liveSubstitutionState(view, view.frames.length - 1, humanTeamId);
    expect(after.planned).toEqual([]);
    expect(after.used).toBe(1);
    expect(after.bench.some((row) => row.id === off.id || row.id === on.id)).toBe(false);
  });

  it("suggests the same role first and keeps keepers for keepers", () => {
    const bench = [
      { id: "gk", name: "Keeper", role: "GK" as const, shirt: 12 },
      { id: "cm", name: "Mid", role: "CM" as const, shirt: 14 },
      { id: "st", name: "Forward", role: "ST" as const, shirt: 19 },
    ];
    expect(substituteSuggestions(bench, "ST").map((row) => row.id)).toEqual(["st", "cm"]);
    expect(substituteSuggestions(bench, "GK")[0]!.id).toBe("gk");
  });
});
