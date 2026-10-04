import {
  transferWindowAmbienceHint,
  transferWindowDisplay,
} from "../../i18n/calendar-display.ts";
import { transferWindowKind } from "../../sim/transfer-windows.ts";
import { transferAmbiencePhotoUrl } from "../assets/hub-photos.ts";

/** WIREFRAME: subtle transfer-window mood strip — text/CSS only. */
export function TransferWindowAmbience({ week }: { week: number }) {
  const kind = transferWindowKind(week);
  if (!kind) return null;

  const label = transferWindowDisplay(week);
  const hint = transferWindowAmbienceHint(kind);

  const photo = transferAmbiencePhotoUrl();

  return (
    <div
      className={`transfer-ambience transfer-ambience--${kind} transfer-ambience--photo`}
      style={{ ["--transfer-ambience-photo" as string]: `url(${photo})` }}
      aria-label={label}
    >
      <p className="transfer-ambience-label">
        <span className="transfer-ambience-dot" aria-hidden="true">●</span>
        {label}
        <span className="transfer-ambience-hint"> · {hint}</span>
      </p>
    </div>
  );
}
