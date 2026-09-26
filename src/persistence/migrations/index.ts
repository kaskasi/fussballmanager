import type { SaveGame } from "../savegame-model.ts";
import { migration002PipelineState } from "./migration_002_pipeline_state.ts";
import { migration003YouthInbox } from "./migration_003_youth_inbox.ts";
import { migration004LeagueState } from "./migration_004_league_state.ts";
import { SaveReadOnlyError } from "./errors.ts";

export interface SaveMigration {
  id: `migration_${string}`;
  apply: (save: SaveGame) => SaveGame;
}

export const MIGRATIONS: readonly SaveMigration[] = [
  migration002PipelineState,
  migration003YouthInbox,
  migration004LeagueState,
];

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
