import { Stethoscope } from "lucide-react";
import { formatPlayerName } from "../../types/player-display.ts";
import type { Player } from "../../types/player.ts";
import type { PendingDiagnosis } from "../../medical/diagnosis-queue.ts";
import { diagnosisRevealLabel } from "../../medical/injury-care.ts";
import { PlayerPortrait } from "./PlayerPortrait.tsx";
import { ModalShell } from "./primitives/ModalShell.tsx";
import { useT } from "../../i18n/react.ts";

export function MedicalDoctorExamModal({
  player,
  pending,
  onConfirm,
  onClose,
}: {
  player: Player;
  pending: PendingDiagnosis;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const t = useT();
  const symptomKey = pending.symptom_key ?? "medical.symptom.genericPain";
  return (
    <ModalShell
      ariaLabel={t("medical.exam.modalTitle")}
      title={
        <h3 className="medical-exam-modal-title">
          <Stethoscope size={18} aria-hidden /> {t("medical.exam.modalTitle")}
        </h3>
      }
      onClose={onClose}
      panelClassName="medical-exam-modal"
    >
      <div className="medical-exam-player">
        <PlayerPortrait seed={player.portrait_seed} size="md" />
        <strong>{formatPlayerName(player)}</strong>
      </div>
      <blockquote className="medical-exam-quote">{t(symptomKey)}</blockquote>
      <p className="medical-muted">{t("medical.exam.doctorIntro")}</p>
      <div className="medical-exam-verdict">
        <span className="medical-exam-label">{t("medical.exam.verdict")}</span>
        <strong>{diagnosisRevealLabel(pending)}</strong>
        <span className="medical-muted">
          {t("medical.exam.rehabHint", { weeks: pending.base_weeks_remaining })}
        </span>
        {pending.needs_surgery ? (
          <span className="medical-exam-op-hint">{t("medical.exam.surgeryLikely")}</span>
        ) : null}
      </div>
      <footer className="medical-exam-actions">
        <button type="button" className="ui-btn ui-btn--ghost" onClick={onClose}>
          {t("inbox.modal.close")}
        </button>
        <button type="button" className="ui-btn ui-btn--sm" onClick={onConfirm}>
          {t("medical.exam.confirm")}
        </button>
      </footer>
    </ModalShell>
  );
}
