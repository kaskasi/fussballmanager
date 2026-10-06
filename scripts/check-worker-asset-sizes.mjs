/** Fail CI if any file in dist exceeds Cloudflare Workers static asset limit (25 MiB). */
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const DIST = "dist";
const LIMIT_BYTES = 25 * 1024 * 1024;

function walk(dir, oversize) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walk(path, oversize);
    else {
      const size = statSync(path).size;
      if (size > LIMIT_BYTES) oversize.push({ path, size });
    }
  }
}

const oversize = [];
try {
  walk(DIST, oversize);
} catch (error) {
  if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
    console.error(`::error::Run "npm run build" before check:worker-assets (missing ${DIST}/).`);
    process.exit(1);
  }
  throw error;
}

if (oversize.length > 0) {
  for (const { path, size } of oversize) {
    const mib = (size / (1024 * 1024)).toFixed(2);
    console.error(`::error::Asset too large for Workers (${mib} MiB > 25 MiB): ${path}`);
  }
  process.exit(1);
}

console.log(`Workers asset check OK (max 25 MiB under ${DIST}/).`);
