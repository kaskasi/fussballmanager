import { campLeaderDisplayName } from "../../youth/camp-leader-hire.ts";
import { campNationById, type YouthCamp } from "../../youth/satellite-camps.ts";

/** Confirm before releasing a hired camp leader. */
export function CampLeaderDismissModal({
  camp,
  onConfirm,
  onCancel,
}: {
  camp: YouthCamp;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const nation = campNationById(camp.id);
  const leaderName = campLeaderDisplayName(camp) ?? "Camp-Leiter";

  return (
    <div className="modal-backdrop" role="presentation">
      <dialog className="negotiation-modal camp-leader-dismiss-modal" open aria-labelledby="camp-leader-dismiss-title">
        <header className="negotiation-head">
          <p className="eyebrow">{nation?.label ?? "Camp"}</p>
          <h2 id="camp-leader-dismiss-title">Leiter entlassen?</h2>
          <p className="negotiation-meta">{leaderName}</p>
        </header>
        <p className="transfer-risk-copy">
          Du hast gerade erst einen Leiter gefunden. Willst du <strong>{leaderName}</strong> wirklich wieder
          abziehen? Das Camp läuft dann ohne Leiter — Intake und Training leiden.
        </p>
        <footer className="negotiation-actions">
          <button type="button" className="ui-btn ui-btn--ghost" onClick={onCancel}>
            Behalten
          </button>
          <button type="button" className="ui-btn ui-btn--primary" onClick={onConfirm}>
            Trotzdem entlassen
          </button>
        </footer>
      </dialog>
    </div>
  );
}
