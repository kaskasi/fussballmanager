import {
  awayKickoffPosition,
  effectiveFormation,
  FORMATION_IDS,
  formationSlotFor,
  type FormationId,
  type FormationSlotId,
  getFormation,
  getFormationSlot,
  sanitizeSlotZones,
  type SlotZones,
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
    const homePosition = (
      formationSlotFor(squad.tactics.formation, place.slot, squad.tactics.slotZones) ??
      getFormationSlot(squad.tactics.formation, place.slot)
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
 * Moved slots (`zones`) take the role of their zone.
 */
export function selectFormation(
  squad: Squad,
  formation: FormationId,
  zones?: SlotZones,
): Squad {
  const slots = effectiveFormation(formation, zones);
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
  const { slotZones: _previousZones, ...tactics } = squad.tactics;
  return {
    ...squad,
    starters,
    tactics: {
      ...tactics,
      formation,
      ...(zones ? { slotZones: zones } : {}),
      pressing: preset.pressing,
      lineHeight: preset.lineHeight,
      intensity: preset.intensity,
      fluidity: preset.fluidity,
      keeperDuty: preset.keeperDuty,
      fullbackDuty: preset.fullbackDuty,
      dmDuty: preset.dmDuty,
      cmDuty: preset.cmDuty,
      wideDuty: preset.wideDuty,
      strikerDuty: preset.strikerDuty,
    },
  };
}

export type SandboxPlan = {
  formation: FormationId;
  mentality: number;
  pressing: number;
  width: number;
  tempo: number;
  lineHeight: number;
  intensity: number;
  fluidity: number;
  marking: TeamTactics["marking"];
  keeperDuty: TeamTactics["keeperDuty"];
  fullbackDuty: TeamTactics["fullbackDuty"]["LB"];
  wideDuty: TeamTactics["wideDuty"]["left"];
  strikerDuty: TeamTactics["strikerDuty"]["ST"];
  /** Slots moved to another zone on the lineup board; only valid for `formation`. */
  slotZones?: SlotZones;
};

function clampStat(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.min(max, Math.max(min, Math.round(value)));
}

export function sandboxPlanFromTactics(tactics: TeamTactics): SandboxPlan {
  return {
    formation: tactics.formation,
    mentality: tactics.mentality,
    pressing: tactics.pressing,
    width: tactics.width,
    tempo: tactics.tempo,
    lineHeight: tactics.lineHeight,
    intensity: tactics.intensity,
    fluidity: tactics.fluidity,
    marking: tactics.marking,
    keeperDuty: tactics.keeperDuty,
    fullbackDuty: tactics.fullbackDuty.LB,
    wideDuty: tactics.wideDuty.left,
    strikerDuty: tactics.strikerDuty.ST,
    ...(tactics.slotZones ? { slotZones: tactics.slotZones } : {}),
  };
}

function defaultMentalityForFormation(formation: FormationId): number {
  switch (formation) {
    case "2-3-5":
      return 62;
    case "4-4-2":
      return 46;
    case "4-5-1":
      return 44;
    case "5-4-1":
      return 42;
    case "5-3-2":
      return 48;
    case "4-2-2-1-1":
      return 56;
    default:
      return 58;
  }
}

function defaultWidthForFormation(formation: FormationId): number {
  switch (formation) {
    case "2-3-5":
      return 70;
    case "4-4-2":
    case "4-5-1":
      return 50;
    case "5-4-1":
      return 46;
    default:
      return 62;
  }
}

function defaultTempoForFormation(formation: FormationId): number {
  switch (formation) {
    case "4-4-2":
    case "5-4-1":
      return 42;
    default:
      return 56;
  }
}

export function sandboxPlanFromFormation(formation: FormationId): SandboxPlan {
  const preset = FORMATION_PRESETS[formation];
  return {
    formation,
    mentality: defaultMentalityForFormation(formation),
    pressing: preset.pressing,
    width: defaultWidthForFormation(formation),
    tempo: defaultTempoForFormation(formation),
    lineHeight: preset.lineHeight,
    intensity: preset.intensity,
    fluidity: preset.fluidity,
    marking: formation === "4-4-2" ? "man" : "zonal",
    keeperDuty: preset.keeperDuty,
    fullbackDuty: preset.fullbackDuty.LB,
    wideDuty: preset.wideDuty.left,
    strikerDuty: preset.strikerDuty.ST,
  };
}

/** Re-seat the XI, then overlay the sandbox sliders the engine actually reads. */
export function applySandboxPlan(squad: Squad, plan: SandboxPlan): Squad {
  const formation = isFormationId(plan.formation) ? plan.formation : squad.tactics.formation;
  const seated = selectFormation(
    squad,
    formation,
    formation === plan.formation ? sanitizeSlotZones(formation, plan.slotZones) : undefined,
  );
  const fullback = plan.fullbackDuty === "overlap" ? "overlap" : "inside";
  const wide = plan.wideDuty === "invert" ? "invert" : "wide";
  const striker =
    plan.strikerDuty === "target" || plan.strikerDuty === "false_nine"
      ? plan.strikerDuty
      : "poacher";
  return {
    ...seated,
    tactics: {
      ...seated.tactics,
      mentality: clampStat(plan.mentality, 0, 100),
      pressing: clampStat(plan.pressing, 0, 100),
      width: clampStat(plan.width, 0, 100),
      tempo: clampStat(plan.tempo, 0, 100),
      lineHeight: clampStat(plan.lineHeight, 25, 90),
      intensity: clampStat(plan.intensity, 80, 130),
      fluidity: clampStat(plan.fluidity, 0, 100),
      marking: plan.marking === "man" ? "man" : "zonal",
      keeperDuty: plan.keeperDuty === "sweeper" ? "sweeper" : "stay",
      fullbackDuty: { LB: fullback, RB: fullback },
      wideDuty: { left: wide, right: wide },
      strikerDuty: { ST: striker, LST: striker, RST: striker },
    },
  };
}

export function parseSandboxPlan(
  raw: unknown,
  fallback: SandboxPlan,
): SandboxPlan {
  if (!raw || typeof raw !== "object") {
    return fallback;
  }
  const value = raw as Record<string, unknown>;
  const formation =
    typeof value.formation === "string" && isFormationId(value.formation)
      ? value.formation
      : fallback.formation;
  const base =
    formation !== fallback.formation
      ? sandboxPlanFromFormation(formation)
      : fallback;
  const num = (key: string, current: number, min: number, max: number) =>
    clampStat(
      typeof value[key] === "number" ? (value[key] as number) : current,
      min,
      max,
    );
  const slotZones = sanitizeSlotZones(formation, value.slotZones);
  const strikerRaw = value.strikerDuty;
  const striker =
    strikerRaw === "target" ||
    strikerRaw === "false_nine" ||
    strikerRaw === "poacher"
      ? strikerRaw
      : base.strikerDuty;
  return {
    formation,
    mentality: num("mentality", base.mentality, 0, 100),
    pressing: num("pressing", base.pressing, 0, 100),
    width: num("width", base.width, 0, 100),
    tempo: num("tempo", base.tempo, 0, 100),
    lineHeight: num("lineHeight", base.lineHeight, 25, 90),
    intensity: num("intensity", base.intensity, 80, 130),
    fluidity: num("fluidity", base.fluidity, 0, 100),
    marking:
      value.marking === "man"
        ? "man"
        : value.marking === "zonal"
          ? "zonal"
          : base.marking,
    keeperDuty:
      value.keeperDuty === "sweeper"
        ? "sweeper"
        : value.keeperDuty === "stay"
          ? "stay"
          : base.keeperDuty,
    fullbackDuty:
      value.fullbackDuty === "overlap"
        ? "overlap"
        : value.fullbackDuty === "inside"
          ? "inside"
          : base.fullbackDuty,
    wideDuty:
      value.wideDuty === "invert"
        ? "invert"
        : value.wideDuty === "wide"
          ? "wide"
          : base.wideDuty,
    strikerDuty: striker,
    ...(slotZones ? { slotZones } : {}),
  };
}
