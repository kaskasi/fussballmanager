import { describe, expect, it } from "vitest";
import { BREAKOUT_SIGNAL } from "./breakouts.ts";
import {
  advanceMentorshipWeek,
  applyMentorshipWeek,
  assignMentor,
  eligibleMentors,
  isMentorCandidate,
  mentorshipWeeks,
  MENTORSHIP_WEEKS_FOR_SIGNAL,
  MENTOR_FORM_CEILING,
  MENTOR_MIN_PRO_YEARS,
  MENTOR_MORALE_CEILING,
  teachableAttributes,
} from "./mentoring.ts";
import { mentoringSlotsFromFacilities, MENTORING_SLOTS_BASE } from "./mentoring-capacity.ts";
import type { GrowthSnapshot, Player } from "../types/player.ts";

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

function proSeasons(count: number): GrowthSnapshot[] {
  return Array.from({ length: count }, (_, index) => ({
    season: index - count,
    age: 18 + index,
    attributes_snapshot: {} as GrowthSnapshot["attributes_snapshot"],
    minutes_played: 1_500,
    drive_at_snapshot: 1,
    season_apps: 20,
  }));
}

function veteran(id: string, years: number, attributes: Partial<Player["attributes"]> = {}): Player {
  const base = player({ id, age: 32 });
  return {
    ...base,
    attributes: { ...base.attributes, leadership: 78, ...attributes },
    hidden: { ...base.hidden, drive: 1.35 },
    history: { ...base.history, growth: proSeasons(years) },
  };
}

describe("mentoring", () => {
  const mentor = veteran("mentor", 8, { passing: 80, vision: 75 });
  const mentee = player({ id: "mentee", age: 19 });

  it("needs a few pro seasons to mentor", () => {
    expect(isMentorCandidate(veteran("rookie", MENTOR_MIN_PRO_YEARS - 1), "cl_fc_nordstern")).toBe(false);
    expect(isMentorCandidate(veteran("vet", MENTOR_MIN_PRO_YEARS), "cl_fc_nordstern")).toBe(true);
    const young = assignMentor(mentee, veteran("rookie", 2), 1, 5);
    expect("error" in young).toBe(true);
  });

  it("assigns mentor and tracks weeks", () => {
    const assigned = assignMentor(mentee, mentor, 1, 5);
    expect("error" in assigned).toBe(false);
    if ("error" in assigned) return;
    expect(assigned.player.state.mentorship?.mentor_player_id).toBe("mentor");
    expect(mentorshipWeeks(assigned.player.state.mentorship!, 1, 10)).toBe(5);
  });

  it("teaches only attributes where the mentor is better", () => {
    const taught = teachableAttributes(mentee, mentor).map((entry) => entry.attribute);
    expect(taught).toEqual(["passing", "leadership", "vision"]);

    const assigned = assignMentor(mentee, mentor, 1, 1);
    if ("error" in assigned) throw new Error("assign failed");
    const after = applyMentorshipWeek(assigned.player, mentor);
    expect(after.attributes.passing).toBeGreaterThan(mentee.attributes.passing);
    expect(after.attributes.vision).toBeGreaterThan(mentee.attributes.vision);
    expect(after.attributes.shooting).toBe(mentee.attributes.shooting);
    expect(after.attributes.pace).toBe(mentee.attributes.pace);
    expect(after.state.mentorship?.gained).toBeGreaterThan(0);
  });

  it("never lifts an attribute past the mentor", () => {
    const close = { ...mentee, attributes: { ...mentee.attributes, passing: 79.99 } };
    const assigned = assignMentor(close, mentor, 1, 1);
    if ("error" in assigned) throw new Error("assign failed");
    let current = assigned.player;
    for (let week = 0; week < 60; week += 1) current = applyMentorshipWeek(current, mentor);
    expect(current.attributes.passing).toBeLessThanOrEqual(mentor.attributes.passing);
  });

  it("lifts morale and form up to a ceiling", () => {
    const low = { ...mentee, state: { ...mentee.state, morale: 40, form: -2 } };
    const assigned = assignMentor(low, mentor, 1, 1);
    if ("error" in assigned) throw new Error("assign failed");
    const after = applyMentorshipWeek(assigned.player, mentor);
    expect(after.state.morale).toBeGreaterThan(40);
    expect(after.state.form).toBeGreaterThan(-2);

    let current = after;
    for (let week = 0; week < 200; week += 1) current = applyMentorshipWeek(current, mentor);
    expect(current.state.morale).toBe(MENTOR_MORALE_CEILING);
    expect(current.state.form).toBe(MENTOR_FORM_CEILING);
  });

  it("gives each mentor one talent and respects the slot count", () => {
    const first = assignMentor(mentee, mentor, 1, 1);
    if ("error" in first) throw new Error("assign failed");
    const second = player({ id: "second", age: 20 });
    const squad = [first.player, second, mentor];
    expect(eligibleMentors(squad, second, "cl_fc_nordstern").map((entry) => entry.id)).not.toContain("mentor");
    expect("error" in assignMentor(second, mentor, 1, 1, { players: squad })).toBe(true);

    const other = veteran("other", 6);
    const full = assignMentor(second, other, 1, 1, { players: [...squad, other], maxSlots: 1 });
    expect("error" in full).toBe(true);
    const room = assignMentor(second, other, 1, 1, { players: [...squad, other], maxSlots: 2 });
    expect("error" in room).toBe(false);
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

describe("mentoring slots", () => {
  it("starts with base slots and grows with clubhouse and restaurant", () => {
    expect(mentoringSlotsFromFacilities({ clubhouseLevel: 0, restaurant: false }).total).toBe(MENTORING_SLOTS_BASE);
    expect(mentoringSlotsFromFacilities({ clubhouseLevel: 1, restaurant: false }).total).toBe(MENTORING_SLOTS_BASE + 1);
    const full = mentoringSlotsFromFacilities({ clubhouseLevel: 2, restaurant: true });
    expect(full.total).toBe(MENTORING_SLOTS_BASE + 3);
    expect(full.next).toEqual([]);
  });
});
