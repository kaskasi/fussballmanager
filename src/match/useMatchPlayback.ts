import { useCallback, useEffect, useMemo, useState } from "react";
import type { MatchView, MatchViewFrame } from "@fussballmanager/shared";
import { frameDurationMs } from "./lerp";

export function frameAt(view: MatchView, index: number): MatchViewFrame {
  return view.frames[Math.min(Math.max(index, 0), view.frames.length - 1)] ??
    view.kickoff;
}

export function useMatchPlayback(view: MatchView | null) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const durationMs = frameDurationMs(speed);

  useEffect(() => {
    setIndex(0);
    setPlaying(false);
  }, [view?.seed, view?.eventCount]);

  useEffect(() => {
    if (!view || !playing) {
      return;
    }
    const last = view.frames.length - 1;
    if (index >= last) {
      setPlaying(false);
      return;
    }
    const timer = window.setTimeout(() => {
      setIndex((current) => Math.min(current + 1, last));
    }, durationMs);
    return () => window.clearTimeout(timer);
  }, [view, playing, index, durationMs]);

  const frame = useMemo(
    () => (view ? frameAt(view, index) : null),
    [view, index],
  );

  const previous = useMemo(() => {
    if (!view) {
      return null;
    }
    if (index <= 0) {
      return view.kickoff;
    }
    return frameAt(view, index - 1);
  }, [view, index]);

  const visibleLines = useMemo(() => {
    if (!view || !frame) {
      return [];
    }
    const seq = frame.seq;
    return view.lines.filter((line) => line.seq <= seq);
  }, [view, frame]);

  const play = useCallback(() => {
    if (!view) {
      return;
    }
    if (index >= view.frames.length - 1) {
      setIndex(0);
    }
    setPlaying(true);
  }, [view, index]);

  const pause = useCallback(() => setPlaying(false), []);

  const restart = useCallback(() => {
    setPlaying(false);
    setIndex(0);
  }, []);

  const toggle = useCallback(() => {
    if (!view) {
      return;
    }
    if (playing) {
      setPlaying(false);
      return;
    }
    if (index >= view.frames.length - 1) {
      setIndex(0);
    }
    setPlaying(true);
  }, [view, playing, index]);

  const stepBy = useCallback(
    (delta: number) => {
      if (!view) {
        return;
      }
      setPlaying(false);
      setIndex((current) =>
        Math.min(Math.max(current + delta, 0), view.frames.length - 1),
      );
    },
    [view],
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
