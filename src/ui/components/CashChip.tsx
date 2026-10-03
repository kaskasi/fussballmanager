/**
 * WIREFRAME: PRD 14.6 / 14.7 — Kasse
 *
 * 💶 € 2.0M   ← nach Ausgabe 2s fett/aufblitzen
 */
import { useEffect, useRef, useState } from "react";
import { formatClubCash } from "../../economy/club-finances.ts";

const PULSE_MS = 2000;

export function CashChip({
  cash,
  compact = false,
}: {
  cash: number;
  compact?: boolean;
}) {
  const previous = useRef<number | null>(null);
  const [pulse, setPulse] = useState<"up" | "down" | null>(null);

  useEffect(() => {
    const last = previous.current;
    previous.current = cash;
    if (last == null || last === cash) return;
    setPulse(cash < last ? "down" : "up");
    const timer = window.setTimeout(() => setPulse(null), PULSE_MS);
    return () => window.clearTimeout(timer);
  }, [cash]);

  const label = `Kasse ${formatClubCash(cash)}`;
  return (
    <p
      className={[
        "cash-chip",
        compact ? "is-compact" : "",
        pulse === "down" ? "is-pulse-down" : "",
        pulse === "up" ? "is-pulse-up" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-live="polite"
      aria-label={label}
      title={label}
    >
      <span aria-hidden="true">💶</span>
      <strong>{formatClubCash(cash)}</strong>
    </p>
  );
}
