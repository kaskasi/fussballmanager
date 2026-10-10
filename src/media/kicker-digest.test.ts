import { describe, expect, it } from "vitest";
import { aiTransfersForKickerWeek, buildKickerEdition, buildTreterEdition } from "./kicker-digest.ts";
import { treterCampHeroCopy } from "./treter-copy.ts";
import type { TransferRecord } from "../transfers/transfer-history.ts";
import type { GameSession } from "../persistence/game-session.ts";
import { defaultLeagueState } from "../persistence/league-state.ts";

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

function minimalTreterSession(overrides: Partial<GameSession> = {}): GameSession {
  return {
    season: 1,
    week: 5,
    weekday: 2,
    masterSeed: 99,
    clubId: "",
    transferState: { history: [], pending_transfers: [], shortlist: [], inbound_offers: [] },
    rivalPlayers: [],
    world: { clubs: [], seed: 0 },
    youthCamps: [],
    league: defaultLeagueState(),
    players: [],
    scoutBoard: { targets: {} },
    board: {
      pressure: 0,
      objectives: [],
      employer_club_id: defaultLeagueState().player_club_id,
      job_status: "employed",
      promotions_this_season: 0,
    },
    stadium: {},
    clubEvents: [],
    pipeline: {} as GameSession["pipeline"],
    merchandising: {},
    narrative: {},
    rng: {},
    calendar: {},
    training: {},
    youth: {},
    scouting: {},
    transfers: {},
    finance: {},
    staff: {},
    chronicle: [],
    history: [],
    ...overrides,
  } as GameSession;
}

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
    expect(edition.league).toBeDefined();
    expect(edition.league.table.length).toBeGreaterThan(0);
  });

  it("camp hero appears only in the purchase week", () => {
    const camps = [
      {
        id: "camp_br",
        staffed: true,
        purchased_season: 1,
        purchased_week: 3,
        leader_hire: "hired" as const,
      },
    ];
    const purchaseWeek = buildTreterEdition(
      minimalTreterSession({ week: 3, youthCamps: camps }),
    );
    const laterWeek = buildTreterEdition(
      minimalTreterSession({ week: 5, youthCamps: camps }),
    );
    expect(purchaseWeek.articles.some((a) => a.kind === "camp")).toBe(true);
    expect(laterWeek.articles.some((a) => a.kind === "camp")).toBe(false);
  });

  it("rotating tabloid filler changes between weeks", () => {
    const w4 = buildTreterEdition(minimalTreterSession({ week: 4 }));
    const w5 = buildTreterEdition(minimalTreterSession({ week: 5 }));
    const rotate4 = w4.articles.find((a) => a.id.startsWith("treter-rotate-"));
    const rotate5 = w5.articles.find((a) => a.id.startsWith("treter-rotate-"));
    expect(rotate4?.body).toBeDefined();
    expect(rotate5?.body).toBeDefined();
    expect(rotate4?.body).not.toBe(rotate5?.body);
  });

  it("camp copy variants differ by seed", () => {
    const a = treterCampHeroCopy("camp_br", "Nordstern FC", "seed-a");
    const b = treterCampHeroCopy("camp_br", "Nordstern FC", "seed-b");
    expect(a.headline).not.toBe(b.headline);
  });
});
