/** WIREFRAME: PRD 09 Screen 3a — Scout-Karte (F4.4 discovery) */
import { useMemo } from "react";
import { MapPin, Radar } from "lucide-react";
import type { BoardTarget } from "../../scouting/scout-board.ts";
import type { ScoutDiscoveryState } from "../../scouting/scout-discovery.ts";
import { DISCOVERY_COMPLETE } from "../../scouting/scout-discovery.ts";
import {
  buildScoutDiscoveryMapModel,
  type ScoutMapClubPin,
} from "../../scouting/scout-region-map.ts";
import type { Player } from "../../types/player.ts";
import type { CSSProperties } from "react";
import type { WorldClub, WorldDivisionId } from "../../world/world-generator.ts";
import { useT } from "../../i18n/react.ts";

export function ScoutRegionMap({
  clubs,
  targets,
  rivalPlayers,
  discovery,
  playerDivisionId,
  activeClubScout,
  activeRegionScout,
  onScoutClub,
  onScoutRegion,
}: {
  clubs: readonly WorldClub[];
  targets: readonly BoardTarget[];
  rivalPlayers: readonly Player[];
  discovery: ScoutDiscoveryState | undefined;
  playerDivisionId: WorldDivisionId;
  activeClubScout?: { club_id: string; progress: number } | null;
  activeRegionScout?: { zone_id: string; progress: number } | null;
  onScoutClub: (careerClubId: string) => void;
  onScoutRegion: (zoneId: string) => void;
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
        activeClubScout,
        activeRegionScout,
      }),
    [activeClubScout, activeRegionScout, clubs, discovery, playerDivisionId, rivalPlayers, targets],
  );

  return (
    <section className="scout-region-map" aria-label={t("scouting.map.title")}>
      <header className="scout-region-map-head">
        <h2>{t("scouting.map.title")}</h2>
        <p className="scout-region-map-hint">{t("scouting.map.poolVsKnowledge")}</p>
      </header>
      <div className="scout-region-map-body scout-discovery-grid">
        {model.zones.map((zone, index) => (
          <article
            key={zone.id}
            className={`scout-discovery-zone is-${zone.tone}`}
            style={{ gridColumn: (index % 2) + 1, gridRow: Math.floor(index / 2) + 1 }}
          >
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
            </header>
            {zone.regionDirectoryOpen ? (
              <ul className="scout-discovery-clubs">
                {zone.clubs.map((club) => (
                  <ClubPinRow
                    key={club.careerClubId}
                    club={club}
                    onScout={() => onScoutClub(club.careerClubId)}
                    disabled={
                      club.discovered ||
                      !club.directoryVisible ||
                      activeClubScout != null
                    }
                  />
                ))}
              </ul>
            ) : (
              <p className="scout-discovery-locked">{t("scouting.map.regionLocked")}</p>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

function ClubPinRow({
  club,
  onScout,
  disabled,
}: {
  club: ScoutMapClubPin;
  onScout: () => void;
  disabled: boolean;
}) {
  const t = useT();
  const label = club.directoryVisible ? club.shortName : "???";
  const progress = club.scoutProgress;
  return (
    <li className={`scout-discovery-club${club.discovered ? " is-done" : ""}`}>
      <span className="scout-discovery-club-name">
        <MapPin size={14} aria-hidden />
        {label}
        {club.discovered ? (
          <span className="scout-discovery-club-pool">
            {club.poolExpected > 0 && club.poolCount >= club.poolExpected
              ? t("scouting.map.clubPoolComplete")
              : t("scouting.map.clubPoolCoverage", {
                  found: club.poolCount,
                  expected: club.poolExpected,
                })}
          </span>
        ) : null}
      </span>
      {!club.discovered && club.directoryVisible ? (
        <button type="button" className="scout-discovery-club-btn" onClick={onScout} disabled={disabled}>
          {progress != null
            ? t("scouting.map.clubProgress", { pct: progress })
            : t("scouting.map.scoutClub")}
        </button>
      ) : null}
      {progress != null && !club.discovered ? (
        <span
          className="scout-discovery-ring"
          style={{ "--scout-progress": `${(progress / DISCOVERY_COMPLETE) * 100}%` } as CSSProperties}
          aria-hidden
        />
      ) : null}
    </li>
  );
}
