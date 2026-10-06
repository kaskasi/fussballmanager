import { describe, expect, it } from "vitest";
import { assignIndividualProgram } from "../../development/individual-training.ts";
import { loadDemoRoster } from "../../ui/demo-roster.ts";
import {
  collectCalendarMilestones,
  individualProgramEndWeek,
  milestoneCivilDate,
} from "./calendar-milestones.ts";
import { newGameSession } from "../../persistence/game-session.ts";

describe("calendar milestones", () => {
  it("computes individual program end week from start + planned duration", () => {
    const players = loadDemoRoster();
    const player = players.find((entry) => entry.squad_status === "pro")!;
    const programs = assignIndividualProgram([], player, "position_retrain", 4, 1, 8, "AM");
    const program = programs[0]!;
    expect(individualProgramEndWeek(program)).toBe(11);
  });

  it("collects retrain milestone on Sunday of end week", () => {
    const session = newGameSession();
    const player = session.players.find((entry) => entry.squad_status === "pro")!;
    session.individualPrograms = assignIndividualProgram(
      [],
      player,
      "position_retrain",
      4,
      session.season,
      8,
      "AM",
    );
    const milestones = collectCalendarMilestones(session);
    const retrain = milestones.find((entry) => entry.kind === "individual_retrain");
    expect(retrain?.week).toBe(11);
    expect(retrain?.weekday).toBe(7);
    expect(milestoneCivilDate(retrain!).day).toBeGreaterThan(0);
  });
});
