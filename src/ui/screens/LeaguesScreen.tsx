import { useMemo, useState } from "react";
import type { TeamId } from "@fussballmanager/shared";
import type { Player } from "../../types/player.ts";
import type { ClubStadium } from "../../stadium/club-stadium.ts";
import type { DivisionEconomyId } from "../../economy/division-economy.ts";
import { totalSeasonMatchdays, type LeagueState } from "../../persistence/league-state.ts";
import { divisionLabel } from "../../sim/league-divisions.ts";
import { pyramidDivisionIds, tierOf } from "../../sim/league-pyramid.ts";
import { divisionLeaderLists, divisionStandings, leagueSliceForForm } from "../../sim/league-standings.ts";
import { ClubProfileModal } from "../components/ClubProfileModal.tsx";
import { LeagueLeaderLists } from "../components/LeagueLeaderLists.tsx";
import { LeagueTable, LeagueZoneLegend } from "../components/LeagueTable.tsx";
import type { WorldClub } from "../../world/world-generator.ts";
import { useT } from "../../i18n/react.ts";
import { COACH_TARGET } from "../../tutorial/tutorial-targets.ts";

const DIVISIONS: DivisionEconomyId[] = pyramidDivisionIds();

/**
 * WIREFRAME: docs/prd/design.md §9.7 — Tabellen. Built from tc- components (design.md §4.3).
 */
export function LeaguesScreen({
  league,
  season,
  masterSeed,
  players,
  rivalPlayers,
  worldClubs,
  stadium,
  onOpenStadium,
}: {
  league: LeagueState;
  season: number;
  masterSeed: number;
  players: readonly Player[];
  rivalPlayers: readonly Player[];
  worldClubs: readonly WorldClub[];
  stadium: ClubStadium;
  onOpenStadium?: () => void;
}) {
  const t = useT();
  const [divisionId, setDivisionId] = useState<DivisionEconomyId>(league.division_id);
  const [selectedClubId, setSelectedClubId] = useState<TeamId | null>(null);

  const standings = useMemo(
    () => divisionStandings(league, divisionId, masterSeed, season, rivalPlayers),
    [league, divisionId, masterSeed, season, rivalPlayers],
  );
  const leagueSlice = useMemo(
    () => leagueSliceForForm(standings.clubIds, standings.results),
    [standings.clubIds, standings.results],
  );
  const matchdays = totalSeasonMatchdays({ club_ids: standings.clubIds, meetings_per_opponent: league.meetings_per_opponent });
  const leaders = useMemo(
    () => divisionLeaderLists(league, standings, masterSeed, season, rivalPlayers),
    [league, standings, masterSeed, season, rivalPlayers],
  );

  return (
    <main className="club-shell-card-body">
      <header className="tc-page-head">
        <span className="tc-label">{t("leagues.eyebrow")}</span>
        <h1 className="tc-page-title">{t("leagues.title")}</h1>
        <p className="tc-page-sub">
          {t("leagues.subtitle")} · {standings.simulated ? t("leagues.mode.simulated") : t("leagues.mode.live")}
        </p>
      </header>

      <div className="tc-tabs tc-tabs--page" role="tablist" aria-label={t("leagues.tabsAria")}>
        {DIVISIONS.map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            className="tc-tab"
            aria-selected={divisionId === id}
            onClick={() => setDivisionId(id)}
          >
            {t("leagues.tierTab", { tier: tierOf(id), name: divisionLabel(id) })}
            {id === league.division_id ? <span className="tc-tab__meta">{t("leagues.yourClub")}</span> : null}
          </button>
        ))}
      </div>

      <div className="tc-split">
        <section
          className="tc-panel"
          aria-label={divisionLabel(divisionId)}
          data-coach-target={COACH_TARGET.leaguesTable}
        >
          <div className="tc-panel__head">
            <span className="tc-label">
              {t("leagues.matchdayProgress", {
                played: standings.matchdaysPlayed,
                total: matchdays,
              })}
              {standings.simulated ? ` · ${t("leagues.autoSim")}` : ""}
            </span>
          </div>
          <LeagueTable
            divisionId={divisionId}
            table={standings.table}
            leagueSlice={leagueSlice}
            playerClubId={league.player_club_id}
            worldClubs={worldClubs}
            onSelectClub={setSelectedClubId}
            caption={`${divisionLabel(divisionId)} · ${t("leagues.matchdayProgress", {
              played: standings.matchdaysPlayed,
              total: matchdays,
            })}`}
          />
          <LeagueZoneLegend divisionId={divisionId} />
        </section>
        <aside className="tc-panel" aria-label={t("leagues.sidebar.statsAria")}>
          <LeagueLeaderLists
            scorers={leaders.scorers}
            assists={leaders.assists}
            discipline={leaders.discipline}
            matchdaysPlayed={standings.matchdaysPlayed}
            playerClubId={league.player_club_id}
            worldClubs={worldClubs}
          />
        </aside>
      </div>

      {selectedClubId ? (
        <ClubProfileModal
          teamId={selectedClubId}
          league={league}
          players={players}
          rivalPlayers={rivalPlayers}
          stadium={stadium}
          worldClubs={worldClubs}
          onClose={() => setSelectedClubId(null)}
          onOpenStadium={
            selectedClubId === league.player_club_id && onOpenStadium
              ? () => {
                  setSelectedClubId(null);
                  onOpenStadium();
                }
              : undefined
          }
        />
      ) : null}
    </main>
  );
}
