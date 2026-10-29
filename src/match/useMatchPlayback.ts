import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MatchView, MatchViewFrame, MatchViewLine } from "@fussballmanager/shared";
import type { MatchHighlightLevel } from "./match-highlight-level.ts";
import {
  buildLineTimeline,
  clockGameMinutes,
  frameIndexForSeq,
  lineDwellMs,
  timelinePosition,
} from "./text-playback.ts";

export { frameAt } from "./text-playback.ts";

const FIRST_LINE_DELAY_MS = 300;

export type MatchPlaybackOptions = {
  /**
   * Playback restarts when this changes. Default: seed + event count. The career match passes its
   * fixture key, so a replay with a substitution (PRD 27) keeps the cursor: the stream is identical
   * up to the paused line.
   */
  resetKey?: string;
  /** Seqs where the timer halts (own injury, half-time); `onStop` fires once per crossing. */
  stops?: readonly number[];
  onStop?: (seq: number) => void;
};

/**
 * Career matchday playback, driven by commentary lines (design.md §9.15, text-first).
 * `cursor` is an index into `view.lines` and sets the match moment (clock, score, frame); the stream
 * shows the lines at or before it that play at `level`. Switching levels never moves the clock.
 * Step back / forward and the timer move between lines of the chosen level.
 */
export function useMatchPlayback(
  view: MatchView | null,
  level: MatchHighlightLevel,
  options: MatchPlaybackOptions = {},
) {
  const [cursor, setCursor] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const resetKey = options.resetKey ?? `${view?.seed}:${view?.eventCount}`;
  const stopsRef = useRef(options);
  stopsRef.current = options;

  useEffect(() => {
    setCursor(0);
    setPlaying(false);
  }, [resetKey]);

  const lineCount = view?.lines.length ?? 0;
  useEffect(() => {
    setCursor((current) => Math.min(current, Math.max(0, lineCount - 1)));
  }, [lineCount]);

  const lines = view?.lines;
  const timeline = useMemo(() => (lines ? buildLineTimeline(lines, level) : []), [lines, level]);
  const position = timelinePosition(timeline, cursor);
  const last = timeline.length - 1;
  const lastLineIndex = timeline[last];
  const atEnd = lastLineIndex !== undefined && cursor >= lastLineIndex;
  /** The cursor sits on a line this level hides (the level changed): back lands on the visible one. */
  const betweenLines = position >= 0 && cursor > (timeline[position] ?? cursor);

  const frameIndexFor = useCallback(
    (lineIndex: number | undefined): number => {
      if (!view || lineIndex === undefined) return -1;
      if (lastLineIndex !== undefined && lineIndex >= lastLineIndex) return view.frames.length - 1;
      const line = view.lines[lineIndex];
      return line ? frameIndexForSeq(view.frames, line.seq) : -1;
    },
    [view, lastLineIndex],
  );

  const frameIndex = frameIndexFor(cursor);
  const frame: MatchViewFrame | null = view ? (view.frames[frameIndex] ?? view.kickoff) : null;
  const previousFrameIndex = frameIndexFor(betweenLines ? timeline[position] : timeline[position - 1]);
  const previous: MatchViewFrame | null = view
    ? (view.frames[previousFrameIndex] ?? view.kickoff)
    : null;

  const currentLine: MatchViewLine | null = lines?.[cursor] ?? null;
  const nextLineIndex = timeline[position + 1];
  const nextLine: MatchViewLine | null = nextLineIndex === undefined ? null : (lines?.[nextLineIndex] ?? null);
  const dwellMs = useMemo(() => {
    if (!view || !currentLine) return FIRST_LINE_DELAY_MS;
    const nextFrame = nextLine ? view.frames[frameIndexForSeq(view.frames, nextLine.seq)] : null;
    const gap =
      frame && nextFrame ? clockGameMinutes(nextFrame.clock) - clockGameMinutes(frame.clock) : 0;
    return lineDwellMs(currentLine, gap, speed);
  }, [view, currentLine, nextLine, frame, speed]);

  useEffect(() => {
    if (!view || !playing) return;
    if (atEnd || nextLineIndex === undefined) {
      setPlaying(false);
      return;
    }
    const timer = window.setTimeout(() => {
      const from = view.lines[cursor]?.seq ?? -1;
      const to = view.lines[nextLineIndex]?.seq ?? from;
      const stop = stopsRef.current.stops?.find((seq) => seq > from && seq <= to);
      if (stop === undefined) {
        setCursor(nextLineIndex);
        return;
      }
      // Land on the last line at or before the stop, whatever its level, and hold there.
      let landing = nextLineIndex;
      while (landing > cursor && (view.lines[landing]?.seq ?? 0) > stop) landing -= 1;
      setCursor(landing);
      setPlaying(false);
      stopsRef.current.onStop?.(stop);
    }, dwellMs);
    return () => window.clearTimeout(timer);
  }, [view, playing, atEnd, cursor, nextLineIndex, dwellMs]);

  const visibleLines = useMemo(
    () =>
      lines ? timeline.slice(0, position + 1).map((index) => lines[index]!) : [],
    [lines, timeline, position],
  );

  const play = useCallback(() => {
    if (!view) return;
    if (atEnd) setCursor(0);
    setPlaying(true);
  }, [view, atEnd]);

  const pause = useCallback(() => setPlaying(false), []);

  const restart = useCallback(() => {
    setPlaying(false);
    setCursor(0);
  }, []);

  const toggle = useCallback(() => {
    if (!view) return;
    if (playing) {
      setPlaying(false);
      return;
    }
    if (atEnd) setCursor(0);
    setPlaying(true);
  }, [view, playing, atEnd]);

  const stepBy = useCallback(
    (delta: number) => {
      if (last < 0) return;
      setPlaying(false);
      const from = delta < 0 && betweenLines ? position + 1 : position;
      const target = timeline[Math.min(Math.max(from + delta, 0), last)];
      if (target !== undefined) setCursor(target);
    },
    [timeline, position, last, betweenLines],
  );
  const stepBack = useCallback(() => stepBy(-1), [stepBy]);
  const stepForward = useCallback(() => stepBy(1), [stepBy]);

  const goToEnd = useCallback(() => {
    if (!lines || lines.length === 0) return;
    setPlaying(false);
    setCursor(lines.length - 1);
  }, [lines]);

  return {
    /** Position in the line timeline (-1 before the first visible line). */
    index: position,
    canStepBack: position > 0 || betweenLines,
    frameIndex,
    frame,
    previous,
    frameDurationMs: dwellMs,
    playing,
    speed,
    setSpeed,
    visibleLines,
    presentedFrameCount: timeline.length,
    atEnd,
    play,
    pause,
    restart,
    toggle,
    stepBack,
    stepForward,
    goToEnd,
  };
}
