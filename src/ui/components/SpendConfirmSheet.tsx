/** WIREFRAME: PRD 11.5 — Spend-Runway before capital buy */
import { spendRunwayLines, type SpendRunway } from "../../economy/spend-runway.ts";

export function SpendConfirmSheet({
  title,
  runway,
  onConfirm,
  onCancel,
}: {
  title: string;
  runway: SpendRunway;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="modal-backdrop" role="presentation">
      <dialog className="spend-confirm" open aria-labelledby="spend-confirm-title">
        <p className="eyebrow">Kasse</p>
        <h2 id="spend-confirm-title">{title}</h2>
        <ul className="spend-confirm-lines">
          {spendRunwayLines(runway).map((line) => (
            <li key={line.label} className={line.warn ? "is-warn" : undefined}>
              <span>{line.label}</span>
              <strong>{line.value}</strong>
            </li>
          ))}
        </ul>
        {runway.belowFloor ? (
          <p className="spend-confirm-warn" role="status">
            Vorstand-Kasse verfehlt, wenn die Saison heute endet. Kauf trotzdem möglich.
          </p>
        ) : null}
        <div className="spend-confirm-actions">
          <button type="button" className="spend-confirm-go" onClick={onConfirm}>
            Zahlen
          </button>
          <button type="button" className="spend-confirm-abort" onClick={onCancel}>
            Abbrechen
          </button>
        </div>
      </dialog>
    </div>
  );
}
