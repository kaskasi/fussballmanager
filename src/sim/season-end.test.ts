import { describe, expect, it } from "vitest";
import { newGameSession } from "../persistence/game-session.ts";
import { INTAKE_COUNT } from "../youth/intake-generator.ts";
import { runSeasonEnd } from "./season-end.ts";

describe("season end", () => {
  it("ages the squad and adds a new intake batch", () => {
    const session = newGameSession();
    const before = session.players.length;
    const ages = session.players.map((player) => player.age);
    const result = runSeasonEnd(session, session.season);
    expect(result.intakeCount).toBe(INTAKE_COUNT);
    expect(result.session.players.length).toBe(before + INTAKE_COUNT);
    const pros = result.session.players.filter((player) => ages.includes(player.age));
    expect(pros.length).toBeGreaterThan(0);
  });
});
