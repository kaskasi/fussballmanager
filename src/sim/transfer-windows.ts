import {
  isSummerTransferWindow,
  isWinterTransferWindow,
} from "./game-calendar.ts";

/** PRD 05 — summer KW 35–36 (season start), winter KW 2–4 (January). */
export const TRANSFER_WINDOW_HINT =
  "Sommer KW 35–36 (Saisonstart, Ende August) und Winter KW 2–4.";

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
