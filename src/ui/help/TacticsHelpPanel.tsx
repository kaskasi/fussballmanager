/** WIREFRAME: PRD F12.7 — Tactics player guide (docs/help/tactics-player-guide.en.md) */
import {
  AlertTriangle,
  Eye,
  Flag,
  LayoutGrid,
  RefreshCw,
  Scale,
  SlidersHorizontal,
  Target,
  TrendingDown,
  Users,
} from "lucide-react";
import { useT } from "../../i18n/react.ts";
import { HelpFigure } from "../components/HelpFigure.tsx";
import { HelpInlineIcon } from "../components/HelpInlineIcon.tsx";
import { HELP_PLAY_FIGURES } from "./help-play-figures.ts";

const TACTICS_FIGURE = HELP_PLAY_FIGURES.find((f) => f.src.includes("tactics.png"))!;

export function TacticsHelpPanel() {
  const t = useT();
  return (
    <div className="help-panel">
      <section className="help-card help-figures" aria-label={t("help.tab.tactics")}>
        <HelpFigure
          src={TACTICS_FIGURE.src}
          captionKey={TACTICS_FIGURE.captionKey}
          altKey={TACTICS_FIGURE.altKey}
        />
      </section>

      <section className="help-card" aria-labelledby="help-tactics-how">
        <h2 id="help-tactics-how">
          <HelpInlineIcon icon={LayoutGrid} /> {t("help.tactics.how.title")}
        </h2>
        <p>{t("help.tactics.how.lede")}</p>
        <h3 className="help-subhead">{t("help.tactics.how.formation.title")}</h3>
        <p>{t("help.tactics.how.formation.body")}</p>
        <h3 className="help-subhead">{t("help.tactics.how.presets.title")}</h3>
        <p>{t("help.tactics.how.presets.body")}</p>
        <h3 className="help-subhead">{t("help.tactics.how.sliders.title")}</h3>
        <ul className="help-icon-list">
          <li>
            <HelpInlineIcon icon={SlidersHorizontal} />
            <span>{t("help.tactics.how.sliders.item1")}</span>
          </li>
          <li>
            <HelpInlineIcon icon={SlidersHorizontal} />
            <span>{t("help.tactics.how.sliders.item2")}</span>
          </li>
          <li>
            <HelpInlineIcon icon={SlidersHorizontal} />
            <span>{t("help.tactics.how.sliders.item3")}</span>
          </li>
        </ul>
        <p className="help-note">{t("help.tactics.how.sliders.readout")}</p>
        <p>{t("help.tactics.how.hidden.body")}</p>
      </section>

      <section className="help-card" aria-labelledby="help-tactics-opponents">
        <h2 id="help-tactics-opponents">
          <HelpInlineIcon icon={Users} /> {t("help.tactics.opponents.title")}
        </h2>
        <p>{t("help.tactics.opponents.body")}</p>
      </section>

      <section className="help-card" aria-labelledby="help-tactics-scout">
        <h2 id="help-tactics-scout">
          <HelpInlineIcon icon={Eye} /> {t("help.tactics.scout.title")}
        </h2>
        <p>{t("help.tactics.scout.body")}</p>
        <p className="help-note">{t("help.tactics.scout.risk")}</p>
      </section>

      <section className="help-card" aria-labelledby="help-tactics-playwell">
        <h2 id="help-tactics-playwell">
          <HelpInlineIcon icon={Target} /> {t("help.tactics.playWell.title")}
        </h2>
        <p>{t("help.tactics.playWell.lede")}</p>
        <ul className="help-icon-list">
          <li>
            <HelpInlineIcon icon={Flag} />
            <span>{t("help.tactics.playWell.default")}</span>
          </li>
          <li>
            <HelpInlineIcon icon={Eye} />
            <span>{t("help.tactics.playWell.scout")}</span>
          </li>
          <li>
            <HelpInlineIcon icon={RefreshCw} />
            <span>{t("help.tactics.playWell.study")}</span>
          </li>
          <li>
            <HelpInlineIcon icon={TrendingDown} />
            <span>{t("help.tactics.playWell.away")}</span>
          </li>
          <li>
            <HelpInlineIcon icon={AlertTriangle} />
            <span>{t("help.tactics.playWell.chase")}</span>
          </li>
        </ul>
        <p>{t("help.tactics.playWell.lineup")}</p>
        <p className="help-note">{t("help.tactics.playWell.expect")}</p>
      </section>

      <section className="help-card" aria-labelledby="help-tactics-even">
        <h2 id="help-tactics-even">
          <HelpInlineIcon icon={Scale} /> {t("help.tactics.even.title")}
        </h2>
        <p>{t("help.tactics.even.measured")}</p>
        <p>{t("help.tactics.even.notMeasured")}</p>
        <ul className="help-icon-list">
          <li>
            <HelpInlineIcon icon={Scale} />
            <span>{t("help.tactics.even.evenQuality")}</span>
          </li>
          <li>
            <HelpInlineIcon icon={Target} />
            <span>{t("help.tactics.even.chess")}</span>
          </li>
        </ul>
        <p>{t("help.tactics.even.bigGap")}</p>
        <p>{t("help.tactics.even.hypothesis")}</p>
      </section>

      <section className="help-card" aria-labelledby="help-tactics-recap">
        <h2 id="help-tactics-recap">
          <HelpInlineIcon icon={Flag} /> {t("help.tactics.recap.title")}
        </h2>
        <ol className="help-steps">
          <li>{t("help.tactics.recap.item1")}</li>
          <li>{t("help.tactics.recap.item2")}</li>
          <li>{t("help.tactics.recap.item3")}</li>
          <li>{t("help.tactics.recap.item4")}</li>
        </ol>
      </section>
    </div>
  );
}
