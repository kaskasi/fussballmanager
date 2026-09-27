/** WIREFRAME: PRD 09.2 — pre-match lineup, formation pick + confirm suggested XI */
import { useEffect, useMemo, useState } from "react";
import { FORMATION_IDS, type FormationId, type Squad } from "@fussballmanager/shared";
import type { NavPrimaryAction } from "../ui/nav-primary-action.ts";
import type { Player } from "../types/player.ts";
import type { CareerMatchSetup } from "../sim/career-match-setup.ts";
import { suggestCareerSquad } from "../sim/career-engine-squad.ts";
import { MatchdayLineupAmbience } from "../ui/components/MatchdayLineupAmbience.tsx";

type CareerLineupScreenProps = {
  setup: CareerMatchSetup;
  players: readonly Player[];
  week: number;
  weekday: number;
  onConfirm: (squad: Squad) => void;
  onNavActionChange: (action: NavPrimaryAction | null) => void;
};

export function CareerLineupScreen({
  setup,
  players,
  week,
  weekday,
  onConfirm,
  onNavActionChange,
}: CareerLineupScreenProps) {
  const [formation, setFormation] = useState<FormationId>("4-3-3");
  const squad = useMemo(() => suggestCareerSquad(players, formation), [players, formation]);

  useEffect(() => {
    if (!squad) {
      onNavActionChange(null);
      return;
    }
    onNavActionChange({
      label: "Auswahl bestätigen",
      onClick: () => onConfirm(squad),
      title: "Startelf-Vorschlag übernehmen und Spiel starten",
    });
    return () => onNavActionChange(null);
  }, [squad, formation, onConfirm, onNavActionChange]);

  if (!squad) {
    return (
      <main className="matchday career-lineup">
        <p className="status error">Kein Profikader für die Aufstellung verfügbar.</p>
      </main>
    );
  }

  return (
    <main className="matchday career-lineup">
      <MatchdayLineupAmbience setup={setup} />
      <section className="career-lineup-panel" aria-label="Aufstellung">
        <header className="career-lineup-header">
          <p className="eyebrow">KW {week} · {weekdayLabel(weekday)}</p>
          <h1>Aufstellung</h1>
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
      </section>
    </main>
  );
}

function weekdayLabel(weekday: number): string {
  return ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"][weekday - 1] ?? "—";
}
