import { isSummerTransferWindow, isWinterTransferWindow } from "./game-calendar.ts";

/** PRD 05 — summer KW 27–34, winter KW 2–4. */
export function isTransferWindowOpen(week: number): boolean {
  return isSummerTransferWindow(week) || isWinterTransferWindow(week);
}

export function transferWindowLabel(week: number): string {
  if (!isTransferWindowOpen(week)) return "Fenster geschlossen";
  if (isSummerTransferWindow(week)) return "Sommerfenster";
  return "Winterfenster";
}
