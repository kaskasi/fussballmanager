import { useMemo } from "react";
import type { BodyRegion } from "../../medical/medical-symptoms.ts";
import type { ClubMedicalState } from "../../medical/diagnosis-queue.ts";
import { physioAssistMinigame } from "../../medical/physio-assist.ts";
import { formatPlayerName } from "../../types/player-display.ts";
import type { Player } from "../../types/player.ts";
import { MedicalXraySlideMinigame } from "./MedicalXraySlideMinigame.tsx";
import { RehabMinigamePanel } from "./RehabMinigamePanel.tsx";
import { ModalShell } from "./primitives/ModalShell.tsx";
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

  const finishAssist = (success: boolean) => {
    onPhysioComplete(success);
  };

  return (
    <ModalShell
      variant="tc"
      ariaLabel={t("medical.physio.modalTitle", { name: formatPlayerName(player) })}
      title={<h2 className="tc-modal__title">{t("medical.physio.modalTitle", { name: formatPlayerName(player) })}</h2>}
      onClose={onClose}
      panelClassName={minigame === "xray_slide" ? "tc-modal--wide medical-physio-modal--xray" : "medical-physio-modal--rehab"}
    >
      {minigame === "xray_slide" ? (
        <MedicalXraySlideMinigame targetRegion={targetRegion} onComplete={finishAssist} />
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
          onComplete={finishAssist}
        />
      )}
    </ModalShell>
  );
}
