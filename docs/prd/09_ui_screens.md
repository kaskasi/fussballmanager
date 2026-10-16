# /docs/prd/09_ui_screens.md

**Version:** 1.8
**Last Updated:** 2026-10-08
**Status:** Final  

---

## Purpose

UI-Screens für den Talent-Pipeline-Block. 8 Screens plus zwei Modals. Wireframes als ASCII. Interaktion ist icon-first, mit der 2-Klick-Regel.

**PRD 14** ist verbindlich für Club-Cockpit, Dichte und „Raum vor Shell“.
**design.md** (`docs/prd/design.md`) ist verbindlich für Tokens, Header, Menü und Wireframes §9 (Club-UI-Zielbild).
Diese Datei bleibt die Inventarliste der acht Pipeline-Screens. Wo 09 und 14
bei Darstellung kollidieren (Grid-first, Text-Buttons, leere SaaS-Tabs),
gilt 14; wo 14/09 und design.md bei Farben/Layout kollidieren, gilt design.md.

---

## Scope

- `/src/ui/screens/` (Pipeline-Dashboard, Youth-Campus, Scouting-Center, Player-Profile)
- Wireframes als Code-Kommentare
- Komponenten-Library (`/src/ui/components/`)

**Dependencies:** PRD 02 (Growth Engine), PRD 03 (Youth), PRD 04 (Scouting), PRD 07 (Player-Schema), PRD 17 (Plattform-Zielbild)

---

## Design-Grundsätze

1. **Icon/Visual First:** Icons, Bilder und Charts vor Fließtext.
2. **2-Klick-Regel:** Von der Information zur Aktion in höchstens 2 Klicks.
3. **Kein Dead-End:** Jeder Screen hat mindestens einen Next-Action-Button.
4. **Wireframes vor Code:** ASCII-Wireframe als Kommentar, bevor gestylt wird.
5. **Keine generative Bild-KI:** Grafik = SVG/CSS/Typografie, CC0 wo nötig.
   Mood-Streifen (Spieltag, Transfer) sind text/CSS-first; siehe PRD 01
   „Asset-Herkunft“. Cursor-Tasks, die Bildgeneratoren vorschlagen, sind out of scope.
6. **Kern Desktop/Deck, Mobile mitdenken:** Primäre Zielplattform ist
   **Browser am PC** und **Steam Deck** (PRD 17). Jede UI-Arbeit ist
   **mobile-responsive** zu liefern (schmale Viewports, Touch, kein Hover-only),
   damit Test unterwegs und optionale PWA funktionieren. Mobile ist **Bonus**,
   kein separates v1-Produkt vor dem Steam-Kern.

---

## Specification

### 09.1 Screen-Landkarte

Acht Screens. `1a` und `2b` sind Modals und zählen nicht mit.

```text
Pipeline Dashboard (Tab-Hub)
├─ 1. Training Overview
│  └─ 1a. Individual Plan [Modal]
├─ 2. Youth Campus (2D iso)
│  ├─ 2a. Jahrgangs-Ansicht
│  └─ 2b. Decision Inbox [Modal]
├─ 3. Scouting Center
│  ├─ 3a. Scout Network / Karte
│  └─ 3b. Shortlist
└─ 4. Player Profile
   └─ 4a. Development History [Tab]
```

### 09.2 Screen-Spezifikationen

**Screen 1 — Pipeline Dashboard**

```text
┌────────────────────────────────────────────────────────┐
│ [Chart: Pipeline-Füllung nach Stufe]                  │
│                                                        │
│ [Training] Ampel Grün · [Focus] 2/2 Fokus (+33 %)      │
│ [Youth] 2 Empfehlungen · [Flag] 1 Abgangsrisiko      │
│ [Scouting] 3 Scouts aktiv · 7 offene Reports           │
│                                                        │
│ [▶ Diese Woche simulieren]                            │
└────────────────────────────────────────────────────────┘
```

Interaktion:

- Klick auf eine Status-Kachel springt in den Sub-Screen.
- Team-Heatmap (F2.7): **ein Quadrat = ein Spieler**, Farbe = Wochenzuwachs aus PRD 02.1. Desktop legt die Quadrate als ~3×8-Raster pro Stufe (Zelle ~8×8px, Hover zeigt Namen); Mobile nutzt größere Touch-Zellen ohne Zwischenschritt. Dieselbe Strip sitzt im Hub und unter dem Stundenplan (Training). Fokus-Slots: PRD 02.4 (bis zu **2** von **15** Trainingsslots, +33 % pro Fokus auf Attributgruppe).
- Keine Kachel hat mehr als einen Satz Fließtext.

**Screen 1a — Individual Plan Modal**

- Links: Spielerkarte (Portrait, Position, 3 Kernattribute als Balken).
- Rechts: Programm-Dropdown, Dauer-Slider, Fatigue-Warnung als Icon (Zap, rot).
- Dropdown-Arten: Schwaches Bein, Positionsumschulung (F2.3), und freigeschaltete
  Stamp-Ziele (F2.8, `kind: "stamp"`) wenn das Gate erfüllt ist.
- Bestätigen wirkt ab der kommenden Woche.

**Screen 2 — Youth Campus (Grid)**

- Gebäude nach Academy-Level visuell unterscheidbar (SVG-Glyphen, kein Iso-Stadtmodell).
- Klick auf ein Gebäude wechselt nach 2a oder kauft die nächste Stufe.
- Spieler-Badges im Grid, sortiert nach Coach-Icon (Rocket / Arrow / Alert / Frown — Lucide).
- Abgangsrisiko: roter Rand, Klick öffnet die Decision Inbox.
- Camps (P2): **3×2** `YouthCampCard`-Raster — Foto, Agentur-Brief, Roster pro Nation
  (PRD 03.6.1 / 03.6.2). Split-Liste + Detailpanel entfällt.

**Hub — Camp-Personal (PRD 03.6.2)**

- Unter der Jugend-Entscheidungs-Sektion: Panel **Camp-Personal** (zählt nicht gegen MAX 4).
- Zeile pro Camp mit `candidates_ready`: „Leiter wählen · {Nation}“ → Modal.

**Camp-Leiter Modal (2c)**

```text
┌──────────────────────────────────────────────┐
│ Camp-Leiter · Brasilien                      │
│ [Portrait] Name · Badges (+Training / Mental)│
│ 5 Absätze Intro (einer disqualifiziert sich) │
│ [Leiter einstellen]  ·  [Später]             │
└──────────────────────────────────────────────┘
```

- Nach Hire: Navigation **Youth Campus → Tab Camps** mit Leader-Block wie 03.6.1.

**Screen 2b — Decision Inbox Modal** (Alias: **Postfach**-Screen, design.md §9.4)

- Queue, höchstens 4 offen (PRD 03.4); Zustellung aus der Queue **max. 1 Jugend-Post pro Kalenderwoche** (Mo–Fr-Slot).
- Jugend-Callbacks: Kachel mit Portrait + Token (Position, Alter, CA); Aktionen inline (Lucide), **kein** zweites Spieler-Hero-Panel.
- Schwere Post (Gegner-Analyse, Camp-Leiter): **Modal**; Scout-Job (Region/Verein): kompakte Inline-Zeile.
- **Archiv** (Liste unten): erledigte Posts, Club-Events und gelesene Scout-Jobs bleiben gespeichert — Zeile antippen **öffnet wieder** (nur Lesen, kein erneutes Entscheiden). **Der Treter:** Snapshot pro Woche in `kicker_edition_archive` (Save v84), Zeitung wie beim Erstlesen.
- **Emojis:** nur im Postfach erlaubt (design.md §4.2) — Archiv-Zeilen und Club-Event-Text (Stempel, Transfer-Teaser); Entscheidungs-Karten und Scout-Abschlüsse bleiben Lucide.

| Aktion | Icon (Lucide) |
|---|---|
| Leihen | RefreshCw |
| Hochziehen | ArrowUp |
| Vertrag | PenLine |
| Trainingsfokus | Dumbbell |

- „Leihen“ öffnet ein Karten-Deck der Zielvereine mit Minuten-Garantie-Badge.

**Screen 3 — Scouting Center**

- Kopfzeile: „Gut bekannt: 12 · Unklar: 43 · Unbekannt: 290“ (Konfidenz-Chips, keine Emoji).
- Suchleiste und Filter-Chips (Position, Alter, Konfidenz).
- Zeile: Portrait, Name, Alter, Position, zwei Balken. Die CI-Breite ist eine Grauzone auf dem Balken.

**Screen 3a — Scout-Karte**

- Vier Zonen (Filter-Labels aus Screen 3). Pro Zone: **bis zu 3×** „Region scouten ({tier}/{max})“ → Fremd-Verzeichnis wächst in Dritteln.
- Eigene Division: Clubs sofort sichtbar; fremde Division stückweise nach Region-Tier.
- Pool-Label: `{found} / ~{expected} ({pct}%)` nur für sichtbare Vereine; Hinweis Pool (Karte) vs. Wissen (Treffer/Assistent).
- Aktionen: „Region scouten“ / „Verein scouten“ (je ein aktiver Job-Typ); Fortschritts-Ring während des Jobs.
- Zone-Tönung nach Pool-Wissen (bekannt / unklar / blind), nicht nach Geburtsregion aller Rivalen.
- Job abgeschlossen → Postfach-Karte (Region erkundet / Verein im Pool), Lucide, „Verstanden“ + Link Netzwerk/Treffer; zählt zur Post-Badge, blockiert NEXT nicht.

**Screen 3b — Shortlist**

- Konfidenz-Icons und Sparkline.
- Push-Alerts als Karte von rechts, nicht als Textbanner.

**Screen 4 — Player Profile (Development-Tab)**

- Attributverläufe als Liniendiagramm über Saisons (`history.growth`).
- CI-Band nur bei fremden Spielern.
- Breakout-Timeline unter dem Chart. Lightbulb-Icon = sichtbares Event (PRD 06.5). Versteckte Events haben kein Icon.

### 09.3 Interaktions-Richtlinien

1. **Zwei-Klick-Regel:** Von jeder Pipeline-Information zur Aktion in höchstens 2 Klicks.
2. **Icon-Legende:** Der erste Hover erklärt das Icon. Danach steht ein „Bedeutungen“-Button in der Header-Bar.
3. **Kein Dead-End:** Mindestens ein sichtbarer Next-Action-Button pro Screen.
4. **Zustands-Deltas:** Änderungen seit dem letzten Besuch bekommen einen Punkt-Marker.
5. **Farbe plus Form:** Ampeln nie nur über Farbe. Immer mit Form koppeln (◆ / ▲ / ●).

### 09.4 Wireframe-Regel für Cursor

```typescript
/**
 * WIREFRAME: PRD 09.2 Screen 1 — Pipeline Dashboard
 *
 * ┌────────────────────────────────────────────────────────┐
 * │ [Chart: Pipeline-Füllung nach Stufe]                  │
 * │ [Training] Ampel Grün · [Focus] 2/2 Fokus              │
 * │ [Youth] 2 Empfehlungen · [Flag] 1 Abgangsrisiko      │
 * │ [Scouting] 3 Scouts aktiv · 7 offene Reports           │
 * │ [▶ Diese Woche simulieren]                            │
 * └────────────────────────────────────────────────────────┘
 */
```

Der Wireframe-Kommentar steht in jeder neuen `.tsx`-Datei, bevor die Implementation beginnt.

### 09.3 Kalender-Takt (P2)

Header-**NEXT** ist **kalendergebunden**: erst orientieren, dann Zeit/Spiel — **außer** im manuellen Training-Nexus (09.3b).

| Regel | Verhalten |
|---|---|
| **Global** | Montag + offene Jugend-Inbox → **Postfach**; sonst Navigation → **Kalender** (kein Tag verbraucht) |
| **Nur auf Kalender** | **+1 Wochentag** (`session.weekday`, Mo=1 … So=7) |
| Spielwoche | Auf dem Kalender: Fr→Sa oder Sa mit `match` → **Aufstellung** (`CareerLineupScreen`), nicht Live-Match vom Hub |
| Nach Spiel / Freiwoche | Tagweise bis **So**, dann `simulate_week` (nur auf Kalender) |
| Inbox | Montag + offene Jugend-Inbox → Postfach (global oder auf Kalender), **kein** Tag verbrauchen |
| Jugend-Queue | `deliverInboxForDays` pro NEXT-Tag; **max. 1** Queue→offen pro Kalenderwoche am Release-Wochentag (Mo–Fr) |
| Training-Erinnerung | **Entfernt** — kein blockierendes Postfach mehr für fehlenden Wochenplan (Training-NEXT ohne Plan-Gate). |
| **Der Treter (Di)** | Tabloid **«Der Treter»** im Postfach (kein NEXT-Blocker). Nach Mo-Training (3. Slot) oder Kalender-Di: Item erscheint, **ein** NEXT öffnet Postfach, danach Training weiter. Copy `treter-copy.ts`, Build `buildTreterEdition`. |

Kalender-UI (`CalendarScreen`): Monatsfokus; **`isToday`** = Zivil-Datum aus `(season, week, weekday)`; Transferfenster nur im Raster (kein Shell-Header-Chrome); kein WeekdayStrip; kein klickbarer Zellsprung in P2.

**Meilenstein-Chips (P2):** `collectCalendarMilestones(session)` liefert ETAs (Individualtraining-Ende, Verletzungsende, Camp-Leiter, Vertrags-Unlock, …). Anzeige über `filterCalendarMilestonesForReveal` — nur Meilensteine in der **aktuellen Spielwoche und früher**; spätere Wochen bleiben leer, bis `session.week` nachrückt (Montag-Reveal implizit beim Wochenwechsel, kein Postfach-Schritt, kein Save-Flag). Pro Zelltag max. zwei Chips + Overflow-Zähler; Vergangenheit als `is-past`. Montag: Kicker „Termine dieser Woche“; Chips der laufenden Woche optional `is-current-week`.

### 09.3b Training-Nexus (NEXT, manuelles Training)

Wenn `feature_curtain.auto_training` **aus** ist (Act 2+), ist die **Wochenplanung** der Zeit-Takt — nicht der Kalender.

```text
/** WIREFRAME: PRD 09.3b — Header NEXT = Trainingseinheit */

Hub (oder Training)                    Flash-Toast (ok)
┌──────────────────────────────┐      ┌─────────────────────────────┐
│ [NEXT] Trainingseinheit (12) │ ──▶  │ Di E2 · Passspiel: Müller   │
│                              │      │ +0.1 Passspiel              │
│ Training-Kachel → Plan       │      └─────────────────────────────┘
└──────────────────────────────┘

Leerer Slot → NEXT warn + Screen Training (Plan ergänzen).
15/15 Einheiten → `weekday` = Sa; danach Kalender-Takt (Spiel / So / Wochen-Sim).
Wochen-Sim: Team-Growth nur über NEXT-Einheiten; Wochenende = Verfall + Jugend/Individual.

Manager Desk (Hub v2): Montag nach Wochen-Sim wie jeder Werktag — **NEXT** startet Einheiten-/Tages-Flow ohne Kalender-Gate; Gegner scouten am **Hub** (Pflicht-Spalte unten links), nicht am Kalender.
Stundenplan: **gelb** = aktuelle Einheit (`is-current`); **grau** = abgeschlossene Einheiten (`training_units_completed`), nicht erst ganzer Tag.
```

| Feld / Regel | Verhalten |
|---|---|
| `training_units_completed` | 0–15 pro Spielwoche; Reset Montag nach `simulate_week` |
| `training_calendar_gate_done` | Legacy Pipeline-Kalender: nach Wochen-Sim `false` bis Kalender-NEXT. **Hub Desk:** Gate ignoriert (`MANAGER_DESK_HUB_ENABLED`). |
| NEXT (global) | Solange `< 15`: eine Einheit simulieren, Toast, Fortschritt +1 |
| Leerer Slot | Kein Growth; Toast + Navigation **Training** |
| Kalender | Nach 15/15 oder Act 1 (`auto_training`) wie 09.3 |
| Save | `pipeline.training_units_completed`, Migration 073 |

### 09.5 Career curtain (PRD 19)

Shell-Menü (⋮ TEAM) und Hub-Kacheln folgen `career_phase` / `feature_curtain` — nicht jeder Screen ist ab Tag 1 sichtbar.

```text
/** WIREFRAME: PRD 09.5 — Hub Act 1 vs full game */

Act 1 (act1_nordstern)                    Full (full / act3)
┌─────────────────────────────┐          ┌─────────────────────────────┐
│ ACTION │ STATUS │ CONTEXT    │          │ ACTION │ STATUS │ CONTEXT    │
│ Inbox  │ Season │ Board      │          │ (same)                       │
│        │ Train* │ Chronicle  │          │ Train  │ Scouting chip        │
│        │ Youth  │            │          │ Youth  │ Transfers/Stadium    │
│ *auto  │        │            │          │ manual training              │
└─────────────────────────────┘          └─────────────────────────────┘
⋮ Menu: Hub, Postfach, Squad, Youth,      ⋮ All TEAM items (PRD 14 menu)
        Calendar, Leagues, Help
        (no Scouting / Transfers / Stadium / Finances)
```

| `career_phase` | Hidden ⋮ entries | Training UI | Header training warn |
|----------------|------------------|-------------|----------------------|
| `act1_nordstern` | scouting, transfers, stadium, finances | Read-only banner; plan auto-filled after week sim | Off when `auto_training` |
| `act2_regional` | Per story beat (matrix PRD 19) | Unlocks with `manual_training` | On when manual |
| `act3_empire` / `full` | None | Full F2.1 | On when manual |

Deep-link: navigating to a hidden screen redirects to Hub (v1).

### 09.6 Act 4 surfaces (PRD 21)

Not shown on first launch (player goes straight to Nordstern opening). After international cup win + client unlock:

| Screen | Role |
|--------|------|
| `VictoryEndScreen` | Full-viewport end stinger; trophy + chronicle line; routes to career select |
| `TitleCareerSelect` | **Underdog saga** vs **Elite world** new career |
| `EliteWorldSetup` | Pick `elite_fantasy` league band + club (generator UI TBD) |

```text
/** WIREFRAME: PRD 09.6 — TitleCareerSelect (minimal) */

┌──────────────────────────────────────┐
│  The Club                            │
│  ┌────────────────┐ ┌──────────────┐ │
│  │ Underdog saga  │ │ Elite world  │ │
│  │ Nordstern · …  │ │ Unlocked ✓   │ │
│  └────────────────┘ └──────────────┘ │
│  [ Continue save ]   [ Spielstände ]   │
└──────────────────────────────────────┘
```

Presentation: Elite path uses PRD 20 `manager_desk`; underdog uses `storybook`. Dev: `?elite_world=1`.

## References

- Growth Engine: PRD 02.1 und PRD 02.4
- Youth Academy: PRD 03.3, PRD 03.4
- Scouting: PRD 04
- Player-Schema: PRD 07
- Breakouts: PRD 06.5
- Club-Cockpit (Dichte, Räume, Spielerakte, Jugend-Report): PRD 14
- Feature-Lücken vs. Referenz-DNA: PRD 15
- Career acts & curtain: PRD 19
- Act 4 / Elite World: PRD 21
- Live playtest gate: playtest_protocol.md
