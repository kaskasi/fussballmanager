import {
  isSummerTransferWindow,
  isWinterTransferWindow,
} from "./game-calendar.ts";

/** PRD 05 — four weeks in August (Saisonstart) and four in January. */
export const TRANSFER_WINDOW_HINT =
  "Sommer: erste 4 August-Wochen · Winter: erste 4 Januar-Wochen.";

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
