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
  loadLocalSave,
  normalizeSave,
  removeLocalSave,
  tryWriteLocalSave,
  writeLocalSave,
} from "../../persistence/local-save.ts";
import {
  scheduleCloudUpload,
  setCloudUploadListener,
} from "../../persistence/cloud-save-scheduler.ts";
import { getActiveSlot, setActiveSlot } from "../../persistence/save-slots.ts";
import type { SaveGame } from "../../persistence/savegame-model.ts";
import { bootstrapSave } from "../shell/bootstrap.ts";

export type PersistedSession = ReturnType<typeof sessionFromSave>;

export function usePersistedGameSession(options: {
  flashNotice: (text: string, tone?: "ok" | "warn") => void;
  onSlotChange?: () => void;
}) {
  const { flashNotice, onSlotChange } = options;
  const [activeSlot, setActiveSlotState] = useState(() => getActiveSlot());
  const [save, setSave] = useState<SaveGame>(() => bootstrapSave(getActiveSlot()));
  const [saveToastVisible, setSaveToastVisible] = useState(false);
  const saveToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
        flashNotice(t("save.cloud.uploadFail"), "warn");
      }
    });
    return () => setCloudUploadListener(null);
  }, [flashNotice]);

  const session = useMemo(() => sessionFromSave(save), [save]);

  const sessionWithEvent = useCallback(
    (current: PersistedSession, kind: ClubEventKind, message: string): PersistedSession => ({
      ...current,
      clubEvents: withClubEvent(current.clubEvents, current.season, current.week, kind, message),
    }),
    [],
  );

  const commitSave = useCallback(
    (nextSave: SaveGame) => {
      const persisted = tryWriteLocalSave(activeSlot, nextSave);
      if (persisted) {
        flashSaveToast();
        scheduleCloudUpload(activeSlot, nextSave);
      } else {
        flashNotice(t("shell.saveWriteFailed"), "warn");
      }
      return persisted;
    },
    [activeSlot, flashNotice, flashSaveToast],
  );

  const patchSession = useCallback(
    (recipe: (current: PersistedSession) => PersistedSession) => {
      let nextSave: SaveGame | null = null;
      let persisted = true;
      setSave((current) => {
        const before = sessionFromSave(current, { refreshMarketValues: false });
        const after = recipe(before);
        nextSave = saveFromSession(after, current);
        persisted = tryWriteLocalSave(activeSlot, nextSave);
        return nextSave;
      });
      if (persisted) {
        flashSaveToast();
        if (nextSave) scheduleCloudUpload(activeSlot, nextSave);
      } else {
        flashNotice(t("shell.saveWriteFailed"), "warn");
      }
    },
    [activeSlot, flashNotice, flashSaveToast],
  );

  const replaceSave = useCallback(
    (updater: (current: SaveGame) => SaveGame) => {
      let nextSave: SaveGame | null = null;
      let persisted = true;
      setSave((current) => {
        nextSave = updater(current);
        persisted = tryWriteLocalSave(activeSlot, nextSave);
        return nextSave;
      });
      if (persisted) {
        flashSaveToast();
        if (nextSave) scheduleCloudUpload(activeSlot, nextSave);
      } else {
        flashNotice(t("shell.saveWriteFailed"), "warn");
      }
    },
    [activeSlot, flashNotice, flashSaveToast],
  );

  const resetGame = useCallback(() => {
    removeLocalSave(activeSlot);
    const fresh = saveFromSession(newGameSession());
    writeLocalSave(activeSlot, fresh);
    setSave(fresh);
    onSlotChange?.();
  }, [activeSlot, onSlotChange]);

  const loadSaveSlot = useCallback(
    (slot: number) => {
      setActiveSlot(slot);
      setActiveSlotState(slot);
      try {
        const loaded = loadLocalSave(slot);
        if (loaded) {
          setSave(loaded);
        } else {
          const fresh = saveFromSession(newGameSession());
          writeLocalSave(slot, fresh);
          setSave(fresh);
        }
      } catch {
        removeLocalSave(slot);
        const fresh = saveFromSession(newGameSession());
        writeLocalSave(slot, fresh);
        setSave(fresh);
      }
      onSlotChange?.();
    },
    [onSlotChange],
  );

  const newGameInSlot = useCallback(
    (slot: number) => {
      removeLocalSave(slot);
      setActiveSlot(slot);
      setActiveSlotState(slot);
      const fresh = saveFromSession(newGameSession());
      writeLocalSave(slot, fresh);
      setSave(fresh);
      onSlotChange?.();
    },
    [onSlotChange],
  );

  const applyCloudSave = useCallback(
    (cloudSave: SaveGame, slot: number) => {
      setActiveSlot(slot);
      setActiveSlotState(slot);
      const normalized = normalizeSave(cloudSave);
      writeLocalSave(slot, normalized);
      setSave(normalized);
      onSlotChange?.();
      flashNotice(t("save.cloud.pullOk"), "ok");
    },
    [flashNotice, onSlotChange],
  );

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
    resetGame,
    loadSaveSlot,
    newGameInSlot,
    applyCloudSave,
  };
}

export type { GameSession };
