import { describe, expect, it } from "vitest";
import { newGameSession, saveFromSession } from "../persistence/game-session.ts";
import { normalizeSave } from "../persistence/local-save.ts";
import { campRoster, generateCampOpeningBundle } from "./satellite-camps.ts";
import { campCopyReplacements } from "./camp-duplicates.ts";

describe("camp opening copies (old double generation)", () => {
  it("keeps one of each tripled camp talent and points references at it", () => {
    const session = newGameSession();
    const bundle = generateCampOpeningBundle({
      campId: "camp_ng",
      clubId: session.clubId,
      season: session.season,
      week: session.week,
      masterSeed: session.masterSeed,
      players: session.players,
    });
    expect(bundle.players).toHaveLength(3);
    const copies = [1, 2].flatMap((round) =>
      bundle.players.map((player) => ({ ...player, id: `${player.id}${round}` })),
    );
    const headlineCopy = `${bundle.headlinePlayerId}2`;
    const save = saveFromSession({
      ...session,
      players: [...session.players, ...bundle.players, ...copies],
      transferState: { ...session.transferState, shortlist: [headlineCopy] },
    });
    expect(campRoster(save.players, "camp_ng")).toHaveLength(9);

    const repaired = normalizeSave(save);
    expect(campRoster(repaired.players, "camp_ng")).toHaveLength(3);
    expect(repaired.state.pipeline?.transfer_state?.shortlist).toEqual([bundle.headlinePlayerId]);
    expect(campCopyReplacements(repaired.players, session.clubId).size).toBe(0);
    expect(normalizeSave(repaired).players).toHaveLength(repaired.players.length);
  });
});
