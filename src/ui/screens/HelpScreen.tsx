import { useState } from "react";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Award,
  Ban,
  BookOpen,
  Bot,
  Briefcase,
  Calendar,
  ClipboardList,
  Construction,
  Diamond,
  Dog,
  Dumbbell,
  Euro,
  Eye,
  Flag,
  Flame,
  Gamepad2,
  Globe,
  Handshake,
  Hourglass,
  Landmark,
  Link2,
  Play,
  Heart,
  Repeat,
  Scale,
  School,
  ScrollText,
  Settings,
  Smartphone,
  Smile,
  Sparkles,
  Sprout,
  Star,
  Sun,
  Target,
  Thermometer,
  Ticket,
  TrendingDown,
  TrendingUp,
  User,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useT } from "../../i18n/react.ts";
import { HelpAttributionPanel } from "../components/HelpAttributionPanel.tsx";
import { HelpFigure } from "../components/HelpFigure.tsx";
import { HelpInlineIcon } from "../components/HelpInlineIcon.tsx";
import { HELP_PLAY_FIGURES } from "../help/help-play-figures.ts";
import { TacticsHelpPanel } from "../help/TacticsHelpPanel.tsx";
import {
  formatStampEffects,
  formatStampGates,
  stampCatalog,
  stampPathLabel,
} from "../../development/ability-stamps.ts";

/**
 * WIREFRAME: PRD 10 F12.7 — Hilfe & Doku
 *
 * ┌────────────────────────────────────────────────────────────┐
 * │ 📖 Hilfe                                                   │
 * │ [Welt & Story] [So funktioniert's] [Taktik] [Fähigkeiten] [Danksagung] │
 * │                                                            │
 * │ Icon-first Abschnitte · Stempel-Katalog mit Gates/Effekten │
 * └────────────────────────────────────────────────────────────┘
 */

type HelpTab = "story" | "play" | "tactics" | "stamps" | "attribution";

const TAB_ICONS: Record<HelpTab, LucideIcon> = {
  story: Globe,
  play: Play,
  tactics: Target,
  stamps: Sparkles,
  attribution: Heart,
};

const TABS: { id: HelpTab; labelKey: string }[] = [
  { id: "story", labelKey: "help.tab.story" },
  { id: "play", labelKey: "help.tab.play" },
  { id: "tactics", labelKey: "help.tab.tactics" },
  { id: "stamps", labelKey: "help.tab.stamps" },
  { id: "attribution", labelKey: "help.tab.attribution" },
];

export function HelpScreen() {
  const [tab, setTab] = useState<HelpTab>("story");
  const t = useT();

  return (
    <main className="help club-shell-card-body">
      <header className="help-head">
        <p className="eyebrow">{t("help.eyebrow")}</p>
        <h1>{t("help.title")}</h1>
        <p className="help-lede">{t("help.lede")}</p>
      </header>

      <div className="fm-tab-bar" role="tablist" aria-label={t("help.navLabel")}>
        {TABS.map((entry) => (
          <button
            key={entry.id}
            type="button"
            role="tab"
            aria-selected={tab === entry.id}
            className={tab === entry.id ? "fm-tab is-active" : "fm-tab"}
            onClick={() => setTab(entry.id)}
          >
            {(() => {
              const Icon = TAB_ICONS[entry.id];
              return <Icon size={18} aria-hidden="true" strokeWidth={2.5} />;
            })()}{" "}
            {t(entry.labelKey)}
          </button>
        ))}
      </div>

      {tab === "story" ? <StoryPanel /> : null}
      {tab === "play" ? <PlayPanel /> : null}
      {tab === "tactics" ? <TacticsHelpPanel /> : null}
      {tab === "stamps" ? <StampsPanel /> : null}
      {tab === "attribution" ? <HelpAttributionPanel /> : null}
    </main>
  );
}

function StoryPanel() {
  const t = useT();
  return (
    <div className="help-panel">
      <section className="help-card" aria-labelledby="help-mission">
        <h2 id="help-mission">
          <HelpInlineIcon icon={Heart} /> {t("help.story.mission.title")}
        </h2>
        <p>{t("help.story.mission.body")}</p>
        <p className="help-note">
          <a
            href="https://kaskasi.itch.io/the-club/devlog/"
            target="_blank"
            rel="noopener noreferrer"
          >
            {t("help.story.mission.devlogLink")}
          </a>
        </p>
      </section>

      <section className="help-card" aria-labelledby="help-promise">
        <h2 id="help-promise">
          <HelpInlineIcon icon={Landmark} /> {t("help.story.promise.title")}
        </h2>
        <p className="help-quote">{t("help.story.promise.quote")}</p>
        <p>{t("help.story.promise.body")}</p>
      </section>

      <section className="help-card" aria-labelledby="help-underdog">
        <h2 id="help-underdog">
          <HelpInlineIcon icon={Dog} /> {t("help.story.underdog.title")}
        </h2>
        <p>{t("help.story.underdog.body")}</p>
        <ul className="help-icon-list">
          <li>
            <HelpInlineIcon icon={TrendingDown} />
            <span>{t("help.story.underdog.item1")}</span>
          </li>
          <li>
            <HelpInlineIcon icon={Euro} />
            <span>{t("help.story.underdog.item2")}</span>
          </li>
          <li>
            <HelpInlineIcon icon={Construction} />
            <span>{t("help.story.underdog.item3")}</span>
          </li>
          <li>
            <HelpInlineIcon icon={Ticket} />
            <span>{t("help.story.underdog.item4")}</span>
          </li>
          <li>
            <HelpInlineIcon icon={Sprout} />
            <span>{t("help.story.underdog.item5")}</span>
          </li>
          <li>
            <HelpInlineIcon icon={AlertTriangle} />
            <span>{t("help.story.underdog.item6")}</span>
          </li>
        </ul>
      </section>

      <section className="help-card" aria-labelledby="help-origin">
        <h2 id="help-origin">
          <HelpInlineIcon icon={ScrollText} /> {t("help.story.origin.title")}
        </h2>
        <p>{t("help.story.origin.body")}</p>
        <ul className="help-ensemble">
          <li>{t("help.story.origin.pathLottery")}</li>
          <li>{t("help.story.origin.pathLetter")}</li>
          <li>{t("help.story.origin.pathCommunity")}</li>
        </ul>
        <p className="help-note">{t("help.story.origin.note")}</p>
      </section>

      <section className="help-card" aria-labelledby="help-arc">
        <h2 id="help-arc">
          <HelpInlineIcon icon={Flame} /> {t("help.story.arc.title")}
        </h2>
        <p>{t("help.story.arc.body")}</p>
        <ol className="help-steps">
          <li>{t("help.story.arc.step1")}</li>
          <li>{t("help.story.arc.step2")}</li>
          <li>{t("help.story.arc.step3")}</li>
          <li>{t("help.story.arc.step4")}</li>
          <li>{t("help.story.arc.step5")}</li>
        </ol>
        <p className="help-note">{t("help.story.arc.note")}</p>
      </section>

      <section className="help-card" aria-labelledby="help-tone">
        <h2 id="help-tone">
          <HelpInlineIcon icon={Sun} /> {t("help.story.tone.title")}
        </h2>
        <ul className="help-icon-list">
          <li>
            <HelpInlineIcon icon={Scale} />
            <span>{t("help.story.tone.item1")}</span>
          </li>
          <li>
            <HelpInlineIcon icon={TrendingDown} />
            <span>{t("help.story.tone.item2")}</span>
          </li>
          <li>
            <HelpInlineIcon icon={Smile} />
            <span>{t("help.story.tone.item3")}</span>
          </li>
          <li>
            <HelpInlineIcon icon={Sprout} />
            <span>{t("help.story.tone.item4")}</span>
          </li>
        </ul>
      </section>

      <section className="help-card" aria-labelledby="help-ensemble">
        <h2 id="help-ensemble">
          <HelpInlineIcon icon={Users} /> {t("help.story.ensemble.title")}
        </h2>
        <p>{t("help.story.ensemble.body")}</p>
        <ul className="help-ensemble">
          <li>{t("help.story.ensemble.assistant")}</li>
          <li>{t("help.story.ensemble.board")}</li>
          <li>{t("help.story.ensemble.captain")}</li>
          <li>{t("help.story.ensemble.youthCoach")}</li>
          <li>{t("help.story.ensemble.scout")}</li>
          <li>{t("help.story.ensemble.fans")}</li>
          <li>{t("help.story.ensemble.press")}</li>
          <li>{t("help.story.ensemble.rivals")}</li>
        </ul>
      </section>

      <section className="help-card" aria-labelledby="help-horizons">
        <h2 id="help-horizons">
          <HelpInlineIcon icon={Hourglass} /> {t("help.story.horizons.title")}
        </h2>
        <ul className="help-icon-list">
          <li>
            <HelpInlineIcon icon={Calendar} />
            <span>{t("help.story.horizons.week")}</span>
          </li>
          <li>
            <HelpInlineIcon icon={Flag} />
            <span>{t("help.story.horizons.season")}</span>
          </li>
          <li>
            <HelpInlineIcon icon={BookOpen} />
            <span>{t("help.story.horizons.career")}</span>
          </li>
        </ul>
      </section>

      <section className="help-card" aria-labelledby="help-sim-story">
        <h2 id="help-sim-story">
          <HelpInlineIcon icon={Link2} /> {t("help.story.sim.title")}
        </h2>
        <ol className="help-steps">
          <li>{t("help.story.sim.step1")}</li>
          <li>{t("help.story.sim.step2")}</li>
          <li>{t("help.story.sim.step3")}</li>
          <li>{t("help.story.sim.step4")}</li>
        </ol>
        <p className="help-note">{t("help.story.sim.note")}</p>
      </section>

      <p className="help-note">{t("help.story.attributionLink")}</p>
    </div>
  );
}

function PlayPanel() {
  const t = useT();
  return (
    <div className="help-panel">
      <section className="help-card help-figures" aria-label={t("help.tab.play")}>
        <div className="help-figure-grid">
          {HELP_PLAY_FIGURES.map((figure) => (
            <HelpFigure
              key={figure.src}
              src={figure.src}
              captionKey={figure.captionKey}
              altKey={figure.altKey}
            />
          ))}
        </div>
      </section>

      <section className="help-card" aria-labelledby="help-loop">
        <h2 id="help-loop">
          <HelpInlineIcon icon={Repeat} /> {t("help.play.loop.title")}
        </h2>
        <p className="help-quote">{t("help.play.loop.quote")}</p>
      </section>

      <section className="help-card" aria-labelledby="help-week">
        <h2 id="help-week">
          <HelpInlineIcon icon={Calendar} /> {t("help.play.week.title")}
        </h2>
        <ol className="help-steps">
          <li>{t("help.play.week.step1")}</li>
          <li>{t("help.play.week.step2")}</li>
          <li>{t("help.play.week.step3")}</li>
          <li>{t("help.play.week.step4")}</li>
        </ol>
      </section>

      <section className="help-card" aria-labelledby="help-grow">
        <h2 id="help-grow">
          <HelpInlineIcon icon={TrendingUp} /> {t("help.play.grow.title")}
        </h2>
        <ul className="help-icon-list">
          <li>
            <HelpInlineIcon icon={Ban} />
            <span>{t("help.play.grow.item1")}</span>
          </li>
          <li>
            <HelpInlineIcon icon={Target} />
            <span>{t("help.play.grow.item2")}</span>
          </li>
          <li>
            <HelpInlineIcon icon={Thermometer} />
            <span>{t("help.play.grow.item3")}</span>
          </li>
          <li>
            <HelpInlineIcon icon={User} />
            <span>{t("help.play.grow.item4")}</span>
          </li>
        </ul>
      </section>

      <section className="help-card" aria-labelledby="help-youth">
        <h2 id="help-youth">
          <HelpInlineIcon icon={School} /> {t("help.play.youth.title")}
        </h2>
        <ul className="help-icon-list">
          <li>
            <HelpInlineIcon icon={Bot} />
            <span>{t("help.play.youth.item1")}</span>
          </li>
          <li>
            <HelpInlineIcon icon={Eye} />
            <span>{t("help.play.youth.item2")}</span>
          </li>
          <li>
            <HelpInlineIcon icon={ArrowUp} />
            <span>{t("help.play.youth.item3")}</span>
          </li>
          <li>
            <HelpInlineIcon icon={School} />
            <span>{t("help.play.youth.item4")}</span>
          </li>
        </ul>
      </section>

      <section className="help-card" aria-labelledby="help-club">
        <h2 id="help-club">
          <HelpInlineIcon icon={Briefcase} /> {t("help.play.club.title")}
        </h2>
        <ul className="help-icon-list">
          <li>
            <HelpInlineIcon icon={Euro} />
            <span>{t("help.play.club.item1")}</span>
          </li>
          <li>
            <HelpInlineIcon icon={Ticket} />
            <span>{t("help.play.club.item4")}</span>
          </li>
          <li>
            <HelpInlineIcon icon={ClipboardList} />
            <span>{t("help.play.club.item2")}</span>
          </li>
          <li>
            <HelpInlineIcon icon={ArrowDown} />
            <span>{t("help.play.club.item3")}</span>
          </li>
        </ul>
      </section>

      <section className="help-card" aria-labelledby="help-settings">
        <h2 id="help-settings">
          <HelpInlineIcon icon={Settings} /> {t("help.play.settings.title")}
        </h2>
        <ul className="help-icon-list">
          <li>
            <HelpInlineIcon icon={ClipboardList} />
            <span>{t("help.play.settings.item1")}</span>
          </li>
          <li>
            <HelpInlineIcon icon={Landmark} />
            <span>{t("help.play.settings.item2")}</span>
          </li>
          <li>
            <HelpInlineIcon icon={Eye} />
            <span>{t("help.play.settings.item3")}</span>
          </li>
        </ul>
      </section>

      <section className="help-card" aria-labelledby="help-mobile">
        <h2 id="help-mobile">
          <HelpInlineIcon icon={Smartphone} /> {t("help.play.mobile.title")}
        </h2>
        <ul className="help-icon-list">
          <li>
            <HelpInlineIcon icon={AlertTriangle} />
            <span>{t("help.play.mobile.item1")}</span>
          </li>
          <li>
            <HelpInlineIcon icon={Dumbbell} />
            <span>{t("help.play.mobile.item2")}</span>
          </li>
          <li>
            <HelpInlineIcon icon={Repeat} />
            <span>{t("help.play.mobile.item3")}</span>
          </li>
          <li>
            <HelpInlineIcon icon={Globe} />
            <span>{t("help.play.mobile.item4")}</span>
          </li>
          <li>
            <HelpInlineIcon icon={Construction} />
            <span>{t("help.play.mobile.item5")}</span>
          </li>
          <li>
            <HelpInlineIcon icon={Handshake} />
            <span>{t("help.play.mobile.item6")}</span>
          </li>
        </ul>
      </section>

      <section className="help-card" aria-labelledby="help-not">
        <h2 id="help-not">
          <HelpInlineIcon icon={Ban} /> {t("help.play.not.title")}
        </h2>
        <ul className="help-icon-list">
          <li>
            <HelpInlineIcon icon={Gamepad2} />
            <span>{t("help.play.not.item1")}</span>
          </li>
          <li>
            <HelpInlineIcon icon={ClipboardList} />
            <span>{t("help.play.not.item2")}</span>
          </li>
          <li>
            <HelpInlineIcon icon={Star} />
            <span>{t("help.play.not.item3")}</span>
          </li>
        </ul>
      </section>
    </div>
  );
}

function StampsPanel() {
  const t = useT();
  const stamps = stampCatalog();
  const trained = stamps.filter((entry) => entry.path === "train");
  const hybrid = stamps.filter((entry) => entry.path === "hybrid");
  const events = stamps.filter((entry) => entry.path === "event" && !entry.spawn);

  return (
    <div className="help-panel">
      <section className="help-card" aria-labelledby="help-stamp-intro">
        <h2 id="help-stamp-intro">
          <HelpInlineIcon icon={Diamond} /> {t("help.stamps.intro.title")}
        </h2>
        <p>{t("help.stamps.intro.body")}</p>
        <ul className="help-icon-list">
          <li>
            <HelpInlineIcon icon={Dumbbell} />
            <span>{t("help.stamps.intro.train")}</span>
          </li>
          <li>
            <HelpInlineIcon icon={Flag} />
            <span>{t("help.stamps.intro.event")}</span>
          </li>
          <li>
            <HelpInlineIcon icon={Link2} />
            <span>{t("help.stamps.intro.hybrid")}</span>
          </li>
          <li>
            <HelpInlineIcon icon={Sprout} />
            <span>{t("help.stamps.intro.spawn")}</span>
          </li>
        </ul>
      </section>

      <StampGroup titleKey="help.stamps.group.spawn" icon={Sprout} stamps={stamps.filter((entry) => entry.spawn)} />
      <StampGroup titleKey="help.stamps.group.train" icon={Dumbbell} stamps={trained} />
      <StampGroup titleKey="help.stamps.group.hybrid" icon={Link2} stamps={hybrid} />
      <StampGroup titleKey="help.stamps.group.event" icon={Flag} stamps={events} />
    </div>
  );
}

function StampGroup({
  titleKey,
  icon,
  stamps,
}: {
  titleKey: string;
  icon: LucideIcon;
  stamps: ReturnType<typeof stampCatalog>;
}) {
  const t = useT();
  if (stamps.length === 0) return null;
  const title = t(titleKey);
  return (
    <section className="help-card" aria-label={title}>
      <h2>
        <HelpInlineIcon icon={icon} /> {title}
      </h2>
      <ul className="help-stamp-list">
        {stamps.map((stamp) => (
          <li key={stamp.id} className="help-stamp">
            <div className="help-stamp-head">
              <span className="help-stamp-icon" aria-hidden="true">
                <Award size={18} strokeWidth={2.5} />
              </span>
              <div>
                <strong>{stamp.label}</strong>
                <p className="help-stamp-meta">
                  {stampPathLabel(stamp.path, stamp)}
                  {stamp.weeks ? ` · ${t("help.stamps.weeks", { count: stamp.weeks })}` : ""}
                </p>
              </div>
            </div>
            <div className="help-stamp-cols">
              <div>
                <p className="help-stamp-label">{t("help.stamps.prereq")}</p>
                <ul>
                  {formatStampGates(stamp).map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="help-stamp-label">{t("help.stamps.effect")}</p>
                <ul>
                  {formatStampEffects(stamp).map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
