/**
 * Offline FC Nordstern opponent-scout lattice study (no Vitest timeout).
 *
 * Full:  npm run study:opponent-scout
 * Quick: STUDY_QUICK=1 npm run study:opponent-scout
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { newGameSession } from "../src/persistence/game-session.ts";
import {
  buildQuickMultiOpponentStudyConfig,
  DEFAULT_NORDSTERN_STUDY,
  DEFAULT_NORDSTERN_STUDY_ARTIFACT_BASENAME,
  QUICK_NORDSTERN_STUDY,
  runNordsternOpponentScoutStudy,
  writeNordsternStudyArtifacts,
} from "../src/scouting/opponent-scout-nordstern-study.ts";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const researchDir = join(repoRoot, "docs/research");
const quick = process.env.STUDY_QUICK === "1";
const quickTeams = Number.parseInt(process.env.STUDY_QUICK_TEAMS ?? "", 10);
const session = newGameSession(new Date("2026-08-01T12:00:00Z"));

let artifactBasename = DEFAULT_NORDSTERN_STUDY_ARTIFACT_BASENAME;
let config = DEFAULT_NORDSTERN_STUDY;
if (quick && quickTeams > 0) {
  config = buildQuickMultiOpponentStudyConfig(quickTeams, session);
  artifactBasename = `opponent-scout-nordstern-quick-${quickTeams}-teams`;
} else if (quick) {
  config = QUICK_NORDSTERN_STUDY;
}

console.log(
  quick && quickTeams > 0
    ? `Opponent scout study (QUICK: ${quickTeams} opponents across CA spectrum, compact lattice)`
    : quick
      ? "Opponent scout study (QUICK: similar opponent, compact lattice)"
      : "Opponent scout study (weaker / similar / stronger × full lattice)",
);
console.log(
  `Plans: ${config.fixtures.length} fixture(s), ${config.seedRepeats} seeds/plan — expect several minutes to ~45 min full run.`,
);

const started = Date.now();
let lastLog = 0;

const result = runNordsternOpponentScoutStudy(config, session, {
  onProgress: ({ fixtureIndex, planIndex, planCount, fixtureCount }) => {
    const now = Date.now();
    if (planIndex > 0 && planIndex % 25 !== 0 && now - lastLog < 5000) return;
    lastLog = now;
    console.log(
      `  fixture ${fixtureIndex + 1}/${fixtureCount} · plan ${planIndex + 1}/${planCount}`,
    );
  },
});

writeNordsternStudyArtifacts(result, researchDir, artifactBasename);

const elapsed = ((Date.now() - started) / 1000).toFixed(1);
console.log(`Done in ${elapsed}s. Wrote docs/research/${artifactBasename}.{json,csv,md}`);
