import { describe, expect, it } from "vitest";
import { aiTransfersForKickerWeek, buildKickerEdition } from "./kicker-digest.ts";
import type { TransferRecord } from "../transfers/transfer-history.ts";

const sample: TransferRecord = {
  id: "tr_ai_1",
  season: 2,
  week: 4,
  kind: "ai",
  player_id: "p1",
  player_name: "Erik Hansen",
  other_club_id: "cl_a",
  other_club_name: "Club A → Club B",
  fee: 250_000,
};

describe("kicker-digest", () => {
  it("filters AI transfers for the week", () => {
    const list = aiTransfersForKickerWeek([sample, { ...sample, id: "x", week: 3 }], 2, 4);
    expect(list).toHaveLength(1);
    expect(list[0]?.player_name).toBe("Erik Hansen");
  });

  it("buildKickerEdition produces headlines from templates", () => {
    const edition = buildKickerEdition({
      history: [sample],
      season: 2,
      week: 4,
      masterSeed: 42,
      rivalPlayers: [],
    });
    expect(edition.articles.length).toBeGreaterThan(0);
    const transferArticle = edition.articles.find((a) => a.kind === "transfer_ai");
    expect(transferArticle?.headline).toContain("Erik Hansen");
  });
});
