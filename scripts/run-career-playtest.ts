/**
 * Headless career playtest: plays one full season through the real week pipeline
 * (no UI) and reports results plus anomalies the agent playtest found by hand.
 *
 *   npm run playtest:career                       # autopilot
 *   npm run playtest:career:youth                 # promote strong U19s on day one
 *   PLAYTEST_WEEKS=6 npm run playtest:career      # short smoke run
 *   npm run playtest:career:story                 # Story Mode (PRD 24): 2 seasons, Act 1 → Act 2
 *   ... --seasons=3                                 # play more seasons
 *
 * Writes docs/research/career-playtest-<strategy>.{md,json} (story: career-playtest-story-<strategy>).
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  runCareerPlaytest,
  renderCareerPlaytestMarkdown,
  type CareerPlaytestStrategy,
} from "../src/playtest/career-playtest.ts";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const researchDir = join(repoRoot, "docs/research");

const strategyArg = process.argv.find((arg) => arg.startsWith("--strategy="))?.split("=")[1];
const strategy: CareerPlaytestStrategy = strategyArg === "youth" ? "youth" : "autopilot";
const maxWeeks = Number.parseInt(process.env.PLAYTEST_WEEKS ?? "", 10);
const storyMode = process.argv.includes("--mode=story");
const seasonsArg = Number.parseInt(
  process.argv.find((arg) => arg.startsWith("--seasons="))?.split("=")[1] ?? "",
  10,
);
const seasons = Number.isFinite(seasonsArg) && seasonsArg > 0 ? seasonsArg : storyMode ? 2 : 1;
const reportName = storyMode ? `story-${strategy}` : strategy;

console.log(`Career playtest · strategy=${strategy}${storyMode ? " · story mode" : ""}`);
const started = Date.now();
const report = await runCareerPlaytest({
  strategy,
  mode: storyMode ? "story_mode" : "regionalliga_manager",
  seasons,
  maxWeeks: Number.isFinite(maxWeeks) && maxWeeks > 0 ? maxWeeks : undefined,
  onWeek: (row) => {
    console.log(
      `  ${seasons > 1 ? `S${row.season} ` : ""}week ${String(row.week).padStart(2)} · MD ${String(row.matchday).padStart(2)} · ` +
        `#${row.place} · ${row.points} pts · pressure ${row.pressure}% · cash ${(row.cash / 1e6).toFixed(2)}M` +
        (row.result ? ` · ${row.result}` : ""),
    );
  },
});

mkdirSync(researchDir, { recursive: true });
const base = join(researchDir, `career-playtest-${reportName}`);
writeFileSync(`${base}.json`, `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(`${base}.md`, renderCareerPlaytestMarkdown(report));

console.log("");
if (report.seasonEnd) {
  console.log(
    `  season end: job ${report.seasonEnd.jobStatus}, pressure ${report.seasonEnd.pressure}%` +
      (report.seasonEnd.summary ? ` — ${report.seasonEnd.summary}` : ""),
  );
}
for (const transition of report.seasonEnds.map((end) => end.actTransition)) {
  if (!transition) continue;
  console.log(
    `  act 1 end: ${transition.outcome}${transition.via_playoff ? " (playoff)" : ""} in place ${transition.final_place}` +
      ` · offers ${transition.offer_team_ids.join(", ")} · followers ${transition.companion_ids.join(", ")}`,
  );
}
if (storyMode) {
  console.log(`  final phase: ${report.final.phase} · unlocks ${(report.final.unlocks ?? []).join(", ")}`);
}
for (const anomaly of report.anomalies) {
  console.log(`  [${anomaly.severity}] ${anomaly.id}: ${anomaly.message}`);
}
const elapsed = ((Date.now() - started) / 1000).toFixed(1);
console.log(
  `Done in ${elapsed}s · final #${report.final.place} · ${report.final.points} pts · ` +
    `${report.anomalies.length} anomalies. Wrote docs/research/career-playtest-${reportName}.{json,md}`,
);
