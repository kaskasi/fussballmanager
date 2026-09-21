import { SEED_MATCHUP } from "@fussballmanager/shared";
import { parseSeed } from "../commentary/index.ts";
import { createPool, persistSeedFixture } from "../db/persist.ts";

const seed = parseSeed(process.argv);
const pool = createPool();
try {
  const result = await persistSeedFixture(pool, seed);
  console.log(
    `Persisted ${SEED_MATCHUP.home.team.name} ${result.homeGoals}–${result.awayGoals} ${SEED_MATCHUP.away.team.name}`,
  );
  console.log(
    `match ${result.matchId}  seed ${result.seed}  ${result.eventCount} events`,
  );
} finally {
  await pool.end();
}
