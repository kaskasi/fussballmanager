import { useCallback, useState } from "react";

export type MatchPresentationMode = "pitch" | "events";

const STORAGE_KEY = "fc-tycoon-match-presentation";

export function readMatchPresentationMode(): MatchPresentationMode {
  if (typeof localStorage === "undefined") {
    return "pitch";
  }
  return localStorage.getItem(STORAGE_KEY) === "events" ? "events" : "pitch";
}

export function writeMatchPresentationMode(mode: MatchPresentationMode): void {
  localStorage.setItem(STORAGE_KEY, mode);
}

export function useMatchPresentationMode(): readonly [
  MatchPresentationMode,
  (mode: MatchPresentationMode) => void,
] {
  const [mode, setMode] = useState<MatchPresentationMode>(() =>
    readMatchPresentationMode(),
  );
  const set = useCallback((next: MatchPresentationMode) => {
    setMode(next);
    writeMatchPresentationMode(next);
  }, []);
  return [mode, set];
}

export type EventLineTone = "goal" | "danger" | "default";

export function eventLineTone(text: string): EventLineTone {
  if (text.includes("GOAL!") || text.includes("it's in!")) {
    return "goal";
  }
  if (
    text.includes("forces a save") ||
    text.includes("rattles the woodwork") ||
    text.includes("penalty") ||
    text.includes("sent off")
  ) {
    return "danger";
  }
  return "default";
}
