#!/usr/bin/env node
/**
 * Merge flat keys from stdin JSON into de.json, en.json, zh-Hans.json (sorted keys).
 * Adds new keys and overwrites existing ones; agents never need to read the packs.
 *
 *   echo '{"de":{"a.b":"Hallo"},"en":{"a.b":"Hello"},"zh-Hans":{"a.b":"你好"}}' | npm run -s i18n:add
 */
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const localesDir = path.join(root, "src/i18n/locales");
const patch = JSON.parse(fs.readFileSync(0, "utf8"));

for (const file of ["de.json", "en.json", "zh-Hans.json"]) {
  const p = path.join(localesDir, file);
  const data = JSON.parse(fs.readFileSync(p, "utf8"));
  const localeKey =
    file === "de.json" ? "de" : file === "en.json" ? "en" : file === "zh-Hans.json" ? "zh-Hans" : null;
  Object.assign(data, localeKey ? patch[localeKey] : patch);
  const sorted = Object.fromEntries(Object.keys(data).sort().map((k) => [k, data[k]]));
  fs.writeFileSync(p, `${JSON.stringify(sorted, null, 2)}\n`);
}

const keySets = ["de", "en", "zh-Hans"].map((l) => Object.keys(patch[l] ?? {}).sort().join("\n"));
if (new Set(keySets).size > 1) {
  console.warn("merge-locale-keys: patch sets different keys per locale; packs are now out of parity");
}
