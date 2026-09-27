import { nordsternSquad, rheinwachtSquad } from "@fussballmanager/shared";
import { describe, expect, it } from "vitest";
import {
  parseCareerMatchBody,
  runCareerMatch,
} from "./career-match.ts";

describe("career match API", () => {
  it("simulates caller-supplied league squads", () => {
    const input = parseCareerMatchBody({
      seed: 2026,
      homeTeamId: nordsternSquad.team.id,
      awayTeamId: rheinwachtSquad.team.id,
      homeSquad: nordsternSquad,
      awaySquad: rheinwachtSquad,
      playerClubSquad: nordsternSquad,
    });

    const view = runCareerMatch(input);
    expect(view.home.id).toBe(nordsternSquad.team.id);
    expect(view.away.id).toBe(rheinwachtSquad.team.id);
    expect(view.frames.length).toBeGreaterThan(0);
  });

  it("rejects squads that do not match the fixture ids", () => {
    expect(() =>
      parseCareerMatchBody({
        seed: 2026,
        homeTeamId: rheinwachtSquad.team.id,
        awayTeamId: nordsternSquad.team.id,
        homeSquad: nordsternSquad,
        awaySquad: rheinwachtSquad,
      }),
    ).toThrow(/must match/);
  });
});
