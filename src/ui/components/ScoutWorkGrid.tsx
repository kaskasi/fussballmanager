/** WIREFRAME: design.md §9 — Scout-Aufträge als Kachel-Grid */
import { ClipboardList, MapPin, Radar, User, X } from "lucide-react";
import { buildScoutWorkTiles, type ScoutWorkTile } from "../../scouting/scout-work-overview.ts";
import type { ScoutWorkCancelTarget } from "../../scouting/scout-work-cancel.ts";
import type { BoardTarget } from "../../scouting/scout-board.ts";
import type { ScoutAssignment } from "../../scouting/scout-assignments.ts";
import type { ActiveClubScout, ActiveRegionScout } from "../../scouting/scout-discovery.ts";
import type { ActiveOpponentScout } from "../../scouting/opponent-scout-job.ts";
import type { ScoutNetworkState } from "../../scouting/scout-network.ts";
import type { ActiveScoutTrip, ScoutTripPlan } from "../../scouting/scout-trip.ts";
import type { WorldClub } from "../../world/world-generator.ts";
import { clubLogoUrlForId } from "../assets/club-logo.ts";
import { ClubCrest } from "./ClubCrest.tsx";
import { PlayerPortrait } from "./PlayerPortrait.tsx";
import { ScreenEmptyState } from "./ScreenEmptyState.tsx";
import { COACH_TARGET } from "../../tutorial/tutorial-targets.ts";
import { useT } from "../../i18n/react.ts";

function WorkTileVisual({ tile }: { tile: ScoutWorkTile }) {
  if (tile.kind === "opponent_job") {
    return (
      <span className="scout-work-tile-zone" aria-hidden>
        <Radar size={22} strokeWidth={2.25} />
      </span>
    );
  }
  if (tile.portraitSeed) {
    return <PlayerPortrait seed={tile.portraitSeed} size="sm" variant="silhouette" />;
  }
  if (tile.clubCareerId) {
    const logo = clubLogoUrlForId(tile.clubCareerId);
    return (
      <ClubCrest
        size={32}
        initials={tile.subtitle.slice(0, 2)}
        logoSrc={logo}
        alt=""
      />
    );
  }
  if (tile.zoneId) {
    return (
      <span className="scout-work-tile-zone" aria-hidden>
        <MapPin size={22} strokeWidth={2.25} />
      </span>
    );
  }
  return (
    <span className="scout-work-tile-zone" aria-hidden>
      <ClipboardList size={22} strokeWidth={2.25} />
    </span>
  );
}

function ScoutWorkTileCard({
  tile,
  onToggleAssignment,
  onCancelScoutWork,
}: {
  tile: ScoutWorkTile;
  onToggleAssignment?: (assignmentId: string) => void;
  onCancelScoutWork: (target: ScoutWorkCancelTarget) => void;
}) {
  const t = useT();
  const progressPct =
    tile.status !== "cancelling" &&
    tile.progressTotal &&
    tile.progressTotal > 0 &&
    tile.progressDone != null
      ? Math.min(100, Math.round((tile.progressDone / tile.progressTotal) * 100))
      : null;
  const subtitle =
    tile.subtitle === "sweep"
      ? t("scouting.workGrid.assignmentSweep", {
          weeks: tile.assignmentSweepWeeks ?? 1,
        })
      : tile.subtitle === "roster"
        ? t("scouting.workGrid.assignmentRoster")
        : tile.subtitle === "opponent"
          ? t("scouting.workGrid.opponentSub")
          : tile.subtitle;
  const assignmentToggle =
    tile.assignmentId && onToggleAssignment && tile.status !== "cancelling"
      ? () => onToggleAssignment(tile.assignmentId!)
      : undefined;
  const showCancel = tile.status !== "cancelling";
  return (
    <li
      className={`scout-work-tile is-${tile.status} is-kind-${tile.kind}`}
      role={assignmentToggle ? "button" : undefined}
      tabIndex={assignmentToggle ? 0 : undefined}
      onClick={assignmentToggle}
      onKeyDown={
        assignmentToggle
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                assignmentToggle();
              }
            }
          : undefined
      }
    >
      {showCancel ? (
        <button
          type="button"
          className="scout-work-tile-remove"
          aria-label={t("scouting.workGrid.cancelOrder")}
          onClick={(event) => {
            event.stopPropagation();
            onCancelScoutWork(tile.cancelTarget);
          }}
        >
          <X size={12} strokeWidth={2.75} aria-hidden />
        </button>
      ) : null}
      <div className="scout-work-tile-visual">
        <WorkTileVisual tile={tile} />
      </div>
      <div className="scout-work-tile-copy">
        <span className="scout-work-tile-title">{tile.title}</span>
        <span className="scout-work-tile-sub">{subtitle}</span>
        {tile.status === "cancelling" ? (
          <span className="scout-work-tile-scout is-muted">{t("scouting.workGrid.scoutReturning")}</span>
        ) : tile.scoutName ? (
          <span className="scout-work-tile-scout">
            <User size={11} aria-hidden />
            {tile.scoutName}
          </span>
        ) : tile.status === "queued" ? (
          <span className="scout-work-tile-scout is-muted">{t("scouting.workGrid.waitingScout")}</span>
        ) : null}
      </div>
      {progressPct != null ? (
        <div
          className="scout-work-tile-progress"
          role="progressbar"
          aria-valuenow={progressPct}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <span style={{ width: `${progressPct}%` }} />
        </div>
      ) : (
        <span className={`scout-work-tile-badge is-${tile.status}`}>
          {tile.status === "cancelling"
            ? t("scouting.workGrid.statusCancelling")
            : tile.status === "active"
              ? t("scouting.workGrid.statusActive")
              : tile.status === "paused"
                ? t("scouting.workGrid.statusPaused")
                : t("scouting.workGrid.statusQueued")}
        </span>
      )}
    </li>
  );
}

export function ScoutWorkGrid({
  targets,
  assignments,
  activeTrips,
  tripQueue,
  activeClubScout,
  activeRegionScout,
  activeOpponentScout,
  opponentLabel,
  season,
  matchSetup,
  scoutNetwork,
  worldClubs,
  onToggleAssignment,
  onCancelScoutWork,
}: {
  targets: readonly BoardTarget[];
  assignments: readonly ScoutAssignment[];
  activeTrips: readonly ActiveScoutTrip[];
  tripQueue: readonly ScoutTripPlan[] | undefined;
  activeClubScout?: ActiveClubScout | null;
  activeRegionScout?: ActiveRegionScout | null;
  activeOpponentScout?: ActiveOpponentScout | null;
  opponentLabel?: string;
  season?: number;
  matchSetup?: import("../../sim/career-match-setup.ts").CareerMatchSetup | null;
  scoutNetwork: ScoutNetworkState;
  worldClubs: readonly WorldClub[];
  onToggleAssignment: (assignmentId: string) => void;
  onCancelScoutWork: (target: ScoutWorkCancelTarget) => void;
}) {
  const t = useT();
  const tiles = buildScoutWorkTiles({
    targets,
    assignments,
    activeTrips,
    tripQueue,
    activeClubScout,
    activeRegionScout,
    activeOpponentScout,
    opponentLabel,
    season,
    matchSetup,
    network: scoutNetwork,
    worldClubs,
  });

  return (
    <section
      className="scout-work-grid-wrap game-panel scouting-section"
      aria-label={t("scouting.workGrid.aria")}
      data-coach-target={COACH_TARGET.scoutingOpponentReport}
    >
      <h2 className="scouting-section-title">{t("scouting.workGrid.title")}</h2>
      {tiles.length === 0 ? (
        <ScreenEmptyState
          icon={MapPin}
          title={t("scouting.workGrid.empty")}
          hint={t("scouting.assignments.hint")}
          aria-label={t("scouting.workGrid.aria")}
        />
      ) : (
        <ul className="scout-work-grid">
          {tiles.map((tile) => (
            <ScoutWorkTileCard
              key={tile.id}
              tile={tile}
              onToggleAssignment={onToggleAssignment}
              onCancelScoutWork={onCancelScoutWork}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
