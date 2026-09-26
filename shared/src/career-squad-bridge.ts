import { asPlayerId } from "./ids.ts";
import type { TeamId } from "./ids.ts";
import { getFormation } from "./formations.ts";
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
  portraitSeed: number;
  overall?: number;
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

export function mapCareerFatigue(fitness: number): number {
  return Math.min(100, Math.max(0, Math.round(100 - fitness)));
}

export function mapCareerAttributes(
  attributes: CareerPlayerAttributes,
  role: PlayerRole,
): PlayerAttributes {
  const scale = scaleCareerAttribute;
  const tackling = scale(attributes.positioning * 0.55 + attributes.strength * 0.45);
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
    positioning: scale(attributes.positioning),
    aerial: scale(attributes.strength),
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
    form: mapCareerForm(career.form),
    fatigue: mapCareerFatigue(career.fitness),
    shirt: (career.portraitSeed % 98) + 1,
    attributes: mapCareerAttributes(career.attributes, role),
  };
}

function compareCareerPlayers(left: CareerPlayerInput, right: CareerPlayerInput): number {
  const leftOverall = left.overall ?? left.attributes.shooting;
  const rightOverall = right.overall ?? right.attributes.shooting;
  return rightOverall - leftOverall;
}

/**
 * Seat career pros on the template formation. Bench fillers come from the
 * template when the career roster is short.
 */
export function buildCareerEngineSquad(template: Squad, careerPlayers: readonly CareerPlayerInput[]): Squad {
  const ranked = [...careerPlayers].sort(compareCareerPlayers);
  const slots = getFormation(template.tactics.formation);
  const pool = [...ranked];

  const starters = slots.map((slot) => {
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
    const chosen = pool.splice(bestIndex, 1)[0];
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
