import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { withClubEvent, type ClubEventKind } from "../../inbox/club-events.ts";
import { t } from "../../i18n/index.ts";
import {
  newCareerSession,
  newGameSession,
  saveFromSession,
  sessionFromSave,
  type GameSession,
} from "../../persistence/game-session.ts";
import {
  normalizeSave,
  removeLocalSave,
  resolveSlotSave,
  tryWriteLocalSaveAsync,
  writeLocalSaveAsync,
} from "../../persistence/local-save.ts";
import { cloudSaveErrorMessage } from "../../persistence/cloud-save-errors.ts";
import {
  scheduleCloudUpload,
  setCloudUploadListener,
} from "../../persistence/cloud-save-scheduler.ts";
import { ensureCloudSaveConfig } from "../../persistence/cloud-save-config.ts";
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
  allow: () => boolean,
): Promise<boolean> {
  if (!allow()) return false;
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
  const [save, setSave] = useState<SaveGame | null>(() => bootstrapSave(getActiveSlot()));
  const [sessionReady, setSessionReady] = useState(false);
  const [saveToastVisible, setSaveToastVisible] = useState(false);
  const [persistDirty, setPersistDirty] = useState(false);
  const saveToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hydrateGenerationRef = useRef(0);
  const readyRef = useRef(false);
  const saveRef = useRef<SaveGame | null>(save);
  const forceNewSlotRef = useRef<number | null>(null);
  saveRef.current = save;

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
    void ensureCloudSaveConfig();
  }, []);

  useEffect(() => {
    setCloudUploadListener((result) => {
      if (!result.ok) {
        Diag.cloud("upload", false);
        flashNotice(cloudSaveErrorMessage(new Error(result.message), t), "warn");
      }
    });
    return () => setCloudUploadListener(null);
  }, [flashNotice]);

  useEffect(() => {
    const flush = () => {
      const current = saveRef.current;
      if (!readyRef.current || !current) return;
      void writeLocalSaveAsync(activeSlot, current).catch(() => {
        /* page hide cannot surface a toast */
      });
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush();
    };
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [activeSlot]);

  useEffect(() => {
    const generation = hydrateGenerationRef.current + 1;
    hydrateGenerationRef.current = generation;
    readyRef.current = false;
    setSessionReady(false);
    const createNew = forceNewSlotRef.current === activeSlot;
    forceNewSlotRef.current = null;
    void (async () => {
      try {
        if (createNew) {
          removeLocalSave(activeSlot);
          const fresh = saveFromSession(newCareerSession());
          if (hydrateGenerationRef.current !== generation) return;
          await writeLocalSaveAsync(activeSlot, fresh);
          if (hydrateGenerationRef.current !== generation) return;
          setSave(fresh);
        } else {
          const resolved = await resolveSlotSave(activeSlot);
          if (hydrateGenerationRef.current !== generation) return;
          setSave(resolved.save);
        }
        setPersistDirty(false);
        readyRef.current = true;
        setSessionReady(true);
      } catch {
        if (hydrateGenerationRef.current !== generation) return;
        setPersistDirty(true);
        flashNotice(t("shell.saveWriteFailed"), "warn");
        readyRef.current = true;
        setSessionReady(true);
      }
    })();
  }, [activeSlot, flashNotice]);

  const placeholderRef = useRef<SaveGame | null>(null);
  if (save == null && placeholderRef.current == null) {
    placeholderRef.current = saveFromSession(newGameSession());
  }
  const activeSave = save ?? placeholderRef.current!;
  const session = useMemo(() => sessionFromSave(activeSave), [activeSave]);

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
      void persistSlot(activeSlot, nextSave, handlePersistSuccess, handlePersistFailure, () => readyRef.current);
    },
    [activeSlot, handlePersistFailure, handlePersistSuccess],
  );

  const patchSession = useCallback(
    (recipe: (current: PersistedSession) => PersistedSession) => {
      let nextSave: SaveGame | null = null;
      setSave((current) => {
        if (!current) return current;
        const before = sessionFromSave(current, { refreshMarketValues: false });
        const after = recipe(before);
        nextSave = saveFromSession(after, current);
        return nextSave;
      });
      if (nextSave) {
        void persistSlot(activeSlot, nextSave, handlePersistSuccess, handlePersistFailure, () => readyRef.current);
      }
    },
    [activeSlot, handlePersistFailure, handlePersistSuccess],
  );

  const replaceSave = useCallback(
    (updater: (current: SaveGame) => SaveGame) => {
      let nextSave: SaveGame | null = null;
      setSave((current) => {
        if (!current) return current;
        nextSave = updater(current);
        return nextSave;
      });
      if (nextSave) {
        void persistSlot(activeSlot, nextSave, handlePersistSuccess, handlePersistFailure, () => readyRef.current);
      }
    },
    [activeSlot, handlePersistFailure, handlePersistSuccess],
  );

  const resetGame = useCallback(() => {
    forceNewSlotRef.current = activeSlot;
    hydrateGenerationRef.current += 1;
    removeLocalSave(activeSlot);
    const fresh = saveFromSession(newCareerSession());
    setSave(fresh);
    readyRef.current = true;
    setSessionReady(true);
    setPersistDirty(false);
    void writeLocalSaveAsync(activeSlot, fresh).catch(() => handlePersistFailure());
    trackEvent("game_reset", { slot: activeSlot });
    onSlotChange?.();
  }, [activeSlot, handlePersistFailure, onSlotChange]);

  const loadSaveSlot = useCallback(
    (slot: number) => {
      trackEvent("save_slot_loaded", { slot });
      onSlotChange?.();
      if (slot === activeSlot) {
        const generation = hydrateGenerationRef.current + 1;
        hydrateGenerationRef.current = generation;
        readyRef.current = false;
        setSessionReady(false);
        void resolveSlotSave(slot).then((resolved) => {
          if (hydrateGenerationRef.current !== generation) return;
          setSave(resolved.save);
          setPersistDirty(false);
          readyRef.current = true;
          setSessionReady(true);
        }).catch(() => handlePersistFailure());
        return;
      }
      setActiveSlot(slot);
      setActiveSlotState(slot);
    },
    [activeSlot, handlePersistFailure, onSlotChange],
  );

  const newGameInSlot = useCallback(
    (slot: number) => {
      forceNewSlotRef.current = slot;
      removeLocalSave(slot);
      trackEvent("new_game_started", { slot });
      onSlotChange?.();
      if (slot === activeSlot) {
        const generation = hydrateGenerationRef.current + 1;
        hydrateGenerationRef.current = generation;
        const fresh = saveFromSession(newCareerSession());
        setSave(fresh);
        readyRef.current = true;
        setSessionReady(true);
        setPersistDirty(false);
        void writeLocalSaveAsync(slot, fresh).catch(() => handlePersistFailure());
        return;
      }
      setActiveSlot(slot);
      setActiveSlotState(slot);
    },
    [activeSlot, handlePersistFailure, onSlotChange],
  );

  const applyCloudSave = useCallback(
    (cloudSave: SaveGame, slot: number) => {
      void (async () => {
        try {
          setActiveSlot(slot);
          setActiveSlotState(slot);
          const normalized = normalizeSave(cloudSave);
          await writeLocalSaveAsync(slot, normalized);
          hydrateGenerationRef.current += 1;
          setSave(normalized);
          readyRef.current = true;
          setSessionReady(true);
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

  const applyImportedSave = useCallback(
    (imported: SaveGame, slot: number) => {
      const generation = hydrateGenerationRef.current + 1;
      hydrateGenerationRef.current = generation;
      void (async () => {
        try {
          const normalized = normalizeSave(imported);
          await writeLocalSaveAsync(slot, normalized);
          if (hydrateGenerationRef.current !== generation) return;
          if (slot !== activeSlot) {
            setActiveSlot(slot);
            setActiveSlotState(slot);
          }
          setSave(normalized);
          readyRef.current = true;
          setSessionReady(true);
          setPersistDirty(false);
          onSlotChange?.();
          flashNotice(t("save.import.ok"), "ok");
        } catch (error) {
          flashNotice(saveLoadErrorMessage(error, t), "warn");
        }
      })();
    },
    [activeSlot, flashNotice, onSlotChange],
  );

  const dismissPersistDirty = useCallback(() => {
    setPersistDirty(false);
  }, []);

  const updateSave = useCallback((updater: (current: SaveGame) => SaveGame) => {
    replaceSave(updater);
  }, [replaceSave]);

  return {
    save: activeSave,
    sessionReady,
    setSave: updateSave,
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
    applyImportedSave,
  };
}

export type { GameSession };
