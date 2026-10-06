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
import { migration026TrainingIntensity } from "./migration_026_training_intensity.ts";
import { migration027IndividualTraining } from "./migration_027_individual_training.ts";
import { migration028MatchLineup } from "./migration_028_match_lineup.ts";
import { migration029AiTransferMarket } from "./migration_029_ai_transfer_market.ts";
import { migration030CoachingStaff } from "./migration_030_coaching_staff.ts";
import { migration031PreContracts } from "./migration_031_pre_contracts.ts";
import { migration032SeasonAwards } from "./migration_032_season_awards.ts";
import { migration033NarrativeVision } from "./migration_033_narrative_vision.ts";
import { migration034LeagueWorldPrd } from "./migration_034_league_world_prd.ts";
import { migration035GeneratedWorld } from "./migration_035_generated_world.ts";
import { migration036ScoutKnowledge } from "./migration_036_scout_knowledge.ts";
import { migration037GrowthRebalance } from "./migration_037_growth_rebalance.ts";
import { migration038ScoutNegotiations } from "./migration_038_scout_negotiations.ts";
import { migration039StoryState } from "./migration_039_story_state.ts";
import { migration040ExpandGeneratedWorld } from "./migration_040_expand_generated_world.ts";
import { migration041AssistantDelegation } from "./migration_041_assistant_delegation.ts";
import { migration042M2Features } from "./migration_042_m2_features.ts";
import { migration043ContractTalks } from "./migration_043_contract_talks.ts";
import { migration044ContractTalkLocks } from "./migration_044_contract_talk_locks.ts";
import { migration045SponsorPrecinct } from "./migration_045_sponsor_precinct.ts";
import { migration046VeteranBackstory } from "./migration_046_veteran_backstory.ts";
import { migration047ProSeasonCalendar } from "./migration_047_pro_season_calendar.ts";
import { migration048PrecinctCampus } from "./migration_048_precinct_campus.ts";
import { migration049PrecinctPatches } from "./migration_049_precinct_patches.ts";
import { migration050PrecinctFarm } from "./migration_050_precinct_farm.ts";
import { migration051AbilityStamps } from "./migration_051_ability_stamps.ts";
import { migration052PhaseStamps } from "./migration_052_phase_stamps.ts";
import { migration053HospitalityCamps } from "./migration_053_hospitality_camps.ts";
import { migration054HybridStamps } from "./migration_054_hybrid_stamps.ts";
import { migration055InfrastructureLedger } from "./migration_055_infrastructure_ledger.ts";
import { migration056CoachPortraitSeed } from "./migration_056_coach_portrait_seed.ts";
import { migration058CampLeaderHire } from "./migration_058_camp_leader_hire.ts";
import { migration059TrainingAccountability } from "./migration_059_training_accountability.ts";
import { migration060ScoutDiscovery } from "./migration_060_scout_discovery.ts";
import { migration061ScoutJobPostfach } from "./migration_061_scout_job_postfach.ts";
import { migration062RegionScoutTier } from "./migration_062_region_scout_tier.ts";
import { migration063ClubPlaceGeo } from "./migration_063_club_place_geo.ts";
import { migration064ScoutTrips } from "./migration_064_scout_trips.ts";
import { migration065MapClubVisits } from "./migration_065_map_club_visits.ts";
import { migration066HomeZoneScout } from "./migration_066_home_zone_scout.ts";
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
  migration026TrainingIntensity,
  migration027IndividualTraining,
  migration028MatchLineup,
  migration029AiTransferMarket,
  migration030CoachingStaff,
  migration031PreContracts,
  migration032SeasonAwards,
  migration033NarrativeVision,
  migration034LeagueWorldPrd,
  migration035GeneratedWorld,
  migration036ScoutKnowledge,
  migration037GrowthRebalance,
  migration038ScoutNegotiations,
  migration039StoryState,
  migration040ExpandGeneratedWorld,
  migration041AssistantDelegation,
  migration042M2Features,
  migration043ContractTalks,
  migration044ContractTalkLocks,
  migration045SponsorPrecinct,
  migration046VeteranBackstory,
  migration047ProSeasonCalendar,
  migration048PrecinctCampus,
  migration049PrecinctPatches,
  migration050PrecinctFarm,
  migration051AbilityStamps,
  migration052PhaseStamps,
  migration053HospitalityCamps,
  migration054HybridStamps,
  migration055InfrastructureLedger,
  migration056CoachPortraitSeed,
  migration058CampLeaderHire,
  migration059TrainingAccountability,
  migration060ScoutDiscovery,
  migration061ScoutJobPostfach,
  migration062RegionScoutTier,
  migration063ClubPlaceGeo,
  migration064ScoutTrips,
  migration065MapClubVisits,
  migration066HomeZoneScout,
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
