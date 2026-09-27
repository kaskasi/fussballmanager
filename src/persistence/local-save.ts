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

/** Migrate and validate a save without persisting (import preview). */
export function normalizeSave(save: SaveGame): SaveGame {
  let next = save;
  const pending = MIGRATIONS.some((migration) => !next.manifest.migrations_applied.includes(migration.id));
  if (pending || next.manifest.save_version < SAVE_VERSION) {
    next = applyMigrations(next, MIGRATIONS);
  }
  if (!next.state.pipeline) {
    next = {
      ...next,
      state: { ...next.state, pipeline: defaultPipelineState(next.state.week) },
      manifest: {
        ...next.manifest,
        save_version: SAVE_VERSION,
        migrations_applied: next.manifest.migrations_applied.includes("migration_002_pipeline_state")
          ? next.manifest.migrations_applied
          : [...next.manifest.migrations_applied, "migration_002_pipeline_state"],
      },
    };
  }
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

export function loadLocalSave(slot: number): SaveGame | null {
  const raw = localStorage.getItem(storageKey(slot));
  if (!raw) return null;
  const save = normalizeSave(JSON.parse(raw) as SaveGame);
  writeLocalSave(slot, save);
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
