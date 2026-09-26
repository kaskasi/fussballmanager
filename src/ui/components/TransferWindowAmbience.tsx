import {
  transferWindowKind,
  transferWindowLabel,
  type TransferWindowKind,
} from "../../sim/transfer-windows.ts";

const ART: Record<TransferWindowKind, { left: string; label: string }> = {
  summer: {
    left: "/assets/transfer/summer-left.png",
    label: "Transfers offen",
  },
  winter: {
    left: "/assets/transfer/winter-left.png",
    label: "Winter-Transfers",
  },
};

/**
 * WIREFRAME: subtle transfer-window mood strip — not a toast, not full-screen.
 */
export function TransferWindowAmbience({ week }: { week: number }) {
  const kind = transferWindowKind(week);
  if (!kind) return null;

  const art = ART[kind];
  const label = transferWindowLabel(week);

  return (
    <div className={`transfer-ambience transfer-ambience--${kind}`} aria-label={label}>
      <img src={art.left} alt="" className="transfer-ambience-art transfer-ambience-art--left" />
      <img src={art.left} alt="" className="transfer-ambience-art transfer-ambience-art--right" />
      <p className="transfer-ambience-label">
        <span className="transfer-ambience-dot" aria-hidden="true">●</span>
        {label}
        <span className="transfer-ambience-hint"> · {art.label}</span>
      </p>
    </div>
  );
}
