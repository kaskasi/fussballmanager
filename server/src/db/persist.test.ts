import { SEED_MATCHUP } from "@fussballmanager/shared";
import { afterAll, describe, expect, it } from "vitest";
import {
  createPool,
  loadMatch,
  loadSquad,
  persistSeedFixture,
} from "./persist.ts";

const MATCH_ID = "md-test";

describe("persistSeedFixture", () => {
  const pool = createPool();

  afterAll(async () => {
    await pool.end();
  });

  it("loads squads from Postgres and stores one simulated result", async ({
    skip,
  }) => {
    try {
      await pool.query("SELECT 1");
    } catch {
      skip("Postgres not available");
      return;
    }

    const played = await persistSeedFixture(pool, 2026, MATCH_ID);
    expect(played.eventCount).toBeGreaterThan(100);
    expect(played.homeGoals + played.awayGoals).toBeGreaterThanOrEqual(0);

    const home = await loadSquad(pool, SEED_MATCHUP.home.team.id);
    expect(home.starters).toHaveLength(11);
    expect(home.team.name).toBe("FC Nordstern");

    const stored = await loadMatch(pool, MATCH_ID);
    expect(stored?.status).toBe("played");
    expect(stored?.homeGoals).toBe(played.homeGoals);
    expect(stored?.awayGoals).toBe(played.awayGoals);
    expect(stored?.events?.at(0)?.type).toBe("kickoff");
    expect(stored?.events?.at(-1)?.type).toBe("match_end");
    expect(stored?.events).toHaveLength(played.eventCount);
  });
});
