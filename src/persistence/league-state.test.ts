import { describe, expect, it } from "vitest";
import {
  LEAGUE_MEETINGS_PER_OPPONENT,
  normalizeLeagueState,
} from "./league-state.ts";

describe("normalizeLeagueState", () => {
  it("fills defaults when league snapshot is missing", () => {
    const league = normalizeLeagueState(undefined, 42);
    expect(league.meetings_per_opponent).toBe(LEAGUE_MEETINGS_PER_OPPONENT);
    expect(league.club_ids.length).toBeGreaterThan(0);
    expect(league.matchday).toBe(1);
  });
});
