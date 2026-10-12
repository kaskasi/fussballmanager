/** Modal wrapper around SaveManagerPanel */
import { useT } from "../../i18n/react.ts";
import type { SaveGame } from "../../persistence/savegame-model.ts";
import { SaveManagerPanel } from "./SaveManagerPanel.tsx";

export function SaveManagerModal({
  activeSlot,
  currentSave,
  onClose,
  onLoadSlot,
  onNewGameInSlot,
  onApplyCloudSave,
}: {
  activeSlot: number;
  currentSave: SaveGame;
  onClose: () => void;
  onLoadSlot: (slot: number) => void;
  onNewGameInSlot: (slot: number) => void;
  onApplyCloudSave: (save: SaveGame, slot: number) => void;
}) {
  const t = useT();

  return (
    <div className="save-modal-backdrop" role="presentation" onClick={onClose}>
      <section
        className="save-modal"
        role="dialog"
        aria-labelledby="save-modal-title"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="save-modal-header">
          <h2 id="save-modal-title">{t("shell.menu.saves")}</h2>
          <button type="button" className="save-modal-close" onClick={onClose} aria-label={t("shell.modal.close")}>
            ✕
          </button>
        </header>
        <SaveManagerPanel
          activeSlot={activeSlot}
          currentSave={currentSave}
          onLoadSlot={(slot) => {
            onLoadSlot(slot);
            onClose();
          }}
          onNewGameInSlot={(slot) => {
            onNewGameInSlot(slot);
            onClose();
          }}
          onApplyCloudSave={onApplyCloudSave}
          onAfterImport={onClose}
        />
      </section>
    </div>
  );
}

export { MAX_SAVE_SLOTS } from "./SaveManagerPanel.tsx";
