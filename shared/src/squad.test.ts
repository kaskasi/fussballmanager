import { describe, expect, it } from "vitest";
import { asPlayerId, asTeamId } from "./ids.ts";
import type { Player } from "./player.ts";
import { squadIssues } from "./squad.ts";
import type { Squad } from "./squad.ts";

const teamId = asTeamId("test-club");

function stubPlayer(shirt: number): Player {
  return {
    id: asPlayerId(`test-${shirt}`),
    teamId,
    name: `Player ${shirt}`,
    role: "CM",
    form: 50,
    fatigue: 0,
    attributes: {
      passing: 50,
      tackling: 50,
      shooting: 50,
      pace: 50,
      stamina: 50,
      positioning: 50,
      aerial: 50,
      dribbling: 50,
      goalkeeping: 8,
    },
  };
}

describe("squadIssues", () => {
  it("flags a short bench and a missing starting GK", () => {
    const slots = [
      "LB",
      "LCB",
      "RCB",
      "RB",
      "DM",
      "LCM",
      "RCM",
      "LW",
      "ST",
      "RW",
      "GK",
    ] as const;
    const squad: Squad = {
      team: { id: teamId, name: "Test", shortName: "TST" },
      tactics: {
        teamId,
        formation: "4-3-3",
        mentality: 50,
        pressing: 50,
        width: 50,
        tempo: 50,
      },
      starters: slots.map((slot, index) => ({
        player: stubPlayer(index + 1),
        slot: slot === "GK" ? "ST" : slot,
      })),
      bench: [stubPlayer(12)],
    };
    const issues = squadIssues(squad);
    expect(issues.some((issue) => issue.includes("substitutes"))).toBe(true);
    expect(issues.some((issue) => issue.includes("starting GK"))).toBe(true);
  });
});
