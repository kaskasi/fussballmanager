import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const FALLBACK =
  "postgres://fussballmanager:fussballmanager@localhost:5432/fussballmanager";

export function resolveDatabaseUrl(
  env: NodeJS.ProcessEnv = process.env,
  cwd = process.cwd(),
): string {
  if (env.DATABASE_URL && env.DATABASE_URL.length > 0) {
    return env.DATABASE_URL;
  }
  loadDotEnv(resolve(cwd, ".env"), env);
  loadDotEnv(resolve(cwd, "../.env"), env);
  if (env.DATABASE_URL && env.DATABASE_URL.length > 0) {
    return env.DATABASE_URL;
  }
  return FALLBACK;
}

function loadDotEnv(path: string, env: NodeJS.ProcessEnv): void {
  if (!existsSync(path)) {
    return;
  }
  const text = readFileSync(path, "utf8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const eq = trimmed.indexOf("=");
    if (eq <= 0) {
      continue;
    }
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (env[key] === undefined) {
      env[key] = value;
    }
  }
}
