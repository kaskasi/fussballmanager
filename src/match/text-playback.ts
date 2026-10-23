/** Line-driven live matchday (design.md §9.15): the commentary stream is the timeline, frames follow it. */
import type { MatchClock, MatchView, MatchViewFrame, MatchViewLine } from "@fussballmanager/shared";
import { COLOR_LINE_DELAY_MS } from "./match-commentary-lines.ts";
import { GOAL_HIGHLIGHT_MS } from "./goal-highlight.ts";
import { lineVisibleAtLevel, type MatchHighlightLevel } from "./match-highlight-level.ts";

export const LINE_DWELL_MS = { goal: 2600, major: 1600, minor: 900 } as const;
/** Game time between two lines, so the clock visibly runs between them. */
export const DWELL_PER_GAME_MINUTE_MS = 120;
const MIN_DWELL_MS = 80;

export type LineTone = "goal" | "danger" | "shot" | "default";
export type LineImportance = keyof typeof LINE_DWELL_MS;

const DANGER_BEATS: ReadonlySet<string> = new Set([
  "shot_saved",
  "shot_wide",
  "shot_woodwork",
  "restart_penalty",
  "card_red",
]);
const SHOT_BEATS: ReadonlySet<string> = new Set(["shot_taken", "shot_blocked"]);
const MAJOR_BEATS: ReadonlySet<string> = new Set([
  "shot_taken",
  "shot_saved",
  "shot_wide",
  "shot_woodwork",
  "shot_blocked",
  "card_yellow",
  "card_red",
  "restart_penalty",
]);

export function frameAt(view: MatchView, index: number): MatchViewFrame {
  return view.frames[Math.min(Math.max(index, 0), view.frames.length - 1)] ?? view.kickoff;
}

export function isGoalLine(line: MatchViewLine): boolean {
  return line.voice !== "color" && line.beatId === "shot_goal";
}

/** Tone from the beat id, so every locale styles the same (analyst lines stay neutral). */
export function lineTone(line: MatchViewLine): LineTone {
  if (line.voice === "color") return "default";
  const beat = line.beatId ?? "";
  if (beat === "shot_goal") return "goal";
  if (DANGER_BEATS.has(beat)) return "danger";
  if (SHOT_BEATS.has(beat)) return "shot";
  return "default";
}

export function lineImportance(line: MatchViewLine): LineImportance {
  if (isGoalLine(line)) return "goal";
  if (line.voice !== "color" && MAJOR_BEATS.has(line.beatId ?? "")) return "major";
  return "minor";
}

/** Indices into `lines` that play at this level, in stream order. */
export function buildLineTimeline(
  lines: readonly MatchViewLine[],
  level: MatchHighlightLevel,
): number[] {
  const timeline: number[] = [];
  lines.forEach((line, index) => {
    if (lineVisibleAtLevel(line, level)) timeline.push(index);
  });
  return timeline;
}

/** Last timeline position whose line index is <= cursor; -1 before the first visible line. */
export function timelinePosition(timeline: readonly number[], cursor: number): number {
  let lo = 0;
  let hi = timeline.length - 1;
  let found = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (timeline[mid]! <= cursor) {
      found = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return found;
}

/** Index of the last frame with `frame.seq <= seq` (frames are seq-ordered); -1 before the first. */
export function frameIndexForSeq(frames: readonly MatchViewFrame[], seq: number): number {
  let lo = 0;
  let hi = frames.length - 1;
  let found = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (frames[mid]!.seq <= seq) {
      found = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return found;
}

/** Elapsed game minutes; stoppage time counts on, the second half restarts at 45. */
export function clockGameMinutes(clock: MatchClock): number {
  return clock.minute + clock.stoppageMinute + clock.second / 60;
}

/**
 * How long `line` stays the newest entry before the next one appears: reading time by importance,
 * plus game time up to the next line, divided by speed. The goal hold is real time and never sped up.
 */
export function lineDwellMs(line: MatchViewLine, gameMinutesToNext: number, speed: number): number {
  const reading =
    LINE_DWELL_MS[lineImportance(line)] + (line.voice === "color" ? COLOR_LINE_DELAY_MS : 0);
  const clock = Math.max(0, gameMinutesToNext) * DWELL_PER_GAME_MINUTE_MS;
  const scaled = (reading + clock) / Math.max(speed, 1);
  const hold = isGoalLine(line) ? GOAL_HIGHLIGHT_MS : 0;
  return Math.max(MIN_DWELL_MS, Math.round(scaled + hold));
}

/** Minute column label: "67'", "45+2'". */
export function lineMinuteLabel(clock: MatchClock): string {
  return clock.stoppageMinute > 0 ? `${clock.minute}+${clock.stoppageMinute}'` : `${clock.minute}'`;
}

/** Engine lines start with a clock ("67'12  …"); the stream shows the minute in its own column. */
export function stripClockPrefix(text: string): string {
  const match = /^\d+(?:\+\d+)?'\d*\s{2}/.exec(text);
  return match ? text.slice(match[0].length) : text;
}
