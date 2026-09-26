import type { Player, PlayerName } from "./player.ts";

const FIRST_NAMES = [
  "Max",
  "Finn",
  "Leon",
  "Paul",
  "Ben",
  "Jonas",
  "Noah",
  "Elias",
  "Felix",
  "Luis",
  "Emil",
  "Anton",
  "Theo",
  "Henry",
  "Liam",
  "Mats",
  "Julian",
  "Oskar",
  "Moritz",
  "Jakob",
] as const;

const LAST_NAMES = [
  "Müller",
  "Schmidt",
  "Schneider",
  "Fischer",
  "Weber",
  "Meyer",
  "Wagner",
  "Becker",
  "Schulz",
  "Hoffmann",
  "Koch",
  "Richter",
  "Klein",
  "Wolf",
  "Schröder",
  "Neumann",
  "Schwarz",
  "Zimmermann",
  "Braun",
  "Krüger",
] as const;

/** Deterministic display name from portrait seed (demo + intake). */
export function generatePlayerName(seed: number): PlayerName {
  const first = FIRST_NAMES[seed % FIRST_NAMES.length] ?? "Max";
  const last = LAST_NAMES[Math.floor(seed / FIRST_NAMES.length) % LAST_NAMES.length] ?? "Müller";
  return { first, last };
}

/** Whole numbers in the UI — CA, attributes, ratings. */
export function roundStat(value: number): number {
  return Math.round(value);
}

export function formatPlayerName(player: Pick<Player, "name" | "portrait_seed">): string {
  const first = player.name.first?.trim();
  const last = player.name.last?.trim();
  if (first && last) return `${first} ${last}`;
  if (first) return first;
  if (last) return last;
  const generated = generatePlayerName(player.portrait_seed);
  return `${generated.first} ${generated.last}`;
}
