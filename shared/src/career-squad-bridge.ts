import { asPlayerId } from "./ids.ts";
import type { TeamId } from "./ids.ts";
import { getFormation, type FormationId, type FormationSlot } from "./formations.ts";
import type { Player, PlayerAttributes, PlayerRole } from "./player.ts";
import type { Squad } from "./squad.ts";
import { assertValidSquad } from "./squad.ts";

export interface CareerPlayerAttributes {
  shooting: number;
  passing: number;
  dribbling: number;
  pace: number;
  stamina: number;
  positioning: number;
  strength: number;
  technique: number;
  composure: number;
  gk_handling: number;
}

export interface CareerPlayerInput {
  id: string;
  displayName: string;
  position: string;
  attributes: CareerPlayerAttributes;
  form: number;
  fitness: number;
  /** 0–100; shifts engine form by up to ±MORALE_FORM_SWING career-form points. Defaults to neutral. */
  morale?: number;
  portraitSeed: number;
  overall?: number;
  /** Derived 0.62–1.0 match-greenness. Defaults to 1 (full sheet). */
  experience?: number;
}

const ROLE_RANK: Record<PlayerRole, number> = {
  GK: 0,
  FB: 1,
  CB: 2,
  DM: 3,
  CM: 4,
  AM: 5,
  W: 6,
  ST: 7,
};

function roleFit(playerRole: PlayerRole, slotRole: PlayerRole): number {
  if (playerRole === slotRole) return 0;
  return Math.abs(ROLE_RANK[playerRole] - ROLE_RANK[slotRole]);
}

export function careerPositionToRole(position: string): PlayerRole {
  switch (position) {
    case "GK":
      return "GK";
    case "CB":
      return "CB";
    case "LB":
    case "RB":
      return "FB";
    case "DM":
      return "DM";
    case "CM":
    case "LM":
    case "RM":
      return "CM";
    case "AM":
      return "AM";
    case "LW":
    case "RW":
      return "W";
    case "CF":
      return "ST";
    default:
      return "CM";
  }
}

export function scaleCareerAttribute(value: number): number {
  return Math.min(99, Math.max(1, Math.round((value * 100) / 199)));
}

export function mapCareerForm(form: number): number {
  return Math.min(100, Math.max(0, Math.round(((form + 5) / 10) * 100)));
}

/**
 * Press & dressing room (PRD 28): morale nudges engine form by at most ±MORALE_FORM_SWING career-form
 * points (≈ ±5 engine form). Neutral sits at the world's typical morale (generator 55–85), so an
 * average squad plays exactly as before; 100 reaches the cap, 30 and below the floor.
 */
export const MORALE_FORM_SWING = 0.5;
export const MORALE_NEUTRAL = 65;
const MORALE_FORM_SPAN = 35;

export function moraleFormOffset(morale: number | undefined): number {
  if (morale === undefined || !Number.isFinite(morale)) return 0;
  const scaled = ((morale - MORALE_NEUTRAL) / MORALE_FORM_SPAN) * MORALE_FORM_SWING;
  return Math.min(MORALE_FORM_SWING, Math.max(-MORALE_FORM_SWING, scaled));
}

/** Engine form (0–100) from career form plus the subtle morale offset (press & dressing room). */
export function careerEngineForm(career: Pick<CareerPlayerInput, "form" | "morale">): number {
  return mapCareerForm(career.form + moraleFormOffset(career.morale));
}

export function mapCareerFatigue(fitness: number): number {
  return Math.min(100, Math.max(0, Math.round(100 - fitness)));
}

export function mapCareerAttributes(
  attributes: CareerPlayerAttributes,
  role: PlayerRole,
  experience = 1,
): PlayerAttributes {
  const scale = scaleCareerAttribute;
  const xp = Math.min(1, Math.max(0, experience));
  const tackling = scale((attributes.positioning * 0.55 + attributes.strength * 0.45) * xp);
  const heightCm = Math.min(
    205,
    Math.max(165, 172 + Math.round(scaleCareerAttribute(attributes.strength) / 8)),
  );
  return {
    passing: scale(attributes.passing),
    tackling,
    shooting: scale(attributes.shooting),
    pace: scale(attributes.pace),
    stamina: scale(attributes.stamina),
    positioning: scale(attributes.positioning * xp),
    aerial: scale(attributes.strength * xp),
    dribbling: scale(attributes.dribbling),
    goalkeeping: role === "GK" ? scale(attributes.gk_handling) : 1,
    heightCm,
  };
}

function toEnginePlayer(career: CareerPlayerInput, role: PlayerRole, teamId: TeamId): Player {
  return {
    id: asPlayerId(career.id),
    teamId,
    name: career.displayName,
    role,
    form: careerEngineForm(career),
    fatigue: mapCareerFatigue(career.fitness),
    shirt: (career.portraitSeed % 98) + 1,
    attributes: mapCareerAttributes(career.attributes, role, career.experience ?? 1),
  };
}

function compareCareerPlayers(left: RankedCareerPlayer, right: RankedCareerPlayer): number {
  const leftOverall = left.overall ?? left.attributes.shooting;
  const rightOverall = right.overall ?? right.attributes.shooting;
  return rightOverall - leftOverall;
}

/**
 * Seat career pros on the template formation. Bench fillers come from the
 * template when the career roster is short.
 */
type RankedCareerPlayer = Pick<CareerPlayerInput, "position" | "overall" | "attributes">;

/** Best-fit pick per slot from the ranked pool; picked players leave `pool`. */
function pickStarters<T extends RankedCareerPlayer>(
  slots: readonly FormationSlot[],
  pool: T[],
): (T | undefined)[] {
  return slots.map((slot) => {
    let bestIndex = 0;
    let bestFit = Number.POSITIVE_INFINITY;
    for (let index = 0; index < pool.length; index += 1) {
      const candidate = pool[index];
      if (!candidate) continue;
      const fit = roleFit(careerPositionToRole(candidate.position), slot.role);
      if (fit < bestFit) {
        bestFit = fit;
        bestIndex = index;
      }
    }
    return pool.splice(bestIndex, 1)[0];
  });
}

/**
 * The XI {@link buildCareerEngineSquad} would field, in slot order, then the rest
 * ranked best first. Same ranking and slot fit, no template needed.
 */
export function rankCareerSelection<T extends RankedCareerPlayer>(
  formation: FormationId,
  careerPlayers: readonly T[],
): { starters: T[]; bench: T[] } {
  const pool = [...careerPlayers].sort(compareCareerPlayers);
  const starters = pickStarters(getFormation(formation), pool).filter(
    (player): player is T => player !== undefined,
  );
  return { starters, bench: pool };
}

export function buildCareerEngineSquad(template: Squad, careerPlayers: readonly CareerPlayerInput[]): Squad {
  const ranked = [...careerPlayers].sort(compareCareerPlayers);
  const slots = getFormation(template.tactics.formation);
  const pool = [...ranked];
  const picks = pickStarters(slots, pool);

  const starters = slots.map((slot, slotIndex) => {
    const chosen = picks[slotIndex];
    if (!chosen) {
      const fallback = template.starters.find((place) => place.slot === slot.id)?.player;
      if (!fallback) {
        throw new Error(`Not enough career players to fill ${slot.id}`);
      }
      return { player: fallback, slot: slot.id };
    }
    return {
      player: toEnginePlayer(chosen, slot.role, template.team.id),
      slot: slot.id,
    };
  });

  let bench = pool.map((career) =>
    toEnginePlayer(career, careerPositionToRole(career.position), template.team.id),
  );
  for (const filler of template.bench) {
    if (bench.length >= 5) break;
    bench.push(filler);
  }

  const squad: Squad = {
    team: template.team,
    tactics: template.tactics,
    starters,
    bench,
  };
  assertValidSquad(squad);
  return squad;
}

export function squadAverageStrength(squad: Squad): number {
  const ratings = squad.starters.map((place) => {
    const attrs = place.player.attributes;
    return (
      attrs.passing +
      attrs.tackling +
      attrs.shooting +
      attrs.pace +
      attrs.stamina +
      attrs.positioning
    ) / 6;
  });
  return ratings.reduce((sum, value) => sum + value, 0) / ratings.length;
}
