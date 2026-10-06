import { describe, expect, it } from "vitest";
import { newGameSession } from "../persistence/game-session.ts";
import { NORDSTERN_TEAM_ID } from "../world/world-generator.ts";
import {
  leagueClubStarterCaRows,
  pickOpponentForStrengthBucket,
  pickOpponentsAcrossCaSpectrum,
} from "./opponent-scout-study-opponents.ts";
import { careerEngineSquadFromPlayers } from "../sim/career-engine-squad.ts";
import { clubStarterCaAverage } from "../sim/club-profiles.ts";

describe("opponent scout study opponents", () => {
  const session = newGameSession(new Date("2026-08-01T12:00:00Z"));

  it("picks three distinct buckets when league spread allows", () => {
    const nordsternSquad = careerEngineSquadFromPlayers(session.players, NORDSTERN_TEAM_ID);
    const nordsternCa = nordsternSquad
      ? clubStarterCaAverage(nordsternSquad, session.players)
      : null;
    expect(nordsternCa).not.toBeNull();

    const weaker = pickOpponentForStrengthBucket(session, "weaker");
    const similar = pickOpponentForStrengthBucket(session, "similar");
    const stronger = pickOpponentForStrengthBucket(session, "stronger");
    expect(weaker).not.toBeNull();
    expect(similar).not.toBeNull();
    expect(stronger).not.toBeNull();

    expect(weaker!.opponentStarterCa).toBeLessThanOrEqual(nordsternCa! + 3);
    expect(stronger!.opponentStarterCa).toBeGreaterThanOrEqual(nordsternCa! - 3);
    expect(similar!.caDelta).toBeLessThanOrEqual(
      Math.max(...leagueClubStarterCaRows(session).map((row) => Math.abs(row.starterCa - nordsternCa!))),
    );
  });

  it("picks ten unique opponents spread by starter CA", () => {
    const picks = pickOpponentsAcrossCaSpectrum(session, 10);
    expect(picks).toHaveLength(10);
    const ids = new Set(picks.map((row) => row.opponentId));
    expect(ids.size).toBe(10);
    const cas = picks.map((row) => row.opponentStarterCa);
    expect(cas[0]).toBeLessThanOrEqual(cas[cas.length - 1]!);
  });

  it("returns stable opponent ids for default seed world", () => {
    const similar = pickOpponentForStrengthBucket(session, "similar");
    expect(similar?.opponentId).toBeTruthy();
    expect(similar?.nordsternStarterCa).toBeGreaterThan(0);
  });
});
