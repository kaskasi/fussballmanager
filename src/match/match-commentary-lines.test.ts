import { describe, expect, it } from "vitest";
import {
  filterVisibleCommentaryLines,
  latestPlayByPlayAndColor,
} from "./match-commentary-lines.ts";

describe("match-commentary-lines", () => {
  it("hides color until reveal seq catches up", () => {
    const lines = [
      { seq: 5, text: "PBP", voice: "pbp" as const },
      { seq: 5, text: "Color", voice: "color" as const },
      { seq: 6, text: "Next", voice: "pbp" as const },
    ];
    expect(filterVisibleCommentaryLines(lines, 5, 4)).toEqual([
      { seq: 5, text: "PBP", voice: "pbp" },
    ]);
    expect(filterVisibleCommentaryLines(lines, 6, 5)).toHaveLength(3);
  });

  it("splits latest pbp and color", () => {
    const { latestPbp, latestColor } = latestPlayByPlayAndColor([
      { seq: 1, text: "a" },
      { seq: 2, text: "b", voice: "color" },
      { seq: 3, text: "c" },
    ]);
    expect(latestPbp?.text).toBe("c");
    expect(latestColor?.text).toBe("b");
  });
});
