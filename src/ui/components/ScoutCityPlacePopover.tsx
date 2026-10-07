/** WIREFRAME: design.md §9 — Scout-Detailkarte, Stadt-Hover */
import type { ScoutCityPlaceGroup } from "../../scouting/scout-map-layout.ts";
import { useT } from "../../i18n/react.ts";
import { ClubCrest } from "./ClubCrest.tsx";
import { clubLogoUrlForId } from "../assets/club-logo.ts";

export function ScoutCityPlacePopover({
  group,
  style,
}: {
  group: ScoutCityPlaceGroup;
  style: { left: number; top: number };
}) {
  const t = useT();
  return (
    <div
      className="scout-city-place-popover"
      role="tooltip"
      style={{ left: style.left, top: style.top }}
    >
      <p className="scout-city-place-popover-title">
        {t("scouting.map.cityPopover.title", { place: group.place })}
      </p>
      <ul className="scout-city-place-popover-list">
        {group.clubs.map((club) => (
          <li key={club.careerClubId} className="scout-city-place-popover-row">
            <ClubCrest
              size={24}
              initials={club.shortName}
              logoSrc={clubLogoUrlForId(club.careerClubId)}
              alt=""
            />
            <div className="scout-city-place-popover-copy">
              <span className="scout-city-place-popover-name">{club.name}</span>
              <span className="scout-city-place-popover-meta">
                {club.discovered
                  ? club.poolExpected > 0
                    ? t("scouting.map.clubPoolCoverage", {
                        found: club.poolCount,
                        expected: club.poolExpected,
                      })
                    : t("scouting.map.clubPoolComplete")
                  : t("scouting.map.cityPopover.notVisited")}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
