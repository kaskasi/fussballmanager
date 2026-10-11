import type { TeamId } from "@fussballmanager/shared";
import type { GameSession } from "../persistence/game-session.ts";
import { careerTeamId } from "../sim/rival-growth.ts";
import { clubShortName } from "../sim/league-week.ts";
import { formatPlayerName } from "../types/player-display.ts";
import type { Player } from "../types/player.ts";
import { estimateCa } from "../transfers/market-value.ts";
import { fairInitialProContract } from "../transfers/fair-initial-contract.ts";
import { t } from "../i18n/index.ts";
import type { StoryInboxPayload } from "../narrative/story-state.ts";
import {
  enqueueStoryInboxItem,
  type YouthInboxState,
} from "../youth/decision-inbox.ts";

export const COMPANION_CANDIDATE_COUNT = 9;

function hashString(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index++) {
    hash = Math.imul(hash ^ value.charCodeAt(index), 0x9e3779b1);
  }
  return hash >>> 0;
}

function companionScore(player: Player): number {
  const minutes = player.state.season_minutes ?? 0;
  const morale = player.state.morale ?? 50;
  const ageBonus = player.age <= 28 ? 20 : 0;
  return minutes * 2 + morale + ageBonus;
}

/** Rank old-club pros; return up to nine deterministic follow candidates. */
export function pickCompanionCandidates(
  pros: readonly Player[],
  masterSeed: number,
  oldTeamId: TeamId,
  season: number,
): Player[] {
  const ranked = [...pros].sort((left, right) => {
    const delta = companionScore(right) - companionScore(left);
    if (delta !== 0) return delta;
    return left.id.localeCompare(right.id);
  });
  const tieBreak = hashString(`${masterSeed}:${oldTeamId}:${season}:companion`);
  const rotated = [...ranked.slice(tieBreak % Math.max(1, ranked.length)), ...ranked];
  const unique: Player[] = [];
  for (const player of rotated) {
    if (unique.some((entry) => entry.id === player.id)) continue;
    unique.push(player);
    if (unique.length >= COMPANION_CANDIDATE_COUNT) break;
  }
  return unique;
}

export function companionPickPayload(
  candidates: readonly Player[],
  oldClubLabel: string,
): StoryInboxPayload {
  return {
    beatId: "manager_companion_pick",
    source: "board",
    title: t("story.beat.manager_companion_pick.title", { club: oldClubLabel }),
    body: t("story.beat.manager_companion_pick.body", {
      club: oldClubLabel,
      count: String(candidates.length),
    }),
    choices: candidates.map((player) => ({
      id: player.id,
      label: `${formatPlayerName(player)} · ${player.position} · CA ${estimateCa(player.attributes, player.position)}`,
      icon: "●",
    })),
  };
}

export function enqueueCompanionPickInbox(
  inbox: YouthInboxState,
  week: number,
  candidates: readonly Player[],
  oldTeamId: TeamId,
): YouthInboxState {
  if (candidates.length === 0) return inbox;
  const payload = companionPickPayload(candidates, clubShortName(oldTeamId));
  return enqueueStoryInboxItem(inbox, week, payload, "manager_companion_pick");
}

export function applyCompanionPick(
  session: GameSession,
  playerId: string,
): GameSession {
  const newCareerId = session.clubId;
  const picked =
    session.rivalPlayers.find((entry) => entry.id === playerId) ??
    session.players.find((entry) => entry.id === playerId);
  if (!picked) return session;
  const without = session.players.filter((entry) => entry.id !== playerId);
  const withoutRival = session.rivalPlayers.filter((entry) => entry.id !== playerId);
  const contract = fairInitialProContract({ ...picked, club_id: newCareerId }, session.season);
  const joined: Player = {
    ...picked,
    club_id: newCareerId,
    squad_status: "pro",
    contract,
  };
  return {
    ...session,
    players: [...without, joined],
    rivalPlayers: withoutRival,
  };
}

export function isCompanionPickBeat(beatId: string): boolean {
  return beatId === "manager_companion_pick";
}
