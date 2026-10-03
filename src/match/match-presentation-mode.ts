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
  if (text.includes("TOR!") || text.includes("und trifft!")) {
    return "goal";
  }
  if (
    text.includes("zwingt den Keeper zur Parade") ||
    text.includes("trifft den Pfosten") ||
    text.includes("Elfmeter") ||
    text.includes("sieht Rot") ||
    text.includes("Gelb-Rot")
  ) {
    return "danger";
  }
  return "default";
}
