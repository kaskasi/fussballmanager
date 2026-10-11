/** Playtest shortcuts (calendar fast-forward). Dev server or `?playtest=1` on the URL. */
export function isPlaytestShortcutsEnabled(): boolean {
  if (import.meta.env.DEV) return true;
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("playtest") === "1";
}
