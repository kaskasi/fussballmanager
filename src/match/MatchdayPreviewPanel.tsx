/** WIREFRAME: docs/prd/design.md §9.15 — Vorschau (read-only Aufstellungen) */
import type { MatchView } from "@fussballmanager/shared";
import { useT } from "../i18n/react.ts";
import { Lineup } from "./Lineup.tsx";
import { frameAt } from "./useMatchPlayback.ts";

export function MatchdayPreviewPanel({ view }: { view: MatchView }) {
  const t = useT();
  const kickoffFrame = frameAt(view, 0);

  return (
    <section className="matchday-preview-main game-panel" aria-label={t("match.preview.lineupsAria")}>
      <p className="matchday-preview-kicker">{t("match.preview.kicker")}</p>
      <h2 className="match-report-section-title">{t("match.preview.lineupsTitle")}</h2>
      <div className="matchday-preview-lineups">
        <Lineup view={view} frame={kickoffFrame} fullClubNames />
      </div>
    </section>
  );
}
