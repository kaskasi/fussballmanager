/** PRD 20 — toolbar wrapper for FilterChip rows (tc-chips, design.md §4.3) */
import type { ReactNode } from "react";

export function FilterToolbar({
  ariaLabel,
  children,
  className = "",
}: {
  ariaLabel: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`tc-chips tc-chips--toolbar${className ? ` ${className}` : ""}`}
      role="toolbar"
      aria-label={ariaLabel}
    >
      {children}
    </div>
  );
}
