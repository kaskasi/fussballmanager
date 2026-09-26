/** WIREFRAME: PRD 09.2 — pre-match lineup, formation pick + confirm suggested XI */
import { useMemo, useState } from "react";
import { FORMATION_IDS, type FormationId, type Squad } from "@fussballmanager/shared";
import type { Player } from "../types/player.ts";
import type { CareerMatchSetup } from "../sim/career-match-setup.ts";
import { suggestCareerSquad } from "../sim/career-engine-squad.ts";
import { WeekdayStrip } from "../ui/components/WeekdayStrip.tsx";

type CareerLineupScreenProps = {
  setup: CareerMatchSetup;
  players: readonly Player[];
  week: number;
  weekday: number;
  onConfirm: (squad: Squad) => void;
};

export function CareerLineupScreen({ setup, players, week, weekday, onConfirm }: CareerLineupScreenProps) {
  const [formation, setFormation] = useState<FormationId>("4-3-3");
  const squad = useMemo(() => suggestCareerSquad(players, formation), [players, formation]);

  if (!squad) {
    return (
      <main className="matchday career-lineup">
        <p className="status error">Kein Profikader für die Aufstellung verfügbar.</p>
      </main>
    );
  }

  return (
    <main className="matchday career-lineup">
      <WeekdayStrip week={week} weekday={weekday} />
      <header className="scoreboard career-lineup-header">
        <p className="eyebrow">Spieltag {setup.matchday}</p>
        <h1>
          {setup.isHome ? "Heim" : "Auswärts"} vs {setup.opponentShortName}
        </h1>
        <p className="career-lineup-sub">
          Formation wählen und den automatischen Vorschlag bestätigen.
        </p>
      </header>

      <div className="career-lineup-toolbar">
        <label className="career-lineup-formation">
          Formation
          <select
            value={formation}
            onChange={(event) => setFormation(event.target.value as FormationId)}
          >
            {FORMATION_IDS.map((id) => (
              <option key={id} value={id}>
                {id}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="career-lineup-confirm" onClick={() => onConfirm(squad)}>
          Vorschlag bestätigen
        </button>
      </div>

      <div className="squad-table-wrap">
        <table className="squad-table career-lineup-table" aria-label="Startelf-Vorschlag">
          <thead>
            <tr>
              <th>Pos</th>
              <th className="squad-col-name">Name</th>
              <th>Rolle</th>
              <th>Nr</th>
            </tr>
          </thead>
          <tbody>
            {squad.starters.map((place) => (
              <tr key={place.slot} className="squad-table-row">
                <td>{place.slot}</td>
                <td className="squad-col-name">{place.player.name}</td>
                <td>{place.player.role}</td>
                <td>{place.player.shirt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
