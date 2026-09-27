# /docs/prd/11_finances.md

**Version:** 1.0  
**Last Updated:** 2026-09-27  
**Status:** Final (M1: F6.1–F6.4)

---

## Purpose

Vereinsökonomie für v1 spezifizieren: getrennte Budgets, wiederkehrende Einnahmen und Ausgaben, monatliche Cashflow-Visualisierung. Der Manager führt den Club als Business — nicht nur als Kader.

Diese PRD ersetzt den Mini-Stub in `src/economy/club-finances.ts` („one pool until PRD 11“) und verknüpft Transfers (PRD 05), Liga (PRD 12 — noch offen) und Stadion (F7.1, später).

---

## Scope

**In (M1 — F6.1–F6.4):**

| ID | Feature | Modul |
|---|---|---|
| F6.1 | Budget-Split | Transfer- vs. Gehaltsbudget getrennt |
| F6.2 | Einnahmen-Streams | Eintritt, TV/Prämien, Basis-Sponsoren |
| F6.3 | Ausgaben | Gehälter, Personal, Unterhalt |
| F6.4 | Cashflow-Visualisierung | Wasserfall monatlich, Icon-first |

**Out (v1, explizit deferred):**

| ID | Grund |
|---|---|
| F6.5 | Sponsor-Verhandlungen — M2 |
| F6.6 | Kredite/Investoren — Stack-Regel (keine Deep Finance in v1) |
| F6.7 | Merchandise dynamisch — M3; bis F7 Matchday-Commerce |
| F6.8 | Finanzkrise-Szenario — M3 |

Matchday-Commerce (Wurst/Bier/Shirt-Preise) und Stadion-Editor liegen in F7; bis dahin nutzt F6.2 feste Ticket-Defaults.

**Dependencies:** PRD 05 (Transfers/Verträge), PRD 08 (Savegame), PRD 09 (UI), PRD 10 (Feature-Liste)

**Code-Pfade (Ziel):**

- `/src/economy/club-finances.ts` — Formeln, Wochenabschluss
- `/src/economy/finance-ledger.ts` — Monats-Snapshots für Wasserfall
- `/src/economy/division-economy.json` — TV-/Prämien-Koeffizienten pro Liga
- `/src/ui/screens/FinancesScreen.tsx` — F6.4
- `/src/persistence/migrations/migration_XXX_finances.ts`

---

## Design-Grundsätze

1. **Kein Random Walk:** Einnahmen und Ausgaben sind deterministisch aus Liga, Spielplan, Verträgen und Defaults. Kein verstecktes „Markt-RNG“.
2. **Zwei Budget-Töpfe:** Transfergeld und Gehaltsbudget sind **getrennte Limits**, nicht nur ein Cash-Konto.
3. **Cash ist Wahrheit:** `cash` ist die liquide Bilanz nach allen Buchungen. Budgets sind **Caps**, keine zweite Währung.
4. **Wöchentliche Simulation, monatliche Berichte:** Die Woche simuliert (PRD 08); der Spieler sieht Cashflow in **4-Wochen-Monaten** (13 Perioden/Jahr).
5. **Icon-first:** Finanzscreen = Wasserfall + Ampeln, keine Tabelle mit 40 Zeilen.
6. **Keine Kredite in v1:** Negatives Cash ist erlaubt (Warnung), aber kein Kreditprodukt (F6.6).

---

## Specification

### 11.1 Datenmodell (F6.1)

Erweiterung von `ClubFinances` in `state.pipeline.club_finances`:

```typescript
export interface ClubFinances {
  /** Liquide Bilanz nach allen Buchungen. */
  cash: number;
  /** Max. Ablösesumme, die der Manager ausgeben darf (≤ cash). */
  transfer_budget: number;
  /** Max. erlaubte Wochenlohnsumme des Profikaders. */
  wage_budget_weekly: number;
  /** Letzter abgeschlossener Finanzmonat (1–13). */
  last_closed_month: number;
}
```

**Startwerte (Regionalliga, neues Spiel):**

```json
{
  "cash": 6000000,
  "transfer_budget": 2500000,
  "wage_budget_weekly": 85000,
  "last_closed_month": 0
}
```

**Invarianten:**

| Regel | Prüfung |
|---|---|
| `transfer_budget ≤ cash` | Nach jeder Buchung clampen |
| `transfer_budget` sinkt bei Ablöse | PRD 05 `applyTransferFee` |
| Gehaltsbudget ist Cap, nicht Ausgabe | `weeklyWageBill ≤ wage_budget_weekly` für neue Verträge |
| `cash` kann negativ werden | UI: Warnung 🔴, kein Soft-Stop in M1 |

**Hilfsfunktionen:**

```typescript
function weeklyWageBill(players, clubId): number;
function transferBudgetAvailable(finances): number; // = finances.transfer_budget
function wageBudgetHeadroom(finances, players, clubId): number;
// wage_budget_weekly - weeklyWageBill
```

Transfers (PRD 05) prüfen `transfer_budget`, nicht rohes `cash`. Gehaltsverhandlungen prüfen `wageBudgetHeadroom`.

---

### 11.2 Einnahmen (F6.2)

Alle Einnahmen laufen über `applyIncome(finances, line)` → erhöht `cash`. Transfer-Budget wird **nur** bei expliziten Zuschüssen (Saisonprämie, Verkauf) erhöht — siehe unten.

**Einnahmearten:**

| Code | Trigger | Formel (M1) |
|---|---|---|
| `sponsorship` | Jede Woche | `division.sponsorship_weekly` |
| `tv_rights` | Jede Woche | `division.tv_weekly` |
| `matchday_tickets` | Heimspiel-Woche (Sa) | `capacity × fill_rate × avg_ticket` |
| `league_prize` | Saisonende | `division.prize_by_place[table_place]` |
| `tv_bonus` | Saisonende | `division.tv_season_bonus[table_place]` |
| `player_sale` | Transfer Verkauf | Ablöse (PRD 05) |

**Division-Defaults** (`/src/economy/division-economy.json`):

```json
{
  "regionalliga-nord": {
    "tier": 3,
    "sponsorship_weekly": 55000,
    "tv_weekly": 12000,
    "stadium_defaults": {
      "capacity": 8000,
      "fill_rate": 0.72,
      "avg_ticket_eur": 18
    },
    "prize_by_place": [0, 180000, 120000, 80000, 50000, 30000, 15000],
    "tv_season_bonus": [0, 250000, 180000, 120000, 80000, 50000, 25000]
  }
}
```

`prize_by_place[0]` und `tv_season_bonus[0]` sind unbenutzt (Plätze 1–6).

**Ticket-Einnahme:**

```typescript
function matchdayTicketIncome(divisionId, isHomeMatch): number {
  if (!isHomeMatch) return 0;
  const d = divisionEconomy[divisionId].stadium_defaults;
  return Math.round(d.capacity * d.fill_rate * d.avg_ticket_eur);
}
```

Heimspiel-Erkennung: `playerFixture` am Spieltag, `homeTeamId === player_club_id` (bestehende Liga-Logik).

**Transfer-Budget bei Einnahmen:**

| Einnahme | `cash` | `transfer_budget` |
|---|---|---|
| Sponsoring, TV wöchentlich, Tickets | + | — |
| Saisonprämie, TV-Bonus, Spielerverkauf | + | + (50 % der Netto-Einnahme, gerundet) |

Die 50 %-Regel hält den Transfer-Topf spürbar, ohne ihn mit operativem Cash zu verwechseln.

---

### 11.3 Ausgaben (F6.3)

| Code | Trigger | Formel (M1) |
|---|---|---|
| `player_wages` | Jede Woche | `weeklyWageBill(pros + youth with contract, clubId)` |
| `staff_wages` | Jede Woche | `division.staff_wages_weekly` (Flat bis F8.1) |
| `facility_maintenance` | Jede Woche | `division.maintenance_weekly` |

**Division-Defaults (ergänzend):**

```json
{
  "staff_wages_weekly": 18000,
  "maintenance_weekly": 9000
}
```

Ausgaben reduzieren nur `cash`, nie `transfer_budget`.

**Wochenabschluss** (ersetzt `advanceWeeklyClubFinances`):

```typescript
function advanceWeeklyClubFinances(
  finances: ClubFinances,
  context: WeeklyFinanceContext,
): { finances: ClubFinances; lines: FinanceLine[] };
```

`WeeklyFinanceContext`: `players`, `clubId`, `divisionId`, `isHomeMatchWeek`, `season`, `week`.

---

### 11.4 Finanz-Ledger & Monatsabschluss (F6.4)

Für den Wasserfall speichert das Savegame aggregierte Monatsbuckets:

```typescript
export type FinanceLineKind =
  | "sponsorship"
  | "tv_rights"
  | "matchday_tickets"
  | "league_prize"
  | "tv_bonus"
  | "player_sale"
  | "player_wages"
  | "staff_wages"
  | "facility_maintenance"
  | "transfer_fee"
  | "other";

export interface FinanceLine {
  kind: FinanceLineKind;
  amount: number; // positiv = Einnahme, negativ = Ausgabe
  week: number;
}

export interface FinanceMonthSnapshot {
  month: number; // 1–13
  season: number;
  opening_cash: number;
  closing_cash: number;
  lines: FinanceLine[];
}
```

**Monatsgrenzen:** Spielwoche `week` → `month = Math.ceil(week / 4)` (max 13).

Am Ende von Woche 4, 8, 12, … wird der laufende Monat geschlossen:

1. Alle `FinanceLine`s der Wochen des Monats summieren.
2. `FinanceMonthSnapshot` an `club_finances.ledger` anhängen (max. 26 Einträge = 2 Saisons, ältere verwerfen).
3. `last_closed_month` setzen.

---

### 11.5 UI — Finanzscreen (F6.4)

Neuer Screen **Finanzen**, erreichbar vom Pipeline-Hub (Kachel 💰 neben Cash-Anzeige).

```text
/** WIREFRAME: PRD 11.5 — Finanzen */
┌────────────────────────────────────────────────────────┐
│ ←  💰 Finanzen · Saison 2 · Monat 7                   │
├────────────────────────────────────────────────────────┤
│  Kasse          Transfer-Topf      Gehalts-Cap         │
│  € 4.82 Mio.    € 1.10 Mio.       85k / 72k ✓        │
├────────────────────────────────────────────────────────┤
│  [Wasserfall Monat 7 — Icon-Balken]                   │
│  ▓▓ Sponsoring +220k                                  │
│  ▓  TV +48k                                           │
│  ▓▓▓ Tickets +104k                                    │
│  ░░░ Gehälter -288k                                   │
│  ░   Personal -72k                                    │
│  ░   Unterhalt -36k                                   │
│  ─────────────────                                    │
│  Saldo Monat: -24k                                    │
├────────────────────────────────────────────────────────┤
│  Saisonübersicht (Sparkline Cash, 13 Monate)          │
└────────────────────────────────────────────────────────┘
```

**Regeln:**

- Wasserfall: grüne Balken = Einnahmen, rote = Ausgaben, Icons pro `FinanceLineKind`.
- Keine Roh-Tabelle; Tooltip für exakte Beträge.
- Hub-Zeile `💰 € X` bleibt; Klick öffnet Finanzscreen.
- Gehalts-Cap: ● grün wenn `wageBill ≤ cap`, ▲ gelb bei >90 %, ◆ rot bei Überschreitung.

---

### 11.6 Saisonende

In `runSeasonEnd` (nach Tabellenplatzierung):

```typescript
const place = tablePlace(league, clubId);
const prize = division.prize_by_place[place];
const tvBonus = division.tv_season_bonus[place];
// Buchung als FinanceLine + cash + 50% auf transfer_budget
```

Promotion/Abstieg (wenn PRD 12 aktiv): Division-ID wechseln → nächste Saison andere `division-economy`-Koeffizienten.

---

### 11.7 Savegame & Migration

**Schema-Bump:** `save_version` +1, Migration `migration_017_finances` (oder nächste freie ID).

```typescript
// Migration: altes { cash } → neues ClubFinances
pipeline.club_finances = {
  cash: old.cash ?? 6_000_000,
  transfer_budget: Math.min(old.cash ?? 2_500_000, 2_500_000),
  wage_budget_weekly: 85_000,
  last_closed_month: 0,
  ledger: [],
};
```

`ledger` optional im Typ: `ledger?: FinanceMonthSnapshot[]`.

**Sanitizer:** Finanzdaten bleiben im Export sichtbar (kein Hidden).

---

### 11.8 Integration mit bestehendem Code

| Bestehend | Änderung |
|---|---|
| `club-finances.ts` | Modell + Wochenformeln nach 11.2/11.3 |
| `week-pipeline.ts` | `advanceWeeklyClubFinances` mit Heimspiel-Flag |
| `App.tsx` `canAffordTransfer` | `transfer_budget` statt `cash` |
| `PipelineDashboard` | Cash-Kachel → Finanzscreen |
| `05_transfers.md` | Verweis auf 11.1 für Budget-Checks |

---

### 11.9 Tests (Pflicht)

`club-finances.test.ts`:

- Wochenabschluss: Sponsoring − Gehälter − Staff − Maintenance.
- Heimspiel-Woche: Ticket-Einnahme zusätzlich.
- `transfer_budget` sinkt bei Ablöse, steigt bei 50 %-Regel auf Verkauf.
- Monatsabschluss Woche 4: Snapshot mit korrekter Summe.
- `wageBudgetHeadroom` bei vollem Kader.

---

## References

- Feature-IDs: F6.1–F6.4 in PRD 10
- Transfers & Verträge: PRD 05
- Stadion-Tickets (später dynamisch): F7.1, F7.5
- Liga-Tabellenplatz: `src/persistence/league-state.ts`
- Archiv-Ökonomie-Überblick: `docs/prd/PRD.md` §7

## Offene Punkte (nicht M1-blockierend)

- Mehrere Divisionen / TV-Skalierung: PRD 12
- Sponsor-Verhandlungen: F6.5
- Matchday-Commerce-Preise: F7 + PRD 11 Ergänzung v1.1
