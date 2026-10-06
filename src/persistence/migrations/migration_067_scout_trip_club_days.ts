import type { ScoutBoard } from "../../scouting/scout-board.ts";
import {
  scoutTripDurationFromClubStops,
  type ScoutTripDurationBreakdown,
} from "../../scouting/scout-trip-duration.ts";
import type { ActiveScoutTrip, ScoutTripPlan } from "../../scouting/scout-trip.ts";
import { clubStopsForTrip } from "../../scouting/scout-trip.ts";
import type { SaveMigration } from "./index.ts";

function refreshDuration(trip: ScoutTripPlan | ActiveScoutTrip): ScoutTripDurationBreakdown {
  const clubs = clubStopsForTrip(trip);
  return scoutTripDurationFromClubStops(Math.max(1, clubs.length), trip.zone_id);
}

/** Recompute trip length: 1 working day per club (PRD 21). */
export const migration067ScoutTripClubDays: SaveMigration = {
  id: "migration_067_scout_trip_club_days",
  apply(save) {
    const board = save.state.pipeline?.scout_board as ScoutBoard | undefined;
    if (board) {
      const queue = (board.scout_trip_queue ?? []).map((plan) => ({
        ...plan,
        duration: refreshDuration(plan),
      }));
      const active = board.active_scout_trip
        ? {
            ...board.active_scout_trip,
            duration: refreshDuration(board.active_scout_trip),
            working_days_done: Math.min(
              board.active_scout_trip.working_days_done,
              refreshDuration(board.active_scout_trip).totalWorkingDays,
            ),
          }
        : null;
      save.state.pipeline!.scout_board = {
        ...board,
        scout_trip_queue: queue,
        active_scout_trip: active,
      };
    }
    save.manifest.save_version = 67;
    return save;
  },
};
