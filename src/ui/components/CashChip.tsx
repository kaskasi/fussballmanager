/**
 * WIREFRAME: design.md §1 — Kasse im Header (rechts, neben Menu)
 */
import { Wallet } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { formatClubCash } from "../../economy/club-finances.ts";
import { t } from "../../i18n/index.ts";

const PULSE_MS = 2000;

export function CashChip({
  cash,
  compact = false,
  onClick,
  warn = false,
}: {
  cash: number;
  compact?: boolean;
  onClick?: () => void;
  /** Unter Vorstandsboden / knappe Liquidität */
  warn?: boolean;
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

  const label = `${t("shell.cash")} ${formatClubCash(cash)}`;
  const className = [
    "cash-chip",
    compact ? "is-compact" : "",
    warn ? "is-warn" : "",
    pulse === "down" ? "is-pulse-down" : "",
    pulse === "up" ? "is-pulse-up" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const body = (
    <>
      <Wallet size={16} strokeWidth={2.2} aria-hidden />
      <strong>{formatClubCash(cash)}</strong>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        className={className}
        aria-live="polite"
        aria-label={label}
        title={label}
        onClick={onClick}
      >
        {body}
      </button>
    );
  }

  return (
    <p className={className} aria-live="polite" aria-label={label} title={label}>
      {body}
    </p>
  );
}
