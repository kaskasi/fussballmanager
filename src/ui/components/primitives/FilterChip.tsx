/** PRD 20 — unified filter pill (design.md §4.1) */
import type { ReactNode } from "react";
import { Hint } from "../Hint.tsx";

export function FilterChip({
  active,
  onClick,
  children,
  title,
  hint,
  size = "default",
  className = "",
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  title?: string;
  hint?: string;
  size?: "default" | "dense";
  className?: string;
}) {
  const sizeClass = size === "dense" ? " filter-chip--dense" : "";
  const chip = (
    <button
      type="button"
      className={`filter-chip${active ? " is-active" : ""}${sizeClass}${className ? ` ${className}` : ""}`}
      aria-pressed={active}
      title={title}
      onClick={onClick}
    >
      {children}
    </button>
  );
  if (!hint) return chip;
  return <Hint text={hint}>{chip}</Hint>;
}
