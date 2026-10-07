import type { SaveMigration } from "./index.ts";

/** Youth inbox: optional `lastYouthDelivery` on pipeline.youth_inbox (weekly queue release). */
export const migration071YouthInboxWeeklyDelivery: SaveMigration = {
  id: "migration_071_youth_inbox_weekly_delivery",
  apply(save) {
    save.manifest.save_version = 71;
    return save;
  },
};
