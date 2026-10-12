import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { withClubEvent, type ClubEventKind } from "../../inbox/club-events.ts";
import { t } from "../../i18n/index.ts";
import {
  newGameSession,
  saveFromSession,
  sessionFromSave,
  type GameSession,
} from "../../persistence/game-session.ts";
import {
  hydrateLocalSaveFromBackend,
  loadLocalSave,
  normalizeSave,
  removeLocalSave,
  tryWriteLocalSaveAsync,
  writeLocalSaveAsync,
} from "../../persistence/local-save.ts";
import {
  scheduleCloudUpload,
  setCloudUploadListener,
} from "../../persistence/cloud-save-scheduler.ts";
import { getActiveSlot, setActiveSlot } from "../../persistence/save-slots.ts";
import type { SaveGame } from "../../persistence/savegame-model.ts";
import { saveLoadErrorMessage } from "../../persistence/save-load-message.ts";
import { bootstrapSave } from "../shell/bootstrap.ts";
import { logPostHogWarning, trackEvent } from "../../telemetry/analytics.ts";
import { Diag } from "../../telemetry/diagnostic-log.ts";

export type PersistedSession = ReturnType<typeof sessionFromSave>;

async function persistSlot(
  slot: number,
  nextSave: SaveGame,
  onSuccess: () => void,
  onFailure: () => void,
): Promise<boolean> {
  const persisted = await tryWriteLocalSaveAsync(slot, nextSave);
  if (persisted) {
    Diag.persist(true, slot);
    onSuccess();
    scheduleCloudUpload(slot, nextSave);
  } else {
    Diag.persist(false, slot, "dirty=true");
    trackEvent("save_write_failed", { slot });
    logPostHogWarning("Local game save persistence failed", {
      event: "game_save_persist_failed",
      slot,
    });
    onFailure();
  }
  return persisted;
}

export function usePersistedGameSession(options: {
  flashNotice: (text: string, tone?: "ok" | "warn") => void;
  onSlotChange?: () => void;
}) {
  const { flashNotice, onSlotChange } = options;
  const [activeSlot, setActiveSlotState] = useState(() => getActiveSlot());
  const [save, setSave] = useState<SaveGame>(() => bootstrapSave(getActiveSlot()));
  const [saveToastVisible, setSaveToastVisible] = useState(false);
  const [persistDirty, setPersistDirty] = useState(false);
  const saveToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hydrateGenerationRef = useRef(0);

  const flashSaveToast = useCallback(() => {
    if (saveToastTimerRef.current) clearTimeout(saveToastTimerRef.current);
    setSaveToastVisible(true);
    saveToastTimerRef.current = setTimeout(() => setSaveToastVisible(false), 2000);
  }, []);

  useEffect(() => {
    return () => {
      if (saveToastTimerRef.current) clearTimeout(saveToastTimerRef.current);
    };
  }, []);

  useEffect(() => {
    setCloudUploadListener((result) => {
      if (!result.ok) {
        Diag.cloud("upload", false);
        flashNotice(t("save.cloud.uploadFail"), "warn");
      }
    });
    return () => setCloudUploadListener(null);
  }, [flashNotice]);

  useEffect(() => {
    const generation = hydrateGenerationRef.current + 1;
    hydrateGenerationRef.current = generation;
    void hydrateLocalSaveFromBackend(activeSlot).then((hydrated) => {
      if (hydrated && hydrateGenerationRef.current === generation) {
        setSave(hydrated);
        setPersistDirty(false);
      }
    });
  }, [activeSlot]);

  const session = useMemo(() => sessionFromSave(save), [save]);

  const sessionWithEvent = useCallback(
    (current: PersistedSession, kind: ClubEventKind, message: string): PersistedSession => ({
      ...current,
      clubEvents: withClubEvent(current.clubEvents, current.season, current.week, kind, message),
    }),
    [],
  );

  const handlePersistFailure = useCallback(() => {
    setPersistDirty(true);
    flashNotice(t("shell.saveWriteFailed"), "warn");
  }, [flashNotice]);

  const handlePersistSuccess = useCallback(() => {
    setPersistDirty(false);
    flashSaveToast();
  }, [flashSaveToast]);

  const commitSave = useCallback(
    (nextSave: SaveGame) => {
      setSave(nextSave);
      void persistSlot(activeSlot, nextSave, handlePersistSuccess, handlePersistFailure);
    },
    [activeSlot, handlePersistFailure, handlePersistSuccess],
  );

  const patchSession = useCallback(
    (recipe: (current: PersistedSession) => PersistedSession) => {
      let nextSave: SaveGame | null = null;
      setSave((current) => {
        const before = sessionFromSave(current, { refreshMarketValues: false });
        const after = recipe(before);
        nextSave = saveFromSession(after, current);
        return nextSave;
      });
      if (nextSave) {
        void persistSlot(activeSlot, nextSave, handlePersistSuccess, handlePersistFailure);
      }
    },
    [activeSlot, handlePersistFailure, handlePersistSuccess],
  );

  const replaceSave = useCallback(
    (updater: (current: SaveGame) => SaveGame) => {
      let nextSave: SaveGame | null = null;
      setSave((current) => {
        nextSave = updater(current);
        return nextSave;
      });
      if (nextSave) {
        void persistSlot(activeSlot, nextSave, handlePersistSuccess, handlePersistFailure);
      }
    },
    [activeSlot, handlePersistFailure, handlePersistSuccess],
  );

  const resetGame = useCallback(() => {
    removeLocalSave(activeSlot);
    const fresh = saveFromSession(newGameSession());
    setSave(fresh);
    setPersistDirty(false);
    void writeLocalSaveAsync(activeSlot, fresh).catch(() => handlePersistFailure());
    trackEvent("game_reset", { slot: activeSlot });
    onSlotChange?.();
  }, [activeSlot, handlePersistFailure, onSlotChange]);

  const loadSaveSlot = useCallback(
    (slot: number) => {
      setActiveSlot(slot);
      setActiveSlotState(slot);
      void (async () => {
        try {
          const loaded = (await hydrateLocalSaveFromBackend(slot)) ?? loadLocalSave(slot);
          if (loaded) {
            setSave(loaded);
            setPersistDirty(false);
          } else {
            const fresh = saveFromSession(newGameSession());
            setSave(fresh);
            await writeLocalSaveAsync(slot, fresh);
            setPersistDirty(false);
          }
        } catch {
          removeLocalSave(slot);
          const fresh = saveFromSession(newGameSession());
          setSave(fresh);
          try {
            await writeLocalSaveAsync(slot, fresh);
            setPersistDirty(false);
          } catch {
            handlePersistFailure();
          }
        }
        trackEvent("save_slot_loaded", { slot });
        onSlotChange?.();
      })();
    },
    [handlePersistFailure, onSlotChange],
  );

  const newGameInSlot = useCallback(
    (slot: number) => {
      removeLocalSave(slot);
      setActiveSlot(slot);
      setActiveSlotState(slot);
      const fresh = saveFromSession(newGameSession());
      setSave(fresh);
      setPersistDirty(false);
      void writeLocalSaveAsync(slot, fresh).catch(() => handlePersistFailure());
      trackEvent("new_game_started", { slot });
      onSlotChange?.();
    },
    [handlePersistFailure, onSlotChange],
  );

  const applyCloudSave = useCallback(
    (cloudSave: SaveGame, slot: number) => {
      void (async () => {
        try {
          setActiveSlot(slot);
          setActiveSlotState(slot);
          const normalized = normalizeSave(cloudSave);
          await writeLocalSaveAsync(slot, normalized);
          setSave(normalized);
          setPersistDirty(false);
          trackEvent("cloud_save_imported", { slot });
          onSlotChange?.();
          flashNotice(t("save.cloud.pullOk"), "ok");
        } catch (error) {
          flashNotice(saveLoadErrorMessage(error, t), "warn");
        }
      })();
    },
    [flashNotice, onSlotChange],
  );

  const dismissPersistDirty = useCallback(() => {
    setPersistDirty(false);
  }, []);

  return {
    save,
    setSave,
    activeSlot,
    setActiveSlotState,
    session,
    patchSession,
    replaceSave,
    commitSave,
    sessionWithEvent,
    saveToastVisible,
    flashSaveToast,
    persistDirty,
    dismissPersistDirty,
    resetGame,
    loadSaveSlot,
    newGameInSlot,
    applyCloudSave,
  };
}

export type { GameSession };
