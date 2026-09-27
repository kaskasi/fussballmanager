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
  modifiers?: Array<TemporaryModifier & { weeks?: number }>;
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

export interface TransferBreakoutContext {
  masterSeed: number;
  worldEventId: string;
  week: number;
  previousMorale: number;
  matchFitPoor: boolean;
}

const WEEKLY_ORDER = [
  "injury_desperation",
  "prodigy_pressure",
  "success_inflation",
  "late_bloomer_kick",
  "mentor_ignition",
  "underdog_resolve",
] as const;

export const BREAKOUT_SIGNAL = {
  mentorReady: "mentor_assigned_6m_high_drive",
  contractTripled: "new_contract_wage_3x",
  mediaHypeHigh: "media_hype_high",
  topClubPressure: "club_is_top",
  mediaSnubEightWeeks: "media_snub_8w",
} as const;

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
  prodigy_pressure: {
    id: "prodigy_pressure",
    visibility: "partial",
    narrative_template:
      "Die Erwartungen erdrücken {player_first}. Zu viele Interviews, zu wenig Fußball.",
    weekly_probability: 0.005,
    karma_weight: 1.4,
    effect: {
      drive_delta: -0.3,
      morale_delta: -20,
      attribute_delta: { composure: -5 },
      permanent: true,
    },
    check: (player) =>
      player.hidden.breakout_flags.includes("prodigy_foundation") &&
      hasSignal(player, BREAKOUT_SIGNAL.mediaHypeHigh) &&
      hasSignal(player, BREAKOUT_SIGNAL.topClubPressure) &&
      !player.hidden.breakout_flags.includes("prodigy_pressure"),
  },
  success_inflation: {
    id: "success_inflation",
    visibility: "hidden",
    narrative_template: null,
    weekly_probability: 0.008,
    karma_weight: 1,
    effect: {
      drive_delta: -0.25,
      permanent: true,
    },
    check: (player) =>
      player.age <= 27 &&
      player.hidden.drive <= 0.9 &&
      hasSignal(player, BREAKOUT_SIGNAL.contractTripled) &&
      !player.hidden.breakout_flags.includes("success_inflation"),
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
      hasSignal(player, BREAKOUT_SIGNAL.mentorReady),
  },
  underdog_resolve: {
    id: "underdog_resolve",
    visibility: "partial",
    narrative_template: "{player_first} hat sich etwas vorgenommen. Man sieht es an jedem Training.",
    weekly_probability: 0.003,
    karma_weight: 1.2,
    effect: {
      drive_delta: 0.15,
      modifiers: [
        {
          source_event_id: "underdog_resolve",
          attribute: "composure",
          delta: 5,
          weeks: 12,
        },
      ],
      permanent: false,
    },
    check: (player) =>
      player.state.morale >= 40 &&
      hasSignal(player, BREAKOUT_SIGNAL.mediaSnubEightWeeks) &&
      !player.hidden.breakout_flags.includes("underdog_resolve"),
  },
};

function hasSignal(player: Player, signal: string): boolean {
  return player.state.modifiers.some((modifier) => modifier.source_event_id === signal);
}

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
    const { weeks, ...stored } = mod;
    modifiers.push({
      ...stored,
      until_week: weeks !== undefined ? week + weeks : stored.until_week,
    });
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
  return players.map((player) => {
    const attributes = { ...player.attributes };
    const modifiers = player.state.modifiers.filter((mod) => {
      const active = mod.until_injury_end
        ? player.state.injury !== null
        : mod.until_week !== undefined
          ? mod.until_week > week
          : true;
      if (!active && mod.attribute && mod.delta !== undefined) {
        attributes[mod.attribute] = Math.min(
          199,
          Math.max(0, attributes[mod.attribute] - mod.delta),
        );
      }
      return active;
    });
    return {
      ...player,
      attributes,
      state: { ...player.state, modifiers },
    };
  });
}

export function processWeeklyBreakoutChecks(
  players: readonly Player[],
  week: number,
  masterSeed: number,
  season = 1,
): { players: Player[]; narratives: BreakoutNarrative[] } {
  const narratives: BreakoutNarrative[] = [];
  const nextPlayers = players.map((player) => {
    for (const eventId of WEEKLY_ORDER) {
      const def = EVENTS[eventId];
      if (player.hidden.breakout_flags.includes(def.id)) continue;
      if (!def.check(player)) continue;

      const probability = def.weekly_probability * def.karma_weight;
      if (breakoutRoll(masterSeed, season, week, player.id, def.id) >= probability) continue;

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

export function processTransferBreakout(
  player: Player,
  context: TransferBreakoutContext,
): { player: Player; narratives: BreakoutNarrative[] } {
  const candidates = [
    {
      id: "environment_shift_positive",
      eligible:
        context.previousMorale < 40 &&
        player.age >= 18 &&
        player.age <= 26 &&
        !player.hidden.breakout_flags.includes("environment_shift_positive"),
      probability: 0.35,
      effect: {
        drive_delta: 0.15,
        morale_set: 75,
        permanent: true,
      } satisfies BreakoutEffect,
      narrative: "Der Wechsel tut {player_first} sichtlich gut. Endlich Spielzeit, endlich Vertrauen.",
    },
    {
      id: "environment_shift_negative",
      eligible:
        context.matchFitPoor &&
        !player.hidden.breakout_flags.includes("environment_shift_negative"),
      probability: 0.25,
      effect: {
        drive_delta: -0.2,
        permanent: true,
      } satisfies BreakoutEffect,
      narrative: null,
    },
  ] as const;

  for (const candidate of candidates) {
    if (!candidate.eligible) continue;
    const roll = breakoutEventRoll(
      context.masterSeed,
      context.worldEventId,
      player.id,
      candidate.id,
    );
    if (roll >= candidate.probability) continue;
    const updated = applyBreakoutEffect(
      player,
      candidate.effect,
      context.week,
      candidate.id,
    );
    const narratives = candidate.narrative
      ? [{
          playerId: player.id,
          eventId: candidate.id,
          narrative: candidate.narrative.replace(
            "{player_first}",
            player.name.first ?? "Spieler",
          ),
          week: context.week,
        }]
      : [];
    return { player: updated, narratives };
  }
  return { player, narratives: [] };
}

function breakoutRoll(
  masterSeed: number,
  season: number,
  week: number,
  playerId: string,
  eventId: string,
): number {
  let hash = 0x811c9dc5;
  for (const ch of `${masterSeed}:${season}:${week}:${playerId}:${eventId}`) {
    hash = Math.imul(hash ^ ch.charCodeAt(0), 0x9e3779b1);
  }
  return ((hash >>> 0) % 10_000) / 10_000;
}

function breakoutEventRoll(
  masterSeed: number,
  worldEventId: string,
  playerId: string,
  eventId: string,
): number {
  let hash = masterSeed;
  for (const char of `${worldEventId}:${playerId}:${eventId}`) {
    hash = Math.imul(hash ^ char.charCodeAt(0), 0x9e3779b1);
  }
  return ((hash >>> 0) % 10_000) / 10_000;
}
