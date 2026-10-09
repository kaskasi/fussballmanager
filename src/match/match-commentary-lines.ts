import type { MatchViewLine } from "@fussballmanager/shared";

export const COLOR_LINE_DELAY_MS = 320;

export function filterVisibleCommentaryLines(
  lines: readonly MatchViewLine[],
  frameSeq: number,
  colorRevealSeq: number,
): MatchViewLine[] {
  return lines.filter((line) => {
    if (line.seq > frameSeq) {
      return false;
    }
    if (line.voice === "color" && line.seq > colorRevealSeq) {
      return false;
    }
    return true;
  });
}

export function latestPlayByPlayAndColor(lines: readonly MatchViewLine[]) {
  const latestPbp = lines
    .filter((line) => line.voice !== "color" && line.voice !== "moment")
    .at(-1);
  const latestColor = lines.filter((line) => line.voice === "color").at(-1);
  return { latestPbp, latestColor };
}
