import { applyMigrations, MIGRATIONS } from "./migrations/index.ts";
import { saveFromSession, sessionFromSave, type GameSession } from "./game-session.ts";
import { defaultPipelineState } from "./pipeline-state.ts";
import { normalizeYouthInbox, pruneYouthInbox } from "../youth/decision-inbox.ts";
import { SaveIncompleteError, SAVE_VERSION, type SaveGame } from "./savegame-model.ts";

const STORAGE_PREFIX = "fm_save_slot_";

function storageKey(slot: number): string {
  if (!Number.isInteger(slot) || slot < 1) {
    throw new Error("Save slot must be a positive integer");
  }
  return `${STORAGE_PREFIX}${slot}`;
}

export function hasLocalSave(slot: number): boolean {
  return localStorage.getItem(storageKey(slot)) !== null;
}

export function loadLocalSave(slot: number): SaveGame | null {
  const raw = localStorage.getItem(storageKey(slot));
  if (!raw) return null;
  let save = JSON.parse(raw) as SaveGame;
  const pending = MIGRATIONS.some((migration) => !save.manifest.migrations_applied.includes(migration.id));
  if (pending || save.manifest.save_version < SAVE_VERSION) {
    save = applyMigrations(save, MIGRATIONS);
    writeLocalSave(slot, save);
  }
  if (!save.state.pipeline) {
    save = {
      ...save,
      state: { ...save.state, pipeline: defaultPipelineState() },
      manifest: {
        ...save.manifest,
        save_version: SAVE_VERSION,
        migrations_applied: save.manifest.migrations_applied.includes("migration_002_pipeline_state")
          ? save.manifest.migrations_applied
          : [...save.manifest.migrations_applied, "migration_002_pipeline_state"],
      },
    };
  }
  if (save.state.season !== save.manifest.current_week.season || save.state.week !== save.manifest.current_week.week) {
    throw new SaveIncompleteError("local save state does not match manifest.current_week");
  }
  if (!save.state.pipeline) {
    throw new SaveIncompleteError("local save is missing pipeline state");
  }
  if (save.state.pipeline.youth_inbox) {
    const pruned = pruneYouthInbox(
      normalizeYouthInbox(save.state.pipeline.youth_inbox),
      save.players,
    );
    const before = save.state.pipeline.youth_inbox;
    if (before.items.length !== pruned.items.length || before.queue.length !== pruned.queue.length) {
      save = {
        ...save,
        state: {
          ...save.state,
          pipeline: {
            ...save.state.pipeline,
            youth_inbox: pruned,
          },
        },
      };
      writeLocalSave(slot, save);
    }
  }
  return save;
}

export function writeLocalSave(slot: number, save: SaveGame): void {
  localStorage.setItem(storageKey(slot), JSON.stringify(save));
}

export function removeLocalSave(slot: number): void {
  localStorage.removeItem(storageKey(slot));
}

/** Browser checkpoint — no weekend gate; official folder saves use `saveToFolder`. */
export function persistSession(session: GameSession, slot: number, base?: SaveGame): SaveGame {
  const save = saveFromSession(session, base);
  writeLocalSave(slot, save);
  return save;
}

export function loadSession(slot: number): GameSession | null {
  const save = loadLocalSave(slot);
  if (!save) return null;
  return sessionFromSave(save);
}
