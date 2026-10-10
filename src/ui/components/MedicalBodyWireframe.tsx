import type { BodyRegion } from "../../medical/medical-symptoms.ts";
import { useT } from "../../i18n/react.ts";

const HOTSPOTS: { region: BodyRegion; cx: number; cy: number; r: number }[] = [
  { region: "foot_l", cx: 42, cy: 92, r: 8 },
  { region: "foot_r", cx: 58, cy: 92, r: 8 },
  { region: "ankle_l", cx: 42, cy: 82, r: 9 },
  { region: "ankle_r", cx: 58, cy: 82, r: 9 },
  { region: "knee_l", cx: 43, cy: 62, r: 10 },
  { region: "knee_r", cx: 57, cy: 62, r: 10 },
  { region: "thigh_l", cx: 44, cy: 48, r: 11 },
  { region: "thigh_r", cx: 56, cy: 48, r: 11 },
  { region: "groin", cx: 50, cy: 42, r: 10 },
  { region: "back", cx: 50, cy: 38, r: 12 },
];

/** WIREFRAME: design.md §9.16 — Physio body map (SVG, no emoji). */
export function MedicalBodyWireframe({
  highlightRegion,
  onTreatRegion,
}: {
  highlightRegion: BodyRegion;
  onTreatRegion: (region: BodyRegion) => void;
}) {
  const t = useT();
  return (
    <figure className="medical-body-wireframe">
      <svg viewBox="0 0 100 100" role="img" aria-label={t("medical.physio.bodyAria")}>
        <ellipse cx="50" cy="14" rx="10" ry="12" className="medical-body-silhouette" />
        <rect x="44" y="24" width="12" height="22" rx="4" className="medical-body-silhouette" />
        <line x1="44" y1="30" x2="32" y2="48" className="medical-body-limb" />
        <line x1="56" y1="30" x2="68" y2="48" className="medical-body-limb" />
        <line x1="47" y1="46" x2="43" y2="78" className="medical-body-limb" />
        <line x1="53" y1="46" x2="57" y2="78" className="medical-body-limb" />
        {HOTSPOTS.filter((spot) => spot.r > 0).map((spot) => {
          const active = spot.region === highlightRegion;
          return (
            <circle
              key={spot.region}
              cx={spot.cx}
              cy={spot.cy}
              r={spot.r}
              className={active ? "medical-body-hotspot is-active" : "medical-body-hotspot"}
              tabIndex={0}
              role="button"
              aria-label={t("medical.physio.treatRegion")}
              onClick={() => onTreatRegion(spot.region)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onTreatRegion(spot.region);
                }
              }}
            />
          );
        })}
      </svg>
      <figcaption className="medical-muted">{t("medical.physio.bodyHint")}</figcaption>
    </figure>
  );
}
