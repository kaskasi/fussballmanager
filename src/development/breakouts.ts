import type { Attributes, Player, TemporaryModifier } from "../types/player.ts";

const DRIVE_MIN = 0.4;
const DRIVE_MAX = 1.6;
const MATURITY_MIN = -5;
const MATURITY_MAX = 5;

export interface BreakoutEffect {
  drive_delta?: number;
  maturity_offset_delta?: number;
  morale_delta?: number;
  morale_set?: number;
  attribute_delta?: Partial<Record<keyof Attributes, number>>;
  modifiers?: TemporaryModifier[];
  permanent: boolean;
}

export interface BreakoutEventDef {
  id: string;
  visibility: "full" | "partial" | "hidden";
  narrative_template: string | null;
  weekly_probability: number;
  karma_weight: number;
  effect: BreakoutEffect;
  check: (player: Player) => boolean;
}

export interface BreakoutNarrative {
  playerId: string;
  eventId: string;
  narrative: string;
  week: number;
}

const WEEKLY_ORDER = [
  "injury_desperation",
  "late_bloomer_kick",
  "mentor_ignition",
] as const;

const EVENTS: Record<(typeof WEEKLY_ORDER)[number], BreakoutEventDef> = {
  injury_desperation: {
    id: "injury_desperation",
    visibility: "hidden",
    narrative_template: null,
    weekly_probability: 0.01,
    karma_weight: 1,
    effect: {
      drive_delta: -0.15,
      modifiers: [{ source_event_id: "injury_desperation", fitness_regen_multiplier: 0.8, until_injury_end: true }],
      permanent: false,
    },
    check: (player) =>
      player.state.injury !== null &&
      player.state.injury.severity === "severe" &&
      player.state.injury.weeks_remaining >= 10 &&
      !player.hidden.breakout_flags.includes("injury_desperation"),
  },
  late_bloomer_kick: {
    id: "late_bloomer_kick",
    visibility: "full",
    narrative_template:
      "{player_first} wirkt wie ausgewechselt — der Trainerstab spricht von einem anderen Menschen auf dem Platz.",
    weekly_probability: 0.004,
    karma_weight: 1.5,
    effect: {
      drive_delta: 0.2,
      maturity_offset_delta: 2,
      permanent: true,
    },
    check: (player) =>
      player.age >= 21 &&
      player.age <= 29 &&
      player.hidden.drive >= 0.9 &&
      (player.state.recent_growth_26w ?? 0) > 8 &&
      !player.hidden.breakout_flags.includes("late_bloomer_kick"),
  },
  mentor_ignition: {
    id: "mentor_ignition",
    visibility: "full",
    narrative_template: "{player_first} ahmt das Vorbild inzwischen nach — auch abseits des Platzes.",
    weekly_probability: 0.006,
    karma_weight: 1,
    effect: {
      drive_delta: 0.25,
      permanent: true,
    },
    check: (player) =>
      player.age <= 23 &&
      !player.hidden.breakout_flags.includes("mentor_ignition") &&
      (player.state.modifiers.some((mod) => mod.source_event_id === "mentor_assigned") ||
        (player.hidden.drive >= 1.0 && (player.state.recent_growth_26w ?? 0) > 4)),
  },
};

export function clampDrive(value: number): number {
  return Math.min(DRIVE_MAX, Math.max(DRIVE_MIN, value));
}

export function applyBreakoutEffect(player: Player, effect: BreakoutEffect, week: number, eventId: string): Player {
  const hidden = { ...player.hidden };
  if (effect.drive_delta !== undefined) {
    hidden.drive = clampDrive(hidden.drive + effect.drive_delta);
  }
  if (effect.maturity_offset_delta !== undefined) {
    hidden.maturity_offset = Math.min(
      MATURITY_MAX,
      Math.max(MATURITY_MIN, hidden.maturity_offset + effect.maturity_offset_delta),
    );
  }

  const attributes = { ...player.attributes };
  if (effect.attribute_delta) {
    for (const [key, delta] of Object.entries(effect.attribute_delta) as [keyof Attributes, number][]) {
      attributes[key] = Math.min(199, Math.max(0, attributes[key] + delta));
    }
  }

  let morale = player.state.morale;
  if (effect.morale_set !== undefined) morale = effect.morale_set;
  if (effect.morale_delta !== undefined) morale = Math.min(100, Math.max(0, morale + effect.morale_delta));

  const modifiers = [...player.state.modifiers];
  for (const mod of effect.modifiers ?? []) {
    if (mod.attribute && mod.delta !== undefined) {
      attributes[mod.attribute] = Math.min(199, Math.max(0, attributes[mod.attribute] + mod.delta));
    }
    modifiers.push(mod);
  }

  if (!hidden.breakout_flags.includes(eventId)) {
    hidden.breakout_flags = [...hidden.breakout_flags, eventId];
  }

  return {
    ...player,
    attributes,
    hidden,
    state: {
      ...player.state,
      morale,
      modifiers,
    },
  };
}

export function expireBreakoutModifiers(players: readonly Player[], week: number): Player[] {
  return players.map((player) => ({
    ...player,
    state: {
      ...player.state,
      modifiers: player.state.modifiers.filter((mod) => {
        if (mod.until_injury_end) return player.state.injury !== null;
        if (mod.until_week !== undefined) return mod.until_week > week;
        return true;
      }),
    },
  }));
}

export function processWeeklyBreakoutChecks(
  players: readonly Player[],
  week: number,
  masterSeed: number,
): { players: Player[]; narratives: BreakoutNarrative[] } {
  const narratives: BreakoutNarrative[] = [];
  const nextPlayers = players.map((player) => {
    for (const eventId of WEEKLY_ORDER) {
      const def = EVENTS[eventId];
      if (player.hidden.breakout_flags.includes(def.id)) continue;
      if (!def.check(player)) continue;

      const probability = def.weekly_probability * def.karma_weight;
      if (breakoutRoll(masterSeed, week, player.id, def.id) >= probability) continue;

      const updated = applyBreakoutEffect(player, def.effect, week, def.id);
      if (def.visibility !== "hidden" && def.narrative_template) {
        narratives.push({
          playerId: player.id,
          eventId: def.id,
          narrative: def.narrative_template.replace("{player_first}", player.name.first ?? "Spieler"),
          week,
        });
      }
      return updated;
    }
    return player;
  });

  return { players: nextPlayers, narratives };
}

function breakoutRoll(masterSeed: number, week: number, playerId: string, eventId: string): number {
  let hash = masterSeed ^ week;
  for (const ch of `${playerId}:${eventId}`) {
    hash = Math.imul(hash ^ ch.charCodeAt(0), 0x9e3779b1);
  }
  return ((hash >>> 0) % 10_000) / 10_000;
}
