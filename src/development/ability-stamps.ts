import type { AbilityStamp, Attributes, Player, StampPath } from "../types/player.ts";
import {
  ABILITY_STAMPS,
  ACTIVE_STAMP_BADGE_SLOTS,
  type StampDefinition,
} from "./ability-stamps-catalog.ts";

const ATTR_HARD_CAP = 199;
const ATTR_HARD_CAP_WEAK_FOOT = 100;

export function stampCatalog(): readonly StampDefinition[] {
  return ABILITY_STAMPS;
}

export function stampDefinition(id: string): StampDefinition | undefined {
  return ABILITY_STAMPS.find((entry) => entry.id === id);
}

export function stampLabel(id: string): string {
  return stampDefinition(id)?.label ?? id;
}

export function stampIcon(id: string): string {
  return stampDefinition(id)?.icon ?? "◆";
}

export function isPhaseStamp(def: StampDefinition): boolean {
  return def.spawn != null;
}

export function stampPathLabel(path: StampPath, def?: StampDefinition): string {
  if (def && isPhaseStamp(def)) return "Start-Makel";
  if (path === "train") return "Training";
  if (path === "hybrid") return "Hybrid";
  return "Ereignis";
}

export function isTrainSealPath(path: StampPath): boolean {
  return path === "train" || path === "hybrid";
}

/** Human-readable gate lines for help / tooltips (German UI). */
export function formatStampGates(def: StampDefinition): string[] {
  const lines: string[] = [];
  if (def.spawn) {
    const pct = Math.round(def.spawn.chance * 100);
    if (def.spawn.positions && def.spawn.positions.length > 0) {
      lines.push(`${pct}% der neuen ${def.spawn.positions.join("/")}`);
    } else {
      lines.push(`${pct}% aller neu generierten Spieler`);
    }
  }
  if (def.gates.attributes) {
    for (const [key, minimum] of Object.entries(def.gates.attributes) as [
      keyof Attributes,
      number,
    ][]) {
      lines.push(`${attributeGateLabel(key)} ≥ ${minimum}`);
    }
  }
  if (def.gates.season_goals !== undefined) {
    lines.push(`${def.gates.season_goals}+ Tore in einer Saison`);
  }
  if (def.gates.season_yellow_cards !== undefined) {
    lines.push(`${def.gates.season_yellow_cards}+ Gelbe Karten in einer Saison`);
  }
  if (def.gates.career_apps !== undefined) {
    lines.push(`${def.gates.career_apps}+ Karriere-Einsätze`);
  }
  if (def.gates.flexibility_lanes !== undefined) {
    lines.push(`${def.gates.flexibility_lanes} ausgebildete Positions-Lanes`);
  }
  if (def.gates.positions && def.gates.positions.length > 0) {
    lines.push(`Position ${def.gates.positions.join("/")}`);
  }
  if (def.clear?.career_apps !== undefined) {
    lines.push(`fällt nach ${def.clear.career_apps} Einsätzen`);
  }
  if (def.clear?.hat_trick) {
    lines.push("fällt nach einem Dreierpack");
  }
  if (def.clear?.scoring_streak !== undefined) {
    lines.push(`fällt nach ${def.clear.scoring_streak} Spielen hintereinander mit Tor`);
  }
  return lines;
}

export function formatStampEffects(def: StampDefinition): string[] {
  return (Object.entries(def.applied) as [keyof Attributes, number][]).map(([key, delta]) => {
    const signed = delta > 0 ? `+${delta}` : String(delta);
    return `${attributeGateLabel(key)} ${signed}`;
  });
}

function attributeGateLabel(key: keyof Attributes): string {
  const labels: Partial<Record<keyof Attributes, string>> = {
    shooting: "Abschluss",
    passing: "Passspiel",
    dribbling: "Dribbling",
    technique: "Technik",
    pace: "Tempo",
    strength: "Kraft",
    stamina: "Ausdauer",
    composure: "Ruhe",
    leadership: "Führung",
    positioning: "Stellung",
    vision: "Übersicht",
    concentration: "Konzentration",
    teamwork: "Teamwork",
    weak_foot: "Schwaches Bein",
    gk_handling: "TW-Handling",
  };
  return labels[key] ?? key;
}

/** Career appearances = past season snapshots + current season. */
export function careerApps(player: Player): number {
  const past = player.history.growth.reduce(
    (sum, snapshot) => sum + (snapshot.season_apps ?? 0),
    0,
  );
  return past + (player.state.season_apps ?? 0);
}

export function hasStamp(player: Player, id: string): boolean {
  return (player.stamps ?? []).some((stamp) => stamp.id === id);
}

export function activeStampBadges(
  player: Player,
  limit = ACTIVE_STAMP_BADGE_SLOTS,
): AbilityStamp[] {
  return [...(player.stamps ?? [])]
    .sort((left, right) => {
      if (left.earned_season !== right.earned_season) {
        return right.earned_season - left.earned_season;
      }
      return right.earned_week - left.earned_week;
    })
    .slice(0, limit);
}

export function trainedFlexibilityLanes(player: Player): number {
  const lanes = new Set<string>();
  for (const slot of player.flexibility) {
    if (slot.weeks_trained > 0 || slot.proficiency >= 0.4) {
      lanes.add(slot.trained_as);
    }
  }
  return lanes.size;
}

export function meetsPositionGates(player: Player, def: StampDefinition): boolean {
  const positions = def.gates.positions;
  if (!positions || positions.length === 0) return true;
  return positions.includes(player.position);
}

export function meetsFlexibilityGates(player: Player, def: StampDefinition): boolean {
  if (def.gates.flexibility_lanes === undefined) return true;
  return trainedFlexibilityLanes(player) >= def.gates.flexibility_lanes;
}

export function meetsUnlockGates(player: Player, def: StampDefinition): boolean {
  return (
    meetsAttributeGates(player, def) &&
    meetsEventGates(player, def) &&
    meetsPositionGates(player, def) &&
    meetsFlexibilityGates(player, def)
  );
}

export function meetsAttributeGates(player: Player, def: StampDefinition): boolean {
  const attrs = def.gates.attributes;
  if (!attrs) return true;
  for (const [key, minimum] of Object.entries(attrs) as [keyof Attributes, number][]) {
    if ((player.attributes[key] ?? 0) < minimum) return false;
  }
  return true;
}

export function meetsEventGates(player: Player, def: StampDefinition): boolean {
  if (def.gates.season_goals !== undefined) {
    if ((player.state.season_goals ?? 0) < def.gates.season_goals) return false;
  }
  if (def.gates.season_yellow_cards !== undefined) {
    if ((player.state.season_yellow_cards ?? 0) < def.gates.season_yellow_cards) return false;
  }
  if (def.gates.career_apps !== undefined) {
    if (careerApps(player) < def.gates.career_apps) return false;
  }
  return true;
}

export function eligibleTrainStamps(player: Player): StampDefinition[] {
  return ABILITY_STAMPS.filter(
    (def) =>
      isTrainSealPath(def.path) &&
      !hasStamp(player, def.id) &&
      meetsUnlockGates(player, def),
  );
}

export function stampGateMarkers(player: Player): Partial<Record<keyof Attributes, string[]>> {
  const marks: Partial<Record<keyof Attributes, string[]>> = {};
  for (const def of ABILITY_STAMPS) {
    if (hasStamp(player, def.id) || !def.gates.attributes) continue;
    for (const key of Object.keys(def.gates.attributes) as (keyof Attributes)[]) {
      marks[key] = [...(marks[key] ?? []), def.label];
    }
  }
  return marks;
}

export function canEarnStamp(
  player: Player,
  stampId: string,
  options?: { ignoreGates?: boolean },
): { ok: true; definition: StampDefinition } | { ok: false; reason: string } {
  const def = stampDefinition(stampId);
  if (!def) return { ok: false, reason: "Unbekannter Stempel." };
  if (hasStamp(player, stampId)) {
    return { ok: false, reason: `${def.label} ist schon verdient.` };
  }
  if (options?.ignoreGates) return { ok: true, definition: def };
  if (isPhaseStamp(def)) {
    return { ok: false, reason: `${def.label} kommt mit der Generation, nicht durch Training.` };
  }
  if (def.path === "train" && !meetsUnlockGates(player, def)) {
    return { ok: false, reason: `Voraussetzungen für ${def.label} nicht erfüllt.` };
  }
  if (def.path === "hybrid" && !meetsUnlockGates(player, def)) {
    return { ok: false, reason: `${def.label} ist noch nicht freigeschaltet.` };
  }
  if (def.path === "event" && !meetsEventGates(player, def)) {
    return { ok: false, reason: `Meilenstein für ${def.label} noch nicht erreicht.` };
  }
  return { ok: true, definition: def };
}

function clampAttr(key: keyof Attributes, value: number): number {
  const max = key === "weak_foot" ? ATTR_HARD_CAP_WEAK_FOOT : ATTR_HARD_CAP;
  return Math.min(max, Math.max(0, value));
}

function bakeDeltas(
  attributes: Attributes,
  deltas: Partial<Record<keyof Attributes, number>>,
  direction: 1 | -1,
): { attributes: Attributes; applied: Partial<Record<keyof Attributes, number>> } {
  const nextAttributes = { ...attributes };
  const applied: Partial<Record<keyof Attributes, number>> = {};
  for (const [key, delta] of Object.entries(deltas) as [keyof Attributes, number][]) {
    const mag = Math.round(delta);
    if (mag === 0) continue;
    const bump = Math.max(-4, Math.min(4, mag));
    nextAttributes[key] = clampAttr(key, nextAttributes[key] + bump * direction);
    applied[key] = bump;
  }
  return { attributes: nextAttributes, applied };
}

/** Apply catalog deltas once and append the stamp record. */
export function awardStamp(
  player: Player,
  stampId: string,
  season: number,
  week: number,
  options?: { ignoreGates?: boolean },
): Player {
  const check = canEarnStamp(player, stampId, options);
  if (!check.ok) return player;
  const def = check.definition;
  const baked = bakeDeltas(player.attributes, def.applied, 1);

  const record: AbilityStamp = {
    id: def.id,
    earned_season: season,
    earned_week: week,
    path: def.path,
    applied: baked.applied,
  };

  return {
    ...player,
    attributes: baked.attributes,
    stamps: [...(player.stamps ?? []), record],
  };
}

/** Reverse baked deltas and drop the stamp. */
export function clearStamp(player: Player, stampId: string): Player {
  const record = (player.stamps ?? []).find((stamp) => stamp.id === stampId);
  if (!record) return player;
  const baked = bakeDeltas(player.attributes, record.applied, -1);
  return {
    ...player,
    attributes: baked.attributes,
    stamps: (player.stamps ?? []).filter((stamp) => stamp.id !== stampId),
  };
}

function meetsClearGates(player: Player, def: StampDefinition): boolean {
  if (!def.clear) return false;
  if (def.clear.career_apps !== undefined && careerApps(player) >= def.clear.career_apps) {
    return true;
  }
  if (def.clear.hat_trick && (player.state.last_match_goals ?? 0) >= 3) {
    return true;
  }
  if (
    def.clear.scoring_streak !== undefined &&
    (player.state.scoring_streak ?? 0) >= def.clear.scoring_streak
  ) {
    return true;
  }
  return false;
}

export interface StampAwardNotice {
  playerId: string;
  stampId: string;
  label: string;
  icon: string;
}

export interface StampClearNotice {
  playerId: string;
  stampId: string;
  label: string;
  icon: string;
}

/** Instant-award event stamps whose gates are newly met (not phase curses). */
export function evaluateEventStamps(
  players: readonly Player[],
  season: number,
  week: number,
): { players: Player[]; awards: StampAwardNotice[] } {
  const awards: StampAwardNotice[] = [];
  const nextPlayers = players.map((player) => {
    let next = player;
    for (const def of ABILITY_STAMPS) {
      if (def.path !== "event" || isPhaseStamp(def)) continue;
      if (hasStamp(next, def.id)) continue;
      if (!meetsEventGates(next, def)) continue;
      next = awardStamp(next, def.id, season, week);
      if (hasStamp(next, def.id) && !hasStamp(player, def.id)) {
        awards.push({
          playerId: next.id,
          stampId: def.id,
          label: def.label,
          icon: def.icon,
        });
      }
    }
    return next;
  });
  return { players: nextPlayers, awards };
}

export function evaluateClearStamps(
  players: readonly Player[],
): { players: Player[]; cleared: StampClearNotice[] } {
  const cleared: StampClearNotice[] = [];
  const nextPlayers = players.map((player) => {
    let next = player;
    for (const stamp of [...(player.stamps ?? [])]) {
      const def = stampDefinition(stamp.id);
      if (!def || !meetsClearGates(next, def)) continue;
      next = clearStamp(next, stamp.id);
      if (!hasStamp(next, stamp.id)) {
        cleared.push({
          playerId: next.id,
          stampId: def.id,
          label: def.label,
          icon: def.icon,
        });
      }
    }
    return next;
  });
  return { players: nextPlayers, cleared };
}

function stampRoll(playerId: string, salt: string): number {
  const text = `${playerId}:${salt}`;
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967296;
}

/** Assign spawn-at-generation phase stamps (Grünschnabel, Chancentod). */
export function seedPhaseStamps(
  player: Player,
  season: number,
  week: number,
  random?: () => number,
): Player {
  let next = player;
  for (const def of ABILITY_STAMPS) {
    if (!def.spawn) continue;
    if (hasStamp(next, def.id)) continue;
    if (def.spawn.positions && !def.spawn.positions.includes(next.position)) continue;
    if (def.clear?.career_apps !== undefined && careerApps(next) >= def.clear.career_apps) {
      continue;
    }
    const roll = random ? random() : stampRoll(next.id, def.id);
    if (roll >= def.spawn.chance) continue;
    next = awardStamp(next, def.id, season, week, { ignoreGates: true });
  }
  return next;
}

export function recordAppearanceGoals(player: Player, goals: number): Player {
  const scored = goals > 0;
  return {
    ...player,
    state: {
      ...player.state,
      last_match_goals: goals,
      scoring_streak: scored ? (player.state.scoring_streak ?? 0) + 1 : 0,
    },
  };
}
