import { useCallback, useEffect, useMemo, useState } from "react";
import type { MatchView, MatchViewFrame } from "@fussballmanager/shared";
import { frameDurationMs } from "./lerp";
import { compressGkCbRecycleFrames } from "./match-presentation.ts";

export function frameAt(view: MatchView, index: number): MatchViewFrame {
  return view.frames[Math.min(Math.max(index, 0), view.frames.length - 1)] ??
    view.kickoff;
}

export function useMatchPlayback(view: MatchView | null) {
  const presented = useMemo(
    () => (view ? compressGkCbRecycleFrames(view) : null),
    [view],
  );
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const durationMs = frameDurationMs(speed);

  useEffect(() => {
    setIndex(0);
    setPlaying(false);
  }, [presented?.seed, presented?.eventCount]);

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
    }, durationMs);
    return () => window.clearTimeout(timer);
  }, [presented, playing, index, durationMs]);

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

  const visibleLines = useMemo(() => {
    if (!presented || !frame) {
      return [];
    }
    const seq = frame.seq;
    return presented.lines.filter((line) => line.seq <= seq);
  }, [presented, frame]);

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

  return {
    index,
    frame,
    previous,
    frameDurationMs: durationMs,
    playing,
    speed,
    setSpeed,
    visibleLines,
    play,
    pause,
    restart,
    toggle,
    stepBack: () => stepBy(-1),
    stepForward: () => stepBy(1),
  };
}
