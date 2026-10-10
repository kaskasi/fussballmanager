import { MedicalBodyWireframe } from "./MedicalBodyWireframe.tsx";
import type { BodyRegion } from "../../medical/medical-symptoms.ts";
import { formatPlayerName } from "../../types/player-display.ts";
import type { Player } from "../../types/player.ts";
import { useT } from "../../i18n/react.ts";

export function MedicalPhysioTreatModal({
  player,
  targetRegion,
  onTreat,
  onClose,
}: {
  player: Player;
  targetRegion: BodyRegion;
  onTreat: (region: BodyRegion) => void;
  onClose: () => void;
}) {
  const t = useT();
  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal-panel medical-physio-modal"
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
        <MedicalBodyWireframe
          highlightRegion={targetRegion}
          onTreatRegion={(region) => {
            if (region === targetRegion) onTreat(region);
          }}
        />
        <p className="medical-muted">{t("medical.physio.modalHint")}</p>
      </div>
    </div>
  );
}
