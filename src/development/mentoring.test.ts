import { describe, expect, it } from "vitest";
import { BREAKOUT_SIGNAL } from "./breakouts.ts";
import {
  advanceMentorshipWeek,
  assignMentor,
  mentorshipWeeks,
  MENTORSHIP_WEEKS_FOR_SIGNAL,
} from "./mentoring.ts";
import type { Player } from "../types/player.ts";

function player(overrides: Partial<Player> & Pick<Player, "id" | "age">): Player {
  return {
    id: overrides.id,
    name: { first: "Test", last: overrides.id },
    birth: { date: "2010-01-01", place: "Kiel", region: "SH" },
    nationality: "DE",
    age: overrides.age,
    club_id: overrides.club_id ?? "cl_fc_nordstern",
    squad_status: overrides.squad_status ?? "pro",
    position: overrides.position ?? "CM",
    flexibility: [],
    contract: null,
    market_value: 100_000,
    attributes: {
      shooting: 60,
      passing: 60,
      dribbling: 60,
      technique: 60,
      pace: 60,
      strength: 60,
      stamina: 60,
      composure: 60,
      leadership: overrides.attributes?.leadership ?? 60,
      positioning: 60,
      vision: 60,
      concentration: 60,
      teamwork: 60,
      weak_foot: 60,
      gk_handling: 60,
      ...overrides.attributes,
    },
    hidden: {
      anlage: {} as Player["hidden"]["anlage"],
      drive: overrides.hidden?.drive ?? 1.0,
      maturity_offset: 0,
      breakout_flags: [],
      ...overrides.hidden,
    },
    state: {
      fitness: 80,
      injury: null,
      form: 0,
      morale: 60,
      weekly_minutes: 0,
      season_minutes: 0,
      season_apps: 0,
      season_goals: 0,
      season_assists: 0,
      season_yellow_cards: 0,
      season_tackles: 0,
      season_headers: 0,
      recent_growth_26w: 0,
      recent_weekly_minutes: [],
      modifiers: [],
      ...overrides.state,
    },
    history: { growth: [], clubs: [], achievements: [], milestones: [] },
    stamps: [],
    portrait_seed: 1,
  } as Player;
}

describe("mentoring", () => {
  const mentor = {
    ...player({ id: "mentor", age: 32 }),
    attributes: { ...player({ id: "mentor", age: 32 }).attributes, leadership: 78 },
    hidden: {
      ...player({ id: "mentor", age: 32 }).hidden,
      drive: 1.35,
    },
  };
  const mentee = player({ id: "mentee", age: 19 });

  it("assigns mentor and tracks weeks", () => {
    const assigned = assignMentor(mentee, mentor, 1, 5);
    expect("error" in assigned).toBe(false);
    if ("error" in assigned) return;
    expect(assigned.player.state.mentorship?.mentor_player_id).toBe("mentor");
    expect(mentorshipWeeks(assigned.player.state.mentorship!, 1, 10)).toBe(5);
  });

  it("fires mentor-ready signal after enough weeks", () => {
    const assigned = assignMentor(mentee, mentor, 1, 1);
    if ("error" in assigned) throw new Error("assign failed");
    const link = assigned.player.state.mentorship!;
    const week = link.since_week + MENTORSHIP_WEEKS_FOR_SIGNAL;
    const advanced = advanceMentorshipWeek([assigned.player, mentor], 1, week);
    const updated = advanced.find((entry) => entry.id === "mentee")!;
    expect(
      updated.state.modifiers.some(
        (modifier) => modifier.source_event_id === BREAKOUT_SIGNAL.mentorReady,
      ),
    ).toBe(true);
  });
});
