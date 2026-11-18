import {
  isSummerTransferWindow,
  isWinterTransferWindow,
} from "./game-calendar.ts";

/** PRD 05 / PRD 35 — summer = pre-season KW 29–32, winter KW 52, 1, 2. */
export const TRANSFER_WINDOW_HINT = "Sommer: KW 29–32 · Winter: KW 52–2.";

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
