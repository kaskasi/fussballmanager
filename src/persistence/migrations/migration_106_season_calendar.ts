import type { SaveMigration } from "./index.ts";
import { standardWeekForLegacyWeek } from "../../sim/season-schedule.ts";

/**
 * PRD 35 §5 — 52-week season. Stored weeks and day indices were written for the
 * legacy layout (week = matchday, 34 weeks per season, season 1 from week −1).
 * Every week moves to the week with the same matchday; day indices and
 * career-week indices are decoded with the old layout and re-encoded.
 * Pre-release (PRD 08.10): best effort for short-lived stamps.
 */

/** Frozen legacy constants — this migration must not follow later calendar edits. */
const LEGACY_DAYS_PER_SEASON = 34 * 7;
const DAYS_PER_WEEK = 7;
const NEW_DAYS_PER_SEASON = 52 * 7;
/** Career-week indices (`(season − 1) × 52 + week`) used 52 per season even before PRD 35. */
const CAREER_WEEKS_PER_SEASON = 52;

export function migrateLegacyWeek(week: number): number {
  return standardWeekForLegacyWeek(week);
}

/** `calendarDayIndex` (34 × 7 days per season, weeks clamped to ≥ 1) → 52 × 7. */
export function migrateLegacyDayIndex(index: number): number {
  const clamped = Math.max(0, Math.round(index));
  const season0 = Math.floor(clamped / LEGACY_DAYS_PER_SEASON);
  const rem = clamped % LEGACY_DAYS_PER_SEASON;
  const week = Math.floor(rem / DAYS_PER_WEEK) + 1;
  const weekday0 = rem % DAYS_PER_WEEK;
  return season0 * NEW_DAYS_PER_SEASON + (migrateLegacyWeek(week) - 1) * DAYS_PER_WEEK + weekday0;
}

/** `(season − 1) × 52 + week` with a legacy week (−1..34) → the same with the new week. */
export function migrateLegacyCareerWeekIndex(index: number): number {
  const i = Math.round(index);
  const season0 = Math.floor((i + 1) / CAREER_WEEKS_PER_SEASON);
  const week = i - season0 * CAREER_WEEKS_PER_SEASON;
  return season0 * CAREER_WEEKS_PER_SEASON + migrateLegacyWeek(week);
}

/** `careerWeekIndex × 7 + weekday` (merch, medical) → the same with the new week. */
export function migrateLegacyCareerDay(day: number): number {
  const d = Math.round(day);
  const weekIndex = Math.floor((d - 1) / DAYS_PER_WEEK);
  const weekday = d - weekIndex * DAYS_PER_WEEK;
  return migrateLegacyCareerWeekIndex(weekIndex) * DAYS_PER_WEEK + weekday;
}

type Json = Record<string, unknown>;

function isRecord(value: unknown): value is Json {
  return typeof value === "object" && value !== null;
}

/** Re-encode every `*_career_week` / `*_career_day` number and the stadium week stamps. */
function walkCareerStamps(value: unknown): void {
  if (Array.isArray(value)) {
    for (const entry of value) walkCareerStamps(entry);
    return;
  }
  if (!isRecord(value)) return;
  for (const [key, field] of Object.entries(value)) {
    if (typeof field === "number") {
      if (key.endsWith("_career_week") || key === "restaurant_viral_until_week" || key === "restaurant_overtime_week") {
        value[key] = migrateLegacyCareerWeekIndex(field);
      } else if (key.endsWith("_career_day")) {
        value[key] = migrateLegacyCareerDay(field);
      }
    } else {
      walkCareerStamps(field);
    }
  }
}

function migratePlayerDays(player: unknown): void {
  if (!isRecord(player)) return;
  for (const key of ["contract_talks_locked_until_day", "contract_underpaid_since_day"] as const) {
    const value = player[key];
    if (typeof value === "number") player[key] = migrateLegacyDayIndex(value);
  }
}

export const migration106SeasonCalendar: SaveMigration = {
  id: "migration_106_season_calendar",
  apply(save) {
    save.state.week = migrateLegacyWeek(save.state.week);
    save.manifest.current_week = { ...save.manifest.current_week, week: save.state.week };

    for (const player of save.players) migratePlayerDays(player);
    const pipeline = save.state.pipeline as unknown as Json | undefined;
    if (pipeline) {
      const rivals = pipeline.rival_players;
      if (Array.isArray(rivals)) for (const player of rivals) migratePlayerDays(player);

      walkCareerStamps(pipeline.club_stadium);
      walkCareerStamps(pipeline.medical_state);
      walkCareerStamps(pipeline.orthopedist_hire);
      walkCareerStamps(pipeline.financing);
      for (const key of ["training_reminder_week", "kicker_consumed_week"] as const) {
        const stamp = pipeline[key];
        if (isRecord(stamp) && typeof stamp.week === "number") stamp.week = migrateLegacyWeek(stamp.week);
      }

      const story = pipeline.story_state;
      if (isRecord(story)) {
        const act = story.act_started;
        if (isRecord(act) && typeof act.week === "number") act.week = migrateLegacyWeek(act.week);
        const payoffs = story.scheduled_payoffs;
        if (Array.isArray(payoffs)) {
          for (const payoff of payoffs) {
            if (isRecord(payoff) && typeof payoff.due_week === "number") {
              payoff.due_week = migrateLegacyWeek(payoff.due_week);
            }
          }
        }
      }

      const transfers = pipeline.transfer_state;
      if (isRecord(transfers)) {
        for (const list of [transfers.scheduled_transfers, transfers.history]) {
          if (!Array.isArray(list)) continue;
          for (const entry of list) {
            if (isRecord(entry) && typeof entry.effective_week === "number") {
              entry.effective_week = migrateLegacyWeek(entry.effective_week);
            }
          }
        }
      }
    }

    save.manifest.save_version = 106;
    return save;
  },
};
