# /docs/prd/10_feature_list.md

**Version:** 1.6

**Last Updated:** 2026-10-04
**Status:** Final  

---

## Purpose
Vollständiger, priorisierter Feature-Katalog aller Spielmodule. Source of Truth für Scope und Release-Meilensteine (M1–M4). Kein Feature existiert im Code, wenn es nicht hier (oder in einer Modul-PRD) aufgeführt ist.

---

## Scope
Alle Module. Details der Implementierung liegen in den jeweiligen Modul-PRDs (References unten).

**Dependencies:** PRD 01–09, PRD 11–15

Darstellung der gebauten Systeme: PRD 14. Keep/Refuse und Lücken vs. 2002/FM11:
PRD 15. PRD 15 darf Meilensteine in dieser Datei nicht still verschieben.

---

## Priorisierungs-Schlüssel

- **M1 (MVP):** Kern-Loop muss funktionieren — P0-Features im .cursorrules
- **M2:** USPs vervollständigen (Wirtschaft, Scouting-Tiefe)
- **M3:** Imperiums-Fantasie & Langzeitmotivation
- **M4:** Feinschliff, Legacy, Meta-Features

Jedes Feature hat eine ID (`F<modul>.<nr>`) für Tracking in Cursor-Tasks.

---

## Specification

### Modul 1 · Kader & Taktik

| ID | Feature | M | Beschreibung |
|---|---|---|---|
| F1.1 | Drag&Drop-Aufstellung | M1 | Spieler-Cards auf 2D-Pitch ziehen, Fitness/Form-Icons, WA per PRD 09 |
| F1.2 | Taktik-Voreinstellungen | M1 | 3 Preset-Slots, fließen in Engine-Input (Engine-Wrapper) |
| F1.3 | Auto-Aufstellung | M1 | Assistent: „Best Eleven" / „Rotation" / „Talente einbauen" |
| F1.4 | Fitness-Management | M1 | Einsatzzeiten → Ermüdung, Verletzungsrisiko-Anzeige |
| F1.5 | Spielerprofile | M1 | Attribute-Charts, Icon-Stimmung/Form/Fitness (PRD 09 Screen 4) |
| F1.6 | Formation-Editor | M2 | Freie Positionen statt festes Raster |
| F1.7 | Spieler-Gespräche | M2 | Spielzeit-Zusagen beeinflussen `drive`-Wahrnehmung & Moral |
| F1.8 | Individualtaktik | M2 | Schützen-Rollen, Kapitän, Pressing-Anweisungen pro Spieler |
| F1.9 | Live-Eingriff Matchday | M3 | Wechsel/Taktik während 2D-Sim |

### Modul 2 · Training & Entwicklung *(PRD 02)*

| ID | Feature | M | Beschreibung |
|---|---|---|---|
| F2.1 | Wochenplanung Training | M1 | 5 Trainingsslots, davon bis zu 3 Fokus-Slots (PRD 02.4), Intensität, Ampel-Fatigue |
| F2.2 | Growth Engine | M1 | Kernformel PRD 02.1 — kein Potential, Varianz, Soft Cap 180 |
| F2.3 | Individualprogramme | M2 | Schwaches Bein, Positionsumschulung (`flexibility`) |
| F2.4 | Mentoring | M2 | Routinier → Talent, `drive`-Bonus (Trigger-Quelle für PRD 06.2) |
| F2.5 | Trainingslager | M2 | Sichtbarkeits-Bonus auf Drive-Einschätzungen in Pausen |
| F2.6 | Rehasystem | M3 | Verletzungsverlauf-Stufen, Reha-Trainer-Qualität |
| F2.7 | Wachstums-Heatmap | M1 | Team-Leiste: 1 Quadrat = 1 Spieler-Wochenzuwachs (PRD 09 Screen 1) |
| F2.8 | Fähigkeiten / Bonus-Stamps | M2 | Named bonuses: train / event / hybrid (unlock then F2.3 seal); signed −4…+4 on 2–3 attrs (PRD 07.5). Six archetype stamps in catalog |

### Modul 3 · Jugendakademie *(PRD 03)*

| ID | Feature | M | Beschreibung |
|---|---|---|---|
| F3.1 | Jährlicher Intake | M1 | Gaussian-Mixture, HQ 24/28/32, Yamal-Exceptions (PRD 03.1) |
| F3.2 | Jugend-Campus 2D | M1 | Campus-Grid, Gebäude-Stufen, Badge-Gruppen — kein Iso-Stadtmodell |
| F3.3 | Auto-Simulation U17/U19 | M1 | KEINE manuellen Aufstellungen — YouthReports (PRD 03.3) |
| F3.4 | Decision Inbox | M1 | Max 4 Items/Woche: Leihen/Hochziehen/Vertrag/Fokus (PRD 03.4) |
| F3.5 | Hochzieh-Workflow | M2 | Empfehlungen + Probewoche Profitraining |
| F3.6 | Jugendverträge | M2 | Profi-Verträge, Spielzeit-Klauseln — Dialog teilt F5.4 |
| F3.7 | Akademie-Ausbau | M2 | 3 Stufen, Intake-Zahl + Qualität, Elite-Chance 1.5× (PRD 03.2) |
| F3.8 | Abgangsrisiko | M2 | Trigger, 1-Wochen-Fenster, Gegenmaßnahmen (PRD 03.5) |
| F3.9 | Jugendcamps | M2 | Satelliten pro Nation, Unterhalt, Betreuer, Übernehmen in HQ (PRD 03.6) |

### Modul 4 · Scouting *(PRD 04)*

| ID | Feature | M | Beschreibung |
|---|---|---|---|
| F4.1 | Basis-Report | M1 | Gegneranalyse, Marktliste |
| F4.2 | Wissensmodell | M1 | Bayesian CI, Beobachtungen schrumpfen Unsicherheit (PRD 04.1) |
| F4.3 | Scout-Netzwerk | M2 | 3 Tiers, Kapazitäten, Assignments (PRD 04.2) |
| F4.4 | Scout-Karte | M2 | Regionen nach Knowledge gefärbt, Pins |
| F4.5 | Scouting-Events | M3 | Turniere, Reisen, Story-Beats (PRD 04.3) |
| F4.6 | Agenten-Alerts | M3 | Push-Karten, gelegentlich Blender |
| F4.7 | Shortlist-Sparklines | M2 | Beobachtete Entwicklung als Verlauf (PRD 04.5) |
| F4.8 | False Positives | M2 | Prodigy-Trap, Hype-Blasen (PRD 04.4) |
| F4.9 | Spielerakte | M3 | Vita, Geburtsort, Vereinshistorie |

### Modul 5 · Transfers & Verträge *(PRD 05)*

| ID | Feature | M | Beschreibung |
|---|---|---|---|
| F5.1 | Transfermarkt-Kern | M1 | Angebote, Reaktionsmatrix (PRD 05.3), Fenster-Schaltung |
| F5.2 | Market Value Formel | M1 | Deterministisch, Schätzungs-basiert (PRD 05.1) — P0 |
| F5.3 | Leihen | M1 | Wage-Split, Minute-Garantie, Recall (PRD 05.7) |
| F5.4 | Vertragsverhandlungen | M2 | Player-Prioritäten, Fog beim 1. Angebot, Frustr-Spirale (PRD 05.4) |
| F5.5 | Sell-On-Klauseln | M2 | Jugend-Anreiz, Track in fee_history |
| F5.6 | KI-Transfermarkt | M2 | Dieselben Formeln, Budget-Disziplin (PRD 05.5) |
| F5.7 | Ablösefreie | M1 | Vorverträge ab 6 Monate Restlaufzeit (PRD 05.6) |
| F5.8 | Beraterwesen | M3 | Beziehungs-System, Sympathie-Effekte |
| F5.9 | Rückhol-Stories | M4 | Legenden kehren zurück |

### Modul 6 · Finanzen *(PRD 11)*

| ID | Feature | M | Beschreibung |
|---|---|---|---|
| F6.1 | Budget-Split | M1 | Transfer- vs. Gehaltsbudget getrennt |
| F6.2 | Einnahmen-Streams | M1 | Eintritt, TV/Prämien, Basis-Sponsoren |
| F6.3 | Ausgaben | M1 | Gehälter, Personal, Unterhalt |
| F6.4 | Cashflow-Visualisierung | M1 | Wasserfall-Diagramm monatlich, Icon-first |
| F6.5 | Sponsor-Verhandlungen | M2 | Laufzeiten, Erfolgsstaffelung |
| F6.6 | Investoren/Kredit | M3 | Notfall-Option, Zinsen. Liegt außerhalb der v1-Stack-Regel (keine Kredite/Investoren) und wird erst gebaut, wenn diese Regel fällt |
| F6.7 | Merchandise | M3 | An Popularität gekoppelt |
| F6.8 | Finanzkrise-Szenario | M3 | Abzüge, Verwaltung (Härte!) |

### Modul 7 · Stadion & Imperium

| ID | Feature | M | Beschreibung |
|---|---|---|---|
| F7.1 | Stadion 2D-Iso-Ansicht | M1 | Grundriss, Blöcke, Preiskategorien |
| F7.2 | Stadionausbau | M2 | Kapazität, VIP, Rasenheizung |
| F7.3 | Nebengebäude platzieren | M3 | Würstchenbude, Fanshop, Hotel, Restaurant (Auslastung+Story); Museum später |
| F7.4 | Trainingsgelände-Ausbau | M3 | Verletzungsrate ↓, Physio-Boni |
| F7.5 | Fanbase-Wachstum | M3 | Erfolgs-/Populäritätskurve → Zuschauerschnitt |
| F7.6 | Ambiance-Effekte | M3 | Attraktivität für Spieler & Fans |
| F7.7 | Havarie-Events | M4 | Sturm, Rohrbruch |
| F7.8 | Maximalzustand-Trophäe | M3 | „Arena-Park" als Endstufe |

### Modul 8 · Trainerstab

| ID | Feature | M | Beschreibung |
|---|---|---|---|
| F8.1 | Trainer einstellen | M1 | Gruppen: Angriff/Verteidigung/Fitness — `environment()`-Faktor |
| F8.2 | Physios/Ärzte | M2 | Prävention + Rehadauer (koppelt an F2.6) |
| F8.3 | Jugendtrainer-Typen | M2 | Entwicklungsspezialist vs. Ergebnisorientiert |
| F8.4 | Staff-Entwicklung | M3 | Trainer wachsen/altern ebenfalls |
| F8.5 | Assistenten-Vorschläge | M3 | QoL: Auto-Delegation einzelner Aufgaben |
| F8.6 | Staff-Chemie | M3 | Konflikte kosten Moral |

### Modul 9 · Verein, Vorstand & Medien

| ID | Feature | M | Beschreibung |
|---|---|---|---|
| F9.1 | Saisonziele | M1 | Vorstand-Vorgaben, Erfolg = Bonus/Fail = Konsequenz |
| F9.2 | Job-Gefahr & Bewerbungsphase | M1 | Entlassung → neuer Job (KEIN Game Over) — Härte-Feature |
| F9.3 | Fan-Stimmungs-Feed | M2 | Emoji-Feed in Header-Bar |
| F9.4 | Interviews | M2 | Icon-getriebene Antworten, `media_hype` beeinflusst PRD 06 Trigger |
| F9.5 | Reputation bei Transfers | M3 | Stars kommen nur bei Status |
| F9.6 | Rivalen-Storylines | M3 | Derby-Historien über Jahre |
| F9.7 | Vereinsmythos | M4 | Legenden-Status als Ressource |

### Modul 10 · Liga & Welt

| ID | Feature | M | Beschreibung |
|---|---|---|---|
| F10.1 | Liga-Betrieb Auto-Sim | M1 | Engine-Wrapper, Compressor-Modus für Fremdspiele |
| F10.2 | Tabelle & Statistiken | M1 | Visuell: Formkurven, Sparklines |
| F10.3 | Aufstieg/Abstieg | M1 | Real, inkl. Playoffs. M1 hat genau zwei Spielklassen, damit der Wechsel die Tabelle verlässt |
| F10.4 | KI nutzt Growth Engine | M1 | Rivalen entwickeln dieselben Regeln (Anti-Boredom, PRD 02) |
| F10.5 | Liga-Drift | M2 | Ökonomie vieler Clubs hebt Ligadurchschnitt |
| F10.6 | Internationaler Cup | M2 | Ab Qualifikationsrang, größerer Markt |
| F10.7 | Nationalmannschaft | M3 | Berufungen als Event (Stolz/Belastung) |
| F10.8 | Multi-League | M4 | Dritte Spielklasse und weitere Ligen über die zwei Klassen aus F10.3 hinaus |

### Modul 11 · Saison-Zyklus & Historie

| ID | Feature | M | Beschreibung |
|---|---|---|---|
| F11.1 | Sommerpause-Flow | M1 | Timeline-Checklist: Verträge, Intake, Planung |
| F11.2 | Saison-Awards | M1 | Torschützenkönig etc. als Karten-Galerie |
| F11.3 | Karriere-Enden | M2 | Ruhestand mit `retired.json`-Schreiben |
| F11.4 | Vereinschronik | M3 | Grafische Timeline, Trophäenschrank 2D |
| F11.5 | Wiedergänger | M3 | Ex-Profis als Trainer/Scout/Mentor |
| F11.6 | Meilensteine | M3 | „500. Ligaspiel" (Player-Schema `milestones`) |
| F11.7 | Alltime-Statistiken | M4 | Über Saves hinweg (LocaleStorage/Kopplung an Mod) |

### Modul 12 · Meta & Spielbetrieb

| ID | Feature | M | Beschreibung |
|---|---|---|---|
| F12.1 | Savegames | M1 | Multi-File, Migrations (PRD 08) |
| F12.2 | Deterministische Seeds | M1 | hash-basiert (PRD 08.6) |
| F12.3 | Pacing-Controls | M1 | Woche skippen, „bis zum Event" |
| F12.4 | Barrierefreiheit | M1 | Textgrößen, Farb-Schemata, Shape-Indikatoren (PRD 09.3) |
| F12.5 | Screenshot-Modus | M3 | Spielermomente teilen |
| F12.6 | Mod-Support | M4 | JSON-Austausch |
| F12.7 | Hilfe & Doku | M1 | Eigener Screen: Welt/Story, Spielablauf, Stempel-Katalog (F2.8) |

---

## Feature-Zählung nach Meilenstein

| Meilenstein | Features | Fokus |
|---|---|---|
| M1 | 37 | Kern-Loop: Sim, Liga, Growth, Intake, Basis-Transfers, Save, Hilfe |
| M2 | 28 | USP-Ausbau: Scouting-Tiefe, Verträge, KI-Markt, Akademie-Stufen, Stamps, Camps |
| M3 | 24 | Imperium, Events, Staff, Storylines |
| M4 | 6 | Legacy & Meta |
| **Total** | **95** | |

**M1-Definition of Done:** Ein Spieler kann einen Verein führen, eine Saison simulieren (mit Auto-Matches), Jugendspieler hochziehen, Talente entwickeln und Transfers tätigen — gespeichert in versioniertem Savegame. Vorstand/Entlassung aktiv.

---

## Non-Features (bewusst NICHT gebaut)

| Ausgeschlossen | Grund |
|---|---|
| Matches selbst spielen | EA-FC-Pain-Point, Kern-Vision verletzt |
| Relatives Potential (Stern-Skalen) | Hauptfrustration Sega FM — Design-Gesetz Nr. 1 |
| Manuelle Jugend-Aufstellungen | Mikromanagement, PRD 03 |
| Nationaltrainer-Rolle | Scope |
| Multiplayer/Online | Savegame-Export genügt |
| 3D / Videosequenzen | 2D + Icons sind Design-Grenze |
| Generative Bild-KI / TTS-Kommentar | Asset-Herkunft PRD 01; eigene modulare Aufnahmen optional später |
| Editor-Mode | Überflüssig durch absolutes Modell ohne versteckte Decke |

---

## Cursor-Task-Verweise

Tasks referenzieren Features via ID: „Implementiere F2.2 (Growth Engine) nach PRD 02.1". Ein Task darf max. 1 Feature umfassen (Ausnahme: reine Typ-/Schema-Tasks).

`F-TYP-1` ist der Schema-Task für PRD 07 (P0, vor F2.2) und zählt nicht in die 95 Features.

M2 list for F2.8: implement after F2.3 slot machinery exists. Schema fields in PRD 07.5.

---

## References

- PRD 01 (Vision), 02 (Growth), 03 (Jugend), 04 (Scouting), 05 (Transfers), 06 (Breakouts), 07 (Player-Schema), 08 (Savegame), 09 (Pipeline-UI), 11 (Finanzen), 12 (Liga/Welt)
- PRD 13 (Story-Slice Abstieg), 14 (Club-Cockpit-UI), 15 (Feature-Lücken / Referenz-DNA)
- Offene PRD: `13_meta.md` — vor Redaktion von Meta-Features (M4) erforderlich. Nicht mit PRD 13 verwechseln.