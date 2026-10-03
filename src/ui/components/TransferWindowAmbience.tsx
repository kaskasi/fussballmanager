import {
  transferWindowKind,
  transferWindowLabel,
  type TransferWindowKind,
} from "../../sim/transfer-windows.ts";

const HINT: Record<TransferWindowKind, string> = {
  summer: "Transfers offen",
  winter: "Winter-Transfers",
};

/** WIREFRAME: subtle transfer-window mood strip — text/CSS only. */
export function TransferWindowAmbience({ week }: { week: number }) {
  const kind = transferWindowKind(week);
  if (!kind) return null;

  const label = transferWindowLabel(week);

  return (
    <div className={`transfer-ambience transfer-ambience--${kind}`} aria-label={label}>
      <p className="transfer-ambience-label">
        <span className="transfer-ambience-dot" aria-hidden="true">●</span>
        {label}
        <span className="transfer-ambience-hint"> · {HINT[kind]}</span>
      </p>
    </div>
  );
}
