import type { Attributes, Player, TemporaryModifier } from "../types/player.ts";
import { estimateCa } from "../transfers/market-value.ts";
import { t } from "../i18n/index.ts";

const DRIVE_MIN = 0.4;
const DRIVE_MAX = 1.6;
const MATURITY_MIN = -5;
const MATURITY_MAX = 5;
const ANLAGE_MIN = 0.85;
const ANLAGE_MAX = 1.5;

export interface BreakoutEffect {
  drive_delta?: number;
  maturity_offset_delta?: number;
  morale_delta?: number;
  morale_set?: number;
  attribute_delta?: Partial<Record<keyof Attributes, number>>;
  anlage_delta?: Partial<Record<keyof Attributes, number>>;
  modifiers?: Array<TemporaryModifier & { weeks?: number }>;
  permanent: boolean;
}

export interface BreakoutCheckContext {
  week: number;
  season: number;
}

export interface BreakoutEventDef {
  id: string;
  tier: 1 | 2;
  visibility: "full" | "partial" | "hidden";
  narrative_template: string | null;
  weekly_probability: number;
  karma_weight: number;
  effect: BreakoutEffect;
  check: (player: Player, ctx: BreakoutCheckContext) => boolean;
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
  "injury_spiral",
  "injury_desperation",
  "golden_boy_fracture",
  "bench_identity_crisis",
  "hype_backlash",
  "prodigy_pressure",
  "success_inflation",
  "obscure_to_main_striker",
  "finishing_school_click",
  "call_up_spark",
  "rehab_rebirth",
  "tactical_unlock",
  "late_bloomer_kick",
  "mentor_ignition",
  "underdog_resolve",
] as const;

export type WeeklyBreakoutId = (typeof WEEKLY_ORDER)[number];

/** Tier-2 story ruptures (PRD 06 v1.2). */
export const TIER2_BREAKOUT_IDS: readonly WeeklyBreakoutId[] = [
  "obscure_to_main_striker",
  "finishing_school_click",
  "call_up_spark",
  "rehab_rebirth",
  "tactical_unlock",
  "golden_boy_fracture",
  "bench_identity_crisis",
  "hype_backlash",
  "injury_spiral",
] as const;

export const SUMMIT_BREAKOUT_ID = "after_the_summit" as const;

export const BREAKOUT_SIGNAL = {
  mentorReady: "mentor_assigned_6m_high_drive",
  contractTripled: "new_contract_wage_3x",
  contractDoubled: "new_contract_wage_2x",
  mediaHypeHigh: "media_hype_high",
  topClubPressure: "club_is_top",
  mediaSnubEightWeeks: "media_snub_8w",
  rehabReturnReady: "rehab_return_severe",
  individualShootingFocus: "individual_focus_shooting_12w",
} as const;

const BREAKOUT_LABELS: Record<string, string> = {
  mentor_ignition: "Vorbild-Wirkung",
  prodigy_pressure: "Wunderkind-Last",
  late_bloomer_kick: "Der Groschen fällt",
  underdog_resolve: "Beweisdrang",
  environment_shift_positive: "Neuanfang",
  obscure_to_main_striker: "Aus dem Schatten",
  finishing_school_click: "Abschluss-Klick",
  call_up_spark: "Einberufung reicht",
  rehab_rebirth: "Stärker zurück",
  tactical_unlock: "System passt",
  golden_boy_fracture: "Glänzen und zerbrechen",
  after_the_summit: "Nach dem Höhepunkt",
  bench_identity_crisis: "Bank-Krise",
  hype_backlash: "Medien kehren sich",
  injury_spiral: "Körper gibt auf",
};

const FULL_VISIBILITY = new Set<string>([
  "late_bloomer_kick",
  "mentor_ignition",
  "environment_shift_positive",
  "obscure_to_main_striker",
  "call_up_spark",
  "tactical_unlock",
  "after_the_summit",
  "hype_backlash",
]);

const PARTIAL_VISIBILITY = new Set<string>([
  "prodigy_pressure",
  "underdog_resolve",
  "finishing_school_click",
  "rehab_rebirth",
  "golden_boy_fracture",
  "injury_spiral",
]);

export function breakoutDisplayLabel(eventId: string): string {
  const key = `breakout.${eventId}`;
  const label = t(key);
  return label !== key ? label : (BREAKOUT_LABELS[eventId] ?? eventId);
}

export function isTimelineVisibleBreakout(eventId: string): boolean {
  return FULL_VISIBILITY.has(eventId) || PARTIAL_VISIBILITY.has(eventId);
}

function striker(player: Player): boolean {
  return player.position === "CF";
}

function maxFlexProficiency(player: Player): number {
  if (player.flexibility.length === 0) return 0;
  return Math.max(...player.flexibility.map((slot) => slot.proficiency));
}

function playerCa(player: Player): number {
  return estimateCa(player.attributes, player.position);
}

const EVENTS: Record<WeeklyBreakoutId, BreakoutEventDef> = {
  injury_spiral: {
    id: "injury_spiral",
    tier: 2,
    visibility: "partial",
    narrative_template:
      "{player_first} wirkt nach erneuter Pause nicht mehr derselbe — das Bein zögert, der Kopf auch.",
    weekly_probability: 0.002,
    karma_weight: 1.1,
    effect: {
      drive_delta: -0.15,
      attribute_delta: { pace: -4, stamina: -3 },
      modifiers: [
        {
          source_event_id: "injury_spiral",
          fitness_regen_multiplier: 0.85,
          weeks: 52,
        },
      ],
      permanent: true,
    },
    check: (player) =>
      player.age >= 24 &&
      (player.state.severe_injuries_logged ?? 0) >= 2 &&
      !player.hidden.breakout_flags.includes("injury_spiral"),
  },
  injury_desperation: {
    id: "injury_desperation",
    tier: 1,
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
  golden_boy_fracture: {
    id: "golden_boy_fracture",
    tier: 2,
    visibility: "partial",
    narrative_template:
      "Alle wollen etwas von {player_first} — auf dem Platz wirkt er plötzlich fremd in der eigenen Haut.",
    weekly_probability: 0.0012,
    karma_weight: 1.3,
    effect: {
      drive_delta: -0.35,
      morale_delta: -25,
      attribute_delta: { composure: -6 },
      modifiers: [
        {
          source_event_id: "golden_boy_fracture",
          weekly_growth_multiplier: 0.45,
          weeks: 78,
        },
      ],
      permanent: true,
    },
    check: (player) => {
      const ca = playerCa(player);
      const prodigy =
        player.hidden.breakout_flags.includes("prodigy_foundation") ||
        (player.age <= 21 && ca >= 105);
      const pressure =
        hasSignal(player, BREAKOUT_SIGNAL.mediaHypeHigh) ||
        player.market_value >= 3_000_000 ||
        hasSignal(player, BREAKOUT_SIGNAL.topClubPressure);
      return (
        prodigy &&
        player.attributes.composure < 65 &&
        pressure &&
        !player.hidden.breakout_flags.includes("golden_boy_fracture")
      );
    },
  },
  bench_identity_crisis: {
    id: "bench_identity_crisis",
    tier: 2,
    visibility: "hidden",
    narrative_template: null,
    weekly_probability: 0.0015,
    karma_weight: 1.2,
    effect: {
      drive_delta: -0.2,
      attribute_delta: { composure: -4 },
      modifiers: [{ source_event_id: "bench_identity_crisis", form_shock: true, weeks: 12 }],
      permanent: true,
    },
    check: (player, ctx) =>
      player.squad_status === "pro" &&
      player.age >= 18 &&
      player.age <= 26 &&
      (player.state.bench_weeks_streak ?? 0) >= 10 &&
      player.state.morale < 50 &&
      player.state.season_apps <= Math.max(1, Math.floor(ctx.week / 4 / 4)) &&
      !player.hidden.breakout_flags.includes("bench_identity_crisis"),
  },
  hype_backlash: {
    id: "hype_backlash",
    tier: 2,
    visibility: "full",
    narrative_template:
      "Die Schlagzeilen drehen sich. {player_first} läuft hinterher — und wirkt dabei langsamer als je zuvor.",
    weekly_probability: 0.001,
    karma_weight: 1.25,
    effect: {
      drive_delta: -0.2,
      morale_delta: -15,
      attribute_delta: { shooting: -3, dribbling: -3, technique: -3 },
      permanent: true,
    },
    check: (player) => {
      const hype =
        player.hidden.breakout_flags.includes("prodigy_pressure") ||
        hasSignal(player, BREAKOUT_SIGNAL.contractDoubled) ||
        hasSignal(player, BREAKOUT_SIGNAL.contractTripled);
      return (
        player.age < 22 &&
        hype &&
        player.state.form < -1 &&
        !player.hidden.breakout_flags.includes("hype_backlash")
      );
    },
  },
  prodigy_pressure: {
    id: "prodigy_pressure",
    tier: 1,
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
    tier: 1,
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
  obscure_to_main_striker: {
    id: "obscure_to_main_striker",
    tier: 2,
    visibility: "full",
    narrative_template:
      "{player_first} wirkt plötzlich zehn Jahre reifer — Tore fallen, als hätte er das schon immer gemacht.",
    weekly_probability: 0.0012,
    karma_weight: 1.6,
    effect: {
      drive_delta: 0.2,
      maturity_offset_delta: 2,
      modifiers: [
        { source_event_id: "obscure_to_main_striker", weekly_growth_multiplier: 2, weeks: 52 },
        {
          source_event_id: "obscure_to_main_striker_composure",
          attribute: "composure",
          delta: 3,
          weeks: 26,
        },
        {
          source_event_id: "obscure_to_main_striker_positioning",
          attribute: "positioning",
          delta: 3,
          weeks: 26,
        },
      ],
      permanent: true,
    },
    check: (player) => {
      const ca = playerCa(player);
      return (
        striker(player) &&
        player.age >= 24 &&
        player.age <= 31 &&
        ca >= 78 &&
        ca <= 92 &&
        player.market_value < 2_000_000 &&
        player.state.season_apps >= 3 &&
        player.hidden.drive >= 1 &&
        (player.state.recent_growth_26w ?? 0) > 5 &&
        !player.hidden.breakout_flags.includes("obscure_to_main_striker")
      );
    },
  },
  finishing_school_click: {
    id: "finishing_school_click",
    tier: 2,
    visibility: "partial",
    narrative_template:
      "Im Abschlusstraining klickt es bei {player_first} — plötzlich trifft er, was er vorher nur anpeilt.",
    weekly_probability: 0.0015,
    karma_weight: 1.3,
    effect: {
      drive_delta: 0.15,
      modifiers: [
        { source_event_id: "finishing_school_click", weekly_growth_multiplier: 1.5, weeks: 26 },
        {
          source_event_id: "finishing_school_click_shooting",
          attribute: "shooting",
          delta: 6,
          weeks: 26,
        },
        {
          source_event_id: "finishing_school_click_composure",
          attribute: "composure",
          delta: 4,
          weeks: 26,
        },
      ],
      permanent: false,
    },
    check: (player) => {
      const ca = playerCa(player);
      return (
        striker(player) &&
        player.age >= 22 &&
        player.age <= 29 &&
        player.attributes.shooting < ca - 8 &&
        (hasSignal(player, BREAKOUT_SIGNAL.mentorReady) ||
          hasSignal(player, BREAKOUT_SIGNAL.individualShootingFocus)) &&
        !player.hidden.breakout_flags.includes("finishing_school_click")
      );
    },
  },
  call_up_spark: {
    id: "call_up_spark",
    tier: 2,
    visibility: "full",
    narrative_template:
      "Seit {player_first} als Stammgast gilt, trägt er die Schultern höher — die Liga merkt es sofort.",
    weekly_probability: 0.001,
    karma_weight: 1.4,
    effect: {
      drive_delta: 0.25,
      morale_set: 85,
      modifiers: [
        { source_event_id: "call_up_spark", weekly_growth_multiplier: 1.7, weeks: 26 },
      ],
      permanent: true,
    },
    check: (player) =>
      !player.hidden.breakout_flags.includes("prodigy_foundation") &&
      player.age >= 20 &&
      player.age <= 28 &&
      player.state.season_goals + player.state.season_assists >= 8 &&
      player.state.form >= 1 &&
      player.market_value >= 800_000 &&
      !player.hidden.breakout_flags.includes("call_up_spark"),
  },
  rehab_rebirth: {
    id: "rehab_rebirth",
    tier: 2,
    visibility: "partial",
    narrative_template:
      "Nach der langen Pause kommt {player_first} hungriger zurück — härter im Zweikampf, klarer im Kopf.",
    weekly_probability: 0.002,
    karma_weight: 1.5,
    effect: {
      drive_delta: 0.2,
      modifiers: [
        { source_event_id: "rehab_rebirth", weekly_growth_multiplier: 1.6, weeks: 20 },
        {
          source_event_id: "rehab_rebirth_stamina",
          attribute: "stamina",
          delta: 3,
          weeks: 20,
        },
        {
          source_event_id: "rehab_rebirth_strength",
          attribute: "strength",
          delta: 3,
          weeks: 20,
        },
      ],
      permanent: false,
    },
    check: (player) =>
      player.hidden.drive >= 0.95 &&
      hasSignal(player, BREAKOUT_SIGNAL.rehabReturnReady) &&
      !player.hidden.breakout_flags.includes("rehab_rebirth"),
  },
  tactical_unlock: {
    id: "tactical_unlock",
    tier: 2,
    visibility: "full",
    narrative_template:
      "Die neue Rolle sitzt bei {player_first} — endlich wirkt er nicht mehr fehl am Platz.",
    weekly_probability: 0.0018,
    karma_weight: 1.35,
    effect: {
      anlage_delta: { positioning: 0.08, teamwork: 0.08 },
      modifiers: [
        { source_event_id: "tactical_unlock", weekly_growth_multiplier: 1.8, weeks: 30 },
      ],
      permanent: true,
    },
    check: (player) =>
      player.age >= 19 &&
      player.age <= 26 &&
      maxFlexProficiency(player) >= 0.6 &&
      player.state.season_apps >= 5 &&
      !player.hidden.breakout_flags.includes("tactical_unlock"),
  },
  late_bloomer_kick: {
    id: "late_bloomer_kick",
    tier: 1,
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
    tier: 1,
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
    tier: 1,
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

function applyAnlageDelta(hidden: Player["hidden"], delta: Partial<Record<keyof Attributes, number>>): Player["hidden"] {
  const anlage = { ...hidden.anlage };
  for (const [key, change] of Object.entries(delta) as [keyof Attributes, number][]) {
    anlage[key] = Math.min(ANLAGE_MAX, Math.max(ANLAGE_MIN, anlage[key] + change));
  }
  return { ...hidden, anlage };
}

export function applyBreakoutEffect(player: Player, effect: BreakoutEffect, week: number, eventId: string): Player {
  let hidden = { ...player.hidden };
  if (effect.drive_delta !== undefined) {
    hidden.drive = clampDrive(hidden.drive + effect.drive_delta);
  }
  if (effect.maturity_offset_delta !== undefined) {
    hidden.maturity_offset = Math.min(
      MATURITY_MAX,
      Math.max(MATURITY_MIN, hidden.maturity_offset + effect.maturity_offset_delta),
    );
  }
  if (effect.anlage_delta) {
    hidden = applyAnlageDelta(hidden, effect.anlage_delta);
  }

  const attributes = { ...player.attributes };
  if (effect.attribute_delta) {
    for (const [key, delta] of Object.entries(effect.attribute_delta) as [keyof Attributes, number][]) {
      attributes[key] = Math.min(199, Math.max(0, attributes[key] + delta));
    }
  }

  let morale = player.state.morale;
  let form = player.state.form;
  if (effect.morale_set !== undefined) morale = effect.morale_set;
  if (effect.morale_delta !== undefined) morale = Math.min(100, Math.max(0, morale + effect.morale_delta));

  const modifiers = [...player.state.modifiers];
  for (const mod of effect.modifiers ?? []) {
    if (mod.form_shock) {
      form = Math.max(-3, form - 2);
      morale = Math.max(0, morale - 10);
    }
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
      form,
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

function effectiveProbability(def: BreakoutEventDef, player: Player): number {
  let karma = def.karma_weight;
  if (def.tier === 2 && player.hidden.drive >= 1.2 && def.effect.drive_delta !== undefined && def.effect.drive_delta > 0) {
    karma *= 1.15;
  }
  if (def.tier === 2 && player.hidden.drive >= 1.1 && def.effect.drive_delta !== undefined && def.effect.drive_delta < 0) {
    karma *= 0.85;
  }
  return def.weekly_probability * karma;
}

export function processWeeklyBreakoutChecks(
  players: readonly Player[],
  week: number,
  masterSeed: number,
  season = 1,
): { players: Player[]; narratives: BreakoutNarrative[] } {
  const narratives: BreakoutNarrative[] = [];
  const ctx: BreakoutCheckContext = { week, season };
  const nextPlayers = players.map((player) => {
    for (const eventId of WEEKLY_ORDER) {
      const def = EVENTS[eventId];
      if (player.hidden.breakout_flags.includes(def.id)) continue;
      if (!def.check(player, ctx)) continue;

      const probability = effectiveProbability(def, player);
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

const SUMMIT_STAMP_IDS = new Set(["torjaeger_saison"]);

/** PRD 06 — Götze arc after a peak event stamp. */
export function processSummitBreakout(
  player: Player,
  stampId: string,
  week: number,
  masterSeed: number,
  season: number,
): { player: Player; narratives: BreakoutNarrative[] } {
  if (!SUMMIT_STAMP_IDS.has(stampId)) {
    return { player, narratives: [] };
  }
  if (player.hidden.breakout_flags.includes(SUMMIT_BREAKOUT_ID)) {
    return { player, narratives: [] };
  }
  if (player.age > 24) {
    return { player, narratives: [] };
  }
  const probability = 0.55;
  if (breakoutRoll(masterSeed, season, week, player.id, SUMMIT_BREAKOUT_ID) >= probability) {
    return { player, narratives: [] };
  }
  const narrative =
    "Nach dem Höhepunkt wirkt {player_first} leer — als könne er den Moment nicht mitnehmen.";
  const updated = applyBreakoutEffect(
    player,
    {
      drive_delta: -0.25,
      modifiers: [
        { source_event_id: SUMMIT_BREAKOUT_ID, weekly_growth_multiplier: 0.55, weeks: 104 },
      ],
      permanent: true,
    },
    week,
    SUMMIT_BREAKOUT_ID,
  );
  return {
    player: updated,
    narratives: [
      {
        playerId: player.id,
        eventId: SUMMIT_BREAKOUT_ID,
        narrative: narrative.replace("{player_first}", player.name.first ?? "Spieler"),
        week,
      },
    ],
  };
}

export function trackBenchWeek(player: Player, minutesPlayed: number): Player {
  if (player.squad_status !== "pro") return player;
  const streak =
    minutesPlayed < 45 ? (player.state.bench_weeks_streak ?? 0) + 1 : 0;
  return {
    ...player,
    state: { ...player.state, bench_weeks_streak: streak },
  };
}

export function noteSevereInjury(player: Player): Player {
  return {
    ...player,
    state: {
      ...player.state,
      severe_injuries_logged: (player.state.severe_injuries_logged ?? 0) + 1,
    },
  };
}

export function signalRehabReturn(player: Player, week: number): Player {
  if (player.state.modifiers.some((mod) => mod.source_event_id === BREAKOUT_SIGNAL.rehabReturnReady)) {
    return player;
  }
  return {
    ...player,
    state: {
      ...player.state,
      modifiers: [
        ...player.state.modifiers,
        { source_event_id: BREAKOUT_SIGNAL.rehabReturnReady, until_week: week + 2 },
      ],
    },
  };
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
