# /docs/prd/05_transfers.md

**Version:** 1.5
**Last Updated:** 2026-10-10
**Status:** Final

---

## Purpose

Transfersystem, Vertragsverhandlungen und den KI-Transfermarkt spezifizieren. Zentral: eine deterministische `market_value`-Formel (P0), die sichtbare Attribute, Alter und Vertragsstatus kombiniert. Der Preis unbekannter Spieler trägt die Unsicherheit des Käufers.

---

## Scope

- Transfersystem (`/src/transfers/market_value.ts`, `/src/transfers/negotiations.ts`)
- KI-Transferlogik (`/src/ai_clubs/transfer_ai.ts`)
- Vertragsobjekt-Erweiterung (PRD 07 `Contract`)
- Transferfenster-Steuerung (`/src/sim/transfer_windows.ts`)

**Dependencies:** PRD 02 (Growth Engine), PRD 04 (Scouting/Wissen), PRD 07 (Player-Schema), PRD 08 (Savegame), PRD 09 (UI Screens)

---

## Design-Grundsätze

1. **Market Value ist deterministisch:** Eine Funktion aus Attributen, Alter, Vertrag und Reputation. Kein Random Walk. Verhandlungen bewegen sich um diesen Wert.
2. **Der Eigentümer kennt seinen Spieler zu 100 %.** Käufer schätzen. Preisverhandlungen mit unbekannten Talenten sind Risk-Analytics.
3. **Fenster-Disziplin:** Deutsches Ligajahr. Spieltag 1 = KW 35 (Ende August).
   Sommerfenster KW 35–36 (noch offen am Saisonstart), Winter KW 2–4 (Januar).
   Intern bleibt `week` 1–34 der Spieltag. Außerhalb: keine Transfers, nur
   Vertragsverhandlungen mit vereinslosen Spielern.
4. **Verträge binden:** Gehalt, Bonus und Klauseln sind Wirtschaftsgrößen. Budget-Limits (Transfer-Topf, Gehalts-Cap) stehen in PRD 11.1; Ablösen und Gehälter buchen gegen `transfer_budget` bzw. `wage_budget_weekly`.
5. **Verkauf ist erlaubt und normal:** Sell-On-Klauseln an Jugendspielern machen die Pipeline ökonomisch lohnend.
6. **Kauf-Gate (Discovery):** Ablöse-Verhandlung und Kaufabschluss nur für Spieler in `scout_board.discovery.scout_pool` (PRD 04.5). Kein Fallback über die volle Rivalen-Liste.

---

## Specification

### 05.1 Market Value Formel (P0)

```text
market_value =
    base_attribute_value(ca_estimated)
  × present_value_factor(age)
  × development_upside_factor(age, ca, growth_signal)   // age < 21, kann > 1 sein
  × contract_factor(months_remaining, wage)
  × demand_factor(position_supply)
  × reputation_factor(player, club)
  // cap 8 Mio € wenn age < 21 (ohne Awards)
```

**a) `ca_estimated`** — gewichtete Attributsumme. Positionsgruppen: PRD 07 (LB/RB → FB, DM/CM → MF, LM/RM/LW/RW → W).

```json
{
  "ca_weights": {
    "GK": { "gk_handling": 0.35, "concentration": 0.15, "positioning": 0.15, "composure": 0.10, "leadership": 0.10, "passing": 0.15 },
    "CB": { "positioning": 0.25, "strength": 0.20, "concentration": 0.15, "passing": 0.10, "pace": 0.10, "composure": 0.10, "leadership": 0.10 },
    "FB": { "pace": 0.25, "stamina": 0.15, "passing": 0.20, "positioning": 0.15, "strength": 0.10, "vision": 0.15 },
    "MF": { "passing": 0.25, "vision": 0.20, "stamina": 0.15, "technique": 0.15, "teamwork": 0.10, "composure": 0.15 },
    "AM": { "vision": 0.25, "technique": 0.20, "passing": 0.20, "dribbling": 0.15, "composure": 0.10, "shooting": 0.10 },
    "W":  { "pace": 0.25, "dribbling": 0.25, "technique": 0.15, "shooting": 0.15, "passing": 0.10, "vision": 0.10 },
    "CF": { "shooting": 0.35, "composure": 0.15, "pace": 0.15, "strength": 0.10, "positioning": 0.15, "technique": 0.10 }
  }
}
```

`ca_estimated = Σ(attribute × weight)`. Für den Markt gilt die Scout-Schätzung des bewertenden Clubs (PRD 04), nicht der wahre Wert.

**b) `base_attribute_value`** — exponentielle Kurve. Anker und Formel sind dieselben Zahlen:

```typescript
// src/transfers/market_value.ts
function baseAttributeValue(ca: number): number {
  // ca 60 ≈ 0.2M, ca 100 ≈ 3.5M, ca 140 ≈ 23M, ca 180 ≈ 94M
  return 200_000 * Math.pow(ca / 60, 5.6);
}
```

**c) `present_value_factor` + `development_upside_factor` (ersetzt die alte `age_curve` mit 0,15 bei 15 J.):**

- **`present_value_factor(age)`** — Karriere-Reife, Peak 23–27 = 1,0. 15–17 leichter Risikoabschlag (~0,88–0,95), **nicht** 85 % Malus. Ab 28 wie bisher fallend bis 0,12 (35+).
- **`development_upside_factor(age, ca, growth_signal)`** — nur **`age < 21`**, sonst 1,0. Multiplikator **> 1** für verbleibende Entwicklung:
  - **`growth_signal`**: normalisiert 0–1 aus `recent_growth_26w` (Owner) bzw. Scout-Sparkline (Käufer, PRD 04.5) — **keine** hidden Anlage/Drive.
  - **`ca_headroom`**: Abstand Richtung Soft-Cap 180 skaliert den Upside-Anteil.
  - Form in Code: `src/transfers/market-value.ts` (`developmentUpsideFactor`, `upsideMax ≈ 0,55`).
- **Jugend-Deckel:** `market_value ≤ 8 Mio €` wenn `age < 21` (ohne Award-Multiplikatoren).

**Beispiel (gleiche CA 99, AM, normales Wachstum, Vertrag 24 Monate):**

| Alter | Richtwert |
|------|-----------|
| 15 | ~4–5 Mio € (über 25-Jährigem) |
| 25 | ~3,3 Mio € (Peak-Leistungswert) |

Wöchentliches Recompute — **kein** Save-Migration nötig.

**d) `contract_factor`:**

```typescript
function contractFactor(monthsRemaining: number, wage: number, marketWage: number): number {
  // Über 6 Monate: 36 Monate → 1.15, 7 Monate → ca. 1.03
  let factor = 1.0 + (monthsRemaining / 36) * 0.15;
  // 6 Monate oder weniger: halbieren (6 Monate → ca. 0.51, 5 Monate → ca. 0.51)
  if (monthsRemaining <= 6) factor *= 0.5;
  if (monthsRemaining <= 6 && youthAcademy) factor = max(factor, 0.82);
  if (wage > marketWage * 1.3) factor *= 0.85;
  return factor;
}
```

Ohne Vertrag (`contract == null`) ist `monthsRemaining` 0, der Faktor also 0.5 vor dem Gehaltsmalus. **U17/U19:** Floor 0,82 bei kurzer Restlaufzeit, damit Akademie-Verträge den Marktwert nicht halbieren.

**e) `demand_factor`:** Knappheit der Positionsgruppe in der Liga. Viele Vereine brauchen Stürmer und wenige sind verfügbar: bis 1.2×. Überangebot: bis 0.85×. Wöchentlich neu.

**f) `reputation_factor`:** Bekanntheit (Jahrgangs-Awards, Nationalteam, Titel) 0.95–1.15×.

### 05.2 Wer weiß was

| Partei | Kennt | Kennt nicht |
|---|---|---|
| Eigentümer-Club | Eigene Spieler zu 100 % (wahre CA) | — |
| Kaufinteressent | Eigene Scout-Schätzung (CI-Band, PRD 04.1) | Wahre CA, wahren drive, wahre anlage |
| Spieler | Grobe Orientierung am eigenen Marktwert | Exakte Zahlen |

Der Preis, den ein Interessent zahlt, basiert auf seiner Schätzung. Ein schlecht gescouteter KI-Käufer zahlt zu wenig. Das ist der Expertise-Vorteil des Verkäufers.

### 05.3 Transfer-Verhandlungsmodell

```typescript
interface TransferOffer {
  id: string;
  from_club: string;
  to_club: string;
  player_id: string;
  fee_offer: number;
  addons?: {
    appearances_fee?: number;
    goals_bonus?: number;
    promotion_fee?: number;
  };
  sell_on_percentage?: number;
  payment_structure?: "upfront" | "installments_2y" | "installments_3y";
  loan_back_weeks?: number;
  exchange_player_id?: string;
  expires_week: number;
}

interface NegotiationStance {
  seller_min_accept: number;
  buyer_max_offer: number;
  patience_rounds_left: number;
}
```

Runden-Modell:

- Maximal 4 Runden. Danach Abbruch für beide Seiten.
- Pro Runde: Angebot, Gegenangebot oder Ablehnung.
- `negotiation_skill` des Managers verschiebt den Spielraum der Gegenseite um ±5 %.
- Die Reaktion folgt ausschließlich dieser Matrix (Angebot in Prozent des Eigenwerts):

```json
{
  "reaction_matrix": {
    "offer_below_70_percent": "sofortige Ablehnung und Beziehungsschaden",
    "offer_70_85": "Gegenangebot 115% und Geduld-1",
    "offer_85_100": "Gegenangebot 108%",
    "offer_100_110": "Zustimmung 70%, sonst Gegenangebot 104%",
    "offer_above_110": "Zustimmung"
  }
}
```

**UI Kauf (Fremdakte / Scouting):** **Kaufen** öffnet immer das Transfer-Verhandlungsmodal; Fenster-, Scout-Genauigkeit- und Budget-Gates sitzen **im Modal** (Checkliste / deaktiviertes Angebot senden), nicht als blockierender Toast davor. Kein separater Blind-Buy-Bestätigungsdialog in v1.

### 05.4 Vertragsverhandlungen (Spieler und eigener Club)

```json
{
  "negotiation_parameters": {
    "wage_anchor": "market_value × 0.8% pro Jahr als Startgehalt (CA 100 ≈ 3.5M → ca. 28k/Jahr)",
    "modifiers": {
      "squads_role": "Rotation -15%, Starter +10%, Star +30%",
      "club_reputation_gap": "Spieler über Club = Aufschlag 20-50%",
      "loyalty_years": "5+ Jahre im Verein = Rabatt bis -15%",
      "buyout_demand": "Wunschklausel kostet Gehalt +5-10%",
      "recent_drive_events": "Slump-Spieler (PRD 06) verlangen mehr Sicherheit und weniger Bonus"
    }
  },
  "player_priorities": {
    "distribution": "Gewichte: money / playing_time / ambition / loyalty / location",
    "weights_generated": "Dirichlet-Verteilung bei der Spielergenerierung",
    "visibility": "Der Berater gibt Hinweise, keine exakten Gewichte"
  }
}
```

Frust-Spirale: 3 Fehlangebote in Folge → `morale` −10 und optional `desire_to_leave`.

UI (Akte, F5.4): Verhandeln öffnet ein **Modal**, nicht die Karte. Slider:
Gehalt, Laufzeit, Einsatzbonus, Minuten-Garantie, Startplatz
(`none` / `rotation` / `starter`). Jugend und Profis derselbe Dialog.
**Laufzeit:** Verträge enden am **Sommerfenster** vor `until_season` — gleiche
Saison-Semantik wie Leihen (`contractUntilSeasonAfterTerm`).

**Fog of war:** Beim **ersten** Angebot kein Berater-Hinweis und kein Live-Verdikt
(keine Zielvorgaben, keine 😤/🤝-Zeile). Nach **einer** Absage erscheint ein
Sponsor-artiges Verdikt (z. B. „Zu wenig Gehalt“) live an den Slidern.
**Anbieten bleibt aktiv**, solange die Frust-Sperre nicht greift — anders als
beim Sponsor-Handschlag, der erst bei Fit klickbar ist.

Sperre ohne Tageszähler in der UI (Akte zeigt den Grund, nicht die Dauer):

- Nach **3 Fehlangeboten** kein Modal: Spieler ist sauer und will erst mal
  nicht reden. Danach, solange `desire_to_leave`, will er zu einem größeren
  Verein und unterzeichnet hier nicht mehr.
- Nach Unterschrift: hat gerade einen neuen Vertrag unterzeichnet
  (intern 60 Tage, ohne Zahl).
- Ein oder zwei Fehlangebote sperren nicht. Abbrechen ohne Angebot zählt nicht.

Intern: `state.contract_talks_locked_until_day` für die stille Frist nach
Unterschrift und nach der dritten Absage.

**Gehalts-Floor (v1):** Kein Gehalts-**cut** ohne Story-Flag
`state.contract_wage_cut_allowed`. Angebote unter dem aktuellen Vertrag werden
abgelehnt (außer Story).

**Fair Startgehalt:** Neue Profiverträge und KI-Rivalen nutzen
`fairInitialProContract` / `playerContractAsk` — kein künstlich aufgeblähtes
Startgehalt.

**Kauf atomar:** Ablöse vereinbart → `pending_purchases` → Vertrag im gleichen
Flow → `commitPendingPurchase`; scheitert der Vertrag, Rollback via
`abortPendingPurchase`.

**Unterbezahlt-Arc:** Gehalt dauerhaft unter 85 % der fairen Forderung
(`UNDERPAID_WAGE_RATIO`), mindestens eine Saison im Verein. Postfach-Items bei
3 / 9 / 12 Monaten (`contract_renegotiate`); Deep-Link **Verhandeln**. Ohne
Lösung nach 12 Monaten: `contract_demoralized`, Moral-Cap 45.

**Jugend (F3.6):** Postfach-Aktion **Verhandeln** — kein One-Click
`signYouthContract`; derselbe Modal-Dialog wie F5.4.

Saison-Anzeige in der UI ist das Kalenderjahr: Startjahr 2026 plus
abgeschlossene Saisons (`Saison 1` → `Saison 2026`). Intern bleibt der
Zähler 1, 2, 3.

### 05.5 KI-Transfermarkt

```typescript
interface TransferAIWeights {
  squad_need: number;
  budget_available: number;
  sell_threshold: number;
  academy_overflow: boolean;
  contract_expiry_pressure: number;
}
```

Wöchentlicher Loop, nur im offenen Fenster:

1. Eigene Kaderlücken prüfen.
2. Budget-Headroom bestimmen.
3. Shortlist aus der eigenen Scout-Datenbank, mit eigener Unsicherheit.
4. Angebot nach `market_value` der eigenen Schätzung, plus Risikopräferenz.
5. Verkauf bei gutem Angebot oder auslaufendem Vertrag.

Realismus:

- Top-Clubs beobachten produzierte Talente nach 2–3 Jahren stärker. Die Angebotswahrscheinlichkeit steigt mit `ca_estimated`.
- KI-Clubs handeln untereinander in der Compressor-Sim. Sichtbar sind nur Transfer-News.
- KI-Clubs können pleitegehen und müssen dann Jugendspieler verkaufen.

### 05.6 Ablösefreie Spieler und Vorverträge

- Ablösefrei ab 6 Monaten vor Vertragsende.
- Vorvertrag: Zusage, wirksam zum Vertragsende, Status `transfer_pending` im Savegame.
- Signaturbonus 10–15 % der gesparten Ablöse. 1–3 Mitbieter mit Gegenangeboten.

### 05.7 Leihen

```json
{
  "loan_rules": {
    "season_loans_per_club": "max 5 ausgeliehen, 5 verliehen",
    "window": "nur in Transferfenstern",
    "duration": "Rest der Saison oder kalenderjährig",
    "wage_split": "Standard 50/50, verhandelbar 0/100 bis 100/0",
    "loan_fee": "Richtwert 15% des market_value bei Talenten mit Spielzeitgarantie",
    "recall_clause": "im Winterfenster abrufbar, wenn die Minuten-Garantie verletzt ist",
    "develop_feedback": "Geliehene Spieler entwickeln sich im Zielverein weiter (PRD 02)"
  }
}
```

### 05.8 Transfer-Historie und Markt-Ansicht

- `history.jsonl` (PRD 08.1): jeder Abschluss als Event `{week, player, fee, clubs}`.
- Markt-Screen: filterbare Liste (Position, Alter, Gehalt, CI). Feed „Letzte Transfers“ mit Farbicons (rot teuer, grün billig, grau Leihe).
- Top-Transfers der Woche sind Karten mit Portrait, kein Zahlenstapel.

### 05.9 Savegame-Integration

```json
{
  "transfers": {
    "active_negotiations": [],
    "pending_transfers": [],
    "current_window": "summer_1",
    "fee_history_this_season": { "spent": 0, "earned": 0 }
  }
}
```

Liegt in `state.json`. Keine eigene Datei.

### 05.10 Invarianten (Unit-Tests)

| Testfall | Erwartetes Ergebnis |
|---|---|
| `baseAttributeValue(100)` | ≈ 3.49 Mio (±1 %) |
| `baseAttributeValue(60)` | 200_000 |
| Spieler, Alter 19, Käufer-Schätzung −20 % CA | Angebot entsprechend unter dem wahren `market_value` |
| `contractFactor` bei `monthsRemaining=5` | ≈ 0.510, also ≤ 0.6 |
| `contractFactor` bei `monthsRemaining=6` | ≈ 0.513, nicht 1.02 |
| Verhandlung nach 4 Runden ohne Einigung | Abbruch, keine weitere Offerte in dieser Fensterperiode |
| Transferaufruf außerhalb des Fensters | wirft, kein stiller Fehlschlag |
| Sell-On 20 %, Weiterverkauf 5M | Ursprungsclub erhält 1M in `fee_history.earned` |
| KI-Club mit Budget 2M, Wunschspieler 5M | Kein Angebot |
| Geliehener Spieler verfehlt die Minuten-Garantie | Rückruf im Winterfenster |
| `desire_to_leave` und erfolgreicher Verkauf | `morale` im neuen Club = 60 |
| Dieselben Inputs | Dieselbe `market_value` |

## References

- Scouting: PRD 04.1, PRD 04.5
- Youth Sell-On: PRD 03.4, PRD 03.5
- Drive-Events: PRD 06.2
- Contract und Positionsgruppen: PRD 07
- Attribute: PRD 07.1
