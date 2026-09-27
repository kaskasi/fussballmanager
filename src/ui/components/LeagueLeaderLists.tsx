import type { PlayerSeasonStat, TeamId } from "@fussballmanager/shared";
import type { LeagueState } from "../../persistence/league-state.ts";
import { clubShortName } from "../../sim/league-week.ts";

export function LeagueLeaderLists({
  scorers,
  assists,
  yellows,
  playerClubId,
}: {
  scorers: readonly PlayerSeasonStat[];
  assists: readonly PlayerSeasonStat[];
  yellows: readonly PlayerSeasonStat[];
  playerClubId: LeagueState["player_club_id"];
}) {
  return (
    <div className="league-leaders" aria-label="Liga-Statistik">
      <LeaderList title="⚽ Torschützen" rows={scorers} field="goals" playerClubId={playerClubId} />
      <LeaderList title="🅰️ Assists" rows={assists} field="assists" playerClubId={playerClubId} />
      <LeaderList title="🟨 Gelbe Karten" rows={yellows} field="yellowCards" playerClubId={playerClubId} />
    </div>
  );
}

function LeaderList({
  title,
  rows,
  field,
  playerClubId,
}: {
  title: string;
  rows: readonly PlayerSeasonStat[];
  field: "goals" | "assists" | "yellowCards";
  playerClubId: LeagueState["player_club_id"];
}) {
  return (
    <div className="league-leader-card">
      <p className="league-leader-title">{title}</p>
      {rows.length > 0 ? (
        <ol className="league-leader-list">
          {rows.map((row) => (
            <li
              key={`${row.name}-${row.teamId}-${field}`}
              className={row.teamId === playerClubId ? "is-player-club" : undefined}
            >
              <span className="league-leader-name">{row.name}</span>
              <span className="league-leader-club">{clubShortName(row.teamId)}</span>
              <strong>{row[field]}</strong>
            </li>
          ))}
        </ol>
      ) : (
        <p className="league-leader-empty">Noch keine Daten</p>
      )}
    </div>
  );
}
