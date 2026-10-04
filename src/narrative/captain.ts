import { t } from "../i18n/index.ts";
import type { Player } from "../types/player.ts";
import { formatPlayerName } from "../types/player-display.ts";

export interface CaptainCandidate {
  player: Player;
  leadership: number;
  teamwork: number;
  label: string;
  teamworkHint: string;
}

export function proSquad(players: readonly Player[], clubId: string): Player[] {
  return players.filter(
    (player) => player.club_id === clubId && player.squad_status === "pro",
  );
}

export function leadershipCandidates(
  players: readonly Player[],
  clubId: string,
  limit = 5,
): CaptainCandidate[] {
  return proSquad(players, clubId)
    .map((player) => {
      const leadership = player.attributes.leadership;
      const teamwork = player.attributes.teamwork;
      return {
        player,
        leadership,
        teamwork,
        label: formatPlayerName(player),
        teamworkHint: teamworkHint(teamwork),
      };
    })
    .sort((a, b) => b.leadership - a.leadership || b.teamwork - a.teamwork)
    .slice(0, limit);
}

export function teamworkHint(teamwork: number): string {
  if (teamwork >= 72) return t("opening.captain.teamwork.high");
  if (teamwork >= 55) return t("opening.captain.teamwork.mid");
  if (teamwork >= 40) return t("opening.captain.teamwork.solo");
  return t("opening.captain.teamwork.low");
}

export function captainMoraleNeighbors(
  players: readonly Player[],
  captainId: string,
  clubId: string,
): string[] {
  const pros = proSquad(players, clubId);
  const captain = pros.find((player) => player.id === captainId);
  if (!captain) return [];
  const sameLine = pros
    .filter((player) => player.position === captain.position && player.id !== captainId)
    .slice(0, 3)
    .map((player) => player.id);
  if (sameLine.length > 0) return sameLine;
  return pros.filter((player) => player.id !== captainId).slice(0, 3).map((player) => player.id);
}
