import type { SaveGame } from "../savegame-model.ts";
import { migration002PipelineState } from "./migration_002_pipeline_state.ts";
import { migration003YouthInbox } from "./migration_003_youth_inbox.ts";
import { migration004LeagueState } from "./migration_004_league_state.ts";
import { migration005LeaguePlayerStats } from "./migration_005_league_player_stats.ts";
import { migration006LeagueSeasonMode } from "./migration_006_league_season_mode.ts";
import { migration007PlayerTracking } from "./migration_007_player_tracking.ts";
import { migration008Calendar } from "./migration_008_calendar.ts";
import { migration009CareerLeagueSync } from "./migration_009_career_league_sync.ts";
import { migration010ClubFinances } from "./migration_010_club_finances.ts";
import { migration011SquadSeasonStats } from "./migration_011_squad_season_stats.ts";
import { migration012Weekday } from "./migration_012_weekday.ts";
import { migration013InboxQueue } from "./migration_013_inbox_queue.ts";
import { migration014ScoutMarketRivals } from "./migration_014_scout_market_rivals.ts";
import { migration015TransferHistory } from "./migration_015_transfer_history.ts";
import { migration016LastWeekCa } from "./migration_016_last_week_ca.ts";
import { migration017Finances } from "./migration_017_finances.ts";
import { migration018ClubStadium } from "./migration_018_club_stadium.ts";
import { migration019Fanbase } from "./migration_019_fanbase.ts";
import { migration020LastWeekGrowth } from "./migration_020_last_week_growth.ts";
import { migration021TacticsStadium } from "./migration_021_tactics_stadium.ts";
import { migration022Board } from "./migration_022_board.ts";
import { migration023LeaguePools } from "./migration_023_league_pools.ts";
import { migration024RivalGrowth } from "./migration_024_rival_growth.ts";
import { migration025TrainingFiveSlots } from "./migration_025_training_five_slots.ts";
import { SaveReadOnlyError } from "./errors.ts";

export interface SaveMigration {
  id: `migration_${string}`;
  apply: (save: SaveGame) => SaveGame;
}

export const MIGRATIONS: readonly SaveMigration[] = [
  migration002PipelineState,
  migration003YouthInbox,
  migration004LeagueState,
  migration005LeaguePlayerStats,
  migration006LeagueSeasonMode,
  migration007PlayerTracking,
  migration008Calendar,
  migration009CareerLeagueSync,
  migration010ClubFinances,
  migration011SquadSeasonStats,
  migration012Weekday,
  migration013InboxQueue,
  migration014ScoutMarketRivals,
  migration015TransferHistory,
  migration016LastWeekCa,
  migration017Finances,
  migration018ClubStadium,
  migration019Fanbase,
  migration020LastWeekGrowth,
  migration021TacticsStadium,
  migration022Board,
  migration023LeaguePools,
  migration024RivalGrowth,
  migration025TrainingFiveSlots,
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
