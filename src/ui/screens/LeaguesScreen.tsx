import { useMemo, useState } from "react";
import type { TeamId } from "@fussballmanager/shared";
import type { Player } from "../../types/player.ts";
import type { ClubStadium } from "../../stadium/club-stadium.ts";
import type { DivisionEconomyId } from "../../economy/division-economy.ts";
import { totalSeasonMatchdays, type LeagueState } from "../../persistence/league-state.ts";
import { divisionLabel, REGIONALLIGA_ID, OBERLIGA_ID } from "../../sim/league-divisions.ts";
import { divisionLeaderLists, divisionStandings, leagueSliceForForm } from "../../sim/league-standings.ts";
import { ClubProfileModal } from "../components/ClubProfileModal.tsx";
import { LeagueLeaderLists } from "../components/LeagueLeaderLists.tsx";
import { LeagueTable } from "../components/LeagueTable.tsx";
import type { WorldClub } from "../../world/world-generator.ts";

const DIVISIONS: DivisionEconomyId[] = [REGIONALLIGA_ID, OBERLIGA_ID];

/**
 * WIREFRAME: docs/prd/design.md §9.7 — Tabellen
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
  const [divisionId, setDivisionId] = useState<DivisionEconomyId>(league.division_id);
  const [viewTab, setViewTab] = useState<"table" | "scorers">("table");
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
    <main className="leagues-screen club-shell-card-body">
      <header className="leagues-screen-head">
        <div>
          <p className="eyebrow">Wettbewerb</p>
          <h1>Ligen</h1>
          <p className="leagues-screen-sub">
            Klick auf einen Verein für Kurzprofil · {standings.simulated ? "Fremdliga simuliert" : "Deine Liga live"}
          </p>
        </div>
      </header>

      <div className="leagues-screen-tabs" role="tablist" aria-label="Spielklassen">
        {DIVISIONS.map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={divisionId === id}
            className={divisionId === id ? "is-active" : undefined}
            onClick={() => setDivisionId(id)}
          >
            {divisionLabel(id)}
            {id === league.division_id ? <span className="leagues-screen-own"> · dein Verein</span> : null}
          </button>
        ))}
      </div>

      <div className="leagues-screen-view-tabs" role="tablist" aria-label="Liga-Ansicht">
        <button
          type="button"
          role="tab"
          aria-selected={viewTab === "table"}
          className={viewTab === "table" ? "is-active" : undefined}
          onClick={() => setViewTab("table")}
        >
          Tabelle
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={viewTab === "scorers"}
          className={viewTab === "scorers" ? "is-active" : undefined}
          onClick={() => setViewTab("scorers")}
        >
          Torschützen
        </button>
      </div>

      {viewTab === "table" ? (
        <section className="leagues-screen-table" aria-label={divisionLabel(divisionId)}>
          <p className="leagues-screen-meta">
            Spieltag {standings.matchdaysPlayed}/{matchdays}
            {standings.simulated ? " · Auto-Sim" : ""}
          </p>
          <LeagueTable
            table={standings.table}
            leagueSlice={leagueSlice}
            playerClubId={league.player_club_id}
            worldClubs={worldClubs}
            onSelectClub={setSelectedClubId}
          />
          <div className="leagues-screen-legend" aria-label="Tabellenzonen">
            <span><i className="zone-promoted" /> Aufstieg</span>
            <span><i className="zone-playoff" /> Relegation</span>
            <span><i className="zone-relegated" /> Abstieg</span>
          </div>
        </section>
      ) : (
        <section className="leagues-screen-leaders" aria-label="Saisonstatistik">
          <LeagueLeaderLists
            scorers={leaders.scorers}
            assists={leaders.assists}
            yellows={leaders.yellows}
            matchdaysPlayed={standings.matchdaysPlayed}
            playerClubId={league.player_club_id}
            worldClubs={worldClubs}
          />
        </section>
      )}

      {selectedClubId ? (
        <ClubProfileModal
          teamId={selectedClubId}
          league={league}
          players={players}
          rivalPlayers={rivalPlayers}
          stadium={stadium}
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
