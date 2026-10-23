import { describe, expect, it } from "vitest";
import type { MatchViewFrame, MatchViewLine } from "@fussballmanager/shared";
import { COLOR_LINE_DELAY_MS } from "./match-commentary-lines.ts";
import { GOAL_HIGHLIGHT_MS } from "./goal-highlight.ts";
import { lineVisibleAtLevel, matchLineLevel } from "./match-highlight-level.ts";
import {
  buildLineTimeline,
  clockGameMinutes,
  DWELL_PER_GAME_MINUTE_MS,
  frameIndexForSeq,
  LINE_DWELL_MS,
  lineDwellMs,
  lineMinuteLabel,
  lineTone,
  stripClockPrefix,
  timelinePosition,
} from "./text-playback.ts";

function line(seq: number, beatId: string, voice: MatchViewLine["voice"] = "pbp"): MatchViewLine {
  return { seq, text: `${seq}`, beatId, voice };
}

function frame(seq: number): MatchViewFrame {
  return { seq } as MatchViewFrame;
}

const LINES: MatchViewLine[] = [
  line(1, "match_opening"),
  line(5, "restart_corner", "moment"),
  line(6, "shot_saved"),
  line(6, "shot_saved", "color"),
  line(9, "foul"),
  line(12, "shot_goal"),
  line(40, "full_time"),
];

describe("matchLineLevel", () => {
  it("puts goals, cards, structure, penalty, injury, subs and woodwork at Key", () => {
    for (const beat of ["shot_goal", "card_yellow", "card_red", "restart_penalty", "injury", "substitution", "half_time", "shot_woodwork"]) {
      expect(matchLineLevel(line(1, beat))).toBe("key");
    }
  });

  it("puts other shots, set-piece moments and analyst lines at Extended", () => {
    expect(matchLineLevel(line(1, "shot_saved"))).toBe("extended");
    expect(matchLineLevel(line(1, "restart_corner", "moment"))).toBe("extended");
    expect(matchLineLevel(line(1, "shot_goal", "color"))).toBe("extended");
    expect(matchLineLevel(line(1, "restart_penalty", "moment"))).toBe("key");
  });

  it("leaves routine play for Full and honours a line's own level", () => {
    expect(matchLineLevel(line(1, "foul"))).toBe("full");
    expect(matchLineLevel({ ...line(1, "foul"), level: "key" } as MatchViewLine)).toBe("key");
    expect(lineVisibleAtLevel(line(1, "shot_saved"), "key")).toBe(false);
    expect(lineVisibleAtLevel(line(1, "shot_saved"), "full")).toBe(true);
  });
});

describe("buildLineTimeline / timelinePosition", () => {
  it("keeps only lines of the chosen level, as indices into the stream", () => {
    expect(buildLineTimeline(LINES, "key")).toEqual([0, 5, 6]);
    expect(buildLineTimeline(LINES, "extended")).toEqual([0, 1, 2, 3, 5, 6]);
    expect(buildLineTimeline(LINES, "full")).toHaveLength(LINES.length);
  });

  it("finds the latest visible line at or before the cursor", () => {
    const key = buildLineTimeline(LINES, "key");
    expect(timelinePosition(key, 0)).toBe(0);
    expect(timelinePosition(key, 3)).toBe(0);
    expect(timelinePosition(key, 5)).toBe(1);
    expect(timelinePosition(key, 99)).toBe(2);
    expect(timelinePosition([2, 4], 1)).toBe(-1);
  });
});

describe("frameIndexForSeq", () => {
  const frames = [frame(1), frame(2), frame(2), frame(5), frame(9)];

  it("returns the last frame with seq <= the line's seq", () => {
    expect(frameIndexForSeq(frames, 2)).toBe(2);
    expect(frameIndexForSeq(frames, 4)).toBe(2);
    expect(frameIndexForSeq(frames, 9)).toBe(4);
    expect(frameIndexForSeq(frames, 100)).toBe(4);
    expect(frameIndexForSeq(frames, 0)).toBe(-1);
    expect(frameIndexForSeq([], 3)).toBe(-1);
  });
});

describe("lineTone", () => {
  it("reads the tone from the beat, not the text", () => {
    expect(lineTone(line(1, "shot_goal"))).toBe("goal");
    expect(lineTone(line(1, "shot_saved"))).toBe("danger");
    expect(lineTone(line(1, "card_red"))).toBe("danger");
    expect(lineTone(line(1, "shot_taken"))).toBe("shot");
    expect(lineTone(line(1, "foul"))).toBe("default");
    expect(lineTone(line(1, "shot_goal", "color"))).toBe("default");
  });
});

describe("lineDwellMs", () => {
  it("weights by importance and adds game time to the next line", () => {
    expect(lineDwellMs(line(1, "foul"), 0, 1)).toBe(LINE_DWELL_MS.minor);
    expect(lineDwellMs(line(1, "card_yellow"), 0, 1)).toBe(LINE_DWELL_MS.major);
    expect(lineDwellMs(line(1, "foul"), 5, 1)).toBe(LINE_DWELL_MS.minor + 5 * DWELL_PER_GAME_MINUTE_MS);
    expect(lineDwellMs(line(1, "foul", "color"), 0, 1)).toBe(LINE_DWELL_MS.minor + COLOR_LINE_DELAY_MS);
  });

  it("divides by speed but never shortens the goal hold", () => {
    expect(lineDwellMs(line(1, "foul"), 10, 4)).toBe(
      Math.round((LINE_DWELL_MS.minor + 10 * DWELL_PER_GAME_MINUTE_MS) / 4),
    );
    expect(lineDwellMs(line(1, "shot_goal"), 0, 2)).toBe(LINE_DWELL_MS.goal / 2 + GOAL_HIGHLIGHT_MS);
  });

  it("ignores a negative gap at the half-time clock reset", () => {
    expect(lineDwellMs(line(1, "half_time"), -3, 1)).toBe(LINE_DWELL_MS.minor);
  });
});

describe("clockGameMinutes", () => {
  it("counts stoppage time and seconds", () => {
    expect(
      clockGameMinutes({ period: "first_half", minute: 45, stoppageMinute: 2, second: 30 } as never),
    ).toBe(47.5);
  });
});

describe("lineMinuteLabel / stripClockPrefix", () => {
  it("formats the minute column and drops the clock from the text", () => {
    expect(lineMinuteLabel({ period: "first_half", minute: 45, stoppageMinute: 2, second: 5 } as never)).toBe("45+2'");
    expect(lineMinuteLabel({ period: "second_half", minute: 67, stoppageMinute: 0, second: 5 } as never)).toBe("67'");
    expect(stripClockPrefix("67'12  TOR! Müller!")).toBe("TOR! Müller!");
    expect(stripClockPrefix("45+1'03  Ecke für Nord.")).toBe("Ecke für Nord.");
    expect(stripClockPrefix("Ohne Uhr.")).toBe("Ohne Uhr.");
  });
});
