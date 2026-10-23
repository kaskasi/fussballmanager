import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GOAL_HIGHLIGHT_MS } from "./goal-highlight.ts";
import type { MatchView } from "@fussballmanager/shared";
import { frameDurationMs, transitionDurationMs } from "./lerp";
import {
  COLOR_LINE_DELAY_MS,
  filterVisibleCommentaryLines,
} from "./match-commentary-lines.ts";
import { compressGkCbRecycleFrames } from "./match-presentation.ts";
import { frameAt } from "./text-playback.ts";

/** Frame-by-frame playback for the sandbox pitch (`Matchday`); the career matchday plays lines via `useMatchPlayback`. */
export function useFramePlayback(view: MatchView | null) {
  const presented = useMemo(
    () => (view ? compressGkCbRecycleFrames(view) : null),
    [view],
  );
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [colorRevealSeq, setColorRevealSeq] = useState(-1);
  const playingRef = useRef(playing);
  playingRef.current = playing;
  const lastGoalHoldSeq = useRef(-1);

  useEffect(() => {
    setIndex(0);
    setPlaying(false);
    setColorRevealSeq(-1);
    lastGoalHoldSeq.current = -1;
  }, [presented?.seed, presented?.eventCount]);

  useEffect(() => {
    if (!presented) {
      return;
    }
    const tick = frameAt(presented, index);
    if (tick.cue !== "goal" || tick.seq === lastGoalHoldSeq.current) {
      return;
    }
    lastGoalHoldSeq.current = tick.seq;
    if (!playingRef.current) {
      return;
    }
    setPlaying(false);
    const resume = window.setTimeout(() => {
      setPlaying(true);
    }, GOAL_HIGHLIGHT_MS);
    return () => window.clearTimeout(resume);
  }, [presented, index]);

  const frame = useMemo(
    () => (presented ? frameAt(presented, index) : null),
    [presented, index],
  );

  const previous = useMemo(() => {
    if (!presented) {
      return null;
    }
    if (index <= 0) {
      return presented.kickoff;
    }
    return frameAt(presented, index - 1);
  }, [presented, index]);

  const roleOf = useMemo(() => {
    if (!presented) {
      return () => undefined;
    }
    const roles = new Map(presented.roster.map((player) => [player.id, player.role]));
    return (playerId: string) => roles.get(playerId);
  }, [presented]);

  const stepDurationMs = useMemo(() => {
    if (!presented || !frame || !previous) {
      return frameDurationMs(speed);
    }
    return transitionDurationMs(previous, frame, presented.home.id, roleOf, speed);
  }, [presented, frame, previous, roleOf, speed]);

  const durationMs = stepDurationMs;

  useEffect(() => {
    if (!presented || !playing) {
      return;
    }
    const last = presented.frames.length - 1;
    if (index >= last) {
      setPlaying(false);
      return;
    }
    const timer = window.setTimeout(() => {
      setIndex((current) => Math.min(current + 1, last));
    }, stepDurationMs);
    return () => window.clearTimeout(timer);
  }, [presented, playing, index, stepDurationMs]);

  useEffect(() => {
    if (!presented || !frame) {
      return;
    }
    const seq = frame.seq;
    setColorRevealSeq((current) => Math.min(current, seq));

    const hasColor = presented.lines.some(
      (line) => line.seq === seq && line.voice === "color",
    );
    if (!hasColor) {
      return;
    }

    if (playing) {
      const delay = Math.max(80, COLOR_LINE_DELAY_MS / speed);
      const timer = window.setTimeout(() => {
        setColorRevealSeq((current) => Math.max(current, seq));
      }, delay);
      return () => window.clearTimeout(timer);
    }

    setColorRevealSeq((current) => Math.max(current, seq));
  }, [presented, frame, frame?.seq, playing, speed]);

  const visibleLines = useMemo(() => {
    if (!presented || !frame) {
      return [];
    }
    return filterVisibleCommentaryLines(
      presented.lines,
      frame.seq,
      colorRevealSeq,
    );
  }, [presented, frame, colorRevealSeq]);

  const play = useCallback(() => {
    if (!presented) {
      return;
    }
    if (index >= presented.frames.length - 1) {
      setIndex(0);
    }
    setPlaying(true);
  }, [presented, index]);

  const pause = useCallback(() => setPlaying(false), []);

  const restart = useCallback(() => {
    setPlaying(false);
    setIndex(0);
  }, []);

  const toggle = useCallback(() => {
    if (!presented) {
      return;
    }
    if (playing) {
      setPlaying(false);
      return;
    }
    if (index >= presented.frames.length - 1) {
      setIndex(0);
    }
    setPlaying(true);
  }, [presented, playing, index]);

  const stepBy = useCallback(
    (delta: number) => {
      if (!presented) {
        return;
      }
      setPlaying(false);
      setIndex((current) =>
        Math.min(Math.max(current + delta, 0), presented.frames.length - 1),
      );
    },
    [presented],
  );

  const goToEnd = useCallback(() => {
    if (!presented || presented.frames.length === 0) {
      return;
    }
    setPlaying(false);
    setIndex(presented.frames.length - 1);
  }, [presented]);

  const presentedFrameCount = presented?.frames.length ?? 0;
  const atEnd =
    presentedFrameCount > 0 ? index >= presentedFrameCount - 1 : false;

  return {
    index,
    frame,
    previous,
    frameDurationMs: durationMs,
    playing,
    speed,
    setSpeed,
    visibleLines,
    presentedFrameCount,
    atEnd,
    play,
    pause,
    restart,
    toggle,
    stepBack: () => stepBy(-1),
    stepForward: () => stepBy(1),
    goToEnd,
  };
}
