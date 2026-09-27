import { useRef, useState } from "react";
import type { SaveGame } from "../../persistence/savegame-model.ts";
import {
  listSaveSlots,
  MAX_SAVE_SLOTS,
  type SaveSlotInfo,
} from "../../persistence/save-slots.ts";
import { downloadSaveAsFile, importSaveJson } from "../../persistence/save-transfer.ts";

/**
 * WIREFRAME: PRD 08 — 3 Slots, Export/Import für Teststände.
 */
export function SaveManagerModal({
  activeSlot,
  currentSave,
  onClose,
  onLoadSlot,
  onNewGameInSlot,
}: {
  activeSlot: number;
  currentSave: SaveGame;
  onClose: () => void;
  onLoadSlot: (slot: number) => void;
  onNewGameInSlot: (slot: number) => void;
}) {
  const [slots, setSlots] = useState<SaveSlotInfo[]>(() => listSaveSlots());
  const [importError, setImportError] = useState<string | null>(null);
  const [pendingNewSlot, setPendingNewSlot] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function refreshSlots() {
    setSlots(listSaveSlots());
  }

  function handleExport() {
    downloadSaveAsFile(currentSave);
  }

  function handleImportFile(file: File) {
    setImportError(null);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = typeof reader.result === "string" ? reader.result : "";
        importSaveJson(text, activeSlot);
        refreshSlots();
        onLoadSlot(activeSlot);
        onClose();
      } catch (error) {
        setImportError(error instanceof Error ? error.message : "Import fehlgeschlagen");
      }
    };
    reader.onerror = () => setImportError("Datei konnte nicht gelesen werden");
    reader.readAsText(file);
  }

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
          <h2 id="save-modal-title">💾 Spielstände</h2>
          <button type="button" className="save-modal-close" onClick={onClose} aria-label="Schließen">
            ✕
          </button>
        </header>

        <p className="save-modal-lead">
          3 Slots lokal im Browser. Export/Import zum Testen auf Docker oder anderen Geräten.
        </p>

        <ul className="save-slot-list">
          {slots.map((slot) => (
            <li key={slot.slot}>
              <SaveSlotCard
                info={slot}
                active={slot.slot === activeSlot}
                pendingNew={pendingNewSlot === slot.slot}
                onSelect={() => {
                  if (slot.corrupt) return;
                  if (!slot.occupied) {
                    setPendingNewSlot(slot.slot);
                    return;
                  }
                  onLoadSlot(slot.slot);
                  onClose();
                }}
                onConfirmNew={() => {
                  onNewGameInSlot(slot.slot);
                  refreshSlots();
                  setPendingNewSlot(null);
                  onClose();
                }}
                onCancelNew={() => setPendingNewSlot(null)}
              />
            </li>
          ))}
        </ul>

        <div className="save-modal-actions">
          <button type="button" className="save-modal-btn" onClick={handleExport}>
            ⬇ Export (Slot {activeSlot})
          </button>
          <button
            type="button"
            className="save-modal-btn"
            onClick={() => fileInputRef.current?.click()}
          >
            ⬆ Import → Slot {activeSlot}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="save-modal-file"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) handleImportFile(file);
              event.target.value = "";
            }}
          />
        </div>

        {importError ? <p className="save-modal-error" role="alert">{importError}</p> : null}
      </section>
    </div>
  );
}

function SaveSlotCard({
  info,
  active,
  pendingNew,
  onSelect,
  onConfirmNew,
  onCancelNew,
}: {
  info: SaveSlotInfo;
  active: boolean;
  pendingNew: boolean;
  onSelect: () => void;
  onConfirmNew: () => void;
  onCancelNew: () => void;
}) {
  if (pendingNew) {
    return (
      <div className="save-slot-card is-pending">
        <p>Neues Spiel in Slot {info.slot} starten?</p>
        <div className="save-slot-card-actions">
          <button type="button" className="save-slot-btn is-danger" onClick={onConfirmNew}>
            Ja, neu starten
          </button>
          <button type="button" className="save-slot-btn" onClick={onCancelNew}>
            Abbrechen
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      className={[
        "save-slot-card",
        active ? "is-active" : "",
        info.corrupt ? "is-corrupt" : "",
        info.occupied ? "is-occupied" : "is-empty",
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={onSelect}
      disabled={info.corrupt}
    >
      <span className="save-slot-icon" aria-hidden="true">
        {info.corrupt ? "⚠️" : info.occupied ? "💾" : "➕"}
      </span>
      <span className="save-slot-body">
        <strong>{info.label}</strong>
        {info.occupied && info.managerName ? (
          <span>
            {info.managerName}
            {info.lastPlayed ? ` · ${formatLastPlayed(info.lastPlayed)}` : null}
          </span>
        ) : (
          <span>Leer — tippen zum Anlegen</span>
        )}
      </span>
      {active ? <span className="save-slot-badge">aktiv</span> : null}
    </button>
  );
}

function formatLastPlayed(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export { MAX_SAVE_SLOTS };
