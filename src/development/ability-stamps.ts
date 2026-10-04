import type { AbilityStamp, Attributes, Player } from "../types/player.ts";
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
      def.path === "train" &&
      !hasStamp(player, def.id) &&
      meetsAttributeGates(player, def),
  );
}

export function canEarnStamp(
  player: Player,
  stampId: string,
): { ok: true; definition: StampDefinition } | { ok: false; reason: string } {
  const def = stampDefinition(stampId);
  if (!def) return { ok: false, reason: "Unbekannter Stempel." };
  if (hasStamp(player, stampId)) {
    return { ok: false, reason: `${def.label} ist schon verdient.` };
  }
  if (def.path === "train" && !meetsAttributeGates(player, def)) {
    return { ok: false, reason: `Voraussetzungen für ${def.label} nicht erfüllt.` };
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

/** Apply catalog deltas once and append the stamp record. */
export function awardStamp(
  player: Player,
  stampId: string,
  season: number,
  week: number,
): Player {
  const check = canEarnStamp(player, stampId);
  if (!check.ok) return player;
  const def = check.definition;

  const nextAttributes = { ...player.attributes };
  const applied: Partial<Record<keyof Attributes, number>> = {};
  for (const [key, delta] of Object.entries(def.applied) as [keyof Attributes, number][]) {
    if (!delta || delta < 1) continue;
    const bump = Math.min(4, Math.max(1, Math.round(delta)));
    nextAttributes[key] = clampAttr(key, nextAttributes[key] + bump);
    applied[key] = bump;
  }

  const record: AbilityStamp = {
    id: def.id,
    earned_season: season,
    earned_week: week,
    path: def.path,
    applied,
  };

  return {
    ...player,
    attributes: nextAttributes,
    stamps: [...(player.stamps ?? []), record],
  };
}

export interface StampAwardNotice {
  playerId: string;
  stampId: string;
  label: string;
  icon: string;
}

/** Instant-award event stamps whose gates are newly met. */
export function evaluateEventStamps(
  players: readonly Player[],
  season: number,
  week: number,
): { players: Player[]; awards: StampAwardNotice[] } {
  const awards: StampAwardNotice[] = [];
  const nextPlayers = players.map((player) => {
    let next = player;
    for (const def of ABILITY_STAMPS) {
      if (def.path !== "event") continue;
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
