/** WIREFRAME: docs/prd/design.md §9.15 — Vorschau (read-only Aufstellungen + Experte) */
import type { MatchView, MatchViewSide } from "@fussballmanager/shared";
import { useT } from "../i18n/react.ts";
import type { PreMatchBrief } from "./pre-match-brief.ts";

export function MatchdayPreviewPanel({
  view,
  brief,
  ownTeamId,
}: {
  view: MatchView;
  brief: PreMatchBrief;
  ownTeamId: string;
}) {
  const t = useT();

  return (
    <section className="tc-panel" aria-label={t("match.preview.lineupsAria")}>
      <div className="tc-panel__head">
        <div>
          <p className="tc-label">{t("match.preview.kicker")}</p>
          <h2 className="tc-panel__title">{t("match.preview.lineupsTitle")}</h2>
        </div>
      </div>
      <p className="tc-match__expert">
        <span className="tc-match__badge">{t("match.commentary.expert")}</span>
        {brief.colorLine}
      </p>
      <div className="tc-match__lineups">
        <PreviewLineup view={view} side={view.home} own={view.home.id === ownTeamId} />
        <PreviewLineup view={view} side={view.away} own={view.away.id === ownTeamId} />
      </div>
    </section>
  );
}

function PreviewLineup({ view, side, own }: { view: MatchView; side: MatchViewSide; own: boolean }) {
  const t = useT();
  const rows = view.roster
    .filter((entry) => entry.teamId === side.id && entry.starter)
    .slice()
    .sort((a, b) => a.shirt - b.shirt);

  return (
    <div className="tc-table-wrap">
      <table className="tc-table tc-table--compact">
        <caption className={`tc-match__caption${own ? " is-own" : ""}`}>
          {side.name} · {side.formation}
        </caption>
        <thead>
          <tr>
            <th scope="col" className="tc-num">
              {t("match.col.shirt")}
            </th>
            <th scope="col">{t("squad.col.pos")}</th>
            <th scope="col">{t("squad.col.name")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td className="tc-num">{row.shirt}</td>
              <td>{row.role}</td>
              <td>{row.name}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
