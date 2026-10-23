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
      variant="tc"
      ariaLabel={t("medical.exam.modalTitle")}
      title={
        <>
          <span className="tc-label">{t("medical.exam.modalTitle")}</span>
          <h2 className="tc-modal__title">{formatPlayerName(player)}</h2>
        </>
      }
      onClose={onClose}
      footer={
        <>
          <button type="button" className="tc-btn tc-btn--ghost" onClick={onClose}>
            {t("inbox.modal.close")}
          </button>
          <button type="button" className="tc-btn tc-btn--primary" onClick={onConfirm}>
            {t("medical.exam.confirm")}
          </button>
        </>
      }
    >
      <div className="tc-stack tc-medical__exam">
        <div className="tc-medical__member">
          <PlayerPortrait seed={player.portrait_seed} nationality={player.nationality} clubId={player.club_id} size="md" />
          <blockquote className="tc-medical__quote">{t(symptomKey)}</blockquote>
        </div>
        <p className="tc-caption">
          <Stethoscope className="tc-icon" aria-hidden /> {t("medical.exam.doctorIntro")}
        </p>
        <dl className="tc-kv">
          <dt>{t("medical.exam.verdict")}</dt>
          <dd>{diagnosisRevealLabel(pending)}</dd>
          <dt>{t("medical.exam.rehabLabel")}</dt>
          <dd>{t("medical.exam.rehabWeeks", { weeks: pending.base_weeks_remaining })}</dd>
        </dl>
        {pending.needs_surgery ? (
          <p className="tc-callout tc-callout--warn">{t("medical.exam.surgeryLikely")}</p>
        ) : null}
      </div>
    </ModalShell>
  );
}
