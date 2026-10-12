import { saveFromSession, sessionFromSave, type GameSession } from "./game-session.ts";
import { normalizeYouthInbox, pruneYouthInbox } from "../youth/decision-inbox.ts";
import {
  parseSaveFromRecord,
  resolveBrowserSaveBackend,
  writeSaveRecordWithRetry,
  type BrowserSaveBackend,
} from "./browser-save-adapter.ts";
import { compactSaveForLocalPersist } from "./save-compact.ts";
import {
  assertSupportedSaveVersion,
  SaveIncompleteError,
  type SaveGame,
} from "./savegame-model.ts";

const STORAGE_PREFIX = "fm_save_slot_";

/** Last loaded/written save per slot (authoritative in-memory until reload). */
const slotCache = new Map<number, SaveGame>();

function storageKey(slot: number): string {
  if (!Number.isInteger(slot) || slot < 1) {
    throw new Error("Save slot must be a positive integer");
  }
  return `${STORAGE_PREFIX}${slot}`;
}

function readLegacyLocalStorageRaw(slot: number): string | null {
  if (typeof localStorage === "undefined") return null;
  return localStorage.getItem(storageKey(slot));
}

function readLegacyLocalStorageSave(slot: number): SaveGame | null {
  const raw = readLegacyLocalStorageRaw(slot);
  if (!raw) return null;
  return JSON.parse(raw) as SaveGame;
}

function removeLegacyLocalStorage(slot: number): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.removeItem(storageKey(slot));
  } catch (error) {
    console.error("Failed to remove legacy local save", error);
  }
}

function writeLegacyLocalStorage(slot: number, save: SaveGame): boolean {
  if (typeof localStorage === "undefined") return false;
  try {
    localStorage.setItem(storageKey(slot), JSON.stringify(save));
    return true;
  } catch (error) {
    console.error("Failed to write legacy local save", error);
    return false;
  }
}

async function migrateLegacyToBackend(slot: number, save: SaveGame, backend?: BrowserSaveBackend): Promise<void> {
  const store = backend ?? resolveBrowserSaveBackend();
  const compact = compactSaveForLocalPersist(save);
  const ok = await writeSaveRecordWithRetry(store, slot, compact);
  if (ok) {
    removeLegacyLocalStorage(slot);
    slotCache.set(slot, compact);
  }
}

/** Validate save at current schema (PRD 08.10 — no migration-on-load). */
export function normalizeSave(save: SaveGame): SaveGame {
  assertSupportedSaveVersion(save.manifest.save_version);

  let next = save;
  if (
    next.state.season !== next.manifest.current_week.season ||
    next.state.week !== next.manifest.current_week.week
  ) {
    throw new SaveIncompleteError("save state does not match manifest.current_week");
  }
  if (!next.state.pipeline) {
    throw new SaveIncompleteError("save is missing pipeline state");
  }
  if (next.state.pipeline.youth_inbox) {
    const pruned = pruneYouthInbox(
      normalizeYouthInbox(next.state.pipeline.youth_inbox),
      next.players,
    );
    const before = next.state.pipeline.youth_inbox;
    if (before.items.length !== pruned.items.length || before.queue.length !== pruned.queue.length) {
      next = {
        ...next,
        state: {
          ...next.state,
          pipeline: {
            ...next.state.pipeline,
            youth_inbox: pruned,
          },
        },
      };
    }
  }
  return next;
}

export function hasLocalSave(slot: number): boolean {
  if (slotCache.has(slot)) return true;
  if (readLegacyLocalStorageRaw(slot)) return true;
  return false;
}

export async function hasLocalSaveAsync(slot: number): Promise<boolean> {
  if (slotCache.has(slot)) return true;
  if (readLegacyLocalStorageRaw(slot)) return true;
  try {
    return await resolveBrowserSaveBackend().hasRecord(slot);
  } catch {
    return false;
  }
}

/** Sync load: memory cache or legacy localStorage (bootstrap / tests). */
export function loadLocalSave(slot: number): SaveGame | null {
  const cached = slotCache.get(slot);
  if (cached) {
    const normalized = normalizeSave(cached);
    slotCache.set(slot, normalized);
    return normalized;
  }

  const legacy = readLegacyLocalStorageSave(slot);
  if (!legacy) return null;

  const save = normalizeSave(legacy);
  slotCache.set(slot, save);
  void migrateLegacyToBackend(slot, save);
  return save;
}

/** Prefer IndexedDB over legacy when hydrating the active slot. */
export async function hydrateLocalSaveFromBackend(slot: number): Promise<SaveGame | null> {
  try {
    const backend = resolveBrowserSaveBackend();
    const record = await backend.loadRecord(slot);
    if (record) {
      const parsed = normalizeSave(await parseSaveFromRecord(record));
      slotCache.set(slot, parsed);
      removeLegacyLocalStorage(slot);
      return parsed;
    }
  } catch (error) {
    console.error("IndexedDB save hydrate failed, falling back to legacy", error);
  }
  return loadLocalSave(slot);
}

export async function tryWriteLocalSaveAsync(slot: number, save: SaveGame): Promise<boolean> {
  const compact = compactSaveForLocalPersist(save);
  slotCache.set(slot, compact);

  const backend = resolveBrowserSaveBackend();
  let ok = await writeSaveRecordWithRetry(backend, slot, compact);
  if (ok) {
    removeLegacyLocalStorage(slot);
    return true;
  }

  ok = writeLegacyLocalStorage(slot, compact);
  if (ok) {
    return true;
  }

  return false;
}

/** Sync write — legacy localStorage only (Node tests). Prefer `tryWriteLocalSaveAsync` in the browser. */
export function tryWriteLocalSave(slot: number, save: SaveGame): boolean {
  const compact = compactSaveForLocalPersist(save);
  slotCache.set(slot, compact);
  return writeLegacyLocalStorage(slot, compact);
}

export function writeLocalSave(slot: number, save: SaveGame): void {
  if (typeof indexedDB !== "undefined") {
    void writeLocalSaveAsync(slot, save);
    return;
  }
  const ok = tryWriteLocalSave(slot, save);
  if (!ok) {
    throw new Error("localStorage save failed (quota or private mode)");
  }
}

export async function writeLocalSaveAsync(slot: number, save: SaveGame): Promise<void> {
  const ok = await tryWriteLocalSaveAsync(slot, save);
  if (!ok) {
    throw new Error("localStorage save failed (quota or private mode)");
  }
}

export async function removeLocalSaveAsync(slot: number): Promise<void> {
  slotCache.delete(slot);
  removeLegacyLocalStorage(slot);
  try {
    await resolveBrowserSaveBackend().deleteRecord(slot);
  } catch (error) {
    console.error("Failed to delete IndexedDB save", error);
  }
}

export function removeLocalSave(slot: number): void {
  slotCache.delete(slot);
  removeLegacyLocalStorage(slot);
  void resolveBrowserSaveBackend()
    .deleteRecord(slot)
    .catch((error) => console.error("Failed to delete IndexedDB save", error));
}

/** Browser checkpoint — no weekend gate; official folder saves use `saveToFolder`. */
export function persistSession(session: GameSession, slot: number, base?: SaveGame): SaveGame {
  const save = saveFromSession(session, base);
  const ok = tryWriteLocalSave(slot, save);
  if (!ok) {
    throw new Error("localStorage save failed (quota or private mode)");
  }
  return save;
}

export async function persistSessionAsync(
  session: GameSession,
  slot: number,
  base?: SaveGame,
): Promise<SaveGame> {
  const save = saveFromSession(session, base);
  await writeLocalSaveAsync(slot, save);
  return save;
}

export function loadSession(slot: number): GameSession | null {
  const save = loadLocalSave(slot);
  if (!save) return null;
  return sessionFromSave(save);
}

export function clearLocalSaveCacheForTests(): void {
  slotCache.clear();
}
