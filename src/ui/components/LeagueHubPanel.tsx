import type { PlayerSeasonStat, TeamId } from "@fussballmanager/shared";
import { totalSeasonMatchdays, type LeagueState } from "../../persistence/league-state.ts";
import { divisionLabel } from "../../sim/league-divisions.ts";
import { leagueSliceForForm } from "../../sim/league-standings.ts";
import {
  clubShortName,
  leagueTable,
  topAssists,
  topScorers,
  topYellowCards,
} from "../../sim/league-week.ts";
import { LeagueTable } from "./LeagueTable.tsx";

/** WIREFRAME: PRD 09.2 — Liga-Übersicht im Hub */
export function LeagueHubPanel({
  league,
  onSelectClub,
}: {
  league: LeagueState;
  onSelectClub?: (teamId: TeamId) => void;
}) {
  const table = leagueTable(league);
  const scorers = topScorers(league);
  const assists = topAssists(league);
  const yellows = topYellowCards(league);
  const leagueSlice = leagueSliceForForm(league.club_ids, league.results);

  return (
    <section className="league-hub" aria-label="Ligaübersicht">
      <h3 className="league-hub-title">
        {divisionLabel(league.division_id)}
        <span className="league-hub-mode">
          {league.club_ids.length} Teams · {league.meetings_per_opponent ?? 6}× Hin- und Rückrunde · {totalSeasonMatchdays(league)} Spiele/Team
        </span>
      </h3>
      <div className="league-hub-grid">
        <LeagueTable
          table={table}
          leagueSlice={leagueSlice}
          playerClubId={league.player_club_id}
          onSelectClub={onSelectClub}
        />
        <div className="league-leaders">
          <LeaderList title="⚽ Torschützen" rows={scorers} field="goals" playerClubId={league.player_club_id} />
          <LeaderList title="🅰️ Assists" rows={assists} field="assists" playerClubId={league.player_club_id} />
          <LeaderList title="🟨 Gelbe Karten" rows={yellows} field="yellowCards" playerClubId={league.player_club_id} />
        </div>
      </div>
    </section>
  );
}

function LeaderList({
  title,
  rows,
  field,
  playerClubId,
}: {
  title: string;
  rows: PlayerSeasonStat[];
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
