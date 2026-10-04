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

      <section className="help-card" aria-labelledby="help-tone">
        <h2 id="help-tone">
          <span aria-hidden="true">🌤</span> Ton der Welt
        </h2>
        <ul className="help-icon-list">
          <li>
            <span aria-hidden="true">⚖</span>
            <span>Fußball ist ungerecht und wirtschaftlich hart — aber hell und lokal warm.</span>
          </li>
          <li>
            <span aria-hidden="true">📉</span>
            <span>Abstieg, Entlassung und Abgänge werden nicht abgefedert.</span>
          </li>
          <li>
            <span aria-hidden="true">😄</span>
            <span>Humor kommt aus Figuren und Ritualen, nicht aus Slapstick über kleine Vereine.</span>
          </li>
          <li>
            <span aria-hidden="true">🌱</span>
            <span>Hoffnung folgt aus Entscheidungen — kein garantiertes Happy End.</span>
          </li>
        </ul>
      </section>

      <section className="help-card" aria-labelledby="help-ensemble">
        <h2 id="help-ensemble">
          <span aria-hidden="true">👥</span> Das Ensemble
        </h2>
        <p>
          Die Story tragen stabile Rollen. Sie dürfen widersprechen — aber nie mehr wissen, als ihr System
          hergibt.
        </p>
        <ul className="help-ensemble">
          <li>
            <strong>Assistent</strong> — Taktik & Risiko
          </li>
          <li>
            <strong>Vorstand</strong> — Ziele & Jobdruck
          </li>
          <li>
            <strong>Kapitän</strong> — Kabine & Moral
          </li>
          <li>
            <strong>Jugendtrainer</strong> — Talente & Geduld
          </li>
          <li>
            <strong>Scout</strong> — Chancen mit Unsicherheit
          </li>
          <li>
            <strong>Fans & Presse</strong> — Stimmung & öffentliche Folgen
          </li>
        </ul>
      </section>

      <section className="help-card" aria-labelledby="help-sim-story">
        <h2 id="help-sim-story">
          <span aria-hidden="true">🔗</span> Story aus der Simulation
        </h2>
        <ol className="help-steps">
          <li>Simulation erzeugt Fakten (Spiel, Transfer, Geld, Jugend).</li>
          <li>Figuren reagieren — kurz, icon-getrieben.</li>
          <li>Du entscheidest nur, wenn es Konsequenzen hat.</li>
          <li>Spätere Meldungen erinnern sich an echte Savegame-Ereignisse.</li>
        </ol>
        <p className="help-note">
          Narrative erklärt und spitzt zu. Sie erfindet keine Tore, Transfers oder Potential-Zahlen.
        </p>
      </section>
    </div>
  );
}

function PlayPanel() {
  return (
    <div className="help-panel">
      <section className="help-card" aria-labelledby="help-week">
        <h2 id="help-week">
          <span aria-hidden="true">📅</span> Die Woche
        </h2>
        <ol className="help-steps">
          <li>
            <strong>▶ Next</strong> simuliert bis zum nächsten Ereignis (Training, Spieltag, Inbox…).
          </li>
          <li>Im Hub siehst du Ampeln, Post und die Trainings-Heatmap des Kaders.</li>
          <li>Entscheidungen in der Post: höchstens wenige pro Woche — kein Mikromanagement.</li>
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
