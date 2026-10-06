/** WIREFRAME: PRD F12.7 — Attribution / Danksagung tab */
import { ExternalLink, Heart } from "lucide-react";
import { useT } from "../../i18n/react.ts";
import { HelpInlineIcon } from "./HelpInlineIcon.tsx";
import {
  ATTRIBUTION_CC0_CREDITS,
  ATTRIBUTION_OTHER_CREDITS,
  type AttributionCredit,
} from "../help/attribution-catalog.ts";

function CreditRow({ credit }: { credit: AttributionCredit }) {
  const t = useT();
  return (
    <li className={`help-attribution-row${credit.highlight ? " is-highlight" : ""}`}>
      <div className="help-attribution-row-head">
        <a href={credit.href} target="_blank" rel="noopener noreferrer">
          {credit.name}
          <ExternalLink size={14} aria-hidden strokeWidth={2.5} />
        </a>
        <span className={`help-attribution-badge is-${credit.license.toLowerCase()}`}>
          {credit.license}
        </span>
      </div>
      <p className="help-attribution-role">{t(credit.roleKey)}</p>
    </li>
  );
}

export function HelpAttributionPanel() {
  const t = useT();
  return (
    <div className="help-panel">
      <section className="help-card help-attribution-thanks" aria-labelledby="help-thanks">
        <h2 id="help-thanks">
          <HelpInlineIcon icon={Heart} /> {t("help.attribution.thanks.title")}
        </h2>
        <p className="help-quote">{t("help.attribution.thanks.lede")}</p>
      </section>

      <section className="help-card" aria-labelledby="help-cc0">
        <h2 id="help-cc0">{t("help.attribution.cc0.title")}</h2>
        <p>{t("help.attribution.cc0.p1")}</p>
        <p>{t("help.attribution.cc0.p2")}</p>
        <p>{t("help.attribution.cc0.p3")}</p>
      </section>

      <section className="help-card" aria-labelledby="help-cc0-creators">
        <h2 id="help-cc0-creators">{t("help.attribution.cc0Creators.title")}</h2>
        <ul className="help-attribution-list">
          {ATTRIBUTION_CC0_CREDITS.map((credit) => (
            <CreditRow key={credit.id} credit={credit} />
          ))}
        </ul>
      </section>

      <section className="help-card" aria-labelledby="help-other-creators">
        <h2 id="help-other-creators">{t("help.attribution.other.title")}</h2>
        <p>{t("help.attribution.other.lede")}</p>
        <ul className="help-attribution-list">
          {ATTRIBUTION_OTHER_CREDITS.map((credit) => (
            <CreditRow key={credit.id} credit={credit} />
          ))}
        </ul>
      </section>

      <section className="help-card help-attribution-foot" aria-labelledby="help-maintainer">
        <h2 id="help-maintainer">{t("help.attribution.maintainer.title")}</h2>
        <p>{t("help.attribution.maintainer.body")}</p>
      </section>
    </div>
  );
}
