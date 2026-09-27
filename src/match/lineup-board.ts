import {
  asPlayerId,
  buildCareerEngineSquad,
  getFormation,
  isFormationId,
  mapCareerAttributes,
  mapCareerFatigue,
  mapCareerForm,
  nordsternSquad,
  type FormationId,
  type FormationSlotId,
  type SandboxPlan,
  type Squad,
} from "@fussballmanager/shared";
import { DEFAULT_CLUB_ID } from "../persistence/game-session.ts";
import { estimateCa } from "../transfers/market-value.ts";
import type { Player } from "../types/player.ts";
import { careerPlayerInputs, suggestCareerSquad } from "../sim/career-engine-squad.ts";

export type LineupAssignments = Partial<Record<FormationSlotId, string>>;

export interface MatchLineupState {
  formation: FormationId;
  assignments: LineupAssignments;
  plan: SandboxPlan;
}

export function defaultMatchLineup(
  players: readonly Player[],
  plan: SandboxPlan,
): MatchLineupState {
  return {
    formation: plan.formation,
    plan,
    assignments: suggestLineupAssignments(players, plan.formation),
  };
}

export function normalizeMatchLineup(
  saved: MatchLineupState | undefined,
  players: readonly Player[],
  fallbackPlan: SandboxPlan,
): MatchLineupState {
  if (!saved?.formation || !saved.plan) {
    return defaultMatchLineup(players, fallbackPlan);
  }
  const plan = { ...saved.plan, formation: saved.formation };
  const slots = getFormation(plan.formation);
  const proIds = new Set(
    players
      .filter((player) => player.club_id === DEFAULT_CLUB_ID && player.squad_status === "pro")
      .map((player) => player.id),
  );
  const assignments: LineupAssignments = {};
  const used = new Set<string>();
  for (const slot of slots) {
    const playerId = saved.assignments[slot.id];
    if (playerId && proIds.has(playerId) && !used.has(playerId)) {
      assignments[slot.id] = playerId;
      used.add(playerId);
    }
  }
  const filled = fillMissingAssignments(players, plan.formation, assignments);
  return { formation: plan.formation, plan, assignments: filled };
}

export function suggestLineupAssignments(
  players: readonly Player[],
  formation: FormationId,
): LineupAssignments {
  const squad = suggestCareerSquad(players, formation);
  if (!squad) return {};
  const assignments: LineupAssignments = {};
  for (const place of squad.starters) {
    assignments[place.slot] = place.player.id;
  }
  return assignments;
}

export function fillMissingAssignments(
  players: readonly Player[],
  formation: FormationId,
  assignments: LineupAssignments,
): LineupAssignments {
  const slots = getFormation(formation);
  const used = new Set(Object.values(assignments).filter(Boolean) as string[]);
  const next = { ...assignments };
  const pool = players
    .filter(
      (player) =>
        player.club_id === DEFAULT_CLUB_ID &&
        player.squad_status === "pro" &&
        !used.has(player.id),
    )
    .sort(
      (left, right) =>
        estimateCa(right.attributes, right.position) - estimateCa(left.attributes, left.position),
    );

  for (const slot of slots) {
    if (next[slot.id]) continue;
    const pick = pickBestForSlot(pool, slot.role, slot.id);
    if (!pick) continue;
    next[slot.id] = pick.id;
    used.add(pick.id);
    pool.splice(pool.indexOf(pick), 1);
  }
  return next;
}

function pickBestForSlot(pool: Player[], slotRole: string, slotId: FormationSlotId): Player | undefined {
  const ROLE_ORDER = ["GK", "FB", "CB", "DM", "CM", "AM", "W", "ST"] as const;
  const roleRank = (role: string) => {
    const idx = ROLE_ORDER.indexOf(role as (typeof ROLE_ORDER)[number]);
    return idx >= 0 ? idx : 99;
  };
  const positionRole = (position: string): string => {
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
  };

  let best: Player | undefined;
  let bestFit = Number.POSITIVE_INFINITY;
  for (const candidate of pool) {
    if (slotId === "GK" && candidate.position !== "GK") continue;
    if (candidate.position === "GK" && slotId !== "GK") continue;
    const fit = Math.abs(roleRank(positionRole(candidate.position)) - roleRank(slotRole));
    if (fit < bestFit) {
      bestFit = fit;
      best = candidate;
    }
  }
  return best;
}

export function benchPlayers(
  players: readonly Player[],
  assignments: LineupAssignments,
): Player[] {
  const used = new Set(Object.values(assignments).filter(Boolean) as string[]);
  return players
    .filter(
      (player) =>
        player.club_id === DEFAULT_CLUB_ID &&
        player.squad_status === "pro" &&
        !used.has(player.id),
    )
    .sort(
      (left, right) =>
        estimateCa(right.attributes, right.position) - estimateCa(left.attributes, left.position),
    );
}

export function lineupSlotCount(assignments: LineupAssignments, formation: FormationId): number {
  const slots = getFormation(formation);
  return slots.filter((slot) => Boolean(assignments[slot.id])).length;
}

export function buildSquadFromAssignments(
  players: readonly Player[],
  plan: SandboxPlan,
  assignments: LineupAssignments,
): Squad | undefined {
  const filled = fillMissingAssignments(players, plan.formation, assignments);
  const input = careerPlayerInputs(players);
  if (input.length === 0) return undefined;

  const template =
    plan.formation === nordsternSquad.tactics.formation
      ? nordsternSquad
      : {
          ...nordsternSquad,
          tactics: { ...nordsternSquad.tactics, formation: plan.formation },
        };

  const auto = buildCareerEngineSquad(template, input);
  const byId = new Map(input.map((player) => [player.id, player]));
  const slots = getFormation(plan.formation);

  const starters = slots.map((slot) => {
    const playerId = filled[slot.id];
    const career = playerId ? byId.get(playerId) : undefined;
    const fallback = auto.starters.find((place) => place.slot === slot.id);
    if (!career) {
      if (!fallback) throw new Error(`Missing slot ${slot.id}`);
      return fallback;
    }
    const role = slot.role;
    return {
      slot: slot.id,
      player: {
        id: asPlayerId(career.id),
        teamId: auto.team.id,
        name: career.displayName,
        role,
        form: mapCareerForm(career.form),
        fatigue: mapCareerFatigue(career.fitness),
        shirt: (career.portraitSeed % 98) + 1,
        attributes: mapCareerAttributes(career.attributes, role),
      },
    };
  });

  const starterIds = new Set(starters.map((place) => place.player.id));
  const bench = auto.bench.filter((player) => !starterIds.has(player.id));
  for (const filler of template.bench) {
    if (bench.length >= 5) break;
    if (starterIds.has(filler.id) || bench.some((player) => player.id === filler.id)) continue;
    bench.push(filler);
  }

  const seated: Squad = {
    ...auto,
    starters,
    bench,
  };
  return applyPlanTactics(seated, plan);
}

function applyPlanTactics(squad: Squad, plan: SandboxPlan): Squad {
  const formation = isFormationId(plan.formation) ? plan.formation : squad.tactics.formation;
  const clamp = (value: number, min: number, max: number) =>
    Math.min(max, Math.max(min, Math.round(value)));
  const fullback = plan.fullbackDuty === "overlap" ? "overlap" : "inside";
  const wide = plan.wideDuty === "invert" ? "invert" : "wide";
  const striker =
    plan.strikerDuty === "target" || plan.strikerDuty === "false_nine"
      ? plan.strikerDuty
      : "poacher";
  return {
    ...squad,
    tactics: {
      ...squad.tactics,
      formation,
      mentality: clamp(plan.mentality, 0, 100),
      pressing: clamp(plan.pressing, 0, 100),
      width: clamp(plan.width, 0, 100),
      tempo: clamp(plan.tempo, 0, 100),
      lineHeight: clamp(plan.lineHeight, 25, 90),
      intensity: clamp(plan.intensity, 80, 130),
      fluidity: clamp(plan.fluidity, 0, 100),
      marking: plan.marking === "man" ? "man" : "zonal",
      keeperDuty: plan.keeperDuty === "sweeper" ? "sweeper" : "stay",
      fullbackDuty: { LB: fullback, RB: fullback },
      wideDuty: { left: wide, right: wide },
      strikerDuty: { ST: striker, LST: striker, RST: striker },
    },
  };
}

export function careerStarterIds(assignments: LineupAssignments): string[] {
  return Object.values(assignments).filter(Boolean) as string[];
}

export function assignmentsFromSquad(squad: Squad): LineupAssignments {
  const assignments: LineupAssignments = {};
  for (const place of squad.starters) {
    assignments[place.slot] = place.player.id;
  }
  return assignments;
}
