# /docs/prd/09_ui_screens.md

**Version:** 1.4
**Last Updated:** 2026-10-03
**Status:** Final  

---

## Purpose

UI-Screens für den Talent-Pipeline-Block. 8 Screens plus zwei Modals. Wireframes als ASCII. Interaktion ist icon-first, mit der 2-Klick-Regel.

**PRD 14** ist verbindlich für Club-Cockpit, Dichte und „Raum vor Shell“.
Diese Datei bleibt die Inventarliste der acht Pipeline-Screens. Wo 09 und 14
bei Darstellung kollidieren (Grid-first, Text-Buttons, leere SaaS-Tabs),
gilt 14.

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
- Der Hub zeigt nur die drei stärksten und drei schwächsten Wochenzuwächse aus PRD 02.1 (Form plus Farbe). Die volle Heatmap sitzt in der Training-Übersicht. Die Fokus-Slots selbst stehen in PRD 02.4 (bis zu 3 von 5 Trainingsslots).
- Keine Kachel hat mehr als einen Satz Fließtext.

**Screen 1a — Individual Plan Modal**

- Links: Spielerkarte (Portrait, Position, 3 Kernattribute als Balken).
- Rechts: Programm-Dropdown, Dauer-Slider, Fatigue-Warnung als Icon (⚡ rot).
- Bestätigen wirkt ab der kommenden Woche.

**Screen 2 — Youth Campus (2D Iso)**

- Gebäude nach Academy-Level visuell unterscheidbar.
- Klick auf ein Gebäude wechselt nach 2a.
- Spieler-Badges im Grid, sortiert nach Coach-Icon (🚀 / ➡️ / ⚠️ / 😞).
- Abgangsrisiko: roter Rand, Klick öffnet die Decision Inbox.

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

## References

- Growth Engine: PRD 02.1 und PRD 02.4
- Youth Academy: PRD 03.3, PRD 03.4
- Scouting: PRD 04
- Player-Schema: PRD 07
- Breakouts: PRD 06.5
- Club-Cockpit (Dichte, Räume, Spielerakte, Jugend-Report): PRD 14
- Feature-Lücken vs. Referenz-DNA: PRD 15
