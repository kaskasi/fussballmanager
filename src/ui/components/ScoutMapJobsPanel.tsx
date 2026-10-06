import { MapPin, Route } from "lucide-react";
import { listMapScoutJobs, type MapScoutJobRow } from "../../scouting/scout-map-jobs.ts";
import type { ScoutNetworkState } from "../../scouting/scout-network.ts";
import type { ActiveScoutTrip, ScoutTripPlan } from "../../scouting/scout-trip.ts";
import type { WorldClub } from "../../world/world-generator.ts";
import { ScreenEmptyState } from "./ScreenEmptyState.tsx";
import { useT } from "../../i18n/react.ts";

function MapScoutJobItem({ row }: { row: MapScoutJobRow }) {
  const t = useT();
  return (
    <li className={`scouting-map-job-row is-${row.status}`}>
      <Route size={16} aria-hidden className="scouting-map-job-icon" />
      <div className="scouting-map-job-body">
        <span className="scouting-map-job-title">
          {row.zoneLabel} · {row.targetClubName}
        </span>
        <span className="scouting-map-job-meta">
          {t("scouting.mapJobs.stops", { count: row.stopCount })}
          {" · "}
          {row.status === "active"
            ? t("scouting.mapJobs.progress", {
                done: row.workingDaysDone,
                total: row.workingDaysTotal,
              })
            : row.durationLabel}
        </span>
        <span className="scouting-map-job-scout">
          {row.assignedScoutName
            ? t("scouting.mapJobs.scoutAssigned", { name: row.assignedScoutName })
            : t("scouting.mapJobs.waitingScout")}
        </span>
      </div>
      {row.status === "active" ? (
        <span className="scouting-map-job-badge">{t("scouting.mapJobs.statusActive")}</span>
      ) : (
        <span className="scouting-map-job-badge is-queued">{t("scouting.mapJobs.statusQueued")}</span>
      )}
    </li>
  );
}

/** WIREFRAME: PRD 09 — Treffer tab map scout job queue */
export function ScoutMapJobsPanel({
  activeTrips,
  tripQueue,
  scoutNetwork,
  worldClubs,
}: {
  activeTrips: readonly ActiveScoutTrip[];
  tripQueue: readonly ScoutTripPlan[] | undefined;
  scoutNetwork: ScoutNetworkState;
  worldClubs: readonly WorldClub[];
}) {
  const t = useT();
  const jobs = listMapScoutJobs({
    activeTrips,
    queue: tripQueue,
    network: scoutNetwork,
    worldClubs,
  });

  return (
    <section className="scouting-map-jobs game-panel scouting-section" aria-label={t("scouting.mapJobs.aria")}>
      <header className="scouting-assignments-head">
        <h2>
          <MapPin size={18} aria-hidden className="scouting-map-jobs-head-icon" />
          {t("scouting.mapJobs.title")}
        </h2>
      </header>
      {jobs.length === 0 ? (
        <ScreenEmptyState
          icon={Route}
          title={t("scouting.mapJobs.empty")}
          aria-label={t("scouting.mapJobs.aria")}
        />
      ) : (
        <ul className="scouting-map-jobs-list">
          {jobs.map((row) => (
            <MapScoutJobItem key={row.id} row={row} />
          ))}
        </ul>
      )}
    </section>
  );
}
