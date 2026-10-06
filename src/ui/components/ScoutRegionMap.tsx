/** WIREFRAME: PRD 09 Screen 3a — Scout-Karte (F4.4 discovery) */
import { useMemo } from "react";
import { Radar } from "lucide-react";
import type { BoardTarget } from "../../scouting/scout-board.ts";
import type { ScoutDiscoveryState } from "../../scouting/scout-discovery.ts";
import { layoutForZone } from "../../scouting/scout-map-layout.ts";
import { buildScoutDiscoveryMapModel } from "../../scouting/scout-region-map.ts";
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
  activeRegionScout,
  onScoutRegion,
  onOpenRegionDetail,
}: {
  clubs: readonly WorldClub[];
  targets: readonly BoardTarget[];
  rivalPlayers: readonly Player[];
  discovery: ScoutDiscoveryState | undefined;
  playerDivisionId: WorldDivisionId;
  activeClubScout?: { club_id: string; progress: number } | null;
  activeRegionScout?: { zone_id: string; progress: number } | null;
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
        activeClubScout: null,
        activeRegionScout,
      }),
    [activeRegionScout, clubs, discovery, playerDivisionId, rivalPlayers, targets],
  );

  return (
    <section className="scout-region-map" aria-label={t("scouting.map.title")}>
      <header className="scout-region-map-head">
        <h2>{t("scouting.map.title")}</h2>
        <p className="scout-region-map-hint">{t("scouting.map.poolVsKnowledge")}</p>
      </header>
      <div className="scout-region-map-body scout-discovery-grid">
        {model.zones.map((zone, index) => {
          const flavor = zone.regionTier > 0 ? layoutForZone(zone.id)?.flavorAsset : undefined;
          const canOpenDetail = Boolean(
            layoutForZone(zone.id) && onOpenRegionDetail && zone.regionDirectoryOpen,
          );
          const discoveredClubs = zone.clubs.filter((club) => club.discovered);
          return (
            <article
              key={zone.id}
              className={`scout-discovery-zone scout-discovery-zone-card is-${zone.tone}${flavor ? " has-flavor" : ""}`}
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
              {canOpenDetail ? (
                <button
                  type="button"
                  className="scout-discovery-zone-flavor-hit"
                  onClick={() => onOpenRegionDetail!(zone.id)}
                  aria-label={t("scouting.map.openRegionDetail", { label: zone.label })}
                />
              ) : null}
              {flavor ? <div className="scout-discovery-zone-card-shade" aria-hidden /> : null}
              <header className="scout-discovery-zone-head">
                <h3>{zone.label}</h3>
                {zone.regionTier < zone.regionTierMax ? (
                  <button
                    type="button"
                    className="scout-discovery-region-btn"
                    onClick={(event) => {
                      event.stopPropagation();
                      onScoutRegion(zone.id);
                    }}
                    disabled={activeRegionScout != null}
                  >
                    <Radar size={14} aria-hidden />
                    {activeRegionScout?.zone_id === zone.id
                      ? t("scouting.map.regionProgress", {
                          pct: activeRegionScout.progress,
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
                {zone.regionDirectoryOpen && zone.regionTier < zone.regionTierMax && zone.poolExpected > 0 ? (
                  <span className="scout-discovery-zone-meta scout-discovery-zone-pool">
                    {t("scouting.map.poolCoverage", {
                      found: zone.poolPlayers,
                      expected: zone.poolExpected,
                      pct: zone.poolCoveragePct,
                    })}
                  </span>
                ) : null}
              </header>
              {discoveredClubs.length > 0 ? (
                <ul className="scout-discovery-zone-crests" aria-label={t("scouting.map.discoveredClubsAria")}>
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
            </article>
          );
        })}
      </div>
    </section>
  );
}
