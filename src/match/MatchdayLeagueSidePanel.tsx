/** WIREFRAME: docs/prd/design.md §9.15 — Vorschau rechts: Tabelle + Spieltag */
import { useMemo } from "react";
import { matchdayFixtures, type TeamId } from "@fussballmanager/shared";
import type { LeagueState } from "../persistence/league-state.ts";
import type { CareerMatchSetup } from "../sim/career-match-setup.ts";
import { clubDisplayName } from "../sim/league-divisions.ts";
import { divisionStandings, leagueSliceForForm } from "../sim/league-standings.ts";
import type { Player } from "../types/player.ts";
import type { WorldClub } from "../world/world-generator.ts";
import { LeagueTable } from "../ui/components/LeagueTable.tsx";

export function MatchdayLeagueSidePanel({
  league,
  setup,
  season,
  masterSeed,
  rivalPlayers,
  worldClubs,
}: {
  league: LeagueState;
  setup: CareerMatchSetup;
  season: number;
  masterSeed: number;
  rivalPlayers: readonly Player[];
  worldClubs?: readonly WorldClub[];
}) {
  const highlightTeamIds: TeamId[] = [setup.homeTeamId, setup.awayTeamId];

  const standings = useMemo(
    () => divisionStandings(league, league.division_id, masterSeed, season, rivalPlayers),
    [league, league.division_id, masterSeed, season, rivalPlayers],
  );

  const leagueSlice = useMemo(
    () => leagueSliceForForm(standings.clubIds, standings.results),
    [standings.clubIds, standings.results],
  );

  const fixtures = useMemo(
    () => matchdayFixtures(league.club_ids, setup.matchday),
    [league.club_ids, setup.matchday],
  );

  return (
    <aside
      className="matchday-cockpit-side matchday-cockpit-side--league game-panel"
      aria-label="Liga und Spieltag"
    >
      <p className="matchday-preview-kicker">Spieltag {setup.matchday}</p>
      <h2 className="match-report-section-title">Tabelle</h2>
      <div className="matchday-side-panel matchday-league-table-panel">
        <LeagueTable
          table={standings.table}
          leagueSlice={leagueSlice}
          playerClubId={league.player_club_id}
          worldClubs={worldClubs}
          highlightTeamIds={highlightTeamIds}
          compact
        />
      </div>
      {fixtures.length > 0 ? (
        <details className="matchday-fixtures-block">
          <summary className="matchday-fixtures-title">
            Weitere Spiele
            <span className="matchday-fixtures-count">{fixtures.length}</span>
          </summary>
          <ul className="matchday-fixtures-compact">
            {fixtures.map((fixture) => {
              const isCurrent =
                fixture.homeTeamId === setup.homeTeamId &&
                fixture.awayTeamId === setup.awayTeamId;
              const home = clubDisplayName(fixture.homeTeamId, worldClubs);
              const away = clubDisplayName(fixture.awayTeamId, worldClubs);
              return (
                <li
                  key={`${fixture.homeTeamId}-${fixture.awayTeamId}`}
                  className={isCurrent ? "is-current" : undefined}
                >
                  <span className="matchday-fixture-teams">
                    {home} – {away}
                  </span>
                  {isCurrent ? (
                    <span className="matchday-fixture-you">dein Spiel</span>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </details>
      ) : null}
    </aside>
  );
}
