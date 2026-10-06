import type { LucideIcon } from "lucide-react";

/** Lucide at 16px for help headings and icon lists (design.md — no emoji in UI). */
export function HelpInlineIcon({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <span className="help-inline-icon" aria-hidden="true">
      <Icon size={16} strokeWidth={2.5} />
    </span>
  );
}
