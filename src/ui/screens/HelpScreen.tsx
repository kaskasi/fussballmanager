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
  Building,
  Calendar,
  Camera,
  ClipboardList,
  Construction,
  Diamond,
  Dog,
  Dumbbell,
  Euro,
  Eye,
  FileText,
  Flag,
  Flame,
  Gamepad2,
  Globe,
  Hourglass,
  Image,
  Landmark,
  Link2,
  Play,
  Repeat,
  Scale,
  School,
  ScrollText,
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
import { HelpInlineIcon } from "../components/HelpInlineIcon.tsx";
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
 * │ [Welt & Story] [So funktioniert's] [Fähigkeiten]           │
 * │                                                            │
 * │ Icon-first Abschnitte · Stempel-Katalog mit Gates/Effekten │
 * └────────────────────────────────────────────────────────────┘
 */

type HelpTab = "story" | "play" | "stamps";

const TAB_ICONS: Record<HelpTab, LucideIcon> = {
  story: Globe,
  play: Play,
  stamps: Sparkles,
};

const TABS: { id: HelpTab; labelKey: string }[] = [
  { id: "story", labelKey: "help.tab.story" },
  { id: "play", labelKey: "help.tab.play" },
  { id: "stamps", labelKey: "help.tab.stamps" },
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
      {tab === "stamps" ? <StampsPanel /> : null}
    </main>
  );
}

function StoryPanel() {
  const t = useT();
  return (
    <div className="help-panel">
      <section className="help-card" aria-labelledby="help-promise">
        <h2 id="help-promise">
          <HelpInlineIcon icon={Landmark} /> Das Versprechen
        </h2>
        <p className="help-quote">
          Baue mit begrenzten Mitteln einen Underdog-Verein auf, ohne die Menschen zu verlieren, die ihn
          tragen.
        </p>
        <p>
          Du führst nicht nur einen Kader. Du verantwortest einen lokalen Club: Mitarbeiter, Nachwuchs,
          Fans, Tradition und knappe Kasse. Erfolge fühlen sich verdient an, weil Abstieg, Fehlkäufe und
          verlorene Talente echte Folgen haben.
        </p>
      </section>

      <section className="help-card" aria-labelledby="help-underdog">
        <h2 id="help-underdog">
          <HelpInlineIcon icon={Dog} /> Dein Start: Underdog
        </h2>
        <p>
          Der Standardstart ist ein fiktionaler, lokal verwurzelter Verein — kein vorgefertigtes Imperium.
          „Underdog“ ist der Startkonflikt, kein dauerhafter Statuseffekt: Aufstieg und Größe entstehen nur
          aus dem, was du in der Simulation baust.
        </p>
        <ul className="help-icon-list">
          <li>
            <HelpInlineIcon icon={TrendingDown} />
            <span>Sportlich unterlegener Profikader</span>
          </li>
          <li>
            <HelpInlineIcon icon={Euro} />
            <span>Enge Transfer- und Gehaltsbudgets</span>
          </li>
          <li>
            <HelpInlineIcon icon={Construction} />
            <span>Einfache, ausbaufähige Infrastruktur</span>
          </li>
          <li>
            <HelpInlineIcon icon={Ticket} />
            <span>Kleine, loyale Fanbasis am Stadion und in der Stadt</span>
          </li>
          <li>
            <HelpInlineIcon icon={Sprout} />
            <span>Starke Akademie-Hoffnung — Talente sind oft dein einziger Hebel</span>
          </li>
          <li>
            <HelpInlineIcon icon={AlertTriangle} />
            <span>Reales Abstiegs- und Jobrisiko vom ersten Tag an</span>
          </li>
        </ul>
      </section>

      <section className="help-card" aria-labelledby="help-origin">
        <h2 id="help-origin">
          <HelpInlineIcon icon={ScrollText} /> Wie du hier landest
        </h2>
        <p>
          Am Karrierebeginn wählst du deinen Weg zum Verein. Die Herkunft färbt Ton und Erwartungen — sie
          überschreibt keine Spielergebnisse.
        </p>
        <ul className="help-ensemble">
          <li>
            <strong>Losgewinn</strong> — Fanverein zog deinen Namen; skeptischer Vorstand
          </li>
          <li>
            <strong>Der Brief</strong> — du hast geschrieben, was du fühlst
          </li>
          <li>
            <strong>Gemeinschaft</strong> — niemand wollte den Job; der Verein gehört euch
          </li>
        </ul>
        <p className="help-note">
          Dazu wählst du den Kapitän (Führung zählt) und triffst die ersten Stimmen aus Kabine, Tribüne und
          Presse.
        </p>
      </section>

      <section className="help-card" aria-labelledby="help-arc">
        <h2 id="help-arc">
          <HelpInlineIcon icon={Flame} /> Erster Bogen: Gemeinsam gegen den Abstieg
        </h2>
        <p>
          Die erste Saison-Geschichte ist kein festes Drehbuch. Sie erkennt echte Zustände — und erzählt
          daraus einen Bogen um Klassenerhalt.
        </p>
        <ol className="help-steps">
          <li>Der Vorstand setzt das Klassenerhaltsziel — Verfehlen erhöht Jobdruck.</li>
          <li>Assistent und Kapitän reagieren auf Form, Verletzungen und Spielzeit.</li>
          <li>Fans antworten auf Ergebnisse, Ticketpreise und sichtbaren Einsatz.</li>
          <li>Die Presse stellt kurze, icon-getriebene Fragen; Hype und Moral schwanken.</li>
          <li>Am Saisonende erinnert die Chronik an konkrete Entscheidungen und Resultate.</li>
        </ol>
        <p className="help-note">
          Zwei Saves mit anderem Saisonverlauf erzählen erkennbar andere Geschichten — ohne erfundene
          Tore oder Transfers.
        </p>
      </section>

      <section className="help-card" aria-labelledby="help-tone">
        <h2 id="help-tone">
          <HelpInlineIcon icon={Sun} /> Ton der Welt
        </h2>
        <ul className="help-icon-list">
          <li>
            <HelpInlineIcon icon={Scale} />
            <span>Nicht cozy: Fußball ist ungerecht und wirtschaftlich hart — aber hell und lokal warm.</span>
          </li>
          <li>
            <HelpInlineIcon icon={TrendingDown} />
            <span>Abstieg, Entlassung, Verletzungen und Abgänge werden nicht abgefedert.</span>
          </li>
          <li>
            <HelpInlineIcon icon={Smile} />
            <span>Humor aus Figuren und Ritualen — nie aus Lächerlichmachung kleiner Vereine.</span>
          </li>
          <li>
            <HelpInlineIcon icon={Sprout} />
            <span>Hoffnung aus Entscheidungen und Beziehungen — kein garantiertes Happy End.</span>
          </li>
        </ul>
      </section>

      <section className="help-card" aria-labelledby="help-ensemble">
        <h2 id="help-ensemble">
          <HelpInlineIcon icon={Users} /> Das Ensemble
        </h2>
        <p>
          Die Story tragen stabile Rollen. Namen und Gesichter können pro Save variieren. Figuren dürfen
          widersprechen — aber nie mehr wissen, als ihr System und ihre Fähigkeit hergeben.
        </p>
        <ul className="help-ensemble">
          <li>
            <strong>Assistent</strong> — Taktik, Aufstellung, Risiko
          </li>
          <li>
            <strong>Vorstand</strong> — Ziele, Finanzen, Jobdruck
          </li>
          <li>
            <strong>Kapitän</strong> — Kabine, Moral, Spielzeit
          </li>
          <li>
            <strong>Jugendtrainer</strong> — Talente, Geduld, Abgangsrisiko
          </li>
          <li>
            <strong>Scout</strong> — Chancen mit Unsicherheitsband
          </li>
          <li>
            <strong>Fanvertretung</strong> — Stimmung, Identität, Ticketpreise
          </li>
          <li>
            <strong>Lokalpresse</strong> — Fragen, Hype, öffentliche Folgen
          </li>
          <li>
            <strong>Rivalen</strong> — Derby, Neid, gemeinsame Historie
          </li>
        </ul>
      </section>

      <section className="help-card" aria-labelledby="help-horizons">
        <h2 id="help-horizons">
          <HelpInlineIcon icon={Hourglass} /> Drei Zeithorizonte
        </h2>
        <ul className="help-icon-list">
          <li>
            <HelpInlineIcon icon={Calendar} />
            <span>
              <strong>Woche</strong> — kurze Reaktionen auf Spiel, Training, Transfer, Geld oder Jugend
            </span>
          </li>
          <li>
            <HelpInlineIcon icon={Flag} />
            <span>
              <strong>Saison</strong> — Bögen wie Klassenerhalt, Aufstieg, Derby-Revanche, Akademie-Durchbruch
            </span>
          </li>
          <li>
            <HelpInlineIcon icon={BookOpen} />
            <span>
              <strong>Karriere</strong> — Chronik, wiederkehrende Rivalen, ehemalige Spieler, ausgebaute Orte
            </span>
          </li>
        </ul>
      </section>

      <section className="help-card" aria-labelledby="help-sim-story">
        <h2 id="help-sim-story">
          <HelpInlineIcon icon={Link2} /> Story aus der Simulation
        </h2>
        <ol className="help-steps">
          <li>Die Simulation erzeugt Fakten (Spiel, Transfer, Geld, Jugend).</li>
          <li>Figuren reagieren — kurz, icon-getrieben, mit Haltungsrichtung.</li>
          <li>Du entscheidest nur, wenn es Konsequenzen hat (Post, max. wenige Items).</li>
          <li>Spätere Meldungen erinnern sich an echte Savegame-Ereignisse.</li>
        </ol>
        <p className="help-note">
          Narrative erklärt und spitzt zu. Sie erfindet keine Tore, Transfers, Verletzungen oder
          Potential-Zahlen — und verhindert keinen Abstieg.
        </p>
      </section>

      <section className="help-card help-credits" aria-labelledby="help-credits">
        <h2 id="help-credits">
          <HelpInlineIcon icon={Image} /> {t("help.credits.title")}
        </h2>
        <p>{t("help.credits.lede")}</p>
        <ul className="help-icon-list">
          <li>
            <HelpInlineIcon icon={Camera} />
            <span>{t("help.credits.commons")}</span>
          </li>
          <li>
            <HelpInlineIcon icon={Building} />
            <span>{t("help.credits.hub")}</span>
          </li>
          <li>
            <HelpInlineIcon icon={Sprout} />
            <span>{t("help.credits.youth")}</span>
          </li>
          <li>
            <HelpInlineIcon icon={Sparkles} />
            <span>
              {t("help.credits.magnific")}{" "}
              <a href="https://www.magnific.com/" rel="noopener noreferrer">
                magnific.com
              </a>
            </span>
          </li>
          <li>
            <HelpInlineIcon icon={User} />
            <span>
              {t("help.credits.openPeeps")}{" "}
              <a href="https://www.openpeeps.com/" rel="noopener noreferrer">
                openpeeps.com
              </a>
            </span>
          </li>
          <li>
            <HelpInlineIcon icon={FileText} />
            <span>
              {t("help.credits.ambientcg")}{" "}
              <a href="https://ambientcg.com/" rel="noopener noreferrer">
                ambientCG.com
              </a>
            </span>
          </li>
        </ul>
      </section>
    </div>
  );
}

function PlayPanel() {
  return (
    <div className="help-panel">
      <section className="help-card" aria-labelledby="help-loop">
        <h2 id="help-loop">
          <HelpInlineIcon icon={Repeat} /> In einem Satz
        </h2>
        <p className="help-quote">
          Du planst die Woche, drückst ▶ Next, liest die Folgen — und greifst nur dort ein, wo es den
          Verein wirklich bewegt.
        </p>
      </section>

      <section className="help-card" aria-labelledby="help-week">
        <h2 id="help-week">
          <HelpInlineIcon icon={Calendar} /> Die Woche
        </h2>
        <ol className="help-steps">
          <li>
            <strong>▶ Next</strong> simuliert bis zum nächsten Ereignis (Training, Spieltag, Post…).
          </li>
          <li>Im Hub: Ampeln, Post, Trainings-Heatmap und kurze Story-Stimmen.</li>
          <li>Post-Entscheidungen: höchstens wenige offene Items — kein Mikromanagement.</li>
          <li>Spieltage laufen als Text + 2D-Spielfeld aus demselben Event-Stream.</li>
        </ol>
      </section>

      <section className="help-card" aria-labelledby="help-grow">
        <h2 id="help-grow">
          <HelpInlineIcon icon={TrendingUp} /> Entwicklung ohne Potential-Sterne
        </h2>
        <ul className="help-icon-list">
          <li>
            <HelpInlineIcon icon={Ban} />
            <span>Keine feste Potential-Zahl. Spieler können überraschende Karrieren machen.</span>
          </li>
          <li>
            <HelpInlineIcon icon={Target} />
            <span>Team-Training: 5 Slots, bis zu 3 Fokus — Gruppen Technik / Athletik / Mental.</span>
          </li>
          <li>
            <HelpInlineIcon icon={Thermometer} />
            <span>Heatmap: jedes Quadrat = ein Spieler, Farbe = Zuwachs der letzten Woche.</span>
          </li>
          <li>
            <HelpInlineIcon icon={User} />
            <span>Einzelprogramme: schwaches Bein, Umschulung — und Stempel-Ziele (Fähigkeiten).</span>
          </li>
        </ul>
      </section>

      <section className="help-card" aria-labelledby="help-youth">
        <h2 id="help-youth">
          <HelpInlineIcon icon={School} /> Jugend & Scouting
        </h2>
        <ul className="help-icon-list">
          <li>
            <HelpInlineIcon icon={Bot} />
            <span>U17/U19 laufen vollautomatisch. Du siehst Reports und triffst Inbox-Entscheidungen.</span>
          </li>
          <li>
            <HelpInlineIcon icon={Eye} />
            <span>Scouting schätzt mit Unsicherheitsband — keine exakten Fremd-Attribute ab Tag 1.</span>
          </li>
          <li>
            <HelpInlineIcon icon={ArrowUp} />
            <span>Eigene Spieler kennst du sofort. Talente hochziehen, leihen oder halten bleibt deine Wahl.</span>
          </li>
          <li>
            <HelpInlineIcon icon={School} />
            <span>Campus-Stufen: mehr Intake und bessere Qualität. Weltcamps liefern Nation-Jahrgänge in die Zentrale.</span>
          </li>
        </ul>
      </section>

      <section className="help-card" aria-labelledby="help-club">
        <h2 id="help-club">
          <HelpInlineIcon icon={Briefcase} /> Verein & Risiko
        </h2>
        <ul className="help-icon-list">
          <li>
            <HelpInlineIcon icon={Euro} />
            <span>Finanzen und Stadion sind erste Klasse — Banden, Tribüne, Matchday. Hotel/Restaurant leben von Auslastung, nicht von Training.</span>
          </li>
          <li>
            <HelpInlineIcon icon={ClipboardList} />
            <span>Vorstand setzt Ziele. Verfehlungen erhöhen Jobdruck.</span>
          </li>
          <li>
            <HelpInlineIcon icon={ArrowDown} />
            <span>Abstieg ist real. Rivalen nutzen dieselbe Growth-Engine.</span>
          </li>
        </ul>
      </section>

      <section className="help-card" aria-labelledby="help-not">
        <h2 id="help-not">
          <HelpInlineIcon icon={Ban} /> Was du nicht machst
        </h2>
        <ul className="help-icon-list">
          <li>
            <HelpInlineIcon icon={Gamepad2} />
            <span>Keine Matches selbst spielen — du managst, die Engine simuliert.</span>
          </li>
          <li>
            <HelpInlineIcon icon={ClipboardList} />
            <span>Keine Jugend-Aufstellungen — U17/U19 bleiben vollautomatisch.</span>
          </li>
          <li>
            <HelpInlineIcon icon={Star} />
            <span>Keine Sterne-Potentiale — Wachstum mit Varianz statt Decke.</span>
          </li>
        </ul>
      </section>
    </div>
  );
}

function StampsPanel() {
  const stamps = stampCatalog();
  const trained = stamps.filter((entry) => entry.path === "train");
  const hybrid = stamps.filter((entry) => entry.path === "hybrid");
  const events = stamps.filter((entry) => entry.path === "event" && !entry.spawn);

  return (
    <div className="help-panel">
      <section className="help-card" aria-labelledby="help-stamp-intro">
        <h2 id="help-stamp-intro">
          <HelpInlineIcon icon={Diamond} /> Fähigkeiten / Bonus-Stempel
        </h2>
        <p>
          Stempel sind benannte Boni — und manchmal Makel — auf der Spielerakte. Beim Verdienen
          ändern sich dauerhaft ein paar Attribute (+ oder −). Maximal drei Badges sind prominent
          sichtbar. Start-Makel (Grünschnabel, Chancentod) fallen von allein, wenn der Meilenstein
          kommt.
        </p>
        <ul className="help-icon-list">
          <li>
            <HelpInlineIcon icon={Dumbbell} />
            <span>
              <strong>Training:</strong> Attribute-Gate erfüllen, dann Einzelprogramm starten.
            </span>
          </li>
          <li>
            <HelpInlineIcon icon={Flag} />
            <span>
              <strong>Ereignis:</strong> Meilenstein in der Saison/Karriere — sofortiger Award.
            </span>
          </li>
          <li>
            <HelpInlineIcon icon={Link2} />
            <span>
              <strong>Hybrid:</strong> Gate oder Karriere-Beweis schaltet frei, dann Einzelprogramm siegelt.
            </span>
          </li>
          <li>
            <HelpInlineIcon icon={Sprout} />
            <span>
              <strong>Start-Makel:</strong> fast jeder Neue trägt Grünschnabel; Angreifer können Chancentod
              mitbringen. Beides geht wieder weg.
            </span>
          </li>
        </ul>
      </section>

      <StampGroup title="Start-Makel" icon={Sprout} stamps={stamps.filter((entry) => entry.spawn)} />
      <StampGroup title="Durch Training" icon={Dumbbell} stamps={trained} />
      <StampGroup title="Hybrid · Unlock dann Siegel" icon={Link2} stamps={hybrid} />
      <StampGroup title="Durch Ereignisse" icon={Flag} stamps={events} />
    </div>
  );
}

function StampGroup({
  title,
  icon,
  stamps,
}: {
  title: string;
  icon: LucideIcon;
  stamps: ReturnType<typeof stampCatalog>;
}) {
  if (stamps.length === 0) return null;
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
                  {stamp.weeks ? ` · ${stamp.weeks} Wochen` : ""}
                </p>
              </div>
            </div>
            <div className="help-stamp-cols">
              <div>
                <p className="help-stamp-label">Voraussetzung</p>
                <ul>
                  {formatStampGates(stamp).map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="help-stamp-label">Effekt</p>
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
