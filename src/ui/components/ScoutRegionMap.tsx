/** WIREFRAME: PRD 09 Screen 3a — Scout-Karte (F4.4 discovery) */
import { useMemo } from "react";
import { MapPin, Radar } from "lucide-react";
import type { BoardTarget } from "../../scouting/scout-board.ts";
import type { ActiveRegionScout, ScoutDiscoveryState } from "../../scouting/scout-discovery.ts";
import { layoutForZone } from "../../scouting/scout-map-layout.ts";
import { buildScoutDiscoveryMapModel } from "../../scouting/scout-region-map.ts";
import type { ActiveScoutTrip, ScoutTripPlan } from "../../scouting/scout-trip.ts";
import { clubLogoUrlForId } from "../assets/club-logo.ts";
import { ClubCrest } from "./ClubCrest.tsx";
import type { Player } from "../../types/player.ts";
import type { WorldClub, WorldDivisionId } from "../../world/world-generator.ts";
import { useT } from "../../i18n/react.ts";

export function ScoutRegionMap({
  clubs,
  targets,
  rivalPlayers,
  discovery,
  playerDivisionId,
  playerClub,
  activeRegionScout,
  activeScoutTrips,
  scoutTripQueue,
  onScoutRegion,
  onOpenRegionDetail,
}: {
  clubs: readonly WorldClub[];
  targets: readonly BoardTarget[];
  rivalPlayers: readonly Player[];
  discovery: ScoutDiscoveryState | undefined;
  playerDivisionId: WorldDivisionId;
  playerClub?: WorldClub | null;
  activeClubScout?: { club_id: string; progress: number } | null;
  activeRegionScout?: ActiveRegionScout | null;
  activeScoutTrips?: readonly ActiveScoutTrip[];
  scoutTripQueue?: readonly ScoutTripPlan[];
  onScoutRegion: (zoneId: string) => void;
  onOpenRegionDetail?: (zoneId: string) => void;
}) {
  const t = useT();
  const model = useMemo(
    () =>
      buildScoutDiscoveryMapModel({
        clubs,
        targets,
        rivalPlayers,
        discovery,
        playerDivisionId,
        playerClub,
        activeClubScout: null,
        activeRegionScout,
      }),
    [activeRegionScout, clubs, discovery, playerClub, playerDivisionId, rivalPlayers, targets],
  );

  return (
    <section className="scout-region-map" aria-label={t("scouting.map.title")}>
      <header className="scout-region-map-head">
        <h2>{t("scouting.map.title")}</h2>
        <p className="scout-region-map-hint">{t("scouting.map.poolVsKnowledge")}</p>
      </header>
      <div className="scout-region-map-body scout-discovery-grid">
        {model.zones.map((zone, index) => {
          const unlocked = zone.cardMode === "unlocked";
          const flavor = unlocked ? layoutForZone(zone.id)?.flavorAsset : undefined;
          const hasLayout = Boolean(layoutForZone(zone.id));
          const canOpenDetail = Boolean(
            unlocked && hasLayout && onOpenRegionDetail && zone.mapUnlocked,
          );
          const discoveredClubs = zone.clubs.filter((club) => club.discovered);
          const loreKey = `scouting.map.regionLore.${zone.id}` as const;
          const regionJobActive = activeRegionScout?.zone_id === zone.id;
          const workingDaysLeft = regionJobActive
            ? (activeRegionScout?.working_days_left ?? zone.regionWorkingDaysLeft)
            : null;
          const zoneActiveTrip = (activeScoutTrips ?? []).find((trip) => trip.zone_id === zone.id);
          const tripActiveHere = zoneActiveTrip != null;
          const tripQueuedHere =
            !tripActiveHere &&
            (scoutTripQueue?.some((plan) => plan.zone_id === zone.id) ?? false);

          return (
            <article
              key={zone.id}
              className={`scout-discovery-zone scout-discovery-zone-card is-${zone.tone}${unlocked && flavor ? " has-flavor" : ""}${!unlocked ? " is-locked" : ""}`}
              style={{
                gridColumn: (index % 2) + 1,
                gridRow: Math.floor(index / 2) + 1,
                ...(flavor
                  ? {
                      backgroundImage: `url(${flavor})`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }
                  : {}),
              }}
            >
              {flavor ? <div className="scout-discovery-zone-card-shade" aria-hidden /> : null}
              <div className="scout-discovery-zone-card-inner">
                <header className="scout-discovery-zone-head">
                  <h3>{zone.label}</h3>
                  {zone.regionTier < zone.regionTierMax ? (
                    <button
                      type="button"
                      className="scout-discovery-region-btn"
                      onClick={() => onScoutRegion(zone.id)}
                      disabled={activeRegionScout != null}
                    >
                      <Radar size={14} aria-hidden />
                      {regionJobActive && workingDaysLeft != null
                        ? t("scouting.map.regionWorkingDays", {
                            tier: zone.regionTier,
                            max: zone.regionTierMax,
                            left: workingDaysLeft,
                          })
                        : t("scouting.map.scoutRegionTier", {
                            tier: zone.regionTier,
                            max: zone.regionTierMax,
                          })}
                    </button>
                  ) : (
                    <span className="scout-discovery-zone-meta">
                      {zone.poolExpected > 0
                        ? t("scouting.map.poolCoverage", {
                            found: zone.poolPlayers,
                            expected: zone.poolExpected,
                            pct: zone.poolCoveragePct,
                          })
                        : t("scouting.map.regionComplete")}
                    </span>
                  )}
                  {unlocked &&
                  zone.regionDirectoryOpen &&
                  zone.regionTier < zone.regionTierMax &&
                  zone.poolExpected > 0 ? (
                    <span className="scout-discovery-zone-meta scout-discovery-zone-pool">
                      {t("scouting.map.poolCoverage", {
                        found: zone.poolPlayers,
                        expected: zone.poolExpected,
                        pct: zone.poolCoveragePct,
                      })}
                    </span>
                  ) : null}
                  {unlocked && tripActiveHere && zoneActiveTrip ? (
                    <span className="scout-discovery-zone-meta scout-discovery-zone-trip-status">
                      {t("scouting.map.tripInProgress", {
                        done: zoneActiveTrip.working_days_done,
                        total: zoneActiveTrip.duration.totalWorkingDays,
                      })}
                    </span>
                  ) : null}
                  {unlocked && tripQueuedHere ? (
                    <span className="scout-discovery-zone-meta scout-discovery-zone-trip-status">
                      {t("scouting.map.tripQueuedOnCard")}
                    </span>
                  ) : null}
                </header>

                {!unlocked ? (
                  <div className="scout-discovery-zone-lore">
                    <p>{t(loreKey)}</p>
                    <p className="scout-discovery-zone-locked-hint">{t("scouting.map.regionLockedHint")}</p>
                  </div>
                ) : null}

                {unlocked && !flavor && discoveredClubs.length > 0 ? (
                  <ul
                    className="scout-discovery-zone-crests"
                    aria-label={t("scouting.map.discoveredClubsAria")}
                  >
                    {discoveredClubs.map((club) => (
                      <li key={club.careerClubId}>
                        <ClubCrest
                          size={28}
                          initials={club.shortName}
                          logoSrc={clubLogoUrlForId(club.careerClubId)}
                          alt={club.name}
                        />
                      </li>
                    ))}
                  </ul>
                ) : null}

                {canOpenDetail ? (
                  <button
                    type="button"
                    className="scout-discovery-zone-open-map"
                    onClick={(event) => {
                      event.stopPropagation();
                      onOpenRegionDetail!(zone.id);
                    }}
                  >
                    <MapPin size={16} aria-hidden />
                    {t("scouting.map.openMap")}
                  </button>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
