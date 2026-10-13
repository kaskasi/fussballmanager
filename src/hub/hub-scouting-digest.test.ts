import { describe, expect, it } from "vitest";
import { buildHubScoutingDigest } from "./hub-scouting-digest.ts";
import { createScoutBoard } from "../scouting/scout-board.ts";

describe("buildHubScoutingDigest", () => {
  it("returns zero pool counts for empty board", () => {
    const digest = buildHubScoutingDigest(createScoutBoard(), 1, null);
    expect(digest.activeMapTrips).toBe(0);
    expect(digest.poolKnown).toBe(0);
    expect(digest.opponentPrep).toBeNull();
  });
});
