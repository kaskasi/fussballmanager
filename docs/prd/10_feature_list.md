# /docs/prd/10_feature_list.md

**Version:** 1.7

**Last Updated:** 2026-10-21
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
| F1.4 | Fitness-Management | M1 | Einsatzzeiten → Ermüdung, Risiko-Anzeige, leichte Verletzungs-Rolls (PRD 07.6) |
| F1.5 | Spielerprofile | M1 | Attribute-Charts, Icon-Stimmung/Form/Fitness (PRD 09 Screen 4) |
| F1.6 | Formation-Editor | M2 | Freie Positionen statt festes Raster. Stand 2026-10-29: Feldspieler per Drag auf eine freie Zone schieben (25 Zonen inkl. Libero, Schienenspieler, Doppel-Sechs); Zone setzt Rolle + Laufweg (`TeamTactics.slotZones`, ohne Override Engine unverändert) |
| F1.7 | Spieler-Gespräche | M2 | Spielzeit-Zusagen beeinflussen `drive`-Wahrnehmung & Moral |
| F1.8 | Individualtaktik | M2 | Schützen-Rollen, Kapitän, Pressing-Anweisungen pro Spieler |
| F1.9 | Live-Eingriff Matchday | M2 | Slice 1 (vorgezogen 2026-10-21): manuelle Wechsel bei Pause/Halbzeit/Verletzung + Preset-Wechsel zur HZ (PRD 27); Slice 2 Taktik live bleibt später |

### Modul 2 · Training & Entwicklung *(PRD 02)*

| ID | Feature | M | Beschreibung |
|---|---|---|---|
| F2.1 | Wochenplanung Training | M1 | 15 Trainingsslots (3/Tag, Mo–Fr), bis zu 2 Fokus (+33 % pro Fokus auf Attributgruppe); Plan **leer nach jeder Wochensim**; **3 Vorlagen** speichern/laden im Save; ohne Fokus keine Entwicklung + Fan/Vorstand-Reaktion |
| F2.2 | Growth Engine | M1 | Kernformel PRD 02.1 — kein Potential, Varianz, Soft Cap 180 |
| F2.3 | Individualprogramme | M2 | Schwaches Bein, Positionsumschulung (`flexibility`, Roll PRD 07.7) |
| F2.4 | Mentoring | M2 | Routinier (≥ 5 Profi-Jahre) → Talent in Slots; Moral, Form, Attribute wo der Mentor besser ist; Trigger-Quelle für PRD 06.2 (PRD 29) |
| F2.5 | Trainingslager | M2 | Sichtbarkeits-Bonus auf Drive-Einschätzungen in Pausen |
| F2.6 | Rehasystem | M3 | Verletzungsverlauf-Stufen, Reha-Trainer-Qualität |
| F2.7 | Wachstums-Heatmap | M1 | Team-Leiste: 1 Quadrat = 1 Spieler-Wochenzuwachs (PRD 09 Screen 1) |
| F2.8 | Fähigkeiten / Bonus-Stamps | M2 | Named bonuses: train / event / hybrid (unlock then F2.3 seal); signed −4…+4 on 2–3 attrs (PRD 07.5). Six archetype stamps in catalog |
| F2.9 | Breakout/Slump Story (Tier 2) | M2 | Seltene Karriere-Risse mit Wachstums-Multiplikator + Narrative (PRD 06.11); eigene + Rivalen |

### Modul 3 · Jugendakademie *(PRD 03)*

| ID | Feature | M | Beschreibung |
|---|---|---|---|
| F3.1 | Jährlicher Intake | M1 | Gaussian-Mixture, HQ 24/28/32, Yamal-Exceptions (PRD 03.1) |
| F3.2 | Jugend-Campus 2D | M1 | Campus-Grid, Gebäude-Stufen, Badge-Gruppen — kein Iso-Stadtmodell |
| F3.3 | Auto-Simulation U17/U19 | M1 | KEINE manuellen Aufstellungen — YouthReports (PRD 03.3) |
| F3.4 | Decision Inbox | M1 | Max 4 Items/Woche: Leihen/Hochziehen/Vertrag/Fokus (PRD 03.4) |
| F3.5 | Hochzieh-Workflow | M2 | Postfach-Empfehlungen: U17→U19, U19→Profikader (direkt, kein Probetraining) |
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
| F4.10 | Gegner-Scout (Sim-Bündel) | M2 | 10× Headless-Sims, 5 Arbeitstage, Postfach-Analytics (PRD 22) |

### Modul 5 · Transfers & Verträge *(PRD 05)*

| ID | Feature | M | Beschreibung |
|---|---|---|---|
| F5.1 | Transfermarkt-Kern | M1 | Angebote, Reaktionsmatrix (PRD 05.3), Fenster-Schaltung |
| F5.2 | Market Value Formel | M1 | Deterministisch, Schätzungs-basiert (PRD 05.1) — P0 |
| F5.3 | Leihen | M1 | Wage-Split, Minute-Garantie, Recall (PRD 05.7) |
| F5.4 | Vertragsverhandlungen | M2 | Player-Prioritäten, Fog beim 1. Angebot, Frustr-Spirale (PRD 05.4) |
| F5.5 | Sell-On-Klauseln | M2 | Jugend-Anreiz, Track in fee_history |
| F5.6 | KI-Transfermarkt | M2 | Dieselben Formeln, Budget-Disziplin (PRD 05.5) |
| F5.6b | Kicker (Di) | M2 | Wöchentlicher Liga-Ticker im Postfach aus F5.6-Deals (PRD 09) |
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
| F6.6 | Finanzierung & Notfall-Liquidität | M3 | **Ab Slice F6.6-A:** Bankkredit im Finanzscreen (§11.12); story-gated Kanäle (Fan-Anteil, Knochenbrecher, Namensrecht, Digi-Merch) mit Karriere-Caps. **Keine** Investoren / Deep-Debt-Instrumente |
| F6.7 | Merchandise | M3 | An Popularität gekoppelt |
| F6.8 | Finanzkrise-Szenario | M3 | Abzüge, Verwaltung (Härte!) |

### Modul 7 · Stadion & Imperium

| ID | Feature | M | Beschreibung |
|---|---|---|---|
| F7.1 | Stadion 2D-Iso-Ansicht | M1 | Grundriss, Blöcke, Preiskategorien |
| F7.2 | Stadionausbau | M2 | Kapazität, VIP, Rasenheizung |
| F7.3 | Nebengebäude platzieren | M3 | Würstchenbude, Fanshop, Hotel, Restaurant (Auslastung+Story); Museum später |
| F7.4 | Trainingsgelände-Ausbau | M3 | Verletzungsrate ↓, Physio-Boni (Stufe 5 stackt ~8 % mit Medical Center) |
| F7.9 | Medical Center (Gelände) | M2 | Eigenes Gebäude 3 Stufen: Praxis → Imaging → OP; Diagnose-Tage, Reha-Multiplikator |
| F7.5 | Fanbase-Wachstum | M3 | Erfolgs-/Populäritätskurve → Zuschauerschnitt |
| F7.6 | Ambiance-Effekte | M3 | Attraktivität für Spieler & Fans |
| F7.7 | Havarie-Events | M4 | Sturm, Rohrbruch |
| F7.8 | Maximalzustand-Trophäe | M3 | „Arena-Park" als Endstufe |

### Modul 8 · Trainerstab

| ID | Feature | M | Beschreibung |
|---|---|---|---|
| F8.1 | Trainer einstellen | M1 | Gruppen: Angriff/Verteidigung/Fitness — `environment()`-Faktor |
| F8.2 | Physios/Ärzte | M2 | Screen **Medizin** (Staff / Verletzte / Ermüdung & Praxis); 1 Arzt, 4 Physios, Orthopäde (Story); Hiring wie Scouts; legendäre Docs möglich |
| F8.3 | Jugendtrainer-Typen | M2 | Entwicklungsspezialist vs. Ergebnisorientiert |
| F8.4 | Staff-Entwicklung | M3 | Trainer wachsen/altern ebenfalls |
| F8.5 | Assistenten-Vorschläge | M3 | Auto-Delegation Aufstellung/Scouting; **Wochenplan = Erinnerung** (kein Auto-Plan), optional Postfach-Blocker |
| F8.6 | Staff-Chemie | M3 | Konflikte kosten Moral |

### Modul 9 · Verein, Vorstand & Medien

| ID | Feature | M | Beschreibung |
|---|---|---|---|
| F9.1 | Saisonziele | M1 | Tier aus Tabellenplatz, Pflicht vs. Nebenziele, Entlassung nur bei Pflicht-Fail — PRD 23 |
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
| F11.3 | Karriere-Enden | M1 | Ruhestand für eigene und KI-Spieler mit `retired.json`-Schreiben, KI-Jugend und Kaderauffüllung (PRD 31) |
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
| F12.7 | Hilfe & Doku | M1 | Eigener Screen: Welt/Story, Spielablauf, **Taktik-Guide**, Stempel-Katalog (F2.8); Kanon `docs/help/tactics-player-guide.*.md` |
| F12.8 | Anzeigesprache | M1 | DE / EN / 简体 JSON-Packs; Sprache in Opening Schritt 1 + ⋮ Anzeige (PRD 18) |
| F12.9 | Karriere-Unlock-Profil | M4 | Client-Prefs: Elite World freigeschaltet nach PRD 21 — kein Meta-Währung; Spez in PRD 21 |
| F12.10 | Kontext-Tutorial (Coach Marks) | M1 | Phase 1 Hub + eingefrorenes Training-Onboarding; Phasen 2–4 PRD 25 (Inbox/Match/Scout/Squad/Campus/Club), keine weiteren Training-Tips |

---

## Feature-Zählung nach Meilenstein

| Meilenstein | Features | Fokus |
|---|---|---|
| M1 | 37 | Kern-Loop: Sim, Liga, Growth, Intake, Basis-Transfers, Save, Hilfe |
| M2 | 29 | USP-Ausbau: Scouting-Tiefe, Verträge, KI-Markt, Akademie-Stufen, Stamps, Camps |
| M3 | 23 | Imperium, Events, Staff, Storylines |
| M4 | 6 | Legacy & Meta |
| **Total** | **96** | (+F12.9 career unlock profile, PRD 21) |

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
- PRD 19 (Career acts, tutorial curtain, story choices) — Narrative/Onboarding; kein neues F-ID ohne Katalog-Eintrag.
- PRD 20 (Design language, UI primitives, CSS/i18n migration) — kein F-ID; harte Voraussetzung für PRD-19-UI ab Slice B.
- PRD 21 (Act 4 / Elite World NG+) — F10.6 + F12.9; Implementierung gated durch [playtest_protocol.md](./playtest_protocol.md).