import { useMemo } from "react";
import type { BodyRegion } from "../../medical/medical-symptoms.ts";
import type { ClubMedicalState } from "../../medical/diagnosis-queue.ts";
import { physioAssistMinigame } from "../../medical/physio-assist.ts";
import { formatPlayerName } from "../../types/player-display.ts";
import type { Player } from "../../types/player.ts";
import { MedicalXraySlideMinigame } from "./MedicalXraySlideMinigame.tsx";
import { RehabMinigamePanel } from "./RehabMinigamePanel.tsx";
import { useT } from "../../i18n/react.ts";

export function MedicalPhysioTreatModal({
  player,
  targetRegion,
  season,
  week,
  masterSeed,
  medicalState,
  onPhysioComplete,
  onClose,
}: {
  player: Player;
  targetRegion: BodyRegion;
  season: number;
  week: number;
  masterSeed: number;
  medicalState: ClubMedicalState;
  onPhysioComplete: (success: boolean) => void;
  onClose: () => void;
}) {
  const t = useT();
  const minigame = useMemo(
    () => physioAssistMinigame(masterSeed, season, week, player.id),
    [masterSeed, season, week, player.id],
  );

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className={
          minigame === "xray_slide"
            ? "modal-panel medical-physio-modal medical-physio-modal--xray"
            : "modal-panel medical-physio-modal medical-physio-modal--rehab"
        }
        role="dialog"
        aria-labelledby="medical-physio-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="modal-head">
          <h2 id="medical-physio-title">{t("medical.physio.modalTitle", { name: formatPlayerName(player) })}</h2>
          <button type="button" className="ui-btn ui-btn--ghost ui-btn--sm" onClick={onClose}>
            {t("inbox.modal.close")}
          </button>
        </header>
        {minigame === "xray_slide" ? (
          <MedicalXraySlideMinigame
            targetRegion={targetRegion}
            onSuccess={() => onPhysioComplete(true)}
          />
        ) : (
          <RehabMinigamePanel
            playerId={player.id}
            playerName={formatPlayerName(player)}
            season={season}
            week={week}
            masterSeed={masterSeed}
            medicalState={medicalState}
            bypassWeeklyCap
            embedded
            onComplete={(success) => onPhysioComplete(success)}
          />
        )}
      </div>
    </div>
  );
}
