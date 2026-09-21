import {
  awayKickoffPosition,
  FORMATION_IDS,
  type FormationId,
  type FormationSlotId,
  getFormation,
  getFormationSlot,
} from "./formations.ts";
import type { PitchPosition } from "./pitch.ts";
import { isOnPitch } from "./pitch.ts";
import type { Player, PlayerRole, Team } from "./player.ts";
import type { TeamTactics } from "./tactics.ts";
import { FORMATION_PRESETS } from "./tactics.ts";

export type StartingPlace = {
  player: Player;
  slot: FormationSlotId;
};

export type Squad = {
  team: Team;
  tactics: TeamTactics;
  starters: readonly StartingPlace[];
  bench: readonly Player[];
};

export function squadIssues(squad: Squad): string[] {
  const issues: string[] = [];
  const formation = getFormation(squad.tactics.formation);

  if (squad.tactics.teamId !== squad.team.id) {
    issues.push("tactics.teamId does not match team.id");
  }
  if (squad.starters.length !== 11) {
    issues.push(`expected 11 starters, got ${squad.starters.length}`);
  }
  if (squad.bench.length < 5) {
    issues.push(`expected at least 5 substitutes, got ${squad.bench.length}`);
  }

  const starterSlots = squad.starters.map((place) => place.slot);
  for (const slot of formation) {
    if (!starterSlots.includes(slot.id)) {
      issues.push(`missing starter for slot ${slot.id}`);
    }
  }
  for (const place of squad.starters) {
    const known = formation.some((slot) => slot.id === place.slot);
    if (!known) {
      issues.push(`slot ${place.slot} is not in ${squad.tactics.formation}`);
    }
  }

  const players = [...squad.starters.map((place) => place.player), ...squad.bench];
  const ids = new Set<string>();
  for (const player of players) {
    if (player.teamId !== squad.team.id) {
      issues.push(`${player.name} has teamId ${player.teamId}`);
    }
    if (ids.has(player.id)) {
      issues.push(`duplicate player id ${player.id}`);
    }
    ids.add(player.id);
  }

  const gks = squad.starters.filter((place) => place.slot === "GK");
  if (gks.length !== 1) {
    issues.push(`expected exactly one starting GK, got ${gks.length}`);
  }

  return issues;
}

export function assertValidSquad(squad: Squad): void {
  const issues = squadIssues(squad);
  if (issues.length > 0) {
    throw new Error(`Invalid squad ${squad.team.name}: ${issues.join("; ")}`);
  }
}

export type KickoffPlace = {
  player: Player;
  slot: FormationSlotId;
  position: PitchPosition;
};

export function kickoffLineup(
  squad: Squad,
  side: "home" | "away",
): KickoffPlace[] {
  assertValidSquad(squad);
  return squad.starters.map((place) => {
    const homePosition = getFormationSlot(
      squad.tactics.formation,
      place.slot,
    ).homePosition;
    const position =
      side === "home" ? homePosition : awayKickoffPosition(homePosition);
    if (!isOnPitch(position)) {
      throw new Error(`Kickoff position off pitch for ${place.player.name}`);
    }
    return { player: place.player, slot: place.slot, position };
  });
}

export function isFormationId(value: string): value is FormationId {
  return (FORMATION_IDS as readonly string[]).includes(value);
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
  if (playerRole === slotRole) {
    return 0;
  }
  return Math.abs(ROLE_RANK[playerRole] - ROLE_RANK[slotRole]);
}

/**
 * Re-seat a squad on a fixed formation. Players keep names/attributes;
 * slot + role follow the template so the engine shape matches the XI.
 */
export function selectFormation(squad: Squad, formation: FormationId): Squad {
  const slots = getFormation(formation);
  const preset = FORMATION_PRESETS[formation];
  const pool = [...squad.starters.map((place) => place.player)];
  const starters = slots.map((slot) => {
    let bestIndex = 0;
    let bestFit = Number.POSITIVE_INFINITY;
    for (let index = 0; index < pool.length; index += 1) {
      const candidate = pool[index];
      if (!candidate) {
        continue;
      }
      const fit = roleFit(candidate.role, slot.role);
      if (fit < bestFit) {
        bestFit = fit;
        bestIndex = index;
      }
    }
    const chosen = pool.splice(bestIndex, 1)[0];
    if (!chosen) {
      throw new Error(`Not enough starters to fill ${formation}`);
    }
    return {
      player: { ...chosen, role: slot.role },
      slot: slot.id,
    };
  });
  return {
    ...squad,
    starters,
    tactics: {
      ...squad.tactics,
      formation,
      pressing: preset.pressing,
      lineHeight: preset.lineHeight,
      intensity: preset.intensity,
      keeperDuty: preset.keeperDuty,
      fullbackDuty: preset.fullbackDuty,
      dmDuty: preset.dmDuty,
      cmDuty: preset.cmDuty,
      wideDuty: preset.wideDuty,
      strikerDuty: preset.strikerDuty,
    },
  };
}
