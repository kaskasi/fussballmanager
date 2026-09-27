import type { DecisionInboxItem } from "../../youth/decision-inbox.ts";
import type { SaveMigration } from "./index.ts";

export const migration013InboxQueue: SaveMigration = {
  id: "migration_013_inbox_queue",
  apply: (save) => {
    const inbox = save.state.pipeline?.youth_inbox;
    if (inbox) {
      const legacy = inbox as {
        queue?: DecisionInboxItem[];
        overflowDropped?: number;
      };
      inbox.queue = Array.isArray(legacy.queue) ? legacy.queue : [];
      delete legacy.overflowDropped;
    }
    save.manifest.save_version = 13;
    return save;
  },
};
