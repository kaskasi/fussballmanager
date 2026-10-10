import type { Player, PlayerName, PositionPrimary } from "./player.ts";

/** Show retrained positions in labels from this proficiency upward (success = 1.0). */
export const POSITION_LABEL_MIN_PROFICIENCY = 0.5;

const POSITION_ORDER: Record<PositionPrimary, number> = {
  GK: 0,
  CB: 1,
  LB: 2,
  RB: 3,
  DM: 4,
  CM: 5,
  AM: 6,
  LM: 7,
  RM: 8,
  LW: 9,
  RW: 10,
  CF: 11,
};

function sortPositions(positions: readonly PositionPrimary[]): PositionPrimary[] {
  return [...positions].sort((left, right) => POSITION_ORDER[left] - POSITION_ORDER[right]);
}

/** Extra positions from `flexibility` (PRD 07.7), excluding primary. */
export function learnedPositions(
  player: Pick<Player, "position" | "flexibility">,
): PositionPrimary[] {
  const seen = new Set<PositionPrimary>();
  const extras: PositionPrimary[] = [];
  for (const slot of player.flexibility) {
    if (slot.trained_as === player.position) continue;
    if (slot.proficiency < POSITION_LABEL_MIN_PROFICIENCY) continue;
    if (seen.has(slot.trained_as)) continue;
    seen.add(slot.trained_as);
    extras.push(slot.trained_as);
  }
  return sortPositions(extras);
}

/** Primary plus learned positions for filters and tooltips. */
export function playerPositionSet(
  player: Pick<Player, "position" | "flexibility">,
): PositionPrimary[] {
  return sortPositions([player.position, ...learnedPositions(player)]);
}

export function playerPlaysPosition(
  player: Pick<Player, "position" | "flexibility">,
  position: PositionPrimary,
): boolean {
  return playerPositionSet(player).includes(position);
}

/** UI label, e.g. `AM · RM` after successful retrain. */
export function formatPlayerPositionLabel(
  player: Pick<Player, "position" | "flexibility">,
): string {
  const extras = learnedPositions(player);
  if (extras.length === 0) return player.position;
  return [player.position, ...extras].join(" · ");
}

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
  const name = player.name ?? { first: "", last: "" };
  const first = name.first?.trim();
  const last = name.last?.trim();
  if (first && last) return `${first} ${last}`;
  if (first) return first;
  if (last) return last;
  const generated = generatePlayerName(player.portrait_seed);
  return `${generated.first} ${generated.last}`;
}
