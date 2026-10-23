/** design.md §9.15 — Drittel/Seite: two thin segmented bars, the zone where play lives lights up. */
import type { MatchViewFrame } from "@fussballmanager/shared";
import { useT } from "../i18n/react.ts";
import {
  ballZone,
  pitchLateralLabel,
  pitchThirdLabel,
  type PitchLateral,
  type PitchThird,
} from "./pitch-zone.ts";

const THIRDS: PitchThird[] = ["defensive", "middle", "attacking"];
const LATERALS: PitchLateral[] = ["left", "center", "right"];

function ZoneBar<Zone extends string>({
  title,
  zones,
  active,
  labelOf,
}: {
  title: string;
  zones: Zone[];
  active: Zone;
  labelOf: (zone: Zone) => string;
}) {
  return (
    <div className="tc-zones__row">
      <span className="tc-label tc-zones__title">{title}</span>
      <ol className="tc-zones__bar">
        {zones.map((zone) => (
          <li
            key={zone}
            className={zone === active ? "tc-zones__seg is-active" : "tc-zones__seg"}
            aria-current={zone === active ? "true" : undefined}
          >
            {labelOf(zone)}
          </li>
        ))}
      </ol>
    </div>
  );
}

export function MatchZoneStrip({
  frame,
  homeTeamId,
  ownTeamId,
}: {
  frame: MatchViewFrame;
  homeTeamId: string;
  /** The lit segment wears the side in possession: own club accent, opponent info blue. */
  ownTeamId: string;
}) {
  const t = useT();
  const { third, lateral } = ballZone(frame.ball, frame.possessionTeamId, homeTeamId);
  const side = frame.possessionTeamId === null ? "" : frame.possessionTeamId === ownTeamId ? " is-own" : " is-other";

  return (
    <section
      className={`tc-zones${side}`}
      aria-label={t("match.zones.aria", { third: pitchThirdLabel(third), lateral: pitchLateralLabel(lateral) })}
    >
      <ZoneBar title={t("match.hud.thirdsTitle")} zones={THIRDS} active={third} labelOf={pitchThirdLabel} />
      <ZoneBar title={t("match.hud.sideTitle")} zones={LATERALS} active={lateral} labelOf={pitchLateralLabel} />
    </section>
  );
}
