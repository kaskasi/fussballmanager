import type { SaveMigration } from "./index.ts";
import { archiveKickerEdition } from "../../inbox/kicker-edition-archive.ts";

export const migration084KickerEditionArchive: SaveMigration = {
  id: "migration_084_kicker_edition_archive",
  apply(save) {
    save.manifest.save_version = 79;
    const pipeline = save.state.pipeline;
    if (!pipeline) return save;
    let archive = pipeline.kicker_edition_archive ?? [];
    if (pipeline.kicker_edition) {
      archive = archiveKickerEdition(archive, pipeline.kicker_edition);
    }
    save.state.pipeline = { ...pipeline, kicker_edition_archive: archive };
    return save;
  },
};
