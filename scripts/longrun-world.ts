/**
 * PRD 31 (PRD 30 phase 1) — headless multi-season world run. Plays the real week
 * pipeline on autopilot and checks the world-longevity invariants after every
 * season end: AI age mix, roster sizes, keepers, CA drift, retired-player leaks.
 * Also measures week-sim time and gzipped save size (PRD 30 budgets).
 *
 *   npx vite-node scripts/longrun-world.ts                 # 20 seasons, seed 2026
 *   npx vite-node scripts/longrun-world.ts --seasons=10 --seed=7
 *   ... --out=docs/research/longrun-world.json             # also write the rows
 *
 * Not part of vitest: a full season takes about 1.5 minutes. Exit code 1 when an
 * invariant fails in any season.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { gzipSync } from "node:zlib";
import { setLocale } from "../src/i18n/index.ts";
import { newGameSession, saveFromSession, type GameSession } from "../src/persistence/game-session.ts";
import { sessionAfterWeekSimulation } from "../src/sim/fast-forward-to-month.ts";
import { simulateGameWeek } from "../src/sim/week-pipeline.ts";
import {
  checkWorldInvariants,
  worldSeasonMetrics,
  type WorldInvariantResult,
  type WorldSeasonMetrics,
} from "../src/playtest/world-longevity.ts";

function argValue(name: string): string | undefined {
  return process.argv.find((arg) => arg.startsWith(`--${name}=`))?.split("=")[1];
}

const seasons = Math.max(1, Number.parseInt(argValue("seasons") ?? "20", 10) || 20);
const seed = Number.parseInt(argValue("seed") ?? "2026", 10) || 2026;
const outPath = argValue("out");
const MAX_WEEKS_PER_SEASON = 60;

interface SeasonRow extends WorldSeasonMetrics {
  weekSimMs: number;
  saveGzipBytes: number;
  checks: WorldInvariantResult[];
}

function saveGzipBytes(session: GameSession): number {
  return gzipSync(JSON.stringify(saveFromSession(session, undefined, new Date(0)))).length;
}

/** Autopilot keeps the job: a dismissal would end the run, not the world. */
function keepEmployed(session: GameSession): GameSession {
  if (session.board.job_status !== "dismissed") return session;
  return { ...session, board: { ...session.board, job_status: "employed", pressure: 40 } };
}

setLocale("en");
let session = newGameSession(new Date("2026-08-01T12:00:00Z"), { seed });
const rows: SeasonRow[] = [];
let baseline: WorldSeasonMetrics | null = null;
const started = Date.now();

console.log(`World long run · ${seasons} seasons · seed ${seed}`);
for (let played = 0; played < seasons; played++) {
  const endingSeason = session.season;
  let weekMs = 0;
  let weeks = 0;
  let ended = false;
  while (!ended && weeks < MAX_WEEKS_PER_SEASON) {
    const t0 = performance.now();
    const result = await simulateGameWeek(session);
    weekMs += performance.now() - t0;
    weeks += 1;
    session = keepEmployed(sessionAfterWeekSimulation(result.session));
    ended = result.seasonEnded;
  }
  const metrics = worldSeasonMetrics(session, endingSeason);
  baseline ??= metrics;
  const row: SeasonRow = {
    ...metrics,
    weekSimMs: Math.round(weekMs / Math.max(1, weeks)),
    saveGzipBytes: saveGzipBytes(session),
    checks: checkWorldInvariants(metrics, baseline),
  };
  rows.push(row);
  const failed = row.checks.filter((check) => !check.ok);
  console.log(
    `  S${String(endingSeason).padStart(2)} · age ${row.aiMeanAge.toFixed(2)} · 35+ ${(row.aiShare35Plus * 100).toFixed(1)} %` +
      ` · roster ≥${row.aiMinRoster} · GK ≥${row.aiMinGoalkeepers} · CA ${row.aiMeanCa}` +
      ` ${JSON.stringify(row.divisionMeanCa)} · retired ${row.retiredTotal}` +
      ` · week ${row.weekSimMs} ms · save ${(row.saveGzipBytes / 1024).toFixed(0)} KB gz` +
      (failed.length > 0 ? ` · FAIL ${failed.map((check) => check.id).join(", ")}` : ""),
  );
}

const failures = rows.flatMap((row) =>
  row.checks.filter((check) => !check.ok).map((check) => `S${row.season} ${check.id}: ${check.detail}`),
);
if (outPath) {
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, `${JSON.stringify({ seed, seasons, rows }, null, 2)}\n`);
}
const elapsed = ((Date.now() - started) / 1000).toFixed(0);
console.log(
  `Done in ${elapsed}s · ${failures.length === 0 ? "all invariants hold" : `${failures.length} failures`}`,
);
for (const failure of failures.slice(0, 20)) console.log(`  ${failure}`);
process.exitCode = failures.length === 0 ? 0 : 1;
