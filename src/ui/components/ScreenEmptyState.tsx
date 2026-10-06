import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

/**
 * WIREFRAME: design.md §2 — shared empty / zero-data blocks (game-surfaces.css)
 */
export function ScreenEmptyState({
  icon: Icon,
  title,
  hint,
  children,
  className,
  "aria-label": ariaLabel,
}: {
  icon: LucideIcon;
  title: string;
  hint?: string;
  children?: ReactNode;
  className?: string;
  "aria-label"?: string;
}) {
  const classes = ["screen-empty-state", className].filter(Boolean).join(" ");
  return (
    <section className={classes} aria-label={ariaLabel ?? title}>
      <span className="screen-empty-state-icon" aria-hidden="true">
        <Icon size={28} strokeWidth={2.25} />
      </span>
      <p className="screen-empty-state-title">{title}</p>
      {hint ? <p className="screen-empty-state-hint">{hint}</p> : null}
      {children}
    </section>
  );
}
