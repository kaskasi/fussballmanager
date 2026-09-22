import { describe, expect, it } from "vitest";
import { validatePlayer } from "../types/validation.ts";
import {
  INTAKE_COUNT,
  SEASON_END_WEEK,
  academyMixture,
  adjustDrive,
  generateYouthIntake,
  intakeBirthDate,
  IntakeOutOfSeasonError,
  type GenerateIntakeInput,
} from "./intake-generator.ts";

function mulberry32(seed: number): () => number {
  let state = seed;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function input(overrides: Partial<GenerateIntakeInput> = {}): GenerateIntakeInput {
  return {
    season: 1,
    week: SEASON_END_WEEK,
    seasonYear: 2026,
    clubId: "cl_fc_nordstern",
    nationality: "DE",
    region: "Schleswig-Holstein",
    facility: "academy_basic",
    idStart: 1,
    random: mulberry32(2026),
    ...overrides,
  };
}

function skillMean(player: ReturnType<typeof generateYouthIntake>[number]): number {
  const { weak_foot: _weak, ...skills } = player.attributes;
  const values = Object.values(skills);
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

describe("academy mixture", () => {
  it("keeps the published weights and means at the basic house", () => {
    const mixture = academyMixture("academy_basic");
    expect(mixture.map((component) => component.weight)).toEqual([0.85, 0.12, 0.025, 0.005]);
    expect(mixture.map((component) => component.mean)).toEqual([65, 85, 105, 120]);
    expect(mixture.reduce((sum, component) => sum + component.weight, 0)).toBeCloseTo(1, 8);
  });

  it("shifts every mean by 10 at performance and by 25 at elite, without stacking", () => {
    expect(academyMixture("academy_performance").map((component) => component.mean)).toEqual([
      75, 95, 115, 130,
    ]);
    expect(academyMixture("academy_elite").map((component) => component.mean)).toEqual([
      90, 110, 130, 145,
    ]);
  });

  it("gives the prodigy component 1.5× weight and renormalises the rest", () => {
    const mixture = academyMixture("academy_elite");
    const scale = (1 - 0.0075) / 0.995;
    expect(mixture[3]?.weight).toBeCloseTo(0.0075, 8);
    expect(mixture[0]?.weight).toBeCloseTo(0.85 * scale, 8);
    expect(mixture.reduce((sum, component) => sum + component.weight, 0)).toBeCloseTo(1, 8);
  });
});

describe("drive adjustment", () => {
  const center = (0.85 + 1.5) / 2;

  it("does not move drive when Anlage sits on the range centre", () => {
    expect(adjustDrive(1, center, 70, 0)).toBeCloseTo(1, 8);
  });

  it("pulls drive down as mean Anlage rises", () => {
    expect(adjustDrive(1, 1.5, 70, 0.5)).toBeCloseTo(1 - 0.15 * (1.5 - center), 8);
  });

  it("applies the 15% elite cut only when the skill mean is above 95 and the roll hits", () => {
    expect(adjustDrive(1, center, 96, 0.14)).toBeCloseTo(0.85, 8);
    expect(adjustDrive(1, center, 96, 0.15)).toBeCloseTo(1, 8);
    expect(adjustDrive(1, center, 95, 0)).toBeCloseTo(1, 8);
  });

  it("clamps the result to [0.4, 1.6]", () => {
    expect(adjustDrive(0.45, 1.5, 120, 0)).toBe(0.4);
  });
});

describe("generateYouthIntake", () => {
  it("refuses every week except season end", () => {
    expect(() => generateYouthIntake(input({ week: 1 }))).toThrow(IntakeOutOfSeasonError);
    expect(() => generateYouthIntake(input({ week: 33 }))).toThrow(IntakeOutOfSeasonError);
    expect(() => generateYouthIntake(input({ week: 35 }))).toThrow(IntakeOutOfSeasonError);
  });

  it("returns 24 valid 15-year-old U17 players with youth contracts unset", () => {
    const players = generateYouthIntake(input());
    expect(players).toHaveLength(INTAKE_COUNT);
    const ids = new Set(players.map((player) => player.id));
    expect(ids.size).toBe(INTAKE_COUNT);
    for (const player of players) {
      expect(validatePlayer(player).valid).toBe(true);
      expect(player.age).toBe(15);
      expect(player.squad_status).toBe("u17");
      expect(player.contract).toBeNull();
      expect(player.current_loan).toBeUndefined();
      expect(player.state.fitness).toBe(100);
      expect(player.state.morale).toBe(70);
      expect(player.state.form).toBe(0);
      expect(player.attributes.weak_foot).toBeGreaterThanOrEqual(20);
      expect(player.attributes.weak_foot).toBeLessThanOrEqual(80);
      expect(player.flexibility).toEqual([]);
      expect(completedYears(player.birth.date, "2026-05-31")).toBe(15);
    }
    expect(players.filter((player) => player.position === "GK")).toHaveLength(2);
    expect(players[0]?.id).toBe("pl_00001");
    expect(players[23]?.id).toBe("pl_00024");
  });

  it("repeats exactly when the random sequence repeats", () => {
    const first = generateYouthIntake(input({ random: mulberry32(7) }));
    const second = generateYouthIntake(input({ random: mulberry32(7) }));
    expect(first).toEqual(second);
  });

  it("marks prodigies only from the mean-120 component", () => {
    const players = generateYouthIntake(input({ random: () => 0.999 }));
    expect(players.every((player) => player.hidden.breakout_flags.includes("prodigy_foundation"))).toBe(
      true,
    );
    expect(players.every((player) => player.hidden.maturity_offset === 0)).toBe(true);
  });

  it("assigns early and late bloomers from the first roll bands", () => {
    const early = generateYouthIntake(input({ random: () => 0.01 }));
    const late = generateYouthIntake(input({ random: () => 0.05 }));
    expect(early.every((player) => player.hidden.maturity_offset === 5)).toBe(true);
    expect(late.every((player) => player.hidden.maturity_offset === -5)).toBe(true);
    expect(early.every((player) => player.hidden.breakout_flags.length === 0)).toBe(true);
  });

  it("lifts the cohort when the academy is better", () => {
    const basic = averageSkill(generateYouthIntake(input({ random: mulberry32(11) })));
    const performance = averageSkill(
      generateYouthIntake(input({ facility: "academy_performance", random: mulberry32(11) })),
    );
    const elite = averageSkill(
      generateYouthIntake(input({ facility: "academy_elite", random: mulberry32(11) })),
    );
    expect(performance - basic).toBeGreaterThan(6);
    expect(performance - basic).toBeLessThan(14);
    expect(elite).toBeGreaterThan(performance);
  });
});

describe("intakeBirthDate", () => {
  it("lands on a date that is 15 on 31 May, including a leap year", () => {
    for (const year of [2024, 2026, 2028]) {
      for (let step = 0; step < 20; step++) {
        const date = intakeBirthDate(year, () => step / 20);
        expect(completedYears(date, `${year}-05-31`)).toBe(15);
      }
    }
  });
});

function averageSkill(players: ReturnType<typeof generateYouthIntake>): number {
  return players.reduce((sum, player) => sum + skillMean(player), 0) / players.length;
}

function completedYears(birthIso: string, asOfIso: string): number {
  const birth = new Date(`${birthIso}T00:00:00Z`);
  const asOf = new Date(`${asOfIso}T00:00:00Z`);
  let age = asOf.getUTCFullYear() - birth.getUTCFullYear();
  const monthDay = asOf.getUTCMonth() - birth.getUTCMonth();
  if (monthDay < 0 || (monthDay === 0 && asOf.getUTCDate() < birth.getUTCDate())) age -= 1;
  return age;
}
