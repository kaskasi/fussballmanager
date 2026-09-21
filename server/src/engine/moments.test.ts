import { describe, expect, it } from "vitest";
import { asTeamId, createRng, DEFAULT_LINE_CONTROL, DIRECT_LINE_DUTIES, POSSESSION_LINE_DUTIES } from "@fussballmanager/shared";
import type { MatchState } from "@fussballmanager/shared";
import {
  beginTransition,
  inGainedBall,
  inLostBall,
  settleTransition,
  TRANSITION_SECONDS,
} from "./moments.ts";

const home = asTeamId("home");
const away = asTeamId("away");

function stub(elapsed: number): MatchState {
  return {
    matchId: "m" as MatchState["matchId"],
    homeTeamId: home,
    awayTeamId: away,
    clock: {
      period: "first_half",
      minute: 10,
      second: 0,
      stoppageMinute: 0,
    },
    phase: "open_play",
    score: { home: 0, away: 0 },
    ball: { x: 50, y: 50 },
    ballCarrierId: null,
    possessionTeamId: away,
    players: [],
    homeTactics: {
      teamId: home,
      formation: "4-3-3",
      mentality: 50,
      pressing: 50,
      width: 50,
      tempo: 50,
      marking: "zonal",
      ...DEFAULT_LINE_CONTROL,
      ...POSSESSION_LINE_DUTIES,
    },
    awayTactics: {
      teamId: away,
      formation: "4-4-2",
      mentality: 50,
      pressing: 50,
      width: 50,
      tempo: 50,
      marking: "man",
      ...DEFAULT_LINE_CONTROL,
      ...DIRECT_LINE_DUTIES,
    },
    rng: createRng(1),
    lastPasserId: null,
    pending: null,
    periodElapsedSeconds: elapsed,
    stoppageAllowanceSeconds: 0,
    firstKickoffTeamId: home,
    substitutionsUsed: { home: 0, away: 0 },
    humanTeamId: home,
    transitionGainedTeamId: null,
    transitionUntilElapsed: null,
    nextSeq: 0,
  };
}

describe("transition moments", () => {
  it("treats the first 10 seconds after a turnover as gained/lost ball", () => {
    const live = beginTransition(stub(100), away);
    expect(inGainedBall(live)).toBe(true);
    expect(inLostBall(live, home)).toBe(true);
    expect(inLostBall(live, away)).toBe(false);
    const later = settleTransition({
      ...live,
      periodElapsedSeconds: 100 + TRANSITION_SECONDS,
    });
    expect(inGainedBall(later)).toBe(false);
    expect(later.transitionGainedTeamId).toBeNull();
  });
});
