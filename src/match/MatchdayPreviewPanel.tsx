/** WIREFRAME: docs/prd/design.md §9.15 — Vorschau (read-only Aufstellungen) */
import type { MatchView } from "@fussballmanager/shared";
import { Lineup } from "./Lineup.tsx";
import { frameAt } from "./useMatchPlayback.ts";

export function MatchdayPreviewPanel({ view }: { view: MatchView }) {
  const kickoffFrame = frameAt(view, 0);

  return (
    <section className="matchday-preview-main game-panel" aria-label="Aufstellungen">
      <p className="matchday-preview-kicker">Vorschau</p>
      <h2 className="match-report-section-title">Aufstellungen</h2>
      <div className="matchday-preview-lineups">
        <Lineup view={view} frame={kickoffFrame} fullClubNames />
      </div>
    </section>
  );
}
