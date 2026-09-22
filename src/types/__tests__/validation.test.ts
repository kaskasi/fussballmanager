import { describe, expect, it } from "vitest";
import { validateAttributes, validateHidden, validatePlayer } from "../validation.ts";
import { clonePlayer, validAttributes, validPlayer } from "./fixtures.ts";

describe("validatePlayer", () => {
  it("accepts the valid fixture", () => {
    expect(validatePlayer(validPlayer)).toEqual({ valid: true, errors: [] });
  });

  it("accepts skill attributes at 0 and 199", () => {
    const atFloor = clonePlayer();
    atFloor.attributes.shooting = 0;
    expect(validatePlayer(atFloor).valid).toBe(true);

    const atCeiling = clonePlayer();
    atCeiling.attributes.pace = 199;
    expect(validatePlayer(atCeiling).valid).toBe(true);
  });

  it("accepts drive at exactly 1.6", () => {
    const player = clonePlayer();
    player.hidden.drive = 1.6;
    expect(validatePlayer(player).valid).toBe(true);
  });

  it("rejects a skill attribute outside [0, 199]", () => {
    const player = clonePlayer();
    player.attributes.shooting = 200;
    const result = validatePlayer(player);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("attributes.shooting must be within [0, 199]");
  });

  it("rejects weak_foot above 100", () => {
    const player = clonePlayer();
    player.attributes.weak_foot = 101;
    const result = validatePlayer(player);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("attributes.weak_foot must be within [0, 100]");
  });

  it("rejects anlage 0.849", () => {
    const player = clonePlayer();
    player.hidden.anlage.passing = 0.849;
    const result = validatePlayer(player);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      "hidden.anlage.passing must be within [0.85, 1.50]",
    );
  });

  it("rejects drive and maturity_offset outside their ranges", () => {
    const highDrive = clonePlayer();
    highDrive.hidden.drive = 1.61;
    expect(validatePlayer(highDrive).errors).toContain(
      "hidden.drive must be within [0.4, 1.6]",
    );

    const offset = clonePlayer();
    offset.hidden.maturity_offset = 6;
    expect(validatePlayer(offset).errors).toContain(
      "hidden.maturity_offset must be within [-5, 5]",
    );
  });

  it("rejects loaned_out without a loan and a loan without loaned_out", () => {
    const missingLoan = clonePlayer();
    missingLoan.squad_status = "loaned_out";
    const missing = validatePlayer(missingLoan);
    expect(missing.valid).toBe(false);
    expect(missing.errors[0]).toMatch(/current_loan/);

    const strayLoan = clonePlayer();
    strayLoan.current_loan = {
      from_club: "cl_fc_nordstern",
      to_club: "cl_sv_rheinwacht",
      until_season: 2,
      has_option: false,
    };
    const stray = validatePlayer(strayLoan);
    expect(stray.valid).toBe(false);
    expect(stray.errors[0]).toMatch(/current_loan/);
  });

  it("rejects an id that is not pl_ plus five digits", () => {
    const player = clonePlayer();
    player.id = "pl_42";
    const result = validatePlayer(player);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("id must match /^pl_\\d{5}$/");
  });

  it("rejects fitness, morale, and form outside PRD 07.3", () => {
    const player = clonePlayer();
    player.state.fitness = 101;
    player.state.morale = -1;
    player.state.form = 6;
    const result = validatePlayer(player);
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual([
      "state.fitness must be within [0, 100]",
      "state.morale must be within [0, 100]",
      "state.form must be within [-5, 5]",
    ]);
  });
});

describe("validateAttributes", () => {
  it("accepts 0 and 199 on skills and rejects 200", () => {
    expect(validateAttributes({ ...validAttributes, shooting: 0, pace: 199 })).toBe(
      true,
    );
    expect(validateAttributes({ ...validAttributes, shooting: 200 })).toBe(false);
  });
});

describe("validateHidden", () => {
  it("accepts drive 1.6 and rejects anlage 0.849", () => {
    const hidden = structuredClone(validPlayer.hidden);
    hidden.drive = 1.6;
    expect(validateHidden(hidden)).toBe(true);
    hidden.anlage.shooting = 0.849;
    expect(validateHidden(hidden)).toBe(false);
  });
});
