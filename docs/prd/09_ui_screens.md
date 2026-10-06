# /docs/prd/09_ui_screens.md

**Version:** 1.6
**Last Updated:** 2026-10-04
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
│ 🏋️ Training: [Ampel Grün]  🎯 3 Fokus-Slots gesetzt   │
│ 🏫 Jugend:   [⚠️ 2] Empfehlungen · [🚩 1] Abgangsrisiko│
│ 👁️ Scouting: [🟢 3] Scouts aktiv · [❓ 7] offene Reports│
│                                                        │
│ [▶ Diese Woche simulieren]                            │
└────────────────────────────────────────────────────────┘
```

Interaktion:

- Klick auf eine Status-Kachel springt in den Sub-Screen.
- Team-Heatmap (F2.7): **ein Quadrat = ein Spieler**, Farbe = Wochenzuwachs aus PRD 02.1. Desktop legt die Quadrate als ~3×8-Raster pro Stufe (Zelle ~8×8px, Hover zeigt Namen); Mobile nutzt größere Touch-Zellen ohne Zwischenschritt. Dieselbe Strip sitzt im Hub und in der Training-Übersicht. Die Fokus-Slots selbst stehen in PRD 02.4 (bis zu 3 von 5 Trainingsslots).
- Keine Kachel hat mehr als einen Satz Fließtext.

**Screen 1a — Individual Plan Modal**

- Links: Spielerkarte (Portrait, Position, 3 Kernattribute als Balken).
- Rechts: Programm-Dropdown, Dauer-Slider, Fatigue-Warnung als Icon (⚡ rot).
- Dropdown-Arten: Schwaches Bein, Positionsumschulung (F2.3), und freigeschaltete
  Stamp-Ziele (F2.8, `kind: "stamp"`) wenn das Gate erfüllt ist.
- Bestätigen wirkt ab der kommenden Woche.

**Screen 2 — Youth Campus (Grid)**

- Gebäude nach Academy-Level visuell unterscheidbar (SVG-Glyphen, kein Iso-Stadtmodell).
- Klick auf ein Gebäude wechselt nach 2a oder kauft die nächste Stufe.
- Spieler-Badges im Grid, sortiert nach Coach-Icon (🚀 / ➡️ / ⚠️ / 😞).
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

**Screen 2b — Decision Inbox Modal**

- Queue, höchstens 4 Items pro Woche (PRD 03.4), Abgangswarnung zählt mit.
- Pro Item: Spielerkarte und Icon-Buttons.

| Aktion | Icon |
|---|---|
| Leihen | 🔄 |
| Hochziehen | ⬆️ |
| Vertrag | ✍️ |
| Trainingsfokus | 💪 |

- „Leihen“ öffnet ein Karten-Deck der Zielvereine mit Minuten-Garantie-Badge.

**Screen 3 — Scouting Center**

- Kopfzeile: „✅ Gut bekannt: 12 · 🤷 Unklar: 43 · ❓ Unbekannt: 290“.
- Suchleiste und Filter-Chips (Position, Alter, Konfidenz).
- Zeile: Portrait, Name, Alter, Position, zwei Balken. Die CI-Breite ist eine Grauzone auf dem Balken.

**Screen 3a — Scout-Karte**

- Regionen nach Wissensgrad eingefärbt.
- Scouts als Pins. Klick ändert das Assignment.
- Fortschritts-Ring um den Pin.

**Screen 3b — Shortlist**

- Konfidenz-Icons und Sparkline.
- Push-Alerts als Karte von rechts, nicht als Textbanner.

**Screen 4 — Player Profile (Development-Tab)**

- Attributverläufe als Liniendiagramm über Saisons (`history.growth`).
- CI-Band nur bei fremden Spielern.
- Breakout-Timeline unter dem Chart. 💡 = sichtbares Event (PRD 06.5). Versteckte Events haben kein Icon.

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
 * │ 🏋️ Training: [Ampel Grün]  🎯 3 Fokus-Slots gesetzt   │
 * │ 🏫 Jugend:   [⚠️ 2] Empfehlungen · [🚩 1] Abgangsrisiko│
 * │ 👁️ Scouting: [🟢 3] Scouts aktiv · [❓ 7] offene Reports│
 * │ [▶ Diese Woche simulieren]                            │
 * └────────────────────────────────────────────────────────┘
 */
```

Der Wireframe-Kommentar steht in jeder neuen `.tsx`-Datei, bevor die Implementation beginnt.

### 09.3 Kalender-Takt (P2)

Header-**NEXT** ist **kalendergebunden**: erst orientieren, dann Zeit/Spiel.

| Regel | Verhalten |
|---|---|
| **Global** | Montag + offene Jugend-Inbox → **Postfach**; sonst Navigation → **Kalender** (kein Tag verbraucht) |
| **Nur auf Kalender** | **+1 Wochentag** (`session.weekday`, Mo=1 … So=7) |
| Spielwoche | Auf dem Kalender: Fr→Sa oder Sa mit `match` → **Aufstellung** (`CareerLineupScreen`), nicht Live-Match vom Hub |
| Nach Spiel / Freiwoche | Tagweise bis **So**, dann `simulate_week` (nur auf Kalender) |
| Inbox | Montag + offene Jugend-Inbox → Postfach (global oder auf Kalender), **kein** Tag verbrauchen |
| Jugend-Queue | `deliverInboxForDays(..., 1)` pro Kalender-NEXT-Tag, nicht Multi-Day-Sprünge |
| Training-Erinnerung | Kalender + Assistenten-Toggle „Wochenplan“: fehlt Fokus am **aktuellen** Mo–Fr-Tag, **einmal pro Spielwoche** blockierendes Postfach vor Tag+1; danach normale NEXT-Kette |

Kalender-UI (`CalendarScreen`): Monatsfokus; **`isToday`** = Zivil-Datum aus `(season, week, weekday)`; Transferfenster nur im Raster (kein Shell-Header-Chrome); kein WeekdayStrip; kein klickbarer Zellsprung in P2.

**Meilenstein-Chips (P2):** `collectCalendarMilestones(session)` liefert ETAs (Individualtraining-Ende, Verletzungsende, Camp-Leiter, Vertrags-Unlock, …). Pro Zelltag max. zwei Chips + Overflow-Zähler; Vergangenheit als `is-past`. Kein Montag-Reveal-Gate in v1 — Chips sind ab Wochenstart sichtbar.

## References

- Growth Engine: PRD 02.1 und PRD 02.4
- Youth Academy: PRD 03.3, PRD 03.4
- Scouting: PRD 04
- Player-Schema: PRD 07
- Breakouts: PRD 06.5
- Club-Cockpit (Dichte, Räume, Spielerakte, Jugend-Report): PRD 14
- Feature-Lücken vs. Referenz-DNA: PRD 15
