import { useSyncExternalStore } from "react";

const MOBILE_NARROW_QUERY = "(max-width: 720px)";

function subscribeMobileNarrow(onChange: () => void): () => void {
  const media = window.matchMedia(MOBILE_NARROW_QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

function getMobileNarrowSnapshot(): boolean {
  return window.matchMedia(MOBILE_NARROW_QUERY).matches;
}

/** True on phone-width viewports — desktop layout unchanged above 720px. */
export function useMobileNarrow(): boolean {
  return useSyncExternalStore(subscribeMobileNarrow, getMobileNarrowSnapshot, () => false);
}
