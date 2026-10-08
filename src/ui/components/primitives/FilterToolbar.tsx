/** PRD 20 — toolbar wrapper for FilterChip rows */
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
      className={`filter-toolbar${className ? ` ${className}` : ""}`}
      role="toolbar"
      aria-label={ariaLabel}
    >
      {children}
    </div>
  );
}
