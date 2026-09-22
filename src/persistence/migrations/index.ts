import type { SaveGame } from "../savegame.ts";
import { SaveReadOnlyError } from "./errors.ts";

/**
 * Migration list for save_version 1.
 * The first real file will be `migration_001_<description>.ts`.
 * There is no historical `migration_001_add_drive`.
 */

export interface SaveMigration {
  id: `migration_${string}`;
  apply: (save: SaveGame) => SaveGame;
}

export const MIGRATIONS: readonly SaveMigration[] = [];

export { SaveReadOnlyError } from "./errors.ts";

export function applyMigrations(save: SaveGame, migrations: readonly SaveMigration[]): SaveGame {
  assertMigrationOrder(migrations);
  let next = structuredClone(save);
  for (const migration of migrations) {
    if (next.manifest.migrations_applied.includes(migration.id)) continue;
    try {
      next = migration.apply(structuredClone(next));
    } catch {
      throw new SaveReadOnlyError(migration.id);
    }
    if (!next.manifest.migrations_applied.includes(migration.id)) {
      next = {
        ...next,
        manifest: {
          ...next.manifest,
          migrations_applied: [...next.manifest.migrations_applied, migration.id],
        },
      };
    }
  }
  return next;
}

export function assertMigrationOrder(migrations: readonly { id: string }[]): void {
  for (let index = 1; index < migrations.length; index++) {
    const previous = migrations[index - 1]?.id ?? "";
    const current = migrations[index]?.id ?? "";
    if (current <= previous) {
      throw new Error(`Migrations run in order: ${previous} before ${current}`);
    }
  }
}
