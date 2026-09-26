/** PRD 05 — summer KW 27–34, winter KW 2–4. */
export function isTransferWindowOpen(week: number): boolean {
  if (week >= 27 && week <= 34) return true;
  if (week >= 2 && week <= 4) return true;
  return false;
}

export function transferWindowLabel(week: number): string {
  if (!isTransferWindowOpen(week)) return "Fenster geschlossen";
  if (week >= 27) return "Sommerfenster";
  return "Winterfenster";
}
