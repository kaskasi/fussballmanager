import type { Attributes, Player } from "./player.ts";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

const SKILL_KEYS = [
  "shooting",
  "passing",
  "dribbling",
  "technique",
  "pace",
  "strength",
  "stamina",
  "composure",
  "leadership",
  "positioning",
  "vision",
  "concentration",
  "teamwork",
  "gk_handling",
] as const satisfies readonly (keyof Attributes)[];

const ANLAGE_KEYS = [
  ...SKILL_KEYS,
  "weak_foot",
] as const satisfies readonly (keyof Attributes)[];

function inClosedRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}

/** Skills are 0–199. weak_foot is 0–100 (PRD 07.3), not the skill ceiling. */
export function validateAttributes(attributes: Attributes): boolean {
  for (const key of SKILL_KEYS) {
    if (!inClosedRange(attributes[key], 0, 199)) return false;
  }
  return inClosedRange(attributes.weak_foot, 0, 100);
}

export function validateHidden(hidden: Player["hidden"]): boolean {
  for (const key of ANLAGE_KEYS) {
    if (!inClosedRange(hidden.anlage[key], 0.85, 1.5)) return false;
  }
  return (
    inClosedRange(hidden.drive, 0.4, 1.6) &&
    inClosedRange(hidden.maturity_offset, -5, 5)
  );
}

function attributeErrors(attributes: Attributes): string[] {
  const errors: string[] = [];
  for (const key of SKILL_KEYS) {
    if (!inClosedRange(attributes[key], 0, 199)) {
      errors.push(`attributes.${key} must be within [0, 199]`);
    }
  }
  if (!inClosedRange(attributes.weak_foot, 0, 100)) {
    errors.push("attributes.weak_foot must be within [0, 100]");
  }
  return errors;
}

function hiddenErrors(hidden: Player["hidden"]): string[] {
  const errors: string[] = [];
  for (const key of ANLAGE_KEYS) {
    if (!inClosedRange(hidden.anlage[key], 0.85, 1.5)) {
      errors.push(`hidden.anlage.${key} must be within [0.85, 1.50]`);
    }
  }
  if (!inClosedRange(hidden.drive, 0.4, 1.6)) {
    errors.push("hidden.drive must be within [0.4, 1.6]");
  }
  if (!inClosedRange(hidden.maturity_offset, -5, 5)) {
    errors.push("hidden.maturity_offset must be within [-5, 5]");
  }
  return errors;
}

/**
 * Checks every PRD 07.3 rule that can be decided from the player alone.
 * Age versus the game date needs a clock this signature does not take.
 */
export function validatePlayer(player: Player): ValidationResult {
  const errors: string[] = [];

  if (!/^pl_\d{5}$/.test(player.id)) {
    errors.push("id must match /^pl_\\d{5}$/");
  }

  errors.push(...attributeErrors(player.attributes));
  errors.push(...hiddenErrors(player.hidden));

  if (!inClosedRange(player.state.fitness, 0, 100)) {
    errors.push("state.fitness must be within [0, 100]");
  }
  if (!inClosedRange(player.state.morale, 0, 100)) {
    errors.push("state.morale must be within [0, 100]");
  }
  if (!inClosedRange(player.state.form, -5, 5)) {
    errors.push("state.form must be within [-5, 5]");
  }

  const loaned = player.squad_status === "loaned_out";
  const hasLoan = player.current_loan !== undefined;
  if (loaned !== hasLoan) {
    errors.push(
      'squad_status "loaned_out" and current_loan must both be set or both be absent',
    );
  }

  return { valid: errors.length === 0, errors };
}
