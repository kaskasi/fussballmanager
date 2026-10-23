import { SEED_DIVISION, SEED_MATCHUP, SEED_OBERLIGA } from "@fussballmanager/shared";
import {
  formatCalibration,
  roundRobin,
  runCalibration,
  scaleSquad,
  seedRange,
  type CalibrationFixture,
} from "../engine/calibration.ts";

const seedsArg = process.argv.find((arg) => arg.startsWith("--seeds="));
const seedCount = seedsArg ? Number.parseInt(seedsArg.slice("--seeds=".length), 10) : 12;
const seeds = seedRange(Number.isFinite(seedCount) && seedCount > 0 ? seedCount : 12);

const sets: Array<[string, CalibrationFixture[]]> = [
  [
    "sandbox (SEED_MATCHUP, both venues)",
    [
      { home: SEED_MATCHUP.home, away: SEED_MATCHUP.away },
      { home: SEED_MATCHUP.away, away: SEED_MATCHUP.home },
    ],
  ],
  ["division (SEED_DIVISION round robin)", roundRobin(SEED_DIVISION)],
  ["oberliga (SEED_OBERLIGA round robin)", roundRobin(SEED_OBERLIGA)],
  ["elite (SEED_DIVISION × 1.3)", roundRobin(SEED_DIVISION.map((squad) => scaleSquad(squad, 1.3)))],
];

const started = Date.now();
for (const [label, fixtures] of sets) {
  console.log(formatCalibration(label, runCalibration({ fixtures, seeds })));
  console.log("");
}
console.log(`${seeds.length} seeds per fixture, ${((Date.now() - started) / 1000).toFixed(1)}s`);
