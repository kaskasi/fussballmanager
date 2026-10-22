/** WIREFRAME: PRD 11.5 — Spend-Runway before capital buy */
import type { ConstructionSnapshot } from "../../sim/advance-construction.ts";
import { spendRunwayLines, type SpendRunway } from "../../economy/spend-runway.ts";
import { ConstructionCapacityPanel } from "./ConstructionCapacityPanel.tsx";
import { useT } from "../../i18n/react.ts";

export function SpendConfirmSheet({
  title,
  runway,
  earlySeasonHint = false,
  constructionSnapshot = null,
  onConfirm,
  onCancel,
}: {
  title: string;
  runway: SpendRunway;
  earlySeasonHint?: boolean;
  constructionSnapshot?: ConstructionSnapshot | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const t = useT();
  return (
    <div className="modal-backdrop" role="presentation">
      <dialog className="spend-confirm" open aria-labelledby="spend-confirm-title">
        <p className="eyebrow">{t("spend.confirm.eyebrow")}</p>
        <h2 id="spend-confirm-title">{title}</h2>
        <ul className="spend-confirm-lines">
          {spendRunwayLines(runway).map((line) => (
            <li key={line.label} className={line.warn ? "is-warn" : undefined}>
              <span>{line.label}</span>
              <strong>{line.value}</strong>
            </li>
          ))}
        </ul>
        {earlySeasonHint ? (
          <p className="spend-confirm-note" role="status">
            {t("spend.confirm.earlySeason")}
          </p>
        ) : null}
        {runway.belowFloor ? (
          <p className="spend-confirm-warn" role="status">
            {t("spend.confirm.belowFloor")}
          </p>
        ) : null}
        {constructionSnapshot ? (
          <ConstructionCapacityPanel snapshot={constructionSnapshot} compact />
        ) : null}
        <div className="spend-confirm-actions">
          <button type="button" className="spend-confirm-go" onClick={onConfirm}>
            {t("spend.confirm.pay")}
          </button>
          <button type="button" className="spend-confirm-abort" onClick={onCancel}>
            {t("spend.confirm.cancel")}
          </button>
        </div>
      </dialog>
    </div>
  );
}
