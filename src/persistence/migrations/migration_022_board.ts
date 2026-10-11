import { defaultBoardState } from "../../board/board-state.ts";
import { startBoardSeason } from "../../board/season-objectives.ts";
import { defaultEmployerClubId } from "../../board/job-offers.ts";
import { defaultLeagueState } from "../league-state.ts";
import type { SaveMigration } from "./index.ts";

export const migration022Board: SaveMigration = {
  id: "migration_022_board",
  apply: (save) => {
    const pipeline = save.state.pipeline;
    if (pipeline && !pipeline.board) {
      pipeline.board = startBoardSeason(
        defaultBoardState(defaultEmployerClubId()),
        defaultEmployerClubId(),
        save.state.season,
        save.state.league ?? defaultLeagueState(),
      );
    }
    save.manifest.save_version = 22;
    return save;
  },
};
