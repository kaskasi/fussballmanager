import {
  transferWindowAmbienceHint,
  transferWindowDisplay,
} from "../../i18n/calendar-display.ts";
import { transferWindowKind } from "../../sim/transfer-windows.ts";

/** WIREFRAME: subtle transfer-window mood strip — text/CSS only. */
export function TransferWindowAmbience({ week }: { week: number }) {
  const kind = transferWindowKind(week);
  if (!kind) return null;

  const label = transferWindowDisplay(week);
  const hint = transferWindowAmbienceHint(kind);

  return (
    <div className={`transfer-ambience transfer-ambience--${kind}`} aria-label={label}>
      <p className="transfer-ambience-label">
        <span className="transfer-ambience-dot" aria-hidden="true">●</span>
        {label}
        <span className="transfer-ambience-hint"> · {hint}</span>
      </p>
    </div>
  );
}
