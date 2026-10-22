#!/usr/bin/env node
/**
 * PRD 20 / design.md §2 — design-token guardrail.
 * Counts raw colours (#hex, rgb(), hsl()) and literal font sizes in every CSS and TSX file under src/,
 * outside design-tokens.css, and fails when a file has more than its committed baseline.
 * The baseline only goes down: when a screen moves to tokens, run with --update to lock in the lower count.
 *
 *   npm run check:design-tokens              check against scripts/design-tokens-baseline.json
 *   npm run check:design-tokens -- --update  rewrite the baseline (refused while any file is over it)
 */
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const BASELINE_PATH = join(import.meta.dirname, "design-tokens-baseline.json");
const EXEMPT = new Set(["src/ui/design/design-tokens.css"]);

const HEX = /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})(?![-\w])/g;
const COLOR_FN = /\b(?:rgba?|hsla?)\(/g;
const CSS_FONT_SIZE = /font-size\s*:\s*[0-9.]/g;
const TSX_FONT_SIZE = /fontSize\s*[:=]\s*\{?\s*["'`]?[0-9.]/g;

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      walk(path, out);
    } else if (name.endsWith(".css") || name.endsWith(".tsx")) {
      out.push(path);
    }
  }
  return out;
}

function stripComments(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

function count(text, pattern) {
  return text.match(pattern)?.length ?? 0;
}

function measure(file) {
  const text = stripComments(readFileSync(file, "utf8"));
  const fontSize = file.endsWith(".css") ? CSS_FONT_SIZE : TSX_FONT_SIZE;
  return { colors: count(text, HEX) + count(text, COLOR_FN), fontSizes: count(text, fontSize) };
}

function loadBaseline() {
  try {
    return JSON.parse(readFileSync(BASELINE_PATH, "utf8")).files ?? {};
  } catch {
    return {};
  }
}

const current = {};
for (const file of walk(join(ROOT, "src"))) {
  const rel = relative(ROOT, file).split(sep).join("/");
  if (EXEMPT.has(rel)) continue;
  const counts = measure(file);
  if (counts.colors > 0 || counts.fontSizes > 0) current[rel] = counts;
}

const baseline = loadBaseline();
const over = [];
let canDrop = 0;
for (const [file, counts] of Object.entries(current)) {
  const allowed = baseline[file] ?? { colors: 0, fontSizes: 0 };
  for (const key of ["colors", "fontSizes"]) {
    if (counts[key] > allowed[key]) {
      over.push(`${file}: ${counts[key]} ${key === "colors" ? "raw colours" : "literal font sizes"} (baseline ${allowed[key]})`);
    }
  }
}
for (const [file, allowed] of Object.entries(baseline)) {
  const counts = current[file] ?? { colors: 0, fontSizes: 0 };
  if (counts.colors < allowed.colors || counts.fontSizes < allowed.fontSizes) canDrop += 1;
}

const total = (files, key) => Object.values(files).reduce((sum, counts) => sum + counts[key], 0);
const summary = `raw colours ${total(current, "colors")} (baseline ${total(baseline, "colors")}), literal font sizes ${total(current, "fontSizes")} (baseline ${total(baseline, "fontSizes")})`;

const update = process.argv.includes("--update");
const bootstrapping = update && !existsSync(BASELINE_PATH);

if (over.length > 0 && !bootstrapping) {
  console.error("check-design-tokens: new raw values outside design-tokens.css:");
  for (const line of over) console.error(`  ${line}`);
  console.error("Use a token from src/ui/design/design-tokens.css (var(--…)) instead; see docs/prd/design.md §2.");
  process.exit(1);
}

if (update) {
  const sorted = Object.fromEntries(Object.entries(current).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(BASELINE_PATH, `${JSON.stringify({ files: sorted }, null, 2)}\n`);
  console.log(`check-design-tokens: baseline updated — ${summary}`);
  process.exit(0);
}

console.log(`check-design-tokens: OK — ${summary}`);
if (canDrop > 0) {
  console.log(`  ${canDrop} file(s) are below their baseline; run \`npm run check:design-tokens -- --update\` to lock that in.`);
}
