import {
  isSummerTransferWindow,
  isWinterTransferWindow,
} from "./game-calendar.ts";

/** PRD 05 — summer KW 33–36 (preseason and Spieltag 1–2), winter KW 2–4. */
export const TRANSFER_WINDOW_HINT = "Sommer: KW 33–36 · Winter: KW 2–4.";

export function isTransferWindowOpen(week: number): boolean {
  return isSummerTransferWindow(week) || isWinterTransferWindow(week);
}

export type TransferWindowKind = "summer" | "winter";

export function transferWindowKind(week: number): TransferWindowKind | null {
  if (isSummerTransferWindow(week)) return "summer";
  if (isWinterTransferWindow(week)) return "winter";
  return null;
}

export function transferWindowLabel(week: number): string {
  const kind = transferWindowKind(week);
  if (kind === "summer") return "Sommerfenster";
  if (kind === "winter") return "Winterfenster";
  return "Fenster geschlossen";
}
