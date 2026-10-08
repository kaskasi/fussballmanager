#!/usr/bin/env node
/**
 * PRD 20 — fail on hard-coded aria-label literals in P0 screens (+ primitives).
 * Full-repo backlog: run with CHECK_UI_ARIA_I18N_FULL=1 (uses allowlist file).
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const ALLOWLIST_PATH = join(import.meta.dirname, "ui-aria-i18n-allowlist.txt");

const P0_REL = [
  "src/ui/screens/PipelineDashboard.tsx",
  "src/ui/screens/YouthCampus.tsx",
  "src/ui/screens/ScoutingCenter.tsx",
  "src/ui/screens/FirstTeam.tsx",
  "src/ui/screens/TrainingCenter.tsx",
  "src/ui/components/primitives",
];

const LITERAL_ARIA =
  /aria-label\s*=\s*["'`][^"'`{]*[A-ZÄÖÜ][^"'`]*["'`]/;

function loadAllowlist() {
  try {
    return new Set(
      readFileSync(ALLOWLIST_PATH, "utf8")
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith("#")),
    );
  } catch {
    return new Set();
  }
}

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      walk(path, out);
    } else if (name.endsWith(".tsx") || name.endsWith(".ts")) {
      out.push(path);
    }
  }
  return out;
}

function resolveTargets() {
  const full = process.env.CHECK_UI_ARIA_I18N_FULL === "1";
  if (full) {
    return walk(join(ROOT, "src/ui"));
  }
  const files = [];
  for (const rel of P0_REL) {
    const abs = join(ROOT, rel);
    if (statSync(abs).isDirectory()) {
      walk(abs, files);
    } else {
      files.push(abs);
    }
  }
  return files;
}

const allowlist = loadAllowlist();
const violations = [];

for (const file of resolveTargets()) {
  const rel = relative(ROOT, file);
  const lines = readFileSync(file, "utf8").split("\n");
  lines.forEach((line, index) => {
    if (!LITERAL_ARIA.test(line)) return;
    if (line.includes("aria-label={")) return;
    const key = `${rel}:${index + 1}`;
    if (allowlist.has(key)) return;
    violations.push(`${key}: ${line.trim()}`);
  });
}

if (violations.length > 0) {
  console.error("Hard-coded aria-label literals (use t() / useT):\n");
  for (const row of violations) console.error(row);
  console.error(`\n${violations.length} violation(s).`);
  process.exit(1);
}

console.log("check-ui-aria-i18n: ok");
