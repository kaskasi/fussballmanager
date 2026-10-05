/** WIREFRAME: docs/prd/design.md §9.15 — Vorschau (read-only Aufstellungen) */
import type { MatchView } from "@fussballmanager/shared";
import { Lineup } from "./Lineup.tsx";
import { frameAt } from "./useMatchPlayback.ts";

export function MatchdayPreviewPanel({ view }: { view: MatchView }) {
  const kickoffFrame = frameAt(view, 0);

  return (
    <aside className="matchday-cockpit-side matchday-cockpit-side--preview game-panel" aria-label="Vorschau">
      <p className="matchday-preview-kicker">Vorschau</p>
      <h2 className="match-report-section-title">Aufstellungen</h2>
      <div className="matchday-side-panel matchday-preview-lineups">
        <Lineup view={view} frame={kickoffFrame} />
      </div>
      <p className="matchday-preview-hint">
        Header: <span className="matchday-preview-hint-em">Spiel simulieren</span> startet die Live-Phase.
      </p>
    </aside>
  );
}
