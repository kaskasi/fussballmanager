/** WIREFRAME: PRD 08 + PRD 18 — Slots, Export/Import, Cloud Sync-Code */
import { useCallback, useEffect, useMemo, useState } from "react";
import type { SaveGame } from "../../persistence/savegame-model.ts";
import {
  listSaveSlots,
  listSaveSlotsAsync,
  MAX_SAVE_SLOTS,
  type SaveSlotInfo,
} from "../../persistence/save-slots.ts";
import { saveLoadErrorMessage, isSaveVersionMismatch } from "../../persistence/save-load-message.ts";
import { downloadSaveAsFile, parseSaveJson } from "../../persistence/save-transfer.ts";
import { ensureCloudSaveConfig, isCloudSaveEnabled } from "../../persistence/cloud-save-config.ts";
import {
  pullCloudSave,
  registerCloudSyncCode,
  pushCloudSave,
} from "../../persistence/cloud-save-client.ts";
import {
  readCloudSlotMeta,
  writeCloudSlotMeta,
} from "../../persistence/cloud-slot-meta.ts";
import { cloudSaveErrorMessage } from "../../persistence/cloud-save-errors.ts";
import { generateSyncCode, isValidSyncCode, normalizeSyncCodeInput } from "../../persistence/sync-code.ts";
import { Diag } from "../../telemetry/diagnostic-log.ts";
import { useT } from "../../i18n/react.ts";

export function SaveManagerPanel({
  activeSlot,
  currentSave,
  onLoadSlot,
  onApplyImportedSave,
  onNewGameInSlot,
  onApplyCloudSave,
  onAfterImport,
}: {
  activeSlot: number;
  currentSave: SaveGame;
  onLoadSlot: (slot: number) => void;
  onApplyImportedSave: (save: SaveGame, slot: number) => void;
  onNewGameInSlot: (slot: number) => void;
  onApplyCloudSave: (save: SaveGame, slot: number) => void;
  /** Called after successful import (modal closes itself; embedded stays). */
  onAfterImport?: () => void;
}) {
  const t = useT();
  const [slots, setSlots] = useState<SaveSlotInfo[]>(() => listSaveSlots());
  useEffect(() => {
    void listSaveSlotsAsync().then(setSlots);
  }, []);
  const [importError, setImportError] = useState<string | null>(null);
  const [cloudError, setCloudError] = useState<string | null>(null);
  const [cloudBusy, setCloudBusy] = useState(false);
  const [pendingNewSlot, setPendingNewSlot] = useState<number | null>(null);
  const [revealedCode, setRevealedCode] = useState<string | null>(null);
  const [pullInput, setPullInput] = useState("");

  const [cloudEnabled, setCloudEnabled] = useState(isCloudSaveEnabled);
  useEffect(() => {
    if (cloudEnabled) return;
    void ensureCloudSaveConfig().then((config) => {
      if (config) setCloudEnabled(true);
    });
  }, [cloudEnabled]);
  const slotMeta = useMemo(() => readCloudSlotMeta(activeSlot), [activeSlot, revealedCode]);

  function refreshSlots() {
    void listSaveSlotsAsync().then(setSlots);
  }

  function handleExport() {
    downloadSaveAsFile(currentSave);
    Diag.saveAction("export", activeSlot);
  }

  function handleImportFile(file: File) {
    setImportError(null);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = typeof reader.result === "string" ? reader.result : "";
        const imported = parseSaveJson(text);
        Diag.saveAction("import", activeSlot);
        onApplyImportedSave(imported, activeSlot);
        refreshSlots();
        onAfterImport?.();
      } catch (error) {
        setImportError(saveLoadErrorMessage(error, t));
        Diag.error(`save import fail slot=${activeSlot}`);
      }
    };
    reader.onerror = () => setImportError("Datei konnte nicht gelesen werden");
    reader.readAsText(file);
  }

  const activateCloud = useCallback(async () => {
    setCloudError(null);
    setCloudBusy(true);
    try {
      const code = generateSyncCode();
      await registerCloudSyncCode(code);
      writeCloudSlotMeta(activeSlot, code);
      await pushCloudSave(code, currentSave);
      setRevealedCode(code);
      Diag.cloud("activate", true);
    } catch (error) {
      Diag.cloud("activate", false);
      setCloudError(cloudSaveErrorMessage(error, t));
    } finally {
      setCloudBusy(false);
    }
  }, [activeSlot, currentSave, t]);

  const uploadNow = useCallback(async () => {
    const meta = readCloudSlotMeta(activeSlot);
    if (!meta) return;
    setCloudError(null);
    setCloudBusy(true);
    try {
      await pushCloudSave(meta.syncCode, currentSave);
      Diag.cloud("upload", true);
    } catch (error) {
      Diag.cloud("upload", false);
      setCloudError(cloudSaveErrorMessage(error, t));
    } finally {
      setCloudBusy(false);
    }
  }, [activeSlot, currentSave, t]);

  const pullFromCloud = useCallback(async () => {
    const code = normalizeSyncCodeInput(pullInput);
    if (!isValidSyncCode(code)) {
      setCloudError(t("save.cloud.pullFail"));
      return;
    }
    setCloudError(null);
    setCloudBusy(true);
    try {
      const result = await pullCloudSave(code);
      onApplyCloudSave(result.save, activeSlot);
      writeCloudSlotMeta(activeSlot, code);
      refreshSlots();
      Diag.cloud("pull", true);
      onAfterImport?.();
    } catch (error) {
      Diag.cloud("pull", false);
      if (isSaveVersionMismatch(error)) {
        setCloudError(saveLoadErrorMessage(error, t));
      } else {
        const raw = error instanceof Error ? error.message : "";
        setCloudError(
          raw.includes("not_found") || raw.includes("404")
            ? t("save.cloud.notFound")
            : t("save.cloud.pullFail"),
        );
      }
    } finally {
      setCloudBusy(false);
    }
  }, [activeSlot, onApplyCloudSave, onAfterImport, pullInput, t]);

  const copyCode = useCallback(async () => {
    if (!revealedCode) return;
    try {
      await navigator.clipboard.writeText(revealedCode);
    } catch {
      /* clipboard optional */
    }
  }, [revealedCode]);

  return (
    <div className="save-manager-panel">
      <p className="save-modal-lead">
        {MAX_SAVE_SLOTS} Slots lokal. Export/Import oder Cloud Sync-Code (PRD 18).
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
                Diag.saveAction("load_slot", slot.slot);
                onLoadSlot(slot.slot);
              }}
              onConfirmNew={() => {
                onNewGameInSlot(slot.slot);
                refreshSlots();
                setPendingNewSlot(null);
              }}
              onCancelNew={() => setPendingNewSlot(null)}
            />
          </li>
        ))}
      </ul>

      <div className="save-modal-actions">
        <button type="button" className="save-modal-btn" onClick={handleExport}>
          Export (Slot {activeSlot})
        </button>
        <button
          type="button"
          className="save-modal-btn"
          onClick={() => document.getElementById("save-import-file")?.click()}
        >
          Import → Slot {activeSlot}
        </button>
        <input
          id="save-import-file"
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

      <section className="save-cloud-panel" aria-label={t("save.cloud.title")}>
        <h3 className="save-cloud-title">{t("save.cloud.title")}</h3>
        {!cloudEnabled ? (
          <p className="save-cloud-muted">{t("save.cloud.disabled")}</p>
        ) : (
          <>
            {revealedCode ? (
              <div className="save-cloud-reveal">
                <p className="save-cloud-code-label">{t("save.cloud.codeLabel")}</p>
                <p className="save-cloud-code" data-testid="cloud-sync-code">
                  {revealedCode}
                </p>
                <p className="save-cloud-warn">{t("save.cloud.codeWarn")}</p>
                <div className="save-cloud-reveal-actions">
                  <button type="button" className="save-modal-btn" onClick={() => void copyCode()}>
                    {t("save.cloud.copy")}
                  </button>
                  <button type="button" className="save-modal-btn" onClick={() => setRevealedCode(null)}>
                    {t("save.cloud.done")}
                  </button>
                </div>
              </div>
            ) : (
              <>
                {slotMeta ? (
                  <p className="save-cloud-muted">{t("save.cloud.linked", { slot: String(activeSlot) })}</p>
                ) : null}
                <button
                  type="button"
                  className="save-modal-btn"
                  disabled={cloudBusy}
                  onClick={() => void activateCloud()}
                >
                  {t("save.cloud.activate", { slot: String(activeSlot) })}
                </button>
                {slotMeta ? (
                  <button
                    type="button"
                    className="save-modal-btn"
                    disabled={cloudBusy}
                    onClick={() => void uploadNow()}
                  >
                    {t("save.cloud.uploadNow")}
                  </button>
                ) : null}
              </>
            )}

            <h4 className="save-cloud-subtitle">{t("save.cloud.pullTitle")}</h4>
            <p className="save-cloud-muted">{t("save.cloud.pullHint")}</p>
            <label className="save-cloud-pull-row">
              <span className="visually-hidden">Sync-Code</span>
              <input
                type="text"
                className="save-cloud-input"
                value={pullInput}
                onChange={(event) => setPullInput(event.target.value)}
                placeholder="fuss-xxxx-xxxx"
                autoComplete="off"
                spellCheck={false}
                disabled={cloudBusy}
              />
              <button
                type="button"
                className="save-modal-btn"
                disabled={cloudBusy}
                onClick={() => void pullFromCloud()}
              >
                {t("save.cloud.pullAction", { slot: String(activeSlot) })}
              </button>
            </label>
          </>
        )}
      </section>

      {importError ? (
        <p className="save-modal-error" role="alert">
          {importError}
        </p>
      ) : null}
      {cloudError ? (
        <p className="save-modal-error" role="alert">
          {cloudError}
        </p>
      ) : null}
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
        {info.corrupt ? "!" : info.occupied ? "S" : "+"}
      </span>
      <span className="save-slot-body">
        <strong>{info.label}</strong>
        {info.occupied && info.managerName ? (
          <span>
            {info.managerName}
            {info.lastPlayed ? ` · ${formatLastPlayed(info.lastPlayed)}` : null}
          </span>
        ) : (
          <span>Leer</span>
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
