import { useCallback, useState } from "react";
import type { MatchViewLine } from "@fussballmanager/shared";

/** Live matchday highlight level: how much of the commentary stream plays. */
export type MatchHighlightLevel = "key" | "extended" | "full";

export const MATCH_HIGHLIGHT_LEVELS: readonly MatchHighlightLevel[] = ["key", "extended", "full"];

const STORAGE_KEY = "fc-tycoon-match-highlight-level";
const DEFAULT_LEVEL: MatchHighlightLevel = "extended";

const LEVEL_RANK: Record<MatchHighlightLevel, number> = { key: 0, extended: 1, full: 2 };

/** Goals, cards, penalty, injury, substitution, match structure, woodwork. */
const KEY_BEATS: ReadonlySet<string> = new Set([
  "match_opening",
  "second_half_open",
  "half_time",
  "full_time",
  "shot_goal",
  "shot_woodwork",
  "card_yellow",
  "card_red",
  "restart_penalty",
  "injury",
  "substitution",
]);

/** Every other shot joins at Extended. */
const EXTENDED_BEATS: ReadonlySet<string> = new Set([
  "shot_taken",
  "shot_saved",
  "shot_wide",
  "shot_blocked",
]);

/** Phase 4 adds `level` to `MatchViewLine`; until then it is derived from voice and beat. */
type LeveledLine = MatchViewLine & { level?: MatchHighlightLevel };

function isHighlightLevel(value: unknown): value is MatchHighlightLevel {
  return value === "key" || value === "extended" || value === "full";
}

export function matchLineLevel(line: LeveledLine): MatchHighlightLevel {
  if (isHighlightLevel(line.level)) return line.level;
  if (line.voice === "color") return "extended";
  const beat = line.beatId ?? "";
  if (KEY_BEATS.has(beat)) return "key";
  if (line.voice === "moment" || EXTENDED_BEATS.has(beat)) return "extended";
  return "full";
}

export function lineVisibleAtLevel(line: MatchViewLine, level: MatchHighlightLevel): boolean {
  return LEVEL_RANK[matchLineLevel(line)] <= LEVEL_RANK[level];
}

export function readMatchHighlightLevel(): MatchHighlightLevel {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return isHighlightLevel(stored) ? stored : DEFAULT_LEVEL;
  } catch {
    return DEFAULT_LEVEL;
  }
}

export function writeMatchHighlightLevel(level: MatchHighlightLevel): void {
  try {
    localStorage.setItem(STORAGE_KEY, level);
  } catch {
    // Private mode or blocked storage: the level lasts for this session only.
  }
}

export function useMatchHighlightLevel(): readonly [
  MatchHighlightLevel,
  (level: MatchHighlightLevel) => void,
] {
  const [level, setLevel] = useState<MatchHighlightLevel>(() => readMatchHighlightLevel());
  const set = useCallback((next: MatchHighlightLevel) => {
    setLevel(next);
    writeMatchHighlightLevel(next);
  }, []);
  return [level, set];
}
