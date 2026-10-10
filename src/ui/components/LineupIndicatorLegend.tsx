/** WIREFRAME: PRD 09 — matchday lineup icon legend (Form / Fitness / weak foot) */
import { CircleHelp } from "lucide-react";
import { useId, useState } from "react";
import { useT } from "../../i18n/react.ts";

export function LineupIndicatorLegend() {
  const t = useT();
  const [open, setOpen] = useState(false);
  const panelId = useId();

  return (
    <div className="lineup-indicator-legend">
      <button
        type="button"
        className="lineup-indicator-legend-toggle"
        aria-expanded={open}
        aria-controls={panelId}
        title={t("match.lineup.legend.toggle")}
        onClick={() => setOpen((current) => !current)}
      >
        <CircleHelp size={16} strokeWidth={2.25} aria-hidden />
        <span>{t("match.lineup.legend.toggle")}</span>
      </button>
      {open ? (
        <div id={panelId} className="lineup-indicator-legend-panel" role="region" aria-label={t("match.lineup.legend.title")}>
          <p className="lineup-indicator-legend-title">{t("match.lineup.legend.title")}</p>
          <ul className="lineup-indicator-legend-list">
            <li>
              <span className="lineup-icon is-good" aria-hidden>
                ●
              </span>
              {t("match.lineup.legend.formGood")}
            </li>
            <li>
              <span className="lineup-icon is-mid" aria-hidden>
                ▲
              </span>
              {t("match.lineup.legend.formMid")}
            </li>
            <li>
              <span className="lineup-icon is-low" aria-hidden>
                ◆
              </span>
              {t("match.lineup.legend.formLow")}
            </li>
            <li>
              <span className="lineup-icon is-good" aria-hidden>
                ●
              </span>
              {t("match.lineup.legend.fitnessGood")}
            </li>
            <li>
              <span className="lineup-icon is-mid" aria-hidden>
                ▲
              </span>
              {t("match.lineup.legend.fitnessMid")}
            </li>
            <li>
              <span className="lineup-icon is-low" aria-hidden>
                ◆
              </span>
              {t("match.lineup.legend.fitnessLow")}
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
