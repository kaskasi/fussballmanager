# Design-PRD: Visuelle Sprache & Komponenten

**Projekt:** The Club (Fußball-Manager)
**Datei:** `docs/prd/design.md`
**Version:** 0.6 · Status: verbindliche Design-Referenz
**Referenzbilder:** `docs/design-refs/design.png`, `docs/design-refs/lumo/` (Layout only, not shipped)
**Ziel:** Dieses Dokument ist die alleinige Design-Wahrheit. Cursor baut jeden Screen ausschließlich aus den hier definierten Tokens, Komponenten und Wireframes. Bei Konflikten gilt: dieses Dokument > bestehender Code > improvisierte Lösungen.

---

## 1. Design-Philosophie: "Rasen"

Ruhiges, helles Grün-Grau mit klaren Haarlinien; Farbe trägt Bedeutung, nicht Dekoration. Löst "Fernsehnachmittag" (Sand, Braun, 2px-Comic-Outline) ab. Quelle: das Design System **"The Club"** (Richtung A "Rasen", Titelleiste aus Richtung C, Dark Theme "Flutlicht" aus B) — https://claude.ai/artifact/UUrc7FBwLgtiPA7gF8Y7yd (privat; die Werte selbst leben im Repo, siehe §2).

**Sechs Grundregeln:**

1. **Die Vereinsfarbe ist die Aktionsfarbe.** `--accent` folgt dem Trikot des eigenen Vereins (§2.5); Rasen-Grün ist der Default (Kieler FC). Keine andere Farbe konkurriert damit; Status-Grün (`--positive`, Bewertung) bleibt fest.
2. **Nur 1× Gelb.** Der NEXT-Button (`--next`) ist das einzige gelbe Element im Spiel.
3. **Titelleiste in Vereinsfarbe.** Die Leiste oben trägt die Trikotfarbe des eigenen Vereins (§2.4) — das ist die einzige Stelle, an der Vereinsfarbe Fläche wird.
4. **Aus einem Guss.** Gleiche Icon-Familie, gleiche Radien, 1px-Haarlinien (`--line`) statt Comic-Outline. **Emojis sind verboten** außer im **Postfach** (§4.2).
5. **Dichte ist erlaubt.** Desktop-first. Tabellen dürfen 12+ Spalten haben, Zahlen immer mit Tabellenziffern. Mobile ist komprimierter Nachbau, kein Redesign.
6. **Keine KI-generierten Assets.** Alles Visuelle kommt aus SVG-Komponenten, CC0-Texturen und öffentlichen Icon-Sets.

**Ausnahme: Der Treter.** Die Zeitung ist ein Objekt in der Welt, kein UI: Zeitungspapier (`--newsprint`), Serifenschrift, Fraktur-Kopf — in beiden Themes gleich.

---

## 2. Farbtokens

**Quelle der Wahrheit:** `src/ui/design/design-tokens.css`. Nur diese Datei darf rohe Farbwerte enthalten; alles andere nutzt `var(--…)` nach **Rolle**, nie nach Farbton.

| Gruppe | Tokens | Hell |
|---|---|---|
| Grund | `--page` · `--panel` · `--sunken` | #F3F5F1 · #FFFFFF · #E8ECE6 |
| Linien | `--line` · `--line-strong` · `--control-border` | #D6DDD3 · #AEB8AB · #7E8A81 |
| Text | `--text` · `--text-muted` | #16211A · #56635A |
| Aktion | `--accent` · `--accent-strong` · `--accent-soft` · `--on-accent` | aus dem Trikot (§2.5), Default #1E7A3C · #145A2B · #E0F0E4 · #FFFFFF |
| NEXT | `--next` · `--on-next` | #FFC933 · #16211A |
| Verein | `--club` · `--on-club` | aus dem Trikot (§2.4), Default #2E9E46 · #16211A |
| Status | `--positive` · `--negative` · `--warning` · `--info` · `--draw` (+ `--on-…`) | #1E7A3C · #B5452A · #8F5A0E · #2E6A93 · #D0D7CC |
| Bewertung | `--rating-1` … `--rating-5` (+ `--on-rating-N`) | CA-Bänder <70 · 70–84 · 85–99 · 100–114 · 115+ |
| Treter | `--newsprint` · `--newsprint-ink` · `--newsprint-rule` · `--newsprint-kicker` | #F1EEE5 · #1B1A17 · #CBC4B3 · #8A2D1F |
| Overlay | `--scrim` · `--shadow-raised` · `--shadow-overlay` | |

**Regeln:**
- Jede Text/Flächen-Paarung erfüllt WCAG AA (4.5:1). Text auf einer Fläche immer mit dem passenden `--on-…`-Token.
- Status nie nur über Farbe: Icon, Vorzeichen oder Wort dazu (W/D/L, +/−, ✓).
- Keine Verläufe auf Panels. Schatten nur für schwebende Ebenen (`--shadow-overlay` für Modals).

### 2.1 Implementation (PRD 20)

Komponenten-Verträge, CSS-Kaskade, Migrations-Phasen und Screen-Audits leben in
**[20_design_language.md](./20_design_language.md)**. Neue UI nutzt Primitives unter
`src/ui/components/primitives/` — keine dritte Chip-/Modal-Variante pro Screen.

### Global shell override (`design-repair.css`)

`src/ui/design/design-repair.css` is imported **after** `design-tokens.css` and `game-surfaces.css` in `main.tsx`. It is **not** a third design system: it applies legacy “repair P0” rules that still sit outside token-only screens (page background on non-shell routes, `--outline-tinte` hairline on legacy `.panel` / `.card` selectors, circular nav tab pills, NEXT colours). New UI must use **tokens + `components.css`** only; extend repair only when unblocking a legacy route — prefer migrating rules into tokens/game-surfaces and deleting repair over time.

**Diagramm-Reihen (F1, Finanzen):** `--series-1…6` sind die kategorialen Farben für Diagramme — feste Reihenfolge, nie zyklisch, je Theme eigene Stufen (Hell/Dunkel) und mit dem dataviz-Validator geprüft (CVD-Abstand, Normalsicht-Abstand). Im hellen Theme liegen drei Stufen unter 3:1 Kontrast zum Panel: deshalb immer Legende mit Text und eine Tabellen-Ansicht. Grün (Status „positiv“) ist bewusst keine Reihe. Statusfarben (`--positive` …) sind nie Reihenfarben.

### 2.2 Abstände, Radien, Größen

- Abstand: `--space-1/2/3/4/6/8/12` = N × 4px. (`--space-5` ist ein Legacy-Schritt, nicht verwenden.)
- Radius: `--radius-sm` 4px (Badges) · `--radius-md` 10px (Panels, Karten) · `--radius-pill` (Buttons, Chips).
- Größen: `--control-sm` 32 · `--control-md` 40 · `--touch-min` 44 · `--title-bar` 56 · `--portrait-sm` 40 · `--portrait-md` 56 (px).

### 2.3 Legacy-Namen, Dark Theme, Guardrail

- **Legacy-Namen** (`--bg-sand`, `--rasen`, `--tinte`, `--sonnengelb`, `--terra`, `--outline` …) zeigen auf die neuen Rollen, damit alle bestehenden Screens sofort die neue Palette tragen. In neuem Code **nicht** verwenden; jeder Screen wirft sie beim Umzug auf die `tc-`-Komponenten ab. Sie sind `var()`-Aliase auf `:root` und folgen deshalb einem lokal gesetzten `data-theme="dark"` nicht.
- **Dark Theme "Flutlicht":** `[data-theme="dark"]` in `design-tokens.css` setzt dieselben Rollen dunkel. Im Spiel noch nicht schaltbar; die UI-Galerie (§4.3) zeigt es.
- **Guardrail:** `npm run check:design-tokens` (läuft in CI) zählt rohe Farben (#hex, rgb(), hsl()) und feste `font-size`-Werte in allen `.css`- und `.tsx`-Dateien unter `src/` außerhalb von `design-tokens.css` und vergleicht mit `scripts/design-tokens-baseline.json`. Mehr als die Baseline → CI rot. Weniger → `npm run check:design-tokens -- --update` und die Baseline mit committen. Die Zahl kann nur sinken. Daten in `.ts`-Dateien (Trikotfarben, Portrait-Recolor) zählen nicht.

### 2.4 Titelleiste in Vereinsfarbe

`titleBarColors(kit, theme)` in `src/ui/shell/title-bar-colors.ts` wählt `--club` / `--on-club` aus dem Trikot des eigenen Vereins (`WorldClub.kit`); `AppNav` setzt beide als Inline-Variablen auf die Leiste und färbt `<meta name="theme-color">` mit.

1. Hell: erst `kit.primary`, dann `kit.secondary`. Dunkel: umgekehrt.
2. Textfarbe: Tinte (#16211A) oder Weiß, je nachdem, was mehr Kontrast hat.
3. Eine Kandidatin gilt, wenn der Text ≥ 4.5:1 erreicht **und** NEXT-Gelb sich mit ≥ 1.5:1 von der Leiste abhebt (gelbe Trikots fallen raus).
4. Sonst Tinte als Leiste, Weiß als Text.

Auf der Leiste: Wappen auf einer `--panel`-Scheibe, Vereinsname in `--font-display` 700 20px, Menü/Zurück in `--on-club`, Warn-Icons auf `--panel`-Scheiben, NEXT mit 1px-Ring in `--on-club` (Gelb auf hellem Grün hat nur ~2.2:1), Fokusringe in `--on-club`.

### 2.5 Akzent aus der Vereinsfarbe

`clubAccentColors(kit)` in `src/ui/shell/club-accent-colors.ts` leitet `--accent` · `--accent-strong` · `--accent-soft` · `--on-accent` aus dem Trikot ab; `useClubAccent` (in `AppChrome`) setzt sie inline auf `<html>`. Begründung: ADR 0006.

1. Kein Trikot oder das Kieler-FC-Trikot → keine Überschreibung, die Werte aus `design-tokens.css` gelten.
2. Erst `kit.primary`, dann `kit.secondary`. Rot/Orange/Gelb (Farbton ≤ 50° oder ≥ 340°, Sättigung > 25 %) scheidet aus — sonst verwechselbar mit `--negative`, `--warning` und NEXT.
3. Farbton und Sättigung bleiben; die Helligkeit sinkt, bis der Akzent ≥ 4.5:1 auf `--page` und `--panel` erreicht. `--accent-strong` = 8 Helligkeitspunkte dunkler, `--accent-soft` = 12 % Akzent in Weiß, `--on-accent` = Weiß oder Tinte (mehr Kontrast).
4. Scheiden beide aus → Schiefer (`#33475B` · `#22303E` · `#E4E8EC` · Weiß).

**Muss auf `<html>`:** Die Legacy-Aliase (`--rasen-dunkel`, `--rasen-hell` …) werden auf `:root` aufgelöst und folgen einem tiefer gesetzten Wert nicht; Portale hängen unter `<body>`.

**Rolle statt Farbton:** Aktion, Auswahl, aktive Tabs, Hover-Flächen, Fortschritt → `--accent*`. „Gut / gestiegen / erfüllt“ → `--positive`. Rasen-Grafiken (Aufstellungs-Pitch), Heatmaps, Heim/Auswärts-Kodierung und Karten bleiben eigene Farben. `--rasen` ist nur noch für den Pitch reserviert.

Nur das helle Theme wird überschrieben; das Dark Theme (nur UI-Galerie) definiert die Rollen auf seinem Teilbaum selbst.

### Asset-Farbanpassung (Remapping)
Kenney-Tiles und SVGs kommen in eigenen Farben. Bevor sie ins Projekt einfließen, müssen ihre Fill-Farben auf unsere Tokens gemapped werden.
- **Regel:** Nie originale Kenney-Farben übernehmen.
- **Mapping-Beispiel:**
  - Kenney-Rasen-Grün → `var(--rasen)` (#2E9E46, Legacy-Literal)
  - Kenney-Linien-Weiß → `var(--accent-soft)`
  - Kenney-Tribünen-Blau → `var(--staubblau)` (#9DBFD0)
  - Kenney-Akzente → `var(--negative)`, `var(--accent)` oder `var(--info)` — **nie** `--next` (reserviert für NEXT)
- **Umsetzung:** Erstelle eine `assets/kenney-color-map.json` oder führe das Remapping direkt in den SVG-Dateien durch, bevor sie in `public/assets` landen.

---

## 3. Typografie

| Rolle | Font | Einsatz |
|---|---|---|
| `--font-display` | **Sofia Sans Condensed** | Überschriften, Namen, Zahlen im Fokus, NEXT |
| `--font-text` | **Sofia Sans** | Fließtext, Tabellen, Labels, Buttons |
| `--font-news` / `--font-masthead` | Newsreader / UnifrakturMaguntia | **nur** Der Treter |

- Sofia Sans und Sofia Sans Condensed (Lettersoup, OFL 1.1) sind self-hosted in `public/fonts/` (woff2, latin + latin-ext, variable 100–900), kein Google-Fonts-Request. Newsreader (variabel, wght 200–800 und opsz, normal und kursiv, latin + latin-ext) und UnifrakturMaguntia (latin) sind ebenfalls self-hosted (OFL 1.1); Chinesisch fällt im Treter auf Songti zurück.
- CJK fällt auf PingFang SC / Microsoft YaHei / Noto Sans CJK SC zurück.
- Zahlen immer mit Tabellenziffern (`font-variant-numeric: tabular-nums`, global gesetzt).

| Stil | Größe / Zeile | Gewicht | Token |
|---|---|---|---|
| display | 32 / 36 | 800 | `--font-size-2xl` |
| title | 24 / 28 | 800 | `--font-size-xl` |
| heading | 20 / 24 | 700 | `--font-size-lg` |
| body | 16 / 24 | 400 | `--font-size-md` |
| body-sm, Tabellen | 14 / 20 | 400 | `--font-size-sm` |
| label (uppercase, +0.08em) · caption | 12 / 16 | 700 · 400 | `--font-size-xs` |
| Treter-Masthead | 56 / 56 | 400 | `--font-size-masthead` |

---

## 4. Icons

- **Set:** Lucide Icons, gefüllt/phosphor-fill bevorzugt; wenn nur Outline verfügbar: `stroke-width: 2.5`.
- **Größen:** 16px (inline), 20px (Buttons/Tabs), 24px (Nav), 32px (Feature).
- **Absolute Verbotsliste (global):** Emojis als Icons oder Dekor **außerhalb** des Postfachs. Jedes Emoji in Hub, Training, Transfer-UI, Match-Kommentar usw. ist ein Bug. Ersatz-Mapping beim Migrieren: 🌭→utensils, 🍺→beer, 👕→shirt, 🅿️→circle-parking, 🚌→bus, 🚃→train-front, 💰→wallet, 🎫→ticket, 🤝→handshake, 📺→tv, 🏗️→construction, 👷→hard-hat.
- Icons erben die Textfarbe; nie eigenständige Icon-Farben einführen.

### 4.2 Postfach-Emojis (einzige Ausnahme)

Das **Postfach** (Manager-Desk-Mail, Entscheidungen-Screen §9.4, Archiv, Hub-Spalte „Mail“) darf **Unicode-Emojis in Fließtext** nutzen — wie echte Benachrichtigungen, nicht als Ersatz für Lucide in Buttons oder Chips.

**Erlaubt:**
- Archiv-Zeilen und Club-Event-Nachrichten mit führendem Emoji (z. B. Stempel-News „🌱 … legt Grünschnabel ab“, Transfer-Teaser „🚀 …“).
- `clubEventIcon()` und `PostfachMessageText` — nur in Postfach-Komponenten (`DecisionInboxPanel`, `PostfachArchive*`, `HubInboxPanel`).
- Emoji aus Sim/Domain in `event.message` / `inboxEmojiLine()` — **nicht** in UI außerhalb Postfach rendern.

**Verboten (unverändert):**
- Emojis in Header, Menü, Training, Markt, Stadion, Match-Stream, Badges, Chips, Buttons.
- Emojis als einzige Information ohne Text (kein reines „🔥“-Icon statt Lucide außerhalb Postfach).

**Umsetzung:** `src/inbox/postfach-emoji.ts`, `PostfachMessageText.tsx`; führendes Emoji `aria-hidden`, Screenreader liest den Textkörper.

### 4.1 Filter-Chips (Pills)

Position-, Sortier- und Scout-Filter sind **ein** Baustein (`FilterChip`):

- Inaktiv: `--panel` Füllung, 1px `--control-border`, `--radius-pill`
- Aktiv: `--accent` Füllung, Text `--on-accent`, `aria-pressed="true"`
- **Niemals** `--next` für aktive Filter (nur NEXT)
- `FilterChip` / `FilterToolbar` rendern seit dem Kader-Umzug `tc-chip` / `tc-chips` (überall, auch Jugend, Transfers, Scouting). `size="dense"` (32px) für lange Chip-Reihen wie im Scouting.

### 4.3 Komponenten (`tc-`) und UI-Galerie

`src/ui/design/components.css` enthält die Komponenten des Design Systems als `tc-`-Klassen: Titelleiste, NEXT, Buttons, Filter-Chips, Tabs, Panel, sortierbare Tabelle, Liga-Tabelle (eigene Zeile, Abstiegslinie, Formkurve), Bewertungs-Badge, Spielerkarte (groß und Grid), Modal, Key-Value-Liste, Der Treter. Nur Tokens, keine rohen Werte. Die Klassen berühren bestehende Screens nicht, bis ein Screen umzieht.

Portraits (F1): `tc-face` / `tc-face--sm|md|lg` (32 · 56 · 88 px, Tokens `--portrait-xs` / `--portrait-md` / `--portrait-lg`) — `PlayerPortrait` zeichnet faces.js im Kreis; `variant="silhouette"` zeigt die Platzhalter-Figur.

Mit den Transfers (F1) dazugekommen: `tc-deal(s)` (Marktkarte), `tc-callout` (Statuszeile ok/warn/no), `tc-gates` (Bedingungen), `tc-patience`, `tc-modal--wide`; Layout in `design/surfaces/transfers.css`.

Mit dem Spielerprofil (F1) dazugekommen: `tc-menu` (⋮-Menü mit Hinweis je Eintrag), `tc-range` (Schieberegler mit Wert), `tc-chip--icon`, `tc-talk` (Vertragsgespräch, auch in der Transfer-Verhandlung); Bildschirm-Layout in `design/surfaces/profile.css`.

Mit dem Kalender (F1) dazugekommen: keine neuen gemeinsamen Bausteine; Saison-Leiste, Tageszellen und Chronik-Spalte als `tc-cal…` in `design/surfaces/calendar.css`.

Mit dem Stadion (F1) dazugekommen: `tc-stepper` / `tc-stepper__value` (−/+ um einen Wert; Ticketpreis, Imbisspreise, Sponsor-Laufzeit auf dem Handy); Bildschirm-Layout in `design/surfaces/stadium.css`.

Mit dem Kader (F1) dazugekommen: `tc-select`, `tc-check(s)`, `tc-cards` / `tc-card`, `tc-stack`, `tc-empty-state`, `tc-state--good/mid/low`, `tc-namecell`, `tc-row--link`, `tc-list__item--wide` / `--stack-narrow`, `tc-btn--sm`, `tc-chip--dense`, `tc-chips--toolbar`. **Gemeinsame Bausteine, die jetzt überall gelten:** Screen-Tabs (`FmScreenTabBar`, `.fm-tab` im tc-Look ohne Gelb), Filter-Chips, Sortierköpfe (`SquadSortHeader`).

Mit dem Ligen-Screen (F1) dazugekommen: `tc-page-head` / `tc-page-title` / `tc-page-sub` (ein Kopf pro Screen), `tc-tabs--page` + `tc-tab__meta`, `tc-split` (Haupt- + Seitenspalte), `tc-linkbtn` (Namen in Tabellen), `tc-place` (Platz mit Zone), `tc-row--mark`, `tc-form__r--empty`, `tc-spark`, `tc-list` (Ranglisten), `tc-section`, `tc-empty`, `tc-stats` (Kennzahl-Kacheln), `tc-hide-narrow`. React: `ModalShell variant="tc"` (Escape schließt, Fokus auf Schließen), `ratingBand()` in `src/ui/design/rating-band.ts`.

Mit Medizin und Postfach (F1) dazugekommen: keine neuen gemeinsamen Bausteine. Medizin nutzt `tc-page-head`, `tc-stats`, `tc-tabs--page`, `tc-cards` und `tc-table` (Layout in `design/surfaces/medical.css`). Das Postfach nutzt `tc-split` (offene Post + Archiv) und **Der Treter** jetzt `tc-news`; die alten Postfach-Karten sind auf dem Screen per `.postfach-screen` auf Tokens gezogen, die Hub-Spalte behält ihren Look (`design/surfaces/postfach.css`).

Mit Aufstellung, Matchday und Spielbericht (F1) dazugekommen: keine neuen Bausteine in `components.css`. Die Spiel-Bausteine stehen in `design/surfaces/matchday.css`: `tc-score` (Spielstand-Kopf, `--lg` im Bericht), `tc-eventlog` (Tore und Karten in Zeitstrahl-Notation, live und im Bericht), `tc-matchstats` (Doppelbalken: eigener Verein `--accent`, Gegner `--info`), `tc-stars` (Drei Sterne, der erste mit `--next`-Rahmen). Spielfeld `tc-pitch` mit eigenen Tokens (`--pitch-*`, in beiden Themes gleich): eigene Spieler als Tinte-Chips, Gegner weiß mit Tinte-Rand, Ballführer gelber Rand; Antippen öffnet eine Mini-Karte (Nummer, Name, Verein · Position, Ballkontakte) mit weißem Halo am Chip, Escape schließt. Die Bank steht unter dem Spielfeld (3 × 3). „Direkt zum Spielbericht“ steht im Menü unter „Spiel“; `tc-pitch` gilt nur noch für die Aufstellung; der Live-Matchday ist Text-first ohne Spielfeld (§9.15, ADR 0004).

**UI-Galerie:** Einstellungen → Entwickler → „UI gallery“ oder `?ui=gallery`. Zeigt Farbrollen, Typo, Abstände, alle Komponenten mit Beispieldaten, Titelleisten für sieben Trikots (jeder Zweig von §2.4) und einen Hell/Dunkel-Schalter. Lädt als eigener Chunk; Spieler sehen sie nicht. Beim Bau oder Umzug eines Screens zuerst hier prüfen.

**Migration Screen für Screen:** Screen auf `tc-`-Klassen und Rollen-Tokens umstellen, Legacy-Regeln aus `index.css` löschen, `npm run check:design-tokens -- --update` committen, Vorher/Nachher-Screenshot in den PR.

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

**Titelleiste in Vereinsfarbe (§2.4), ohne Border.** Darunter beginnt die Content-Karte.

```
┌──────────────────────────────────────────────────────────────┐
│ (Wappen) Kieler FC          [!]        € 5.50 Mio  Menu  [NEXT ▶ 2] │   ← Fläche: --club, Text: --on-club
└──────────────────────────────────────────────────────────────┘
```

- **Links = Identität:** Wappen auf `--panel`-Scheibe + voller Vereinsname (`--font-display` 700, 20px). Nie Kürzel.
- **Mitte = Status:** Warn-Icons (Trainingsplan, Lager, Medizin, Kasse) auf `--panel`-Scheiben in `--warning`.
- **Rechts = Fortschritt:** Kassen-Chip (`--panel`), `Menu` (transparent, `--on-club`, Rand 45 % `--on-club`), `NEXT ▶` (`--next` / `--on-next`, Pill, Display-Font 800, 1px-Ring `--on-club`, rotes Zähler-Badge `--negative`). **Einzige Gelbstelle im Spiel.**
- Höhe: `--title-bar` (56px). Sticky top, `z-index: 100`.
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

- Panel: `--panel`, 1px `--line`, `--radius-md`, `--shadow-overlay`. Breite 240px, am rechten Rand rechtsbündig.
- Kategorie-Header: 11px uppercase, `--tinte-weich`, letter-spacing.
- Menüpunkte: Icon (20px) + Label, 12px Padding, Hover `--sunken`, aktiv `--accent-soft` gefüllt, Label `--text` (Display optional fetter).
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

**Eine Datei pro Screen** unter [`design/`](design/) (§9.1–§9.17). Für einen Screen-Task reicht diese Datei plus die Wireframe-Datei des Screens. Gelände-Editor lebt nur unter **§9.3 Tab Gelände** — kein eigener Abschnitt.

Allgemeine Regeln: `[...]` = anklickbar, `●` = aktiver Zustand, Wireframes definieren **Proportionen und Nachbarschaften, keine Pixelmaße** – die kommen aus den Tokens.

| § | Screen | Datei |
|---|---|---|
| 9.1 | Aufstellung | [design/09.01-aufstellung.md](design/09.01-aufstellung.md) |
| 9.2 | Finanzen | [design/09.02-finanzen.md](design/09.02-finanzen.md) |
| 9.3 | Stadion (Tabs: Grundriss \| Gelände \| Ausbau) | [design/09.03-stadion.md](design/09.03-stadion.md) |
| 9.4 | Entscheidungen / Postfach | [design/09.04-postfach.md](design/09.04-postfach.md) |
| 9.5 | Kalender | [design/09.05-kalender.md](design/09.05-kalender.md) |
| 9.6 | Transfers | [design/09.06-transfers.md](design/09.06-transfers.md) |
| 9.7 | Tabellen (Liga) | [design/09.07-tabellen.md](design/09.07-tabellen.md) |
| 9.8 | Spielerprofil | [design/09.08-spielerprofil.md](design/09.08-spielerprofil.md) |
| 9.9 | Hub — Manager Desk (Start-Screen, PRD 14.15) | [design/09.09-hub.md](design/09.09-hub.md) |
| 9.10 | Training | [design/09.10-training.md](design/09.10-training.md) |
| 9.11 | Kader (Squad) | [design/09.11-kader.md](design/09.11-kader.md) |
| 9.12 | Jugend | [design/09.12-jugend.md](design/09.12-jugend.md) |
| 9.13 | Scouting | [design/09.13-scouting.md](design/09.13-scouting.md) |
| 9.14 | Spiel Zusammenfassung | [design/09.14-spiel-zusammenfassung.md](design/09.14-spiel-zusammenfassung.md) |
| 9.15 | Matchday | [design/09.15-matchday.md](design/09.15-matchday.md) |
| 9.16 | Medizin | [design/09.16-medizin.md](design/09.16-medizin.md) |
| 9.17 | Merchandising (Tabs: Preise \| Einkauf) | [design/09.17-merchandising.md](design/09.17-merchandising.md) |


## 10. Definition of Done (pro Screen)

Ein Screen gilt erst als fertig, wenn:
- [ ] Nur Tokens aus diesem Dokument verwendet (keine Hex-Codes im Screen-Code)
- [ ] Null Emojis außer Postfach (§4.2; auch nicht "temporär" anderswo)
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

**Cursor-Regel:** `.cursor/rules/main.mdc` ist lokal (gitignored, nicht im Repo). Verbindlich für alle Agenten: `AGENTS.md`.

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
| **Charaktere** | [Blocky Characters](https://www.kenney.nl/assets/blocky-characters) | Optional: Alternative zu den faces.js-Portraits, falls gewünscht. | `blocky_characters.zip` |

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

Player-facing: [docs/ATTRIBUTION.md](../ATTRIBUTION.md). Maintainer inventory: [assets/ATTRIBUTION.MD](../../assets/ATTRIBUTION.MD) — Kenney (CC0), Lucide (MIT), faces.js (Apache-2.0), ambientCG (CC0).

**Quell-Zips:** `assets/kenney.nl/` (siehe README dort). Shipped tiles only after remap → `public/assets/kenney/`.

---

**Nächste Migrations-Tasks (Code):** PRD [20_design_language.md](./20_design_language.md) (FilterChip, ModalShell, index.css-Abbau).

**Referenz:** PRD 20 Design language & UI system.