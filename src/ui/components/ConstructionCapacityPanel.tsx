/** Club-wide build cap (PRD economy pacing) — Gelände, Tribüne, Camps, Campus. */
import { useMemo } from "react";
import { Hammer } from "lucide-react";
import {
  constructionCapacitySummary,
  type ActiveConstructionProject,
  type ConstructionSnapshot,
} from "../../sim/advance-construction.ts";
import { useT } from "../../i18n/react.ts";

function projectLine(
  project: ActiveConstructionProject,
  t: (key: string, params?: Record<string, string>) => string,
): string {
  switch (project.kind) {
    case "tribune":
      return t("construction.slot.tribune", { name: project.name });
    case "camp":
      return t("construction.slot.camp", { nation: project.name });
    case "precinct_build":
      return t("construction.slot.precinctBuild", { building: project.name });
    case "precinct_upgrade":
      return t("construction.slot.precinctUpgrade", { building: project.name });
    case "academy":
      return t("construction.slot.academy", { name: project.name });
    default:
      return project.name;
  }
}

export function ConstructionCapacityPanel({
  snapshot,
  compact = false,
  hero = false,
}: {
  snapshot: ConstructionSnapshot;
  compact?: boolean;
  /** Replaces stadium mood photo when the build queue is full. */
  hero?: boolean;
}) {
  const t = useT();
  const summary = useMemo(() => constructionCapacitySummary(snapshot), [snapshot]);

  return (
    <section
      className={[
        "construction-capacity",
        compact ? "construction-capacity--compact" : "",
        hero ? "construction-capacity--hero stadium-hero" : "",
        summary.atCap ? "is-at-cap" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label={t("construction.capacity.aria")}
    >
      <header className="construction-capacity-head">
        <Hammer size={16} strokeWidth={2.2} aria-hidden="true" />
        <strong>
          {t("construction.capacity.title", {
            active: String(summary.active),
            max: String(summary.max),
          })}
        </strong>
      </header>
      {summary.projects.length > 0 ? (
        <ul className="construction-capacity-list">
          {summary.projects.map((project) => (
            <li key={project.id}>{projectLine(project, t)}</li>
          ))}
        </ul>
      ) : (
        <p className="construction-capacity-empty">
          {t("construction.capacity.empty", { max: String(summary.max) })}
        </p>
      )}
      {!compact ? (
        <p className="construction-capacity-hint">{t("construction.capacity.hint")}</p>
      ) : null}
      {summary.atCap ? (
        <p className="construction-capacity-full" role="status">
          {t("construction.capacity.full")}
        </p>
      ) : null}
    </section>
  );
}
