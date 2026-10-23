/**
 * ADR 0003 — engine calibration on the real career world (AI vs AI fixtures).
 *
 *   npx vite-node scripts/run-engine-calibration.ts [--matchdays=8] [--seeds=3]
 */
import { matchdayFixtures, type TeamId } from "@fussballmanager/shared";
import { newGameSession } from "../src/persistence/game-session.ts";
import { squadForLeagueClub } from "../src/sim/league-divisions.ts";
import {
  formatCalibration,
  formatCalibrationCompact,
  runCalibration,
  seedRange,
  type CalibrationFixture,
} from "../server/src/engine/calibration.ts";

function flag(name: string, fallback: number): number {
  const hit = process.argv.find((arg) => arg.startsWith(`--${name}=`));
  const value = hit ? Number.parseInt(hit.slice(name.length + 3), 10) : fallback;
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

const matchdays = flag("matchdays", 8);
const seeds = seedRange(flag("seeds", 3), 7000, 31);
const session = newGameSession(new Date("2026-08-01T12:00:00Z"));
const clubIds = session.league.club_ids as TeamId[];

const fixtures: CalibrationFixture[] = [];
for (let matchday = 1; matchday <= matchdays; matchday += 1) {
  for (const fixture of matchdayFixtures(clubIds, matchday)) {
    const home = squadForLeagueClub(fixture.homeTeamId, session.rivalPlayers);
    const away = squadForLeagueClub(fixture.awayTeamId, session.rivalPlayers);
    if (home && away) fixtures.push({ home, away });
  }
}

const started = Date.now();
const metrics = runCalibration({ fixtures, seeds });
console.log(
  process.argv.includes("--compact")
    ? formatCalibrationCompact("career", metrics)
    : formatCalibration(`career (${matchdays} matchdays of AI fixtures × ${seeds.length} seeds)`, metrics),
);
console.log(`${((Date.now() - started) / 1000).toFixed(1)}s`);
