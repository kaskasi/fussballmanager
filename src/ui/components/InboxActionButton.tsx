import {
  ArrowUp,
  Clock,
  Dumbbell,
  PenLine,
  RefreshCw,
  type LucideIcon,
} from "lucide-react";
import type { DecisionAction } from "../../youth/decision-inbox.ts";

function inboxActionIcon(action: DecisionAction): LucideIcon {
  switch (action) {
    case "loan":
      return RefreshCw;
    case "promote":
      return ArrowUp;
    case "contract":
      return PenLine;
    case "training_focus":
      return Dumbbell;
    case "dismiss":
      return Clock;
    default:
      return Clock;
  }
}

/** PRD 09.2 — Lucide action buttons (no emoji in shipped UI). */
export function InboxActionButton({
  action,
  label,
  primary = false,
  disabled = false,
  title,
  onClick,
}: {
  action: DecisionAction;
  label: string;
  primary?: boolean;
  disabled?: boolean;
  title?: string;
  onClick: () => void;
}) {
  const Icon = inboxActionIcon(action);
  const className = disabled
    ? "inbox-action is-disabled"
    : primary
      ? "inbox-action is-primary"
      : "inbox-action";

  return (
    <button type="button" className={className} disabled={disabled} title={title} onClick={onClick}>
      <Icon size={18} strokeWidth={2.25} aria-hidden />
      <span>{label}</span>
    </button>
  );
}
