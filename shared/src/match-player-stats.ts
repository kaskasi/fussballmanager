import type { MatchEvent } from "./match-event.ts";
import type { PlayerId, TeamId } from "./ids.ts";
import type { Squad } from "./squad.ts";

export type PlayerSeasonStat = {
  playerId: PlayerId;
  teamId: TeamId;
  name: string;
  goals: number;
  assists: number;
  yellowCards: number;
  /** Direct reds and second-yellow send-offs (optional on older saves). */
  redCards?: number;
};

export const DISCIPLINE_YELLOW_POINTS = 2;
export const DISCIPLINE_RED_POINTS = 5;

export function disciplinePoints(row: Pick<PlayerSeasonStat, "yellowCards" | "redCards">): number {
  return row.yellowCards * DISCIPLINE_YELLOW_POINTS + (row.redCards ?? 0) * DISCIPLINE_RED_POINTS;
}

function playerNameLookup(home: Squad, away: Squad): Map<PlayerId, string> {
  const names = new Map<PlayerId, string>();
  for (const squad of [home, away]) {
    for (const place of squad.starters) {
      names.set(place.player.id, place.player.name);
    }
    for (const player of squad.bench) {
      names.set(player.id, player.name);
    }
  }
  return names;
}

export function aggregatePlayerMatchStats(
  events: readonly MatchEvent[],
  home: Squad,
  away: Squad,
): PlayerSeasonStat[] {
  const names = playerNameLookup(home, away);
  const rows = new Map<PlayerId, PlayerSeasonStat>();

  const bump = (playerId: PlayerId, teamId: TeamId, field: "goals" | "assists" | "yellowCards" | "redCards") => {
    let row = rows.get(playerId);
    if (!row) {
      row = {
        playerId,
        teamId,
        name: names.get(playerId) ?? String(playerId),
        goals: 0,
        assists: 0,
        yellowCards: 0,
        redCards: 0,
      };
      rows.set(playerId, row);
    }
    if (field === "redCards") {
      row.redCards = (row.redCards ?? 0) + 1;
    } else {
      row[field] += 1;
    }
  };

  for (const event of events) {
    if (event.type === "goal") {
      bump(event.scorer.playerId, event.scorer.teamId, "goals");
      if (event.assist) {
        bump(event.assist.playerId, event.assist.teamId, "assists");
      }
      continue;
    }
    // A carded foul is always followed by its own `card` event; count the card once, there.
    if (event.type === "card") {
      if (event.color === "yellow") {
        bump(event.player.playerId, event.player.teamId, "yellowCards");
      } else if (event.color === "second_yellow") {
        bump(event.player.playerId, event.player.teamId, "yellowCards");
        bump(event.player.playerId, event.player.teamId, "redCards");
      } else if (event.color === "red") {
        bump(event.player.playerId, event.player.teamId, "redCards");
      }
    }
  }

  return [...rows.values()];
}

export function mergePlayerSeasonStats(
  season: readonly PlayerSeasonStat[],
  matchday: readonly PlayerSeasonStat[],
): PlayerSeasonStat[] {
  const rows = new Map(season.map((row) => [row.playerId, { ...row }]));
  for (const row of matchday) {
    const existing = rows.get(row.playerId);
    if (existing) {
      existing.goals += row.goals;
      existing.assists += row.assists;
      existing.yellowCards += row.yellowCards;
      existing.redCards = (existing.redCards ?? 0) + (row.redCards ?? 0);
    } else {
      rows.set(row.playerId, { ...row });
    }
  }
  return [...rows.values()];
}

export function topByStat(
  stats: readonly PlayerSeasonStat[],
  field: "goals" | "assists" | "yellowCards",
  limit = 5,
): PlayerSeasonStat[] {
  return [...stats]
    .filter((row) => row[field] > 0)
    .sort((left, right) => {
      const delta = right[field] - left[field];
      if (delta !== 0) return delta;
      return left.name.localeCompare(right.name, "de");
    })
    .slice(0, limit);
}

export function topDiscipline(stats: readonly PlayerSeasonStat[], limit = 3): PlayerSeasonStat[] {
  return [...stats]
    .filter((row) => disciplinePoints(row) > 0)
    .sort((left, right) => {
      const delta = disciplinePoints(right) - disciplinePoints(left);
      if (delta !== 0) return delta;
      return left.name.localeCompare(right.name, "de");
    })
    .slice(0, limit);
}
