/**
 * PRD 28 — what a conference is about.
 *
 * Investment and transfer topics are diffed against `press.known_topic_ids`: the first scan of a
 * save only seeds the list, so assets the club already owned never trigger a presser. Key-match
 * topics come from the fixture and the table at kickoff.
 */

import type { GameSession } from "../persistence/game-session.ts";
import { leagueTable } from "../sim/league-week.ts";
import { careerWeekIndex } from "../stadium/hospitality.ts";
import type { PrecinctBuilding } from "../stadium/precinct.ts";
import { RELEGATION_ZONE_PLACE } from "../narrative/season-objectives.ts";
import { formatPlayerName } from "../types/player-display.ts";
import type { PressTopic } from "./press-state.ts";

/** A fee only makes headlines when it beats the squad's third most valuable player. */
export const BIG_TRANSFER_MIN_FEE = 150_000;
/** Transfers older than this never trigger a presser (late threshold drift, legacy history). */
export const TRANSFER_TOPIC_WEEKS = 4;

const TRAINING_FACILITIES: readonly PrecinctBuilding[] = [
  "training_ground",
  "training_pitch",
  "youth_pitch",
];

type TopicSession = Pick<
  GameSession,
  | "players"
  | "clubId"
  | "season"
  | "week"
  | "transferState"
  | "youthCamps"
  | "stadium"
  | "academyFacility"
  | "academyProject"
>;

export function bigTransferThreshold(
  players: GameSession["players"],
  clubId: string,
  excludePlayerId?: string,
): number {
  const values = players
    .filter(
      (player) =>
        player.club_id === clubId && player.squad_status === "pro" && player.id !== excludePlayerId,
    )
    .map((player) => player.market_value)
    .sort((left, right) => right - left);
  return Math.max(BIG_TRANSFER_MIN_FEE, values[2] ?? values[values.length - 1] ?? 0);
}

function transferTopics(session: TopicSession): PressTopic[] {
  const now = careerWeekIndex(session.season, session.week);
  const topics: PressTopic[] = [];
  for (const record of session.transferState.history) {
    if (record.kind !== "in" && record.kind !== "out") continue;
    if (record.pending || record.fee == null) continue;
    if (now - careerWeekIndex(record.season, record.week) > TRANSFER_TOPIC_WEEKS) continue;
    const exclude = record.kind === "in" ? record.player_id : undefined;
    if (record.fee < bigTransferThreshold(session.players, session.clubId, exclude)) continue;
    const player = session.players.find((entry) => entry.id === record.player_id);
    topics.push({
      id: `transfer:${record.id}`,
      kind: record.kind === "in" ? "transfer_in" : "transfer_out",
      playerId: record.kind === "in" ? record.player_id : undefined,
      params: {
        player: player ? formatPlayerName(player) : record.player_name,
        club: record.other_club_name,
        fee: record.fee,
      },
    });
  }
  return topics;
}

function investmentTopics(session: TopicSession): PressTopic[] {
  const topics: PressTopic[] = [];
  for (const camp of session.youthCamps ?? []) {
    topics.push({ id: `camp:${camp.id}`, kind: "youth_camp", params: { camp: camp.id } });
  }

  const stadium = session.stadium;
  for (const [blockId, state] of Object.entries(stadium.block_expansion ?? {})) {
    if (state.construction_until != null) {
      topics.push({
        id: `stand:${blockId}:build:${state.construction_until}`,
        kind: "stadium",
        params: { block: blockId, stage: "build" },
      });
    }
    if (state.level >= 2) {
      topics.push({
        id: `stand:${blockId}:level:${state.level}`,
        kind: "stadium",
        params: { block: blockId, stage: "open" },
      });
    }
  }
  for (const [upgradeId, level] of Object.entries(stadium.upgrade_levels ?? {})) {
    if (level < 1) continue;
    topics.push({
      id: `upgrade:${upgradeId}:${level}`,
      kind: "stadium",
      params: { upgrade: upgradeId, stage: "open" },
    });
  }

  const precinct = stadium.precinct;
  for (const building of TRAINING_FACILITIES) {
    const level = precinct?.levels[building] ?? 0;
    if (level >= 1) {
      topics.push({
        id: `facility:${building}:level:${level}`,
        kind: "training_facility",
        params: { building, level },
      });
    }
    const pending = precinct?.pendingUpgrades?.[building];
    if (pending != null) {
      topics.push({
        id: `facility:${building}:build:${pending}`,
        kind: "training_facility",
        params: { building, level: level + 1 },
      });
    }
  }

  if (session.academyProject) {
    topics.push({
      id: `academy:build:${session.academyProject.target}`,
      kind: "academy",
      params: { facility: session.academyProject.target },
    });
  }
  if (session.academyFacility && session.academyFacility !== "academy_basic") {
    topics.push({
      id: `academy:level:${session.academyFacility}`,
      kind: "academy",
      params: { facility: session.academyFacility },
    });
  }

  for (const deal of stadium.sponsor_deals ?? []) {
    if (deal.slotId !== "shirt") continue;
    topics.push({
      id: `sponsor:shirt:${deal.brandId ?? deal.brand}:${deal.signedSeason}`,
      kind: "sponsor",
      params: { brand: deal.brand },
    });
  }
  if (stadium.naming_rights_sponsor) {
    topics.push({
      id: `sponsor:naming:${stadium.naming_rights_sponsor}:${stadium.naming_rights_until_season ?? 0}`,
      kind: "sponsor",
      params: { brand: stadium.naming_rights_sponsor },
    });
  }
  return topics;
}

/** Every investment/transfer topic the club state currently implies (covered or not). */
export function scanPressTopics(session: TopicSession): PressTopic[] {
  return [...transferTopics(session), ...investmentTopics(session)];
}

/** Topics not yet covered by a presser. Empty until the first scan has seeded the known list. */
export function pendingPressTopics(
  session: TopicSession,
  knownTopicIds: readonly string[] | undefined,
): PressTopic[] {
  if (!knownTopicIds) return [];
  const known = new Set(knownTopicIds);
  const seen = new Set<string>();
  return scanPressTopics(session).filter((topic) => {
    if (known.has(topic.id) || seen.has(topic.id)) return false;
    seen.add(topic.id);
    return true;
  });
}

export function seedKnownTopicIds(session: TopicSession): string[] {
  return [...new Set(scanPressTopics(session).map((topic) => topic.id))];
}

interface KeyMatchInput {
  league: GameSession["league"];
  world: GameSession["world"];
  homeTeamId: string;
  awayTeamId: string;
  opponentName: string;
  matchday: number;
}

/** Derby, relegation/promotion six-pointer, title race, or a live season finale. */
export function keyMatchTopic(input: KeyMatchInput): PressTopic | null {
  const { league } = input;
  const clubId = league.player_club_id;
  const opponentId = input.homeTeamId === clubId ? input.awayTeamId : input.homeTeamId;
  const params = { opponent: input.opponentName };
  const key = `key:${input.matchday}`;

  const club = input.world.clubs.find((entry) => entry.id === clubId);
  if (club?.rivalry_ids.includes(opponentId)) {
    return { id: `${key}:derby`, kind: "derby", params };
  }

  const table = leagueTable(league);
  const placeOf = (teamId: string) => table.findIndex((row) => row.teamId === teamId) + 1;
  const ownPlace = placeOf(clubId);
  const opponentPlace = placeOf(opponentId);
  const clubCount = league.club_ids.length;
  const totalMatchdays = Math.max(1, (clubCount - 1) * 2);
  const relegationLine = Math.min(RELEGATION_ZONE_PLACE, clubCount);
  const nearDrop = (place: number) => place >= relegationLine - 2;
  const nearTop = (place: number) => place > 0 && place <= 3;
  const tableSettled = input.matchday >= 8 && ownPlace > 0 && opponentPlace > 0;

  if (tableSettled && nearTop(ownPlace) && nearTop(opponentPlace)) {
    return { id: `${key}:title`, kind: "title_race", params };
  }
  if (tableSettled && nearDrop(ownPlace) && nearDrop(opponentPlace)) {
    return { id: `${key}:six`, kind: "six_pointer", params };
  }
  if (input.matchday > totalMatchdays - 3 && (nearTop(ownPlace) || nearDrop(ownPlace))) {
    return { id: `${key}:finale`, kind: "finale", params };
  }
  return null;
}
