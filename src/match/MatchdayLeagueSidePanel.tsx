/** WIREFRAME: docs/prd/design.md §9.15 — Vorschau rechts: Tabelle + Spieltag */
import { useMemo } from "react";
import { matchdayFixtures, type TeamId } from "@fussballmanager/shared";
import type { LeagueState } from "../persistence/league-state.ts";
import type { CareerMatchSetup } from "../sim/career-match-setup.ts";
import { clubDisplayName } from "../sim/league-divisions.ts";
import { divisionStandings, leagueSliceForForm } from "../sim/league-standings.ts";
import type { Player } from "../types/player.ts";
import type { WorldClub } from "../world/world-generator.ts";
import { useT } from "../i18n/react.ts";
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
  const t = useT();
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
    <aside className="tc-stack" aria-label={t("match.leagueSide.aria")}>
      <section className="tc-panel tc-match__league">
        <div className="tc-panel__head">
          <div>
            <p className="tc-label">{t("match.lineup.matchday", { matchday: setup.matchday })}</p>
            <h2 className="tc-panel__title">{t("match.leagueSide.tableTitle")}</h2>
          </div>
        </div>
        <LeagueTable
          table={standings.table}
          leagueSlice={leagueSlice}
          playerClubId={league.player_club_id}
          worldClubs={worldClubs}
          highlightTeamIds={highlightTeamIds}
          compact
        />
      </section>
      {fixtures.length > 0 ? (
        <details className="tc-panel tc-match__fixtures">
          <summary className="tc-label">
            {t("match.leagueSide.moreFixtures")} · {fixtures.length}
          </summary>
          <ul className="tc-list">
            {fixtures.map((fixture) => {
              const isCurrent =
                fixture.homeTeamId === setup.homeTeamId &&
                fixture.awayTeamId === setup.awayTeamId;
              const home = clubDisplayName(fixture.homeTeamId, worldClubs);
              const away = clubDisplayName(fixture.awayTeamId, worldClubs);
              return (
                <li
                  key={`${fixture.homeTeamId}-${fixture.awayTeamId}`}
                  className={`tc-list__item tc-list__item--wide${isCurrent ? " tc-list__item--own" : ""}`}
                >
                  <span className="tc-list__name">
                    {home} – {away}
                  </span>
                  {isCurrent ? <span className="tc-list__meta">{t("match.leagueSide.yourMatch")}</span> : null}
                </li>
              );
            })}
          </ul>
        </details>
      ) : null}
    </aside>
  );
}
