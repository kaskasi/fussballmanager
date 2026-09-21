import {
  awayKickoffPosition,
  type FormationId,
  type FormationSlotId,
  getFormation,
  getFormationSlot,
} from "./formations.ts";
import type { PitchPosition } from "./pitch.ts";
import { isOnPitch } from "./pitch.ts";
import type { Player, Team } from "./player.ts";
import type { TeamTactics } from "./tactics.ts";

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
  return value === "4-3-3" || value === "4-4-2";
}
