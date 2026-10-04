import { useState } from "react";
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

const TABS: { id: HelpTab; label: string; icon: string }[] = [
  { id: "story", label: "Welt & Story", icon: "🌍" },
  { id: "play", label: "So funktioniert's", icon: "▶" },
  { id: "stamps", label: "Fähigkeiten", icon: "◆" },
];

export function HelpScreen() {
  const [tab, setTab] = useState<HelpTab>("story");

  return (
    <main className="help">
      <header className="help-head">
        <p className="eyebrow">Dokumentation</p>
        <h1>📖 Hilfe</h1>
        <p className="help-lede">
          Underdog-Verein, echte Folgen, keine Sterne-Potentiale — und Stempel, die man sich verdient.
        </p>
      </header>

      <nav className="help-tabs" aria-label="Hilfe-Themen">
        {TABS.map((entry) => (
          <button
            key={entry.id}
            type="button"
            className={tab === entry.id ? "help-tab is-active" : "help-tab"}
            onClick={() => setTab(entry.id)}
          >
            <span aria-hidden="true">{entry.icon}</span> {entry.label}
          </button>
        ))}
      </nav>

      {tab === "story" ? <StoryPanel /> : null}
      {tab === "play" ? <PlayPanel /> : null}
      {tab === "stamps" ? <StampsPanel /> : null}
    </main>
  );
}

function StoryPanel() {
  return (
    <div className="help-panel">
      <section className="help-card" aria-labelledby="help-promise">
        <h2 id="help-promise">
          <span aria-hidden="true">🏟</span> Das Versprechen
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
          <span aria-hidden="true">🐕</span> Dein Start: Underdog
        </h2>
        <p>
          Der Standardstart ist ein fiktionaler, lokal verwurzelter Verein — kein vorgefertigtes Imperium.
          „Underdog“ ist der Startkonflikt, kein dauerhafter Statuseffekt: Aufstieg und Größe entstehen nur
          aus dem, was du in der Simulation baust.
        </p>
        <ul className="help-icon-list">
          <li>
            <span aria-hidden="true">📉</span>
            <span>Sportlich unterlegener Profikader</span>
          </li>
          <li>
            <span aria-hidden="true">💶</span>
            <span>Enge Transfer- und Gehaltsbudgets</span>
          </li>
          <li>
            <span aria-hidden="true">🏗</span>
            <span>Einfache, ausbaufähige Infrastruktur</span>
          </li>
          <li>
            <span aria-hidden="true">🎟</span>
            <span>Kleine, loyale Fanbasis am Stadion und in der Stadt</span>
          </li>
          <li>
            <span aria-hidden="true">🌱</span>
            <span>Starke Akademie-Hoffnung — Talente sind oft dein einziger Hebel</span>
          </li>
          <li>
            <span aria-hidden="true">⚠</span>
            <span>Reales Abstiegs- und Jobrisiko vom ersten Tag an</span>
          </li>
        </ul>
      </section>

      <section className="help-card" aria-labelledby="help-origin">
        <h2 id="help-origin">
          <span aria-hidden="true">📜</span> Wie du hier landest
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
          <span aria-hidden="true">🔥</span> Erster Bogen: Gemeinsam gegen den Abstieg
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
          <span aria-hidden="true">🌤</span> Ton der Welt
        </h2>
        <ul className="help-icon-list">
          <li>
            <span aria-hidden="true">⚖</span>
            <span>Nicht cozy: Fußball ist ungerecht und wirtschaftlich hart — aber hell und lokal warm.</span>
          </li>
          <li>
            <span aria-hidden="true">📉</span>
            <span>Abstieg, Entlassung, Verletzungen und Abgänge werden nicht abgefedert.</span>
          </li>
          <li>
            <span aria-hidden="true">😄</span>
            <span>Humor aus Figuren und Ritualen — nie aus Lächerlichmachung kleiner Vereine.</span>
          </li>
          <li>
            <span aria-hidden="true">🌱</span>
            <span>Hoffnung aus Entscheidungen und Beziehungen — kein garantiertes Happy End.</span>
          </li>
        </ul>
      </section>

      <section className="help-card" aria-labelledby="help-ensemble">
        <h2 id="help-ensemble">
          <span aria-hidden="true">👥</span> Das Ensemble
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
          <span aria-hidden="true">⏳</span> Drei Zeithorizonte
        </h2>
        <ul className="help-icon-list">
          <li>
            <span aria-hidden="true">📅</span>
            <span>
              <strong>Woche</strong> — kurze Reaktionen auf Spiel, Training, Transfer, Geld oder Jugend
            </span>
          </li>
          <li>
            <span aria-hidden="true">🏁</span>
            <span>
              <strong>Saison</strong> — Bögen wie Klassenerhalt, Aufstieg, Derby-Revanche, Akademie-Durchbruch
            </span>
          </li>
          <li>
            <span aria-hidden="true">📖</span>
            <span>
              <strong>Karriere</strong> — Chronik, wiederkehrende Rivalen, ehemalige Spieler, ausgebaute Orte
            </span>
          </li>
        </ul>
      </section>

      <section className="help-card" aria-labelledby="help-sim-story">
        <h2 id="help-sim-story">
          <span aria-hidden="true">🔗</span> Story aus der Simulation
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
    </div>
  );
}

function PlayPanel() {
  return (
    <div className="help-panel">
      <section className="help-card" aria-labelledby="help-loop">
        <h2 id="help-loop">
          <span aria-hidden="true">🔁</span> In einem Satz
        </h2>
        <p className="help-quote">
          Du planst die Woche, drückst ▶ Next, liest die Folgen — und greifst nur dort ein, wo es den
          Verein wirklich bewegt.
        </p>
      </section>

      <section className="help-card" aria-labelledby="help-week">
        <h2 id="help-week">
          <span aria-hidden="true">📅</span> Die Woche
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
          <span aria-hidden="true">📈</span> Entwicklung ohne Potential-Sterne
        </h2>
        <ul className="help-icon-list">
          <li>
            <span aria-hidden="true">🚫</span>
            <span>Keine feste Potential-Zahl. Spieler können überraschende Karrieren machen.</span>
          </li>
          <li>
            <span aria-hidden="true">🎯</span>
            <span>Team-Training: 5 Slots, bis zu 3 Fokus — Gruppen Technik / Athletik / Mental.</span>
          </li>
          <li>
            <span aria-hidden="true">🌡</span>
            <span>Heatmap: jedes Quadrat = ein Spieler, Farbe = Zuwachs der letzten Woche.</span>
          </li>
          <li>
            <span aria-hidden="true">👤</span>
            <span>Einzelprogramme: schwaches Bein, Umschulung — und Stempel-Ziele (Fähigkeiten).</span>
          </li>
        </ul>
      </section>

      <section className="help-card" aria-labelledby="help-youth">
        <h2 id="help-youth">
          <span aria-hidden="true">🏫</span> Jugend & Scouting
        </h2>
        <ul className="help-icon-list">
          <li>
            <span aria-hidden="true">🤖</span>
            <span>U17/U19 laufen vollautomatisch. Du siehst Reports und triffst Inbox-Entscheidungen.</span>
          </li>
          <li>
            <span aria-hidden="true">👁</span>
            <span>Scouting schätzt mit Unsicherheitsband — keine exakten Fremd-Attribute ab Tag 1.</span>
          </li>
          <li>
            <span aria-hidden="true">⬆</span>
            <span>Eigene Spieler kennst du sofort. Talente hochziehen, leihen oder halten bleibt deine Wahl.</span>
          </li>
        </ul>
      </section>

      <section className="help-card" aria-labelledby="help-club">
        <h2 id="help-club">
          <span aria-hidden="true">💼</span> Verein & Risiko
        </h2>
        <ul className="help-icon-list">
          <li>
            <span aria-hidden="true">💶</span>
            <span>Finanzen und Stadion sind erste Klasse — Banden, Tribüne, Matchday.</span>
          </li>
          <li>
            <span aria-hidden="true">📋</span>
            <span>Vorstand setzt Ziele. Verfehlungen erhöhen Jobdruck.</span>
          </li>
          <li>
            <span aria-hidden="true">⬇</span>
            <span>Abstieg ist real. Rivalen nutzen dieselbe Growth-Engine.</span>
          </li>
        </ul>
      </section>

      <section className="help-card" aria-labelledby="help-not">
        <h2 id="help-not">
          <span aria-hidden="true">🚫</span> Was du nicht machst
        </h2>
        <ul className="help-icon-list">
          <li>
            <span aria-hidden="true">🎮</span>
            <span>Keine Matches selbst spielen — du managst, die Engine simuliert.</span>
          </li>
          <li>
            <span aria-hidden="true">📋</span>
            <span>Keine Jugend-Aufstellungen — U17/U19 bleiben vollautomatisch.</span>
          </li>
          <li>
            <span aria-hidden="true">⭐</span>
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
  const events = stamps.filter((entry) => entry.path === "event");

  return (
    <div className="help-panel">
      <section className="help-card" aria-labelledby="help-stamp-intro">
        <h2 id="help-stamp-intro">
          <span aria-hidden="true">◆</span> Fähigkeiten / Bonus-Stempel
        </h2>
        <p>
          Stempel sind benannte Boni auf der Spielerakte. Beim Verdienen steigen dauerhaft ein paar
          Attribute (+2 bis +4). Maximal drei Badges sind prominent sichtbar; weitere bleiben in der
          Historie.
        </p>
        <ul className="help-icon-list">
          <li>
            <span aria-hidden="true">🏋️</span>
            <span>
              <strong>Training:</strong> Attribute-Gate erfüllen, dann Einzelprogramm starten.
            </span>
          </li>
          <li>
            <span aria-hidden="true">🏁</span>
            <span>
              <strong>Ereignis:</strong> Meilenstein in der Saison/Karriere — sofortiger Award.
            </span>
          </li>
        </ul>
      </section>

      <StampGroup title="Durch Training" icon="🏋️" stamps={trained} />
      <StampGroup title="Durch Ereignisse" icon="🏁" stamps={events} />
    </div>
  );
}

function StampGroup({
  title,
  icon,
  stamps,
}: {
  title: string;
  icon: string;
  stamps: ReturnType<typeof stampCatalog>;
}) {
  if (stamps.length === 0) return null;
  return (
    <section className="help-card" aria-label={title}>
      <h2>
        <span aria-hidden="true">{icon}</span> {title}
      </h2>
      <ul className="help-stamp-list">
        {stamps.map((stamp) => (
          <li key={stamp.id} className="help-stamp">
            <div className="help-stamp-head">
              <span className="help-stamp-icon" aria-hidden="true">
                {stamp.icon}
              </span>
              <div>
                <strong>{stamp.label}</strong>
                <p className="help-stamp-meta">
                  {stampPathLabel(stamp.path)}
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
