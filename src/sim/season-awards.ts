import type { PlayerSeasonStat } from "@fussballmanager/shared";
import type { LeagueState } from "../persistence/league-state.ts";
import type { Player } from "../types/player.ts";
import { formatPlayerName } from "../types/player-display.ts";
import { seasonMatchRating } from "../player/season-stats.ts";
import { clubShortName, leaguePlayerStats } from "./league-week.ts";
import { careerTeamId } from "./rival-growth.ts";

export type SeasonAwardKind =
  | "top_scorer"
  | "top_assists"
  | "most_minutes"
  | "player_of_season";

export interface SeasonAwardCard {
  kind: SeasonAwardKind;
  icon: string;
  title: string;
  playerId: string;
  playerName: string;
  clubId: string;
  clubLabel: string;
  value: number;
  valueLabel: string;
}

export interface SeasonAwardsSnapshot {
  season: number;
  awards: SeasonAwardCard[];
}

const AWARD_META: Record<SeasonAwardKind, { icon: string; title: string; unit: string }> = {
  top_scorer: { icon: "⚽", title: "Torschützenkönig", unit: "Tore" },
  top_assists: { icon: "🅰️", title: "Assist-König", unit: "Vorlagen" },
  most_minutes: { icon: "⏱️", title: "Einsatzkönig", unit: "Minuten" },
  player_of_season: { icon: "⭐", title: "Spieler der Saison", unit: "Ø Note" },
};

function statClubLabel(stat: PlayerSeasonStat, league: LeagueState): string {
  if (stat.teamId === league.player_club_id) return "Eigener Verein";
  return clubShortName(stat.teamId);
}

function statClubId(stat: PlayerSeasonStat, league: LeagueState): string {
  if (stat.teamId === league.player_club_id) return careerTeamId(league.player_club_id);
  return careerTeamId(stat.teamId);
}

function topStatCard(
  stats: readonly PlayerSeasonStat[],
  league: LeagueState,
  kind: SeasonAwardKind,
  field: "goals" | "assists",
): SeasonAwardCard | null {
  const leader = [...stats].sort((left, right) => right[field] - left[field])[0];
  if (!leader || leader[field] <= 0) return null;
  const meta = AWARD_META[kind];
  return {
    kind,
    icon: meta.icon,
    title: meta.title,
    playerId: leader.playerId,
    playerName: leader.name,
    clubId: statClubId(leader, league),
    clubLabel: statClubLabel(leader, league),
    value: leader[field],
    valueLabel: `${leader[field]} ${meta.unit}`,
  };
}

function mostMinutesCard(
  players: readonly Player[],
  league: LeagueState,
): SeasonAwardCard | null {
  const leader = [...players]
    .filter((player) => player.state.season_minutes > 0)
    .sort((left, right) => right.state.season_minutes - left.state.season_minutes)[0];
  if (!leader) return null;
  const meta = AWARD_META.most_minutes;
  const clubId = leader.club_id ?? careerTeamId(league.player_club_id);
  return {
    kind: "most_minutes",
    icon: meta.icon,
    title: meta.title,
    playerId: leader.id,
    playerName: formatPlayerName(leader),
    clubId,
    clubLabel: leader.club_id === league.player_club_id || clubId.includes("nordstern")
      ? "Eigener Verein"
      : clubId.replace(/^cl_/, "").replace(/_/g, " "),
    value: leader.state.season_minutes,
    valueLabel: `${leader.state.season_minutes} ${meta.unit}`,
  };
}

function playerOfSeasonCard(players: readonly Player[], league: LeagueState): SeasonAwardCard | null {
  const leader = [...players]
    .map((player) => ({ player, rating: seasonMatchRating(player) }))
    .filter((entry) => entry.rating != null && entry.player.state.season_minutes >= 450)
    .sort((left, right) => (right.rating ?? 0) - (left.rating ?? 0))[0];
  if (!leader?.rating) return null;
  const meta = AWARD_META.player_of_season;
  const clubId = leader.player.club_id ?? careerTeamId(league.player_club_id);
  return {
    kind: "player_of_season",
    icon: meta.icon,
    title: meta.title,
    playerId: leader.player.id,
    playerName: formatPlayerName(leader.player),
    clubId,
    clubLabel:
      leader.player.club_id === league.player_club_id || clubId.includes("nordstern")
        ? "Eigener Verein"
        : clubId.replace(/^cl_/, "").replace(/_/g, " "),
    value: Math.round(leader.rating * 10) / 10,
    valueLabel: `${leader.rating.toFixed(1)} ${meta.unit}`,
  };
}

/** F11.2 — league award cards from final season stats. */
export function computeSeasonAwards(
  league: LeagueState,
  players: readonly Player[],
  rivalPlayers: readonly Player[],
  season: number,
): SeasonAwardsSnapshot {
  const stats = leaguePlayerStats(league);
  const allPlayers = [...players, ...rivalPlayers];
  const awards = [
    topStatCard(stats, league, "top_scorer", "goals"),
    topStatCard(stats, league, "top_assists", "assists"),
    mostMinutesCard(allPlayers, league),
    playerOfSeasonCard(allPlayers, league),
  ].filter((card): card is SeasonAwardCard => card != null);

  return { season, awards };
}
