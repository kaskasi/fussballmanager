import { careerProYears } from "../../development/experience.ts";
import { MENTOR_MIN_PRO_YEARS } from "../../development/mentoring.ts";
import type { SaveMigration } from "./index.ts";

/** F2.4 rework: mentors need pro years and teach one talent each; `mentorship.gained` starts at 0. */
export const migration100MentoringSlots: SaveMigration = {
  id: "migration_100_mentoring_slots",
  apply(save) {
    const byId = new Map(save.players.map((player) => [player.id, player]));
    const taken = new Set<string>();
    for (const player of save.players) {
      const link = player.state.mentorship;
      if (!link) continue;
      const mentor = byId.get(link.mentor_player_id);
      if (!mentor || careerProYears(mentor) < MENTOR_MIN_PRO_YEARS || taken.has(mentor.id)) {
        delete player.state.mentorship;
        continue;
      }
      taken.add(mentor.id);
      link.gained = link.gained ?? 0;
    }
    save.manifest.save_version = 100;
    return save;
  },
};
