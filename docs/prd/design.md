# Design-PRD: Visuelle Sprache & Komponenten

**Projekt:** The Club (Fußball-Manager)
**Datei:** `docs/prd/design.md`
**Version:** 0.4 · Status: verbindliche Design-Referenz
**Referenzbilder:** `docs/design-refs/design.png`, `docs/design-refs/lumo/` (Layout only, not shipped)
**Ziel:** Dieses Dokument ist die alleinige Design-Wahrheit. Cursor baut jeden Screen ausschließlich aus den hier definierten Tokens, Komponenten und Wireframes. Bei Konflikten gilt: dieses Dokument > bestehender Code > improvisierte Lösungen.

---

## 1. Design-Philosophie: "Fernsehnachmittag"

Gedecktes Anime/Comic-Feeling eines sonnigen Nachmittags im Stadion. Warm, flach, kohärent.

**Fünf Grundregeln:**

1. **Grün ist der Star.** Rasen-Grün ist die dominante Marke; Partnerfarben sind neutral-warm oder sein Komplementär. Keine Farbe konkurriert mit Grün.
2. **Nur 1× Gelb.** Der NEXT-Button ist das einzige gelbe Element im gesamten Spiel. Niemand sonst darf Honiggelb verwenden.
3. **Aus einem Guss.** Gleiche Icon-Familie, gleiche Radien, gleiche Outline-Stärke überall. **Emojis sind verboten** (auch als Platzhalter).
4. **Dichte ist erlaubt.** Desktop-first. Tabellen dürfen 12+ Spalten haben. Mobile ist komprimierter Nachbau (Drawer), kein Redesign.
5. **Keine KI-generierten Assets.** Alles visuelle kommt aus SVG-Komponenten, CC0-Texturen und öffentlichen Icon-Sets.

---

## 2. Farbtokens

```css
:root {
  /* Flächen */
  --bg-sand:        #F5EFE0;   /* Screen-Hintergrund */
  --panel:          #FDFBF4;   /* Content-Karten */
  --panel-muted:    #EFEBDD;   /* Sekundäre Flächen, Tab-Leisten */

  /* Marke */
  --rasen:          #2E9E46;   /* Primär: aktive States, Kaufen-Buttons */
  --rasen-dunkel:   #1D6B31;   /* Hover, gedrückte States */
  --rasen-hell:     #BFDEC2;   /* Deaktivierte Tags, Inaktiv-Markierung */

  /* Akzente (sparsam!) */
  --sonnengelb:     #FFC933;   /* NUR der NEXT-Button. Streng exklusiv. */
  --terra:          #E07A3F;   /* Warnungen, negative Balken, Talent-Marker */
  --terra-dunkel:   #B85A28;

  /* Neutral */
  --tinte:          #3E3128;   /* Text, Outlines (warmes Braun statt Schwarz) */
  --tinte-weich:    #6B5D4F;   /* Sekundärtext */
  --staubblau:      #9DBFD0;   /* Info-Chips, neutrale Tag-Hintergründe */

  /* Feedback */
  --erfolg:         var(--rasen);
  --fehler:         var(--terra);

  /* Outlines & Radien */
  --outline:        2px solid var(--tinte);
  --outline-weich:  2px solid rgba(62, 49, 40, 0.25);
  --radius:         12px;
  --radius-klein:   8px;
  --shadow:         0 2px 0 rgba(62, 49, 40, 0.15);   /* flacher Versatz, kein Blur */
}
```

**Regeln:**
- Text auf `--rasen` und `--sonnengelb`: immer `--tinte` (nicht weiß – warmes Braun gehört zur Marke).
- Statusfarben: grün = positiv, terrakotta = negativ/hervorgehoben, staubblau = informativ/neutral. Nie rot-blau mischen.
- Keine Verläufe auf Panels. Subtile Schatten nur als flacher 2px-Versatz (Comic-Stil).

### 2.1 Implementation (PRD 20)

Komponenten-Verträge, CSS-Kaskade, Migrations-Phasen und Screen-Audits leben in
**[20_design_language.md](./20_design_language.md)**. Neue UI nutzt Primitives unter
`src/ui/components/primitives/` — keine dritte Chip-/Modal-Variante pro Screen.

### Global shell override (`design-repair.css`)

`src/ui/design/design-repair.css` is imported **after** `design-tokens.css` and `game-surfaces.css` in `main.tsx`. It is **not** a third design system: it applies legacy “repair P0” rules that still sit outside token-only screens (sand page background on non-shell routes, comic `--outline-tinte` on legacy `.panel` / `.card` selectors, circular nav tab pills). New UI must use **tokens + `game-surfaces.css`** only; extend repair only when unblocking a legacy route — prefer migrating rules into tokens/game-surfaces and deleting repair over time.

### Asset-Farbanpassung (Remapping)
Kenney-Tiles und SVGs kommen in eigenen Farben. Bevor sie ins Projekt einfließen, müssen ihre Fill-Farben auf unsere Tokens gemapped werden.
- **Regel:** Nie originale Kenney-Farben übernehmen.
- **Mapping-Beispiel:**
  - Kenney-Rasen-Grün → `var(--rasen)` (#2E9E46)
  - Kenney-Linien-Weiß → `var(--rasen-hell)` (#BFDEC2)
  - Kenney-Tribünen-Blau → `var(--staubblau)` (#9DBFD0)
  - Kenney-Akzente → `var(--terra)`, `var(--rasen)` oder `var(--staubblau)` — **nie** `--sonnengelb` (reserviert für NEXT)
- **Umsetzung:** Erstelle eine `assets/kenney-color-map.json` oder führe das Remapping direkt in den SVG-Dateien durch, bevor sie in `public/assets` landen.

---

## 3. Typografie

| Rolle | Font | Gewichte |
|---|---|---|
| Display / Überschriften / Buttons / Zahlen im Fokus | **Baloo 2** (Fallback: Fredoka) | 600, 700 |
| Fließtext / Tabellen / Labels | **Nunito** | 400, 600, 700 |

```css
--font-display: 'Baloo 2', 'Fredoka', system-ui, sans-serif;
--font-body: 'Nunito', system-ui, sans-serif;
```

- Beide via Google Fonts (OFL-Lizenz) oder self-hosted.
- Scale: H1 24px / H2 20px / Body 15px / Table 14px / Meta 12px.
- Zahlen in Stat-Kontexten immer `font-family: var(--font-display)` – das ist ein Wiedererkennungsmerkmal.

---

## 4. Icons

- **Set:** Lucide Icons, gefüllt/phosphor-fill bevorzugt; wenn nur Outline verfügbar: `stroke-width: 2.5`.
- **Größen:** 16px (inline), 20px (Buttons/Tabs), 24px (Nav), 32px (Feature).
- **Absolute Verbotsliste:** Emojis als Icons. Jedes Emoji im Code ist ein Bug. Ersatz-Mapping beim Migrieren: 🌭→utensils, 🍺→beer, 👕→shirt, 🅿️→circle-parking, 🚌→bus, 🚃→train-front, 💰→wallet, 🎫→ticket, 🤝→handshake, 📺→tv, 🏗️→construction, 👷→hard-hat.
- Icons erben die Textfarbe; nie eigenständige Icon-Farben einführen.

### 4.1 Filter-Chips (Pills)

Position-, Sortier- und Scout-Filter sind **ein** Baustein (`FilterChip`):

- Inaktiv: `--panel` Füllung, `--outline`, `--radius-chip`
- Aktiv: `--rasen` Füllung, Text `--tinte`
- **Niemals** `--sonnengelb` / `--accent-primary` für aktive Filter (nur Header-NEXT)

---

## 5. Wappen (SVG-Komponente, kein KI-Gen)

Parametrische React-Komponente statt Bilddateien:

```tsx
<Crest initials="NO" color={--rasen} symbol="star" />
```

- Grundform: flacher Kreis oder einfacher Schild-Pfad, gefüllt mit Vereinsfarbe, 2px `--tinte`-Outline.
- Inhalt: 2 Initialen in `--font-display` + ein Symbol aus dem Icon-Set (star, shield, lightning, mountain…).
- Prozedural generierbar → jedes Fantasy-Team bekommt ein konsistentes Wappen aus demselben Baukasten.
- Nichts von Wikimedia/Heraldik laden – der parametrische Ansatz ist Pflicht, damit die Wappen zur Icon-Sprache passen.

---

## 6. Header (fixe Komponente, auf JEDEM Screen identisch)

**Flach, nahtlos, ohne Border und Outline – der Sand-Hintergrund läuft durch.**

```
┌─────────────────────────────────────────────────────────────--┐
│ [Wappen] NORDSTERN 03  · 3.  · € 7.69 Mio      Menu   [NEXT ▶]│
│  (display-font)  (meta, grau, 12px)           (Link) (gelb)   │
└──────────────────────────────────────────────────────────────-┘
```

- **Links = Identität:** `<Crest>` + Klubname (Display-Font). Danach zwei Meta-Labels: Tabellenposition und Kasse (`--tinte-weich`, 12px, durch ` · ` getrennt).
- **Rechts = Fortschritt:** 
  - `Menu`: Desktop = schlichter Textlink (`--tinte`, Nunito 600). Mobile (<768px) = Burger-Icon.
  - `NEXT ▶`: chunky pill-button, `--sonnengelb`, `--radius`, Display-Font, Text `--tinte`, flat shadow. **Einzige Gelbstelle im Spiel.**
- Höhe: 56px Desktop / 52px Mobile. Sticky top, `z-index: 50`.
- **Kein Wochenzyklus im Header.** (bewusst entfernt)

### Dropdown-Menü (öffnet aus dem Menu-Button)

Bei Klick öffnet ein Panel **unterhalb** des Headers (nicht fullscreen), FM2001-Stil – kategorisiert, mit Auswahl-Highlight:

```
┌─ MENU ────────────────────────┐
│ TEAM                          │
│   ├ Hub                       │
│   ├ Kader                     │
│   ├ Training                  │
│   ├ Aufstellung      ● aktiv  │   ← aktiver Screen: grün gefüllt,
│   ├ Jugend                    │      Text `--tinte` auf `--rasen`
│   ├ Scouting                  │
│   ├ Transfers                 │
│   ├ Kalender                  │
│   ├ Tabellen                  │
│   ├ Analyse                   │
│   ├ Finanzen                  │
│   └ Postfach (1)              │      ← Badge mit offenen Entscheidungen
│                               │
│ SPIEL-OPTIONEN                │
│   ├ Speichern                 │
│   └ Einstellungen             │
└───────────────────────────────┘
```

- Panel: `--panel`, `--outline`, `--radius-klein`, flat shadow. Breite 240px, am rechten Rand rechtsbündig.
- Kategorie-Header: 11px uppercase, `--tinte-weich`, letter-spacing.
- Menüpunkte: Icon (20px) + Label, 12px Padding, Hover `--panel-muted`, aktiv `--rasen` gefüllt, Label `--tinte` (Display optional fetter).
- Verhalten: Click-outside und ESC schließen. Mobile (<768px): dieselbe Struktur als Drawer von rechts, Header bleibt sichtbar.

---

## 7. Layout-Grid

**Desktop-first.** Basis-Grid für jeden Screen unterhalb des Headers:

```
┌──────────────────────────────────────────────────────────────┐
│ SCREEN-TITEL (H1)                       [Tab A][Tab B][Tab C]│
├──────────────────────────────────────────┬───────────────────┤
│                                          │                   │
│  PRIMARY (flexible, min 60%)             │  CONTEXT (320px   │
│                                          │  fix, optional)   │
│                                          │                   │
└──────────────────────────────────────────┴───────────────────┘
```

- Max-Content-Breite: 1280px, zentriert, Seitenpadding 24px.
- **Context-Spalte (rechts, 320px):** nur wo sinnvoll (Aufstellung, Kalender) – keine Pflicht. Per Screen in der Wireframe-Sektion festgelegt.
- Screen-Titel-Zeile: H1 links, Screen-lokale Tabs/Filter rechts.
- Panels im Primary-Bereich: `--panel` + `--outline-weich` + `--radius`; große Hero-Flächen (Illustration, Pitch) bekommen das kräftige `--outline`.

**Breakpoints:**

| ≥1024px Desktop | 768–1023 Tablet | <768 Mobile |
|---|---|---|
| Volles Grid, Context-Spalte | Grid, Context unter Primary | Alles gestapelt, Menu = Drawer, Tabellen horizontal scrollbar mit sticky erster Spalte |

Mobile ist bewusst Afterthought: gleiche Komponenten, nur gestapelt. Keine eigenen mobilen Designs.

---

## 8. Texturen

- CC0-Texturen (Halftone/Papier) ausschließlich als **Overlay auf großen Hintergrundflächen**: `body` und Full-Bleed-Illustrationen.
- `opacity: 0.04–0.08`, `pointer-events: none`.
- **Nie** auf Panels mit Text, Buttons, Tabellen – Lesbarkeit geht vor Atmosphäre.

---

## 9. Wireframes pro Screen

**Index §9.1–§9.15** (lückenlos). Gelände-Editor lebt nur unter **§9.3 Tab Gelände** — kein eigenes §9.9.

Allgemeine Regeln: `[...]` = anklickbar, `●` = aktiver Zustand, Wireframes definieren **Proportionen und Nachbarschaften, keine Pixelmaße** – die kommen aus den Tokens.

### 9.1 Aufstellung
```
H1 "Aufstellung"                    [Best XI ●][Rotation][Talente]
┌──────────────────────────────┬──────────────-┐
│ PITCH (Hero-Panel)           │ GEGNER-KARTE  │
│  4-3-3 Chips, animiert       │ SÜD · 4-4-2   │
│  Drag&Drop Chips             │ Spieltag-Info │
│                              ├──────────────-┤
│                              │ TAKTIK        │
│                              │ Presets:      │
│                              │ [Ballbesitz ●]│
│                              │ [Kompakt]     │
│                              │ [Offensiv]    │
│                              │ Score 58/64/56│
├──────────────────────────────┴─────────────-─┤
│ KADER-TABELLE (volle Breite, dicht):         │
│ Pos | Name | Alter | CA | Form | Einsatz     │
└─────────────────────────────────────────────-┘
```
- Pitch: Vollflächiges `--rasen` mit weißen Feldlinien (CSS/SVG), Player-Chips = `--panel`-Karten mit Mini-Avatar (Open Peeps) + Name + Rating (Display-Font).
- **Portraits:** Open Peeps Busts (CC0), gebacken mit design-Tokens (tinte, warme Haut, rasen-hell auf Kit-Bodies). `portrait_seed` → Bust-ID über **Pool**: `mens_squad` (Spieler auf dem Platz — **Allowlist** sportlicher Bodies + ohne klar weiblich codierte Heads im Katalog-Script), `mixed` (Trainer/Staff), `womens_squad` (reserviert). Katalog: `src/ui/portraits/portrait-bust-catalog.json` via `npm run bake:portraits`. Kein Gender-Feld am Player in v1 — nur visuelle Pools.
- Talent-Marker: kleines `--terra`-Dreieck oben rechts am Chip.
- Context-Spalte hier: Pflicht (Gegner + Taktik).

### 9.2 Finanzen
```
H1 "Finanzen · Monat 1"                     [Monat ◀ ▶]
┌──────────────────────────────┬──────────────┐
│ HAUPTTABELLE                 │ KPI-KARTEN   │
│ Posten | Betrag | Balken     │ Kasse        │
│ Verkauf   +1.59M ▓▓▓▓▓▓      │ 7.69 Mio     │
│ Eintritt  +110k  ▓▓          │──────────────│
│ Sponsoring +55k  ▓           │ Transfer-Topf│
│ Gehälter  -41k   ▪▪          │ 3.29 Mio     │
│ Personal  -29k   ▪▪          │──────────────│
│ ...                          │ Gehalts-Cap  │
│ Saldo: +1.69 Mio             │ 35k/85k ▓▓░  │
└──────────────────────────────┴──────────────┘
```
- Einnahmen-Balken `--rasen`, Ausgaben `--terra`, gleiche Skala, Breite proportional.
- Pro Zeile: Icon (Lucide) links vom Postennamen. Zahlen rechtsbündig, Display-Font.
- KPI-Karten: gestapelt in Context-Spalte.



### 9.3 Stadion (Tabs: Grundriss | Gelände | Ausbau)

Der Grundriss ist jetzt ein echtes Preissteuerungs-Cockpit pro Tribüne (±€, Bande frei, Auslastung, Heimspiel-Erlös je Sektor), das Gelände hat ein Effekte-Panel (13/14 belegt, Zuschauer/Stadt/Fans/Training/Kasse-Boni) bekommen, und der Ausbau hat Stufen-Logik (1/2, Max, Kaufen). Hier der überarbeitete §9.3, der die drei Tabs mit derselben Hub-Spaltenlogik konsolidiert:


┌─[Header]────────────────────────────────────────────────────┐
│ H1 "Nordstern Arena"        [Grundriss][Gelände][Ausbau ●]  │
├────────────────────────────────────────────────────────────-┤
│ STRIP (allen Tabs gemein): 10.800 Plätze · Ø €18 ·          │
│ Heimspiel €170k · Fanbase 52.51 (+0.4 ▲rasen)               │
├──────────────────────────────┬─────────────────────────────-┤
│ TAB GRUNDRISS: SEKTOR-COCKPIT│ TAB GELÄNDE: EDITOR          │
│                              │                              │
│ ┌STADION-PLAN (SVG)─────-┐   │ ┌BAU-GRID (Canvas)───────┐   │
│ │ Top-Down-Rasen, N/W/O/S│   │ │ Drag&Drop aus Palette, │   │
│ │ Tribünen als klickbare │   │ │ Kollision terra, Lv2-  │   │
│ │ Segmente. Gewählter    │   │ │ Tags, Preise auf Tiles │   │
│ │ Sektor: --rasen Outline│   │ └─────────────────────--─┘   │
│ └───────────────────────-┘   │ ┌PALETTE (unten/schmal)──┐   │
│                              │ │ Gastro/Verkehr/Infra/  │   │
│ ┌SEKTOR-Detail (aktuell)─┐   │ │ Grün, gruppiert, mit   │   │
│ │ Nordkurve · 3.200 · St │   │ │ €-Preis + Footprint    │   │
│ │ ▲98% Auslastung        │   │ └────────────────────────┘   │
│ │ ~3.129 Zuschauer       │     ┌EFFEKTE-SPALTE (rechts)─┐   │
│ │ Preis: €12 [−][+]      │   │ │ Gesamt: 13/14          │   │
│ │ [Bande frei ×3]        │   │ │ Zuschauer +4.8%        │   │
│ │ Heimspiel €38k         │   │ │ Stadt +1.8% · Fans …   │   │
│ └───────────────────────-┘   │ │ Training/Kasse als €-  │   │
│ (Wechseln via Plan-Klick)    │ │ Zeilen                 │   │
│                              │ └────────────────────────┘   │
├──────────────────────────────┴──────────────────────────────┤
│ TAB AUSBAU: Upgrade-Karten-Liste (§9.3a unten)              │
└─────────────────────────────────────────────────────────────┘


Gemeinsamer Kopf über allen drei Tabs: Illustration/Foto als atmosphärisches Band ist dem Stat-Strip gewichen (10.800 Plätze · Ø €18 · Heimspiel €170k · Fanbase mit Trend-Chip). Das Foto bleibt als dekoratives Element hinter dem Strip optional (Halftone überlagert).

##TAB GRUNDRISS – das Preiskalkulationsspiel:

```
┌SEKTOR-DETAIL (rechts, klick-gesteuert aus Plan)─────────┐
│ [standing-icon] NORDKURVE                               │
│ 3.200 Plätze · Stehplatz                                │
│ Auslastung ▲98% (+13%) · ~3.129 Zuschauer               │
│                                                         │
│ TICKETPREIS  €12          [ − €1 ] [ + €1 ]             │
│ BANDEN-SLOTS [frei 1][frei 2][frei 3]  (aktivierbar)    │
│ Erlös Heimspiel: €38k                                   │
└────────────────────────────────2 Bibf-------------------┘
```


Der Plan ist ein SVG-Top-Down des Stadions: Rasen als --rasen-Fläche, die vier Tribünen-Segmente (Nordkurve/Südkurve als Stehplatz, West/Ost als Sitzplatz) plus Business-Loge als klickbare Shapes mit --outline. Gewählter Sektor bekommt die --rasen-Füllung, Auslastung schimmert als Hell-Dunkel-Tönung im Segment.
Im Sektor-Detail: alles, was vorher lose gestapelt war, jetzt kontextuell – der Preis-Stepper ist die primäre Interaktion, Bande frei als Toggle-Chips, Erlös als Display-Font-Zahl.
Regel: Preis-Feedback sofort. Jede ±-Aktion aktualisiert geschätzte Auslastung und Heimspiel-Erlös live (bestehende Matchday-Commerce-Schätzung aus PRD 11 / Economy — keine neue Sim ohne PRD-Update).
Shirt-Slot / VIP-Hinweise werden als kleine Badges an den betroffenen Segmenten angezeigt, nicht als Floaties.

#### TAB GELÄNDE – der Baukasten:

Bauraster 3:2 (20×12), Straßenkacheln dunkelgrau gefärbt im Token, Palette unten quer als horizontale Gruppe (Gastronomie | Verkehr | Infrastruktur | Grün) – die Gruppenköpfe wie im Menü-Dropdown formatiert.
Tile-Kosten (€320k) und "Lv2"-Tags direkt auf der Palette, nicht aufs Grid.
Das Effekte-Panel rechts (280px, sticky): Kopf "EFFEKTE · 13/14" mit Gesamtzähler, darunter die fünf Wirkgruppen als kompakte Zeilen (Icon + Wert). Es ist die Belohnungs-Anzeige fürs Bauen – der Grund, warum man kauft. Bei 14/14: kleine Feier-Animation (--rasen-Puls).
Orientierungs-Labels (links oben / rechts unten …) ersetzt durch dezente Kompassspitze N oben mittig.

#### TAB AUSBAU – Upgrade-Pfad:

```
┌UPGRADE-KARTE────────────────────────────────────────────┐
│ [steuropeople-icon] STEHPLATZ-ERWEITERUNG               │
│ +800 Plätze in beiden Kurven · extra Werbebanden        │
│ Stufe 1/2 ●●○ · Preis €878k                             │
│                                    [Kaufen --rasen]     │
└─────────────────────────────────────────────────────────┘
```

- Karten als vertikale Liste (volle Breite unter dem Stat-Strip), gleiche Struktur wie Jugend-Abausbau (jetzt inklusive der Nachwuchs-Kategorie Jugendhaus/Leistungszentrum/Elite-Akademie aus §9.12 (Jugend) – und zwar als eigene Kategorie-Zwischenüberschrift "NACHWUCHS" zwischen den Stadion-Upgrades und den Rasenheizung & Co.-Upgrades).
- Max-Level: Karte kollabiert zu kompakter Zeile mit ✓-Badge, kein Kaufen-Button.
- Ungleich finanzielle Lage: Button --rasen-hell, Preis --terra.

Zusätzlich eine übergreifende Regel, die die drei Tabs verbindet:
```
- Tab-Verbund: Grundriss (Betrieb) → Gelände (Bau) → Ausbau (Investition).
  Neue Funktionen werden genau einer dieser drei Rollen zugeordnet.
  Der gemeinsame Stat-Strip zeigt die Rendite-Resümee-Zahlen, die
  alle drei betreffen (Plätze, Ø-Ticket, Heimspiel-Erlös, Fanbase).
```

Damit hat der Stadion-Screen jetzt dieselbe Lesehilarchie wie Hub und Profil: oberer Strip = Scoreboard, links/oben = Interaktion, rechts = Effekte/Erlös.

---


### 9.4 Entscheidungen / Postfach
```
H1 "Entscheidungen"                      [Alle erledigt ▶]
┌──────────────────────────────────────────────┐
│ POST · 1/4 · KW 36                           │
│ ┌──────────────────────────────────────────┐ │
│ │ [Avatar] Felix Hoffmann · RB · 16 · CA 82│ │ ← offen:
│ │ ⚠ Trainerhinweis (terra)                 │   grüne
│ │ "Wenig Spielzeit — Abgang droht"         │   Outline
│ │ [Leihen][Jugendvertrag][Später]          │ │
│ └──────────────────────────────────────────┘ │
│ ┌──────────────────────────────────────────┐ │
│ │ [erledigte Karten, kompakter, gegraut]   │ │
│ └──────────────────────────────────────────┘ │
└──────────────────────────────────────────────┘
```
- Kein Modal-Overlay – das Postfach ist ein voller Screen.
- Offene Entscheidung: `--outline` in `--rasen`, erledigte: `--outline-weich`, Avatar ausgegraut.
- Action-Buttons: sekundär (Panel-Optik), nur die empfohlene Standard-Aktion bekommt `--rasen`-Fill.
- Badge im Menü ("Postfach (1)") zeigt Anzahl offener Entscheidungen.

### 9.5 Kalender
```
H1 "Saison 2026"                        [◀ August ▶]
┌──────────────────────────────────────────────┐
│ MONATS-GRID (7 Spalten)                      │
│ Spieltag-Chips: [Heim vs SÜD] [Ausw. @ OST]  │
│ Marker: Pokal=Trophy-Icon, Verletzung=terra  │
└──────────────────────────────────────────────┘
```
- Zellen: `--panel-muted`, Spieltage als kleine Chips mit Vereinswappen-Miniaturen (`<Crest>` wiederverwenden!).
- Mo/Sa/So (die drei aktiven Spieltage) deutlich markiert: fette Outline, inaktive Tage reduziert.

---


### 9.6 Transfers


Der Transferbereich besteht aus zwei Ansichten: **Überblick** (Standard) und **Markt** (Interaktiv).

#### A) Überblick (Standard-Screen)
- **Header:** Titel + Fenster-Status (Offen/Geschlossen) + Dropdown für Fensterwahl.
- **Nächste Aktionen:** Horizontale Kartenliste mit Spielern, deren Vertrag bald ausläuft (z.B. "noch 24 Monate"). Klick führt zum Spielerprofil.
- **Aktive Ausleihen:** Kompakte Liste oder "Keine Spieler verliehen".
- **Liga-Markt (Feed):** Chronologische Liste der letzten Transfers in der Liga (Spielername, Verein → Verein, Preis, Woche).
- **Historie:** Filterbare Liste aller eigenen Transfers (Abgänge/Eingänge) mit Preis und Datum.
- **Keine Eingabefelder.** Nur Navigation zu Profil oder Markt.

```

┌─[Header]──────────────────────────────────────────────────────┐
│ H1 "Transfers" · [Sommerfenster offen ▼]                      │
├───────────────────────────────────────────────────────────────┤
│ STATUS-BANNER: "Fenster geschlossen" (--terra) oder "Offen" (--rasen)│
│ Nächste Aktionen (3): [Finn Bergmann][Erik Voss][Felix Weber] │
├───────────────────────────────────────────────────────────────┤
│ AKTIVE AUSLEIHEN (Liste)                                      │
│ Keine Spieler derzeit verliehen.                              │
├───────────────────────────────────────────────────────────────┤
│ LIGA-MARKT (Feed)                                             │
│ Aktuelle Deals dieser Saison:                                 │
│ [Icon] Erik Hansen: SAL → SCH · €1.51 Mio · KW 36             │
│ [Icon] Enno Arslan: TAN → SEE · €1.16 Mio · KW 36             │
├───────────────────────────────────────────────────────────────┤
│ HISTORIE (Filter: 2026)                                       │
│ Abgang · Jonas Çelik · WAL · €2.11 Mio · KW 36                │
│ Abgang · Karim Koch  · SAL · €606k  · KW 36                   │
│ Liga-Transfer · Erik Hansen ...                               │
└───────────────────────────────────────────────────────────────┘

```

#### B) Markt (Interaktiv)
- **Trigger:** Button "Markt durchsuchen" im Überblick oder direkter Link.
- **Filter-Leiste:** Position, Alter, Max. Marktwert, Nur Talente (Checkbox).
- **Tabelle:** Dichte Liste mit Pos, Name, Alter, CA, MW, Interesse (Wappen-Reihe).
- **Interaktion:** Klick auf Zeile öffnet **Ausklapp-Bereich** direkt unter der Zeile (kein Modal).
  - **Inhalt des Ausklapps:** Kurz-Attribute (Top 5), Scout-Bericht (Text), **Verhandlungs-Controls** (Ablöse-Stepper, Gehalt, Vertragslänge, Button "Angebot senden").
  - **Status-Badges:** Prüfung (staubblau), Angenommen (rasen), Abgelehnt (terra).
- **Rechte Spalte (Context):** "Eigene Offerten" – Liste der laufenden Angebote mit Status und [Zurückziehen]-Button.

```
┌─[Header]──────────────────────────────────────────────────────┐
│ H1 "Transfermarkt" · [Sommerfenster offen]                    │
│ Filter: [Pos ▼][Alter][MW][Nur Talente]                       │
├──────────────────────────────────────────────┬────────────-───┤
│ MARKT-TABELLE (Scout-Liste)                  │ EIGENE OFFERTEN│
│ Pos | Name | Alter | CA | MW | Int.          │ 3 aktiv / 1 ein│
│ ───────────────────────────────────────────  │ ┌────────────┐ │
│ [Zeile: Erik Hansen]                         │ │ Miller →   │ │
│   ↓ Ausklapp:                                │ │ OFC · €850k│ │
│   ┌Attributes|Scout-Report|Verhandeln─────┐  │ │ [Zurück-   │ │
│   │ Pass 80 | "Schneller RB, braucht..."  │  │ │ ziehen]    │ │
│   │ [Ablöse +][Gehalt +][Vertrag +]       │  │ └────────────┘ │
│   │ [Verhandeln starten ▶]                │  │                │
│   └───────────────────────────────────────┘  │                │
└──────────────────────────────────────────────┴──────-─────────┘
```

#### C) Regeln
- **Fenster-Disziplin:** Wenn das Fenster geschlossen ist, ist der "Markt"-Tab deaktiviert/grau. Nur der Überblick ist lesbar.
- **Verhandlungs-Flow:** Inline in der Tabelle. Kein separates Modal für das Angebot.
- **Scouting:** Die angezeigten CA/MW-Werte sind die **Scout-Schätzungen** des eigenen Vereins (Fog of War), nicht die wahren Werte (siehe PRD 05.2).

Das erklärt den Unterschied: Der Screenshot ist der Informations-Hub, dein Wireframe ist das Arbeitswerkzeug. Beide gehören zusammen.


### 9.7 Tabellen (Liga)

```
H1 "2. Liga · Spieltag 2"
┌──────────────────────────────────────────────┬──────────────────-┐
│ LIGA-TABELLE                                 │ EIGENER CLUB      │
│ # | Wappen | Verein | Sp | S | U | N | Tore  │ │ Nordstern 03    │
│ Diff | Pkt                                   │ Platz 3 · 4 Pkt   │
│ 1..18, Spieltags-Wechsel mit Pfeilen         │ Form: S-U-S (Chips│
│                                              │  ●terra ●staubb.  │
│ Trennlinien:                                 │  ●rasen)          │
│ Aufstieg nach Z. 3 (grün)                    │──────────────────-│
│ Abstieg ab Z. 16 (terra)                     │ NÄCHSTES SPIEL    │
│                                              │ Sa · Heim vs KDV  │
│ Eigene Zeile: immer sichtbar fixiert         │ (Mini-Wappen)     │
│ + Outline                                    │                   │
└──────────────────────────────────────────────┴──────────────────-┘
```

Klassische Dichtetabelle ohne Schnörkel – das ist der FM2001-Herzstück-Screen, hier ist Reinheit das Design.
Farb-Zonen statt Legende: dünne --rasen / --terra Linien nach Zeile 3 bzw. vor 16.
Eigene Zeile: sticky unter dem Header fixiert (auch beim Scrollen sichtbar) + 2px --rasen-Outline.
Form-Chips: kleine Kreise, Sieg --rasen, Unentschieden --staubblau, Niederlage --terra.
Torschützen-Liste als Tab darunter: [Tabelle ●][Torschützen][Zuschauerschnitte].

### 9.8 Spielerprofil

Das Profil enthält aktuell: Status-Chips (Fit/Form/Moral), Bio-Zeile (Nation, Region, Jugendverein, Vertrag bis, Einsätze, Story-Zitat), fünf Tabs (Attribute/Training/Vertrag/Verlauf/Saisonwerte), in Attributen: Kern-Radar + 4 Kategorien (Technik/Physik/Mental/Extras) mit je 4–6 Balken, Positionsstärken (TW/IV/MF/ST), Erfahrung, im Training: Ziel, Einzeltraining, Fähigkeiten/Bonus, Stempel, im Vertrag: Gehalt, Laufzeit, Rotationsversprechen, Verhandeln, im Verlauf: CA-Kurve + Saison-Übergänge, plus Verkaufspreis und ein Mehr-Menü (Ermutigen/Zurück U19/Entfernen).

Das alte Wireframe mit drei gleichhohen Boxen hält das nicht aus – das Profil braucht die Hub-and-Spoke-Struktur: eine persistente Identitäts-Schiene links, die Tabs rechts wechseln. Hier der komplette Ersatz für §9.8:

┌─[Header]────────────────────────────────────────────────-─────-─┐
│ H1 "[Avatar] Felix Weber · CM · 20"                             │
├──────────────--┬────────────────────────────────────────────────┤
│ IDENTITÄT-     │ TABS: [Attribute ●][Training][Vertrag]         │
│ SCHRIDGE       │       [Verlauf][Saisonwerte]                   │
│ (persistiert   │                                                │
│ über alle      │ ── Tab: ATTRIBUTE ──────────────────────────── │
│ Tabs)          │ ┌RADAR (6 Achsen: Pass, Übersicht, Ruhe,     │ │
│                │ │  Ausdauer, Technik, Teamwork) · großes SVG │ │
│ [großer        │ │  rechts daneben: ERFahrung ▓▓░░ "Roh · 23" │ │
│  Avatar]       │ └──────────────────────────────────────────--┘ │
│ CA 82 · PA██░  │ ┌STÄRKE ALS POS: TW ░ IV ░ MF ▓ ST ░ ─---──┐   │
│                │ │ (4 kompakte Balken, Highlight aktiv)     │   │
│ ▲Fit 52        │ └──────────────────────────────────────────┘   │
│ ▲Form +0.35    │ ┌4 SPALTEN: TECHNIK | PHYSIK | MENTAL | EXTRA  │
│ ●Moral 79      │ │ Abschluss    |Tempo    |Ruhe      |TW-Hand   │
│                │ │ Passspiel    |Kraft    |Führung    |Weak Ft│ │
│ ──────────     │ │ Dribbling    |Ausdauer |Stellung   │   │     │
│ 🇩🇪 Deutschland │                |         |Übersicht  │   │    │
│ 📍 Fördeküste│ │                |         |Konzentrat.│   |    │
│ Jugend: Förde│ │                |         |Teamwork   │   │    │ 
│ 📅 bis S2027 │ └──────────────────────────────────────────┘    │
│ 📊 23 Einsätze│                                                │
│              │ ── Tab: TRAINING ────────────────────────────── │
│ ┌"Rohdiamant │ │ AKTUELLES ZIEL: Taktik · Mannschaftsfokus     │
│ mit Tempo im │ │ (Teamplan, kein persönlicher Fortschritt)     │
│  Gepäck"     │ │ [Einzeltraining]                              │
│ └Story-Zitat │ │ FÄHIGKEITEN/BONUS: Skills, Stempel (n)        │
│ └────────────┘ │      + Tooltip "Training/Meilenstein/Makel"   │
│ [Verkaufen   │                                                 │
│  ca. €963k]  │ ── Tab: VERTRAG ─────────────────────────────-  │
│ ⋮ Aktionen:  │ │ Profivertrag · € 2.050/Wo · bis S2027         │
│  Ermutigen   │ │ Rotation versprochen · [Verhandeln]           │
│  Zurück U19  │                                                 │
│  Entfernen   │ ── Tab: VERLAUF ─────────────────────────────-  │
│              │ │ CA-Kurve 26 Wochen (+28.1 Momentum) ·         │
│              │ │ Saisonsprünge 2025→2026 als Marker ·          │
│              │ │ Soll-Verlauf gestrichelt (terra)              │
│              │                                                 │
│              │ ── Tab: SAISONWERTE ──────────────────────────- │
│              │ │ Dichte Tabelle: MIN | T | A | TKL | Ø | Form  │
└──────────────┴────────────────────────────────────────────────-┘

Regeln:

Hub-and-Spoke: Die linke Identitäts-Schiene (280px, sticky) bleibt beim Tab-Wechsel stehen – Name, Avatar, CA/PA, die drei Status-Chips, Bio-Metadaten, Story-Zitat und Verkauf/Actions. Alles, was den Spieler definiert, ist immer sichtbar; alles, was man analysiert, lebt in den Tabs.
Attribute-Tab: Radar als Hero (Werte an den Ecken, keine redundanten Fußnoten-Balken), Erfahrung daneben; Positionsstärken „Stärke als…“ als kompakte Highlight-Zeile (Hauptposition markiert). Die volle Attribut-Enzyklopädie (2×2-Kategorien, Zahlen statt Balken) ist standardmäßig eingeklappt (`Alle Attribute`). Einzelwerte 0–199 (weak foot 0–100); Werte >100 sind erlaubt.
Status-Chips: ▲/● Lucide-Chips, nie Emoji. Fit unter 60 = terra, 60–80 staubblau, >80 rasen. Form immer mit Vorzeichen, Moral als 0–100 mit farbigem Chip.
PA: Balken-Kategorie (██░), nie exakte Zahl (bleibt).
Training-Tab: Ziel-Karte oben, Fähigkeiten/Stempel als Badge-Liste. Der Stempel-Tooltip erklärt Herkunft.
Vertrag-Tab: Wichtigste Vertragsdaten als Label/Value-Karten + [Verhandeln]-Button in --rasen.
Verlauf-Tab: CA-Kurve als Liniendiagramm (monotone), Saisongrenzen als vertikale Marker, Momentum-Wert als Headline-Badge ("26 Wochen · +28.1").
Saisonwerte-Tab: Standard-StatTable-Komponente (gleiche wie Jugend/Kader-Tabellen) – gleiche Spaltendefinitionen.
Aktionen: Verkauf + Mehr-Menü (Ermutigen, Zurück U19, Entfernen) in der linken Schiene unten. "Entfernen" mit terra und Bestätigungs-Inline.
Mobile: Identitäts-Schiene wird zum kompakten Top-Kopf (Avatar klein, Chips inline), Tabs scrollbar, Tab-Inhalt darunter.

Damit ist das Profil von einer 3-Box-Skizze zu einem echten Screen geworden, der die Datenmenge in Schichten organisiert: Identität (immer sichtbar) → Status (immer sichtbar) → Analyse (gewählt) → Aktionen (immer erreichbar). Das ist dieselbe Cockpit-Logik wie beim Hub.




### 9.9 Hub (Start-Screen)

- Spaltenlogik: LINKS Handlungsqueue / MITTE Status / RECHTS Kontext. Neu
  eingehende Inhalte werden einer dieser drei Rollen zugeordnet – niemals
  einfach untergestapelt.
- Entscheidungen stehen IMMER oben links und sind der Gate für den
  NEXT-Button: offene Entscheidungen = NEXT-Button zeigt terra-Badge mit
  Anzahl, leer = NEXT "sauber".
- Events-Liste: max. 4 sichtbar, Rest über [Alle ▶] auf separatem Screen.
  Keine Pagination im Hub.
- Wochenmodule: 2×2-Grid, jede Modulkarte ist klickbar zum Fach-Screen.
  Scout-Report-Leerzeilen entfallen (Scouting-Karte zeigt "0 aktiv").
- Chronik: nur die letzten 3 Einträge, mit Datumsstempel S1 · KW xx.
- Die Header-Icon-Leiste des alten Hubs ist entfernt – Navigation lebt
  ausschließlich im Menü-Dropdown (§6).


Der Hub stapelt aktuell neun Inhaltstypen gleichgewichtig untereinander: Matchday-Banner, News, Modul-Grid (Training/Jugend/Scouting/Leihen), Wachstums-Chart, Posteingang, Entscheidungen, Scout-Reports, Events-Liste mit Pagination, Board-Pressure, Top-Development, Chronik. Auf Mobile ein 10-Screens-langer Scroll – alles wichtig, also nichts wichtig.

Die Lösung ist keine Kürzung, sondern Hierarchie nach Dringlichkeit. Ein Hub ist ein Cockpit: Was mich blockiert, steht links groß; was ich beobachte, steht in der Mitte; was Atmosphäre ist, steht rechts. Hier der Wireframe:


┌─[Header: identisch]--─────────────────────────────────────────┐
├──────────────-┬───────────────────────────┬─────────────────-─┤
│ AKTION        │ STATUS                    │ KONTEXT           │
│ (360px)       │ (flexibel)                │ (320px)           │
│               │                           │                   │
│ ┌ENTSCHIED.─-┐│ ┌MATCHDAY-STRIP─────────┐ │ ┌BOARD · NOR───-┐ │
│ │4 offen ⚠   ││ │KW46 · Spieltag 12/34  │ │ │Pressure 0%    │ │
│ │Julian Schm.││ │vs OST · #13 · 11 Pkt  │ │ │✓ Platz ≥15    │ │
│ │Ready U19 → ││ └───────────────────────┘ │ │  40 Pkt: 11   │ │
│ │Paul Wolf → ││                           │ │  Cash ≥3.5M:  │ │
│ │Ben Krüger→ ││ ┌WOCHEN-MODULE (2×2)──┐   │ │  €0.5M        │ │
│ │Anton Wagn.→││ │Training 3/3 │Jugend 4│  │ └───────────────┘ │
│ └────────────┘│ │Scouting  0  │Leihen —│  │ ┌TOP-DEV─────--─┐ │
│               │ └──────────────────────┘  │ │▲F.Weber +28   │ │
│ ┌POST 4/4─-──┐│                           │ │▲B.Martens+26  │ │
│ └────────────┘│ ┌SQUAD GROWTH (U17/U19/   │ │▲A.Aydin  +23  │ │
│               │ │ PRO) · Chart─────────-┐ │ │ (Klick=Profil)│ │
│ ┌EVENTS KW46┐ │ └───────────────────────┘ │ └──────────────-┘ │
│ │4 ближайшие ││                           │ ┌CHRONIK─────--─┐ │
│ │[Alle 38 ▶] ││ (kein NEXT im Content — nur Header) │ │Kapitän gewählt│ │
│ └────────────┘│                           │ │Gemeinschaft…  │ │
└──────────────-┴───────────────────────────┴──────────────────-┘


Die Kernprinzipien:

Links = Handlungsqueue. Entscheidungen (blockierend, max. 4) oben, dann Post, dann Events – aber nur die nächsten 4, der Rest hinter "Alle". Diese Spalte ist das, was der Spieler vor dem NEXT-Druck abarbeitet: Wenn sie leer ist, darf Next ruhig Gewissen haben.
Mitte = Status. Matchday-Strip als Hero-Zeile (immer sichtbar, klebt emotional die Session fest), darunter die vier Wochenmodule als 2×2 statt 1×4, darunter das Wachstums-Chart.
Rechts = Kontext. Board-Pressure (eine Kompaktkarte mit Icon-Checkliste), Top-Development (die Belohnungs-Spalte – klickbar zum Profil), Chronik als ruhige Erzähl-Liste.
Was verschwindet: Die Icon-Leiste im oberen Header (die gehört ins Menü), die Scout-Report-Leerzeile (Scouting-Modulkarte sagt "0 aktiv" schon), und die Pagination auf Seite 1 – das "Alle 38"-Muster ersetzt zehn Seitenzahlen.


### 9.10 Training

- **Tabs (zwei):** `[Team · Stundenplan]` (Default) und `[Individuell · Extra]`. Kein separater „Übersicht/Heatmap“-Tab — Heatmap sitzt als schmales Band unter dem Stundenplan.
- **Tab Stundenplan:**
  - **15 Trainingsslots** (Mo–Fr × 3 Einheiten/Tag), Spalten = Wochentage, Slots vertikal; leere Slots „Leer / Einheit wählen“ (kein Auto-Passspiel).
  - **Fokus:** Icon auf der Karte (nicht globaler „Fokus setzen“-CTA); max. **2** Fokus/Woche, **+33 %** Wachstum pro Fokus auf Attributgruppe (PRD 02.4); max. 2 Fokus pro Gruppe (Technik/Athletik/Mental).
  - **Intensität:** drei Presets (Leicht / Normal / Hart), kein Slider im Content.
  - Kompakte Belastungszeile (Fitness/Müdigkeit); kein zweiter Fortschritts-CTA (nur Header-NEXT).
  - **Growth-Heatmap** (F2.7): kompaktes Band unter dem Grid (Farbfelder + Legende mit Swatches).
- **Tab Individuell:** Spielerliste; Modal für Programme (F2.3 / Stamps).
- **Ausgelagert:** Mentoring → Kader; Coaches → Staff.

┌─[Header]──────────────────────────────────────────────────┐
│ H1 "Training"         [Team·Stundenplan][Individuell]     │
├───────────────────────────────────────────────────────────┤
│ INFO: 5×3 Slots · 1/2 Fokus (+33 %) · Int. Normal         │
│ Belastung: Ø Fitness … · N müde                           │
├───────────────────────────────────────────────────────────┤
│  MO      DI      MI      DO      FR                        │
│ [E1][E2][E3]  …  (3 Karten/Spalte, gleiche Höhe)          │
│                                                           │
│ [Heatmap-Band: Spieler-Wochenzuwachs]                     │
└───────────────────────────────────────────────────────────┘

### 9.11 Kader (Squad)

Der Kader-Screen ist der zentrale Hub für alle Spieler- und Personalentscheidungen. Er ist in drei Hauptbereiche unterteilt: Aufstellung/Liste, Mentoring und Staff.
```
┌─[Header]──────────────────────────────────────────────────┐
│ H1 "Kader"                 [Tab: Liste][Mentoring][Staff] │
├───────────────────────────────────────────────────────────┤
│ TAB: LISTE (Default)                                      │
│ ┌───────────────────────────────────────────────────────┐ │
│ │ FILTER: [Pos ▼][Alter][CA][Vertrag]                   │ │
│ │ SORTIEREN: [Name][CA][Form][Alter]                    │ │
│ ├───────────────────────────────────────────────────────┤ │
│ │ ┌───────────────────────────────────────────────────┐ │ │
│ │ │ [Avatar] Philipp Hoffmann · GK · 28 · CA 86       │ │ │
│ │ │ ⚡ Fit · Vertrag bis 2027 · Wert € 1.2M            │ │ │
│ │ │ [Profil][Verkaufen]                               │ │ │
│ │ └───────────────────────────────────────────────────┘ │ │
│ │ ┌───────────────────────────────────────────────────┐ │ │
│ │ │ [Avatar] Erik Voss · CB · 18 · CA 87              │ │ │
│ │ │ ⚡ Müde · Mentor: Samir Böttcher · Wert € 2.5M     │ │ │
│ │ │ [Profil][Verkaufen]                               │ │ │
│ │ └───────────────────────────────────────────────────┘ │ │
│ │ ... (Scrollbare Liste, alle Spieler)                  │ │
│ └───────────────────────────────────────────────────────┘ │
├───────────────────────────────────────────────────────────┤
│ TAB: MENTORING                                            │
│ ┌───────────────────────────────────────────────────────┐ │
│ │ H1 "Mentoring · 10 Talente · 13 mögliche Mentoren"    │ │
│ │ Hinweis: Erfahrene Spieler können junge Talente       │ │
│ │ fördern und deren Entwicklung beschleunigen.          │ │
│ ├───────────────────────────────────────────────────────┤ │
│ │ ┌───────────────────────────────────────────────────┐ │ │
│ │ │ Erik Voss (CB · 18 · Moral 58)                    │ │ │
│ │ │ Kein Mentor                                       │ │ │
│ │ │ [Dropdown: Mentor wählen ▼]                       │ │ │
│ │ │ Verfügbare Mentoren: Samir Böttcher, Can Wagner.. │ │ │
│ │ └───────────────────────────────────────────────────┘ │ │
│ │ ┌───────────────────────────────────────────────────┐ │ │
│ │ │ Samir Böttcher (CB · 23 · Moral 79)               │ │ │
│ │ │ Mentor von: Erik Voss                             │ │ │
│ │ │ [Dropdown: Mentor wählen ▼] (optional)            │ │ │
│ │ └───────────────────────────────────────────────────┘ │ │
│ │ ... (Liste aller Talente mit Dropdown)                │ │
│ └───────────────────────────────────────────────────────┘ │
├───────────────────────────────────────────────────────────┤
│ TAB: STAFF                                                │
│ ┌───────────────────────────────────────────────────────┐ │
│ │ H1 "Trainer & Staff"                                  │ │
│ │ ┌───────────────────────────────────────────────────┐ │ │
│ │ │ Lars Dose (Head Coach)                            │ │ │
│ │ │ Taktik-Qualität 57 · Durchwachsen                 │ │ │
│ │ │ Aufgaben: [✓ Aufstellung][✓ Wochenplan][☐ Scoutin]│ │ │
│ │ │ [Vertrag][Leistungen]                             │ │ │
│ │ └───────────────────────────────────────────────────┘ │ │
│ │ ┌───────────────────────────────────────────────────┐ │ │
│ │ │ Thomas Dose (Angriffstrainer)                     │ │ │
│ │ │ Qualität 58 · Umfeld x1.02                        │ │ │
│ │ │ € 7k/Woche · bis Saison 2028                      │ │ │
│ │ │ Kandidaten: Stefan Klug, Oliver Cohrs...          │ │ │
│ │ │ [Einstellen]                                      │ │ │
│ │ └───────────────────────────────────────────────────┘ │ │
│ │ ... (Listen für Angriff, Verteidigung, Torwart, etc.) │ │
│ └───────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────┘
```

Regeln für den Kader-Screen:
Tabs: Drei Tabs: Liste (Standard), Mentoring, Staff.
Tab "Liste":
Vollständige Spielerliste mit Filtern (Position, Alter, CA, Vertrag) und Sortieroptionen.
Jede Zeile zeigt Avatar, Name, Position, Alter, CA, Status (Fit/Müde/Verletzung), Mentor-Info (falls vorhanden), Vertrag, Wert und Aktionen ([Profil], [Verkaufen]).
Klick auf einen Spieler öffnet das Spielerprofil (§9.8).
Tab "Mentoring":
Liste aller Spieler, die potenzielle Mentoren oder Mentees sein können (z.B. unter 23 Jahre oder mit niedriger CA).
Für jeden Spieler: Name, Position, Alter, Moral, aktueller Mentor (falls vorhanden).
Dropdown-Menü "Mentor wählen", das eine Liste der verfügbaren, erfahrenen Spieler anzeigt.
Visuelles Feedback, wenn ein Mentor zugewiesen wurde (z.B. grüner Haken oder Icon).
Tab "Staff":
Übersicht aller Trainer und Mitarbeiter (Head Coach, Angriffstrainer, Verteidigungstrainer, Torwarttrainer, Scout, Physiotherapeut).
Für jede Rolle: Aktueller Inhaber, Qualitätsmetriken, Vertrag, Gehalt, Aufgaben (mit Checkboxen).
Bereich "Kandidaten" für jede Rolle, um neue Mitarbeiter einzustellen.
Button [Einstellen] neben Kandidaten, um sie zu verpflichten.
Integration:
Die "Coaches/Staff"-Funktion aus dem alten Trainingsscreen wird hierher verlegt.
Die "Mentoring"-Funktion aus dem alten Trainingsscreen wird hierher verlegt.
Der Hub-Link "Jugend" führt zum Jugend-Screen, nicht mehr zum Training.
Diese Struktur trennt klar zwischen Spielermanagement (Liste, Mentoring) und Personalmanagement (Staff) und macht den Kader-Screen zum umfassenden Zentrum für alle menschlichen Ressourcen des Vereins.


### 9.12 Jugend

Aktuell:
Doppelt: "Jugendkader" (Sortier-Tabelle mit MIN/T/A/TKL/Ø...) und der "U17/U19-Report KW xx" (Tabelle mit ZIEL/FORTSCHRITT/STATUS) sind zwei fast identische Listen desselben Jahrgangs – eine mit Daten ohne Avatare, eine mit Peeps-Bildern ohne Daten. Das ist eine Tabelle, die sich als zwei verkleidet hat.

Versteckt: Die Jugendhaus-Upgrades (Stufe 1/3: Jugendhaus → Leistungszentrum → Elite-Akademie) sind Infrastruktur – die gehören nach deiner eigenen Logik in den Stadion/Ausbau-Screen (dort wo auch Stehplätze, Rasenheizung etc. leben). Gleiches gilt für den Unterhalt und die "Stadion 20.000 Plätze"-Koppelung.

Hohl: Die Jugendcamps sind eine Einkaufsliste ohne Spielspaß: Kaufen-Buttons, Unterhalt, "Kein Jahrgang — Saisonende". Es fehlt der eigentliche Inhalt: die Spieler im Camp, die man in die eigene Jugend überführen kann – das ist ja der Lohn der Investition.

Vorschlag für die Struktur
Ein Jugend-Screen mit einer Kader-Tabelle (die Sortier-Tabelle ist die Basis, die Peeps-Avatare kommen als Spalte rein – nicht als zweiter Screen), plus Camp-Tabs pro Standort mit den überführbaren Spielern. Die Jugendhaus-Upgrades wandern zu §9.3 Stadion/Ausbau als Kategorie "Nachwuchs".

- **Eine Tabelle, kein Doppelscreen:** Die sortierbare Jugendkader-
  Tabelle ist die einzige Listenansicht. Die Peeps-Avatare sind eine
  Spalte in dieser Tabelle, kein separater "Report"-Screen. Der
  Report-Inhalt (Ziel, Fortschritt, Status) wird in Spalten derselben
  Tabelle integriert – Detailinfos (Coach-Meldung, Profil)
  in der Aufklapp-Zeile.
- **Tabs:** `U17 · n` / `U19 · n` / `Camps`. Der "Jahrgang"-Tab
  entfällt – Jahrgangsinfo ist eine Filtermöglichkeit (Dropdown) auf
  der Tabelle.
- **Camp-Tab:** Links die Standort-Liste (Status: aktiv/kaufbar/
  gesperrt mit Preis, Unterhalt, Betreuer-Toggle, max. 3). Rechts die
  Spieler des aktiven Camps als Karten mit Avatar, CA, Ø, Scout-
  Hinweis und Button [In Jugend überführen · Kosten]. Nur ein Camp
  gleichzeitig im Fokus.
- **Jugendhaus-Upgrades:** Wandern in den Stadion-Screen (§9.3),
  Tab "Ausbau", als Kategorie "Nachwuchs" neben Stehplätze & Co.
  (Jugendhaus → Leistungszentrum → Elite-Akademie, mit den
  Intake-/Qualitäts-Effekten in der Kartenbeschreibung).
- **Camp-Empty-State:** Camp ohne Jahrgang (z.B. Saisonende) zeigt
  "Nächster Jahrgang: Saisonstart" statt der leeren Kaufleiste.


┌─[Header]─────────────────────────────────────────────────────┐
│ H1 "Jugend"                    [U17 ·1][U19 ·7][Camps ▸]     │
├──────────────────────────────────────────────────────────────┤
│ STRIP: Campus Stufe 1/3 · Intake 24 · KW45: U17 0-1 · U19 1-0│
├──────────────────────────────────────────────────────────────┤
│ DIE EINE TABELLE (U19 aktiv):                                │
│ [Avatare] Name | Pos | Alt | CA | Δ | Wert | Min | T | A |   │
│ Ø | Form | Ziel | Fortschritt | Status | Region              │
│ Sortierbar · Filter [Alle][GK][CB][CM][LW] · Coach-Icons     │
│ ┌ Aufklapp-Zeile: Spielerprofil-Kurzansicht ┐                │
│ │ [großer Avatar] · Ziel: Mental · Fortschritt│              │
│ │ Bewertung · Coach-Meldung · [Zum Profil ▶] │               │
│ └─────────────────────────────────────────────┘              │
├──────────────────────────────────────────────────────────────┤
│ TAB "CAMPS" (statt eigenem Screen):                          │
│ ┌Camp-Auswahl──────┬─────────────────────────────────┐       │
│ │ ● Polen · Krakau │ SPIELER IM CAMP (Jahrgang 2029) │       │
│ │ ○ Brasilien SP   │ ┌Karte: [Avatar] Marek Nowak    │       │
│ │  €1.2M 🔒        │ │ ST · 15 · CA 61 · Ø 7.2       │       │
│ │ ○ Nigeria Lagos  │ │ Region: Krakau · Scoute: ++   │       │
│ │  €900k 🔒        │ │ [In Jugend überführen · €15k] │       │
│ │ ○ Frankreich ... │ └───────────────────────────────┘       │
│ │ (max 3 · Unter-  │ ... weitere Camp-Spieler ...            │
│ │ halt €6k/Wo)     │                                         │
│ └──────────────────┴─────────────────────────────────┘       │
└──────────────────────────────────────────────────────────────┘

→ Jugendhaus-Upgrades: ENTFERNT, lebt jetzt in
  Stadion · Ausbau als Kategorie "Nachwuchs":
  [Jugendhaus Stufe 1/3 €20k → Leistungszentrum → Elite-Akademie]



Der Kern des Fixes ist die Erkenntnis aus deinen zwei Screenshots: Daten und Avatare gehören in dieselbe Tabelle – die Aufklapp-Zeile ist der natürliche Ort für alles, was im "Report" extra war (Ziel/Fortschritt-Story pro Spieler). Und die Camps bekommen endlich ihren Content: Die überführbaren Spieler sind Karten mit dem gleichen Peeps-Avatar-Format wie überall, wodurch der Kauf eines Camps sofort fühlbar wird.



### 9.13 Scouting

#### Aktuell:

Das ist die klassische Falle: Scouting wird oft als riesige Datenbank-Liste dargestellt, weil es technisch gesehen das ist. Aber für den Spieler ist es langweilig, endlose Listen zu scrollen.

Die Lösung ist: Scouting ist kein "Suchen", sondern ein "Aufdecken".

Statt einer Karte mit Regionen und einer Liste darunter, machen wir daraus ein interaktives Radar/Netzwerk.

##### Die Struktur:

Oben: Das Netzwerk (Die "Karte")

Statt einer Landkarte zeigen wir ein Node-Graph: Deine Scouts sind Knotenpunkte, die mit Regionen verbunden sind.
Jede Region hat einen Deckungsgrad (z.B. "Schleswig: 60% abgedeckt").
Klick auf eine Region öffnet sofort die Top-Treffer dieser Region (nicht die ganze Liste).
Mitte: Die Scout Orders (Aktivitäten)

Hier stellst du die Aufträge ein: "Suche RB, Alter <23, Region: Europa".
Das System zeigt sofort die top 5 Treffer dieses Auftrags an (nicht 200).
Unten: Die Ergebnisse (Die "Hits")

Eine kompakte Liste der besten Funde, sortiert nach Scout-Schätzung / Trust (kein `potential`-Attribut — Gesetz 1).
Jeder Eintrag hat ein Trust-Badge (Gut bekannt, Unklar, unbekannt).


##### Wireframe

┌─[Header]─────────────────────────────────────────────────────┐
│ H1 "Scouting" · [Netzwerk][Aufträge][Treffer]                │
├──────────────────────────────────────────────────────────────┤
│ NETZWERK (Interaktiv)                                        │
│ ┌─────────────────────────────────────────────────────────┐  │
│ │  [Schleswig] ───┐                                       │  │
│ │      ● (60%)    │  ● = Scout, Linie = Region            │  │
│ │      │          │                                       │  │
│ │  [Förde] ─-─────┘  Farbe: Grün = gut abgedeckt           │  │
│ │      ● (40%)                                            │  │
│ │                                                         │  │
│ │  [Hanse]   ● (80%)                                      │  │
│ │      │                                                  │  │
│ │  [Nord]  ● (20%)                                        │  │
│ │                                                         │  │
│ │  Klick auf Region → Top 5 Treffer dieser Region         │  │
│ └─────────────────────────────────────────────────────────┘  │
├──────────────────────────────────────────────────────────────┤
│ AUFTRÄGE (Scout Orders)                                      │
│ ┌─────────────────────────────────────────────────────────┐  │
│ │ Auftrag 1: "RB, <23, Europa" (Aktiv)                    │  │
│ │   → 3 Treffer gefunden · Trust: Mittel                  │  │
│ │   [Top-Treffer ansehen ▶]                               │  │
│ │                                                         │  │
│ │ Auftrag 2: "CM, <20, Brasilien" (Inaktiv)               │  │
│ │   → 0 Treffer · Scout nicht verfügbar                   │  │
│ │   [Auftrag bearbeiten]                                  │  │
│ │                                                         │  │
│ │ [+ Neuer Auftrag]                                       │  │
│ └─────────────────────────────────────────────────────────┘  │
├──────────────────────────────────────────────────────────────┤
│ TREFFER (Beste Funde)                                        │
│ ┌─────────────────────────────────────────────────────────┐  │
│ │ [Avatar] Deniz Voss · CF · 23 · CA 84 · Trust: Gut      │  │
│ │   Region: Hansestadt · Scout: Felix Krüger              │  │
│ │   [Profil][Angebot]                                     │  │
│ │                                                         │  │
│ │ [Avatar] Finn Engel · GK · 30 · CA 78 · Trust: Unklar   │  │
│ │   Region: Schleswig · Scout: Max Pohl                   │  │
│ │   [Vertrauen erhöhen][Profil]                           │  │
│ └─────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘

##### Die Regeln für Scouting:

- Keine endlosen Listen: Zeige immer nur die Top 5 oder Top 10 Treffer an. Wenn du mehr willst, musst du den Auftrag verfeinern.
- Trust als Spielmechanik: "Unbekannt" bedeutet nicht "kein Wert", sondern "hohe Unsicherheit". Der Spieler muss entscheiden: "Will ich das Risiko eingehen?"
- Region als Filter, nicht als Screen: Die Region ist ein Filter im Auftrag, kein eigener Screen. Du wählst "Europa" im Auftrag, und das System zeigt dir die besten europäischen Spieler.
- Scout-Netzwerk als Investition: Je mehr Scouts du hast, desto mehr Regionen sind "grün" (gut abgedeckt). Das ist dein Fortschritt im Scouting.

Warum das besser ist:

Erlebnis: Du siehst sofort, wo du stark bist und wo Lücken sind.
Platz: Die Karte nimmt weniger Platz ein als eine lange Liste.
Fokus: Du wirst nicht von 200 Spielern erschlagen, sondern bekommst die besten 5 präsentiert.
Interaktion: Klick auf eine Region → sofortige Trefferliste. Kein Scrollen.


### 9.14 Spiel Zusammenfassung


┌─[Header]──────────────────────────────────────────────────────-┐
│ (NEXT-Button heißt hier: "Spieltag abschließen" –              │
│  bleibt gelb, gleiche Position, nur anderes Label!)            │
├──────────────────────┬────────────────────────────────────────-┤
│ HERO (links, 60%)    │ DREI STERNE (rechts, vertikal gestapelt)│
│                      │                                         │
│  NOR  2 : 1  HEI     │  ★1 [Avatar] Adrian Peters · NOR-ST     │
│  ─────────────────   │        2 Tore · Rating-Badge            │
│  ☁ Leicht bewölkt    │  ★2 [Avatar] Amir Aydin · NOR-W         │
│  18°C · Schiri:      │        1 Vorlage                        │
│  S. Stegemann        │  ★3 [Avatar] Luis Çelik · HEI-ST        │
│  [NOR 4-3-3]         │        1 Tor                            │
│  [HEI 4-4-2]         │                                         │
│                      │                                         │
│ ┌TOR-ZEITSTRALHL────┐│                                         │
│ │ 18' ● Peters (A:  ││  (Karten-Box nur, wenn Karten fielen    │
│ │   Aydin)          ││   – sonst weglassen)                    │
│ │ 40' ○ Çelik       ││                                         │
│ │ 61' ● Peters      ││                                         │
│ │ ● = NOR, ○ = Gast ││                                         │
│ └───────────────────┘│                                         │
├──────────────────────┴────────────────────────────────────────-┤
│ STATISTIK (volle Breite):        │ KASSE (Kompakt-Widget)      │
│ ┌Tore      [██████░░] 2:1      │ │ Eintritt €110k · Wurst €0   │
│ ┌Schüsse   [████████] 41:9     │ │ Bier €0 · Shop €0           │
│ ┌Auf Tor   [███████░] 10:3     │ │ SUMME: €110k                │ 
│ ┌Ecken     [████░░░░] 8:3      │ │ (Detail → Finanzen-Screen)  │
│ ┌Pässe %   [████░░░░] 48:48    │ │                             │
├──────────────────────────────────┴─────────────────────────-───┤
│ [Spielerlisten NOR | HEI] – Tabs, Standard-StatTable-Komponente│
│ Nr | Name | Pos | (Rating) | Ereignis-Badges (Tor/Assist/Karte)│
└────────────────────────────────────────────────────────────────┘

- **NEXT-Button (bestehend, unverändert lassen):** Der gelbe
  Header-Button ist global dieselbe Komponente – Position, Farbe
  und Verhalten sind fix. Nur das Label variiert nach Kontext
  (NEXT → "Spieltag abschließen" am Spieltag → ...). Im
  Zusammenfassungs-Screen KEIN zweiter Abschluss-Button im
  Content-Bereich – der Header-Button IST der Abschluss.
- **Hero links:** Ergebnis riesig (Display-Font), darunter die
  atmosphärische Zeile (Wetter, Schiri, Formationen) als Meta-
  Text. Der Tor-Zeitstrahl darunter – Teamfarben als ●/○-Punkte,
  nicht als Farbwechsel der ganzen Zeile.
- **Drei Sterne rechts:** Vertikal gestapelt, nicht horizontal –
  der 1. Stern mit gold-orangem Rahmen als Reward-Moment
  (--terra Outline), 2/3 in --outline-weich. Klick → Profil.
- **Statistik:** Takte Doppel-Balken pro Zeile – eigener Verein
  immer in --rasen, Gegner in --staubblau. Kein Nor-Orange mehr
  (Teamfarben-Konflikt mit Terra/Stat).
- **Kasse als Widget:** Der Einnahmen-Breakdown verdient nach dem
  Spiel nur noch eine kompakte Zusammenfassung. Der Rest wohnt im
  Finanz-Screen. Ausnahme: Bei Kassen-Ereignissen (Wurst 0€ weil
  Gastro-Tiles fehlen) → dezentere Hinweis-Zeile, kein Block.
- **Karten-Box:** Conditional – nur rendern, wenn Karten existieren.
- **Spielerlisten:** Umliegende Aufteilung als Tab NOR/HEI mit der
  Standard-Tabelle; Ereignisse (Tor, Vorlage, Karte, Verletzung)
  als Icon-Badges in der Zeile. Beide Teams (auch Gegner) klickbar
  → Profil (Scout-Wissen gilt).
- **Mobile:** Hero oben, Sterne darunter horizontal (1-card-Breite),
  Statistik, Kasse, dann Tabs.

### 9.15 Matchday

Er ist der emotionale Höhepunkt des Wochenzyklus — eigenes Cockpit mit zwei Zuständen: **Vorschau** (vor Anpfiff) und **Live** (Simulation läuft).

┌─[Header: "Spiel simulieren" ersetzt NEXT (gelb, gleiche Stelle)]─┐
├──────────────────────-┬───────────---────────────────────────────┤
│ HERO (links, ~55%)    │ LIVE-REGELN (rechts, 320px)              │
│                       │                                          │
│  NOR  0 : 0  HEI      │   [Play ▶][Ereignisse][Spielfeld]        │
│  ─────────────────    │  SPEED 1x [▾]                            │
│  0'01 · 4-3-3 vs      │                                          │
│  4-4-2                │  ── Tab: EREIGNISSE ──                   │
│                       │  18' ● Peters (A: Aydin)                 │
│ ┌PITCH-VIZ (SVG)─────┐│  40' ○ Çelik                             │
│ │ Ball (weißer Punkt)││  61' ● Peters                            │
│ │ NOR-Chips: Tinte-  ││                                          │
│ │ gelb, HEI: Weiß    ││  ── Tab: STATISTIK ──                    │
│ │ auf --rasen-Pitch  ││  (Zusammenfassungs-Doppelbalken)         │
│ │                    ││                                          │
│ │ Tooltip-Klick:     ││  ── Tab: AUFSTELLUNGEN ──                │
│ │ Chip → Mini-Profil ││  Nr | Name | Pos | Bewertung             │
│ └────────────────────┘│  (Standard-StatTable-Komponente)         │
│                       │                                          │
│ EXPERTEN-/FANSTIMME:  │  DRITTEL/SEITE-ZONEN:                    │
│ "Das Duell 4-3-3..."  │  DEF | MITTE ● | ANGRIFF                 │
│ (Meta-Text, nicht     │  LINKS | ZENTRUM ● | RECHTS              │
│  Box-In-Box)          │                                          │
└──────────────────────-┴────────────────────────────────────────--┘

Regeln:

- **"Spiel simulieren" als NEXT-Variante:** Der Header-Button wird
  am Spieltag zu "Spiel simulieren" (gelb, gleiche Komponente).
  KEIN zusätzlicher Simulations-Button im Content. Nach dem
  Anpfiff ändert er sich in PAUSE/FORTSETZEN (gleiche Stelle).
- **Zwei Zustände:** VORSCHAU (vor dem Anpfiff: Aufstellungen +
  Experte) und LIVE (Simulation läuft: Play/Events/Spielfeld +
  Speed). Vorschau ist read-only, alle Interaktion in LIVE.
- **Pitch-Viz als Hero:** Der Platz als SVG auf --rasen. Eigene
  Spieler: --tinte-gefüllte Chips mit Nummer, Gegner: --panel
  mit --outline. Ball als weißer Punkt mit sanfter Bewegungs-
  interpolation. Klick auf Chip → Mini-Popup (Name, Rating,
  Ballkontakte) – kein Screen-Wechsel.
- **Zonen-Indikatoren (DRITTEL/SEITE):** Zwei dünne Segmente-
  Balken unterm Pitch, aktive Zone hellt auf. Sie zeigen, wo
  das Spiel gerade "lebt" – billige Atmosphäre, großer Effekt.
  Kombiniert mit dem Kommentar-Text darüber.
- **Kommentar & Analyst als Textfluss:** Der Textmodus ist KEIN
  separater Screen, sondern der Stream unter/über dem Pitch, je
  nach Tab-Zustand. Experte & Ultras-Stimme als einzeilige Meta-
  Einträge im Stream, markiert durch [EXPERTE]/[ULTRAS]-Badge.
  Emojis verboten – Badges übernehmen die Markierung.
- **Ereignisse als Log:** Chronologisch, Tor-Zeitstrahl-Notation
  wie in der Zusammenfassung (18' ● Peters (A: Aydin)). Wechsel
  und Karten ebenfalls als Log-Einträge mit Icon-Badge.
- **Aufstellungen:** Standard-StatTable, Wechsel-Highlight und
  Rating-Entwicklung live aktualisiert.
- **Gegner-Scouting gilt:** Klick auf Gegenspieler → Mini-Profil
  mit Fog-of-War-Werten (PRD 04) – wenn gescoutet, sonst "?".


Der wichtige Unterschied zum Status quo in euren Screenshots: Der Textmodus ist kein dritter Screen neben Pitch und Simulation, sondern derselbe Stream in zwei Darstellungen. Wer will, liest; wer will, schaut. Die Pitch-Viz kann sogar parallel den Stream als kompaktes Ticker-Band unten anzeigen lassen.

Zwei Punkte zum Nachdenken:

Video-Rückmeldung beim Tor: Der Moment, in dem Peters trifft, ist euer Lohn-Moment. Option: Beim Tor springt der Pitch kurz in Zeitlupe/Highlight-Modus (Ball-Puls + --terra-Ring beim Torschützen-Chip), bevor der Stream weiterläuft. Nichts Kompliziertes – nur 800ms Aufmerksamkeit für den verdienten Moment.
Speed-Control: 1x/2x/4x als kleines Dropdown neben den Tabs. "Direkt zur Zusammenfassung" (Skip) gehört ins ⋮-Menü, nicht als Button – sonst schwächt es das Ritual, jedes Spiel anzuschauen... oder ist eure Zielgruppe eher der Skip-Typ? Das ist eine echte Design-Entscheidung: Level of Engagement. FM-Puristen wollen 90 Minuten Textmodus, Casuals wollen Skip.




## 10. Definition of Done (pro Screen)

Ein Screen gilt erst als fertig, wenn:
- [ ] Nur Tokens aus diesem Dokument verwendet (keine Hex-Codes im Screen-Code)
- [ ] Null Emojis (auch nicht "temporär")
- [ ] Header identisch zur Header-Komponente (keine Kopie – Import der Komponente)
- [ ] Genau 0 oder 1 gelbe Elemente (der NEXT-Button im Header)
- [ ] Lucide-Icons mit einheitlicher Größe
- [ ] Desktop ≥1024px voll funktional, Mobile <768px gestapelt nutzbar
- [ ] Dunkelmodus: **nicht implementieren** (bewusst außer Scope)
- [ ] Kenney-Assets nur remapped in `public/assets/kenney/` (siehe `assets/kenney-color-map.json`)
- [ ] **Kein zweiter Fortschritts-CTA** im Content (kein „Weiter“, „Nächster Schritt“, „Abschließen“). Einziger zyklussteuernder Button: Header-NEXT (Labels §9.14/§9.15).
- [ ] Header-NEXT: ein gelber Button; Label kontextabhängig (`NEXT` / `Spiel simulieren` / `Spieltag abschließen`).
- [ ] Match-Skip nur im ⋮-Menü (§9.15), nicht als prominenter Button

---

## 11. Anbindung an Cursor

**`fmscreens/README.md`** (committed; die Bilder selbst bleiben hinter Gitignore):

```markdown
## Referenz-Screens FM2001
- Kalender:      fm2001/calendar_month.png  — Monatsgrid, rechte Menüstruktur
- Team/Statistik: fm2001/team_stats.png      — Statuszeile, Tabellenaufbau
- Posteingang:   fm2001/inbox.png            — Karten-Liste
- Menü-Dropdown: fm2001/menu_open.png       — Kategorien, Highlight-Logik
```

Nutzung im Prompt: *"Implementiere den Screen 'Kalender' gemäß `docs/prd/design.md` §9.5; Referenz `fmscreens/fm2001/calendar_month.png` (lokal) oder `docs/design-refs/lumo/`."*

**Referenzbilder (committed, nicht Shipped):** `docs/design-refs/design.png`, `docs/design-refs/lumo/*.png`.

**Cursor-Regel:** siehe `.cursor/rules/main.mdc` → Design-System.

## 12. Komponenten-Imports & CC0-Assets

**UI-Primitives:** `FilterChip`, `ModalShell`, … aus `src/ui/components/primitives/` importieren (Barrel `index.ts`). Details: PRD 20.

### 12.0 CC0-Asset-Quellen & Lizenzierung

Alle visuellen Assets stammen aus CC0/Public-Domain-Quellen. Keine KI-Generierung. Keine Attribution erforderlich, aber empfohlen als Dank.

### 12.1 Kenney.nl (Primärquelle)
Alle folgenden Packs sind **CC0** (Public Domain). Kein Credit zwingend, aber erwünscht ("Credit 'Kenney.nl' or 'www.kenney.nl'").

| Asset-Typ | Pack | Verwendungszweck | Link |
|-----------|------|------------------|------|
| **Sport-Tiles** | [Sports pack (350+)](https://www.kenney.nl/assets/sports-pack) | Rasen-Tiles, Feld-Markierungen, Tribünen-Andeutungen im Stadion-Tab Gelände (§9.3). Remap auf Palette §2. | `kenney_sports-pack.zip` |
| **City kit** | city-kit-roads + city-kit-commercial | Straßen-/Commercial-Tiles für Gelände-Grid (§9.3) | `kenney_city-kit-*.zip` |
| **Texturen/Patterns** | [Pattern Pack](https://www.kenney.nl/assets/pattern-pack) + [Extra](https://www.kenney.nl/assets/pattern-pack-extra) | Halftone/Papier-Texturen für Hintergründe (§8). SVG-Format für skalierbare Nutzung. | `pattern_pack.zip`, `pattern_pack_extra.zip` |
| **UI-Icons** | [Game Icons](https://www.kenney.nl/assets/game-icons) + [Input Icons](https://www.kenney.nl/assets/input-icons) | Ergänzende Icons für UI, wo Lucide Lücken hat (z.B. spezifische Sport-Icons). SVG/PNG. | `game_icons.zip`, `input_icons.zip` |
| **Charaktere** | [Blocky Characters](https://www.kenney.nl/assets/blocky-characters) | Optional: Alternative zu Open Peeps für Avatare, falls gewünscht. | `blocky_characters.zip` |

**Installationspfad im Repo:**
- `public/assets/kenney/sports/` (Rasen-Tiles)
- `public/assets/kenney/textures/` (Patterns)
- `public/assets/kenney/icons/` (UI-Icons)

**Bearbeitungspflicht:**
- Alle Kenney-SVGs/PNGs müssen vor Nutzung auf unsere Farbtokens (§2) remapt werden (siehe §2 "Remapping-Regel").
- Keine rohen Kenney-Assets direkt im Code verwenden.

### 12.2 Weitere Quellen (Sekundär)
- **Openclipart.org:** CC0 1.0. Nur für einzelne Stadion-Illustrationen, falls Kenney nicht reicht. Qualität prüfen, oft Nachbearbeitung nötig.
- **Wikimedia Commons:** Nur explizit CC0/PD markierte Dateien. Vorsicht bei historischen Wappen (Lizenz prüfen).

### 12.3 Verbotene Quellen
- Stock-Seiten (Shutterstock, Vecteezy, etc.): Nicht CC0, Lizenzrisiko.
- Game-icons.net: CC-BY (Attribution required) – nur mit Credits-Datei nutzbar, aktuell nicht geplant.
- KI-Generierte Bilder: Verboten (§1 Regel 5).

### 12.4 Credits

Player-facing: [docs/ATTRIBUTION.md](../ATTRIBUTION.md). Maintainer inventory: [assets/ATTRIBUTION.MD](../../assets/ATTRIBUTION.MD) — Kenney (CC0), Lucide (MIT), Open Peeps (CC0), ambientCG (CC0).

**Quell-Zips:** `assets/kenney.nl/` (siehe README dort). Shipped tiles only after remap → `public/assets/kenney/`.

---

**Nächste Migrations-Tasks (Code):** PRD [20_design_language.md](./20_design_language.md) (FilterChip, ModalShell, index.css-Abbau).

**Referenz:** PRD 20 Design language & UI system.