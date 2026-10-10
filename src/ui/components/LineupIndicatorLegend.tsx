/** WIREFRAME: PRD 09 — matchday lineup icon legend (Form / Fitness / weak foot) */
import { useState } from "react";
import { useT } from "../../i18n/react.ts";
import { LineupFatigueBars } from "../../match/LineupFatigueBars.tsx";
import { LineupFormValue } from "../../match/LineupFormValue.tsx";

export function LineupIndicatorLegend() {
  const t = useT();
  const [open, setOpen] = useState(false);

  return (
    <div className="lineup-bench-legend-block">
      <div className="lineup-bench-legend-row">
        <p className="lineup-bench-hint">{t("match.lineup.benchHint")}</p>
        <button
          type="button"
          className="pipeline-legend-toggle"
          aria-label={t("match.lineup.legend.toggle")}
          aria-pressed={open}
          title={t("match.lineup.legend.toggle")}
          onClick={() => setOpen((current) => !current)}
        >
          ?
        </button>
      </div>
      {open ? (
        <div className="pipeline-heat-legend" role="note" aria-label={t("match.lineup.legend.title")}>
          <p className="pipeline-heat-legend-lead">{t("match.lineup.legend.title")}</p>
          <ul className="pipeline-heat-legend-list lineup-legend-examples">
            <li>
              <LineupFormValue careerForm={4} compact />
              <span>{t("match.lineup.legend.formHigh")}</span>
            </li>
            <li>
              <LineupFormValue careerForm={0} compact />
              <span>{t("match.lineup.legend.formMid")}</span>
            </li>
            <li>
              <LineupFormValue careerForm={-4} compact />
              <span>{t("match.lineup.legend.formLow")}</span>
            </li>
            <li>
              <LineupFatigueBars fitness={95} compact />
              <span>{t("match.lineup.legend.fatigueFull")}</span>
            </li>
            <li>
              <LineupFatigueBars fitness={55} compact />
              <span>{t("match.lineup.legend.fatigueMid")}</span>
            </li>
            <li>
              <LineupFatigueBars fitness={8} compact />
              <span className="lineup-fitness-pill is-low">
                <span className="lineup-shape-mark" aria-hidden>
                  ◆
                </span>
                <span className="lineup-fitness-num">8</span>
              </span>
              <span>{t("match.lineup.legend.fatigueEmpty")}</span>
            </li>
            <li>
              <span className="lineup-icon lineup-icon-wa" aria-hidden>
                WA
              </span>
              {t("match.lineup.legend.weakFoot")}
            </li>
          </ul>
        </div>
      ) : null}
    </div>
  );
}
