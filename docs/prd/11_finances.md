# /docs/prd/11_finances.md

**Version:** 1.1  
**Last Updated:** 2026-10-03  
**Status:** Final (M1: F6.1–F6.4; F6.5 Stadion-Inventar gezogen)

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
- `/src/economy/division-economy.ts` — TV-/Prämien-Koeffizienten pro Liga
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
  "cash": 4500000,
  "transfer_budget": 1800000,
  "wage_budget_weekly": 85000,
  "last_closed_month": 0
}
```

Bestehende Saves behalten ihren Kassenstand. Zwei bis drei Kapitalkäufe (Hotel, Camp, Leistungszentrum) bedrohen die Vorstand-Kasse (`min_cash` Nordstern €3,5 Mio.).

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
function spendClubCash(finances, amount, week, kind = "infrastructure"): ClubFinances;
// deducts cash and appends a pending FinanceLine — never raw `cash - cost`
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
| `concessions` | Jede Woche | Imbiss/Shop × Occupancy (Heim = Ticket-Fill; sonst Visit-Fill 4–12 %). Hotel/Restaurant extra. Vollhaus z. B. €1000 je Kiosk-Zelle, nicht 1 Wurst pro Zuschauer geteilt durch Stände. |
| `league_prize` | Saisonende | `division.prize_by_place[table_place]` |
| `tv_bonus` | Saisonende | `division.tv_season_bonus[table_place]` |
| `player_sale` | Transfer Verkauf | Ablöse (PRD 05) |

**Division-Defaults** (`/src/economy/division-economy.ts`):

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
| `infrastructure` | Kapitalkauf | Gelände / Tribünen / Campus / Camps über `spendClubCash` — Kasse **und** Ledger |
| `transfer_fee` | Transfer | Ablöse (PRD 05), nicht Ausbau |

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
  | "concessions"
  | "infrastructure"
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
│  € 4.18 Mio.    € 1.80 Mio.       85k / 72k ✓        │
├────────────────────────────────────────────────────────┤
│  [Wasserfall Monat 7 — Icon-Balken]                   │
│  ▓▓ Sponsoring +220k                                  │
│  ▓  TV +48k                                           │
│  ▓▓▓ Tickets +104k                                    │
│  ░░░ Gehälter -288k                                   │
│  ░   Personal -72k                                    │
│  ░   Unterhalt -36k                                   │
│  ░   Ausbau -320k                                     │
│  ─────────────────                                    │
│  Saldo Monat: -344k                                   │
├────────────────────────────────────────────────────────┤
│  🌭 Imbiss & Shop     🏟️ Stadion        🛤️ Runway     │
│  diese Woche / voll   Heim-Eintritt     Gehälter-Wo    │
│                       → öffnet Stadion  vs Vorstand    │
├────────────────────────────────────────────────────────┤
│  Sparkline Cash (13 Monate)                           │
│  Ein/Aus nach Art: Matchday · Ops · Löhne · Transfers │
│                    · Ausbau                           │
└────────────────────────────────────────────────────────┘
```

**Regeln:**

- Wasserfall: grüne Balken = Einnahmen, rote = Ausgaben, Icons pro `FinanceLineKind`.
- Drei Detail-Karten: Imbiss (Occupancy × Kapazität, kein SKU), Stadion (aktueller Heim-Eintritt, Link), Runway (Kasse in Gehaltswochen, Abstand zur Vorstand-Kasse). Rot wenn Monatsnetto < 0 oder Kasse unter Floor.
- Graph: kategorisierte Balken (Matchday / Operations / Gehälter / Transfers / Ausbau) plus Sparkline `closing_cash`.
- Keine Roh-Tabelle; Tooltip für exakte Beträge.
- Hub-Zeile `💰 € X` bleibt; Klick öffnet Finanzscreen. Negative Kasse wird angezeigt (Warnung), kein Clamp auf 0.
- Gehalts-Cap: ● grün wenn `wageBill ≤ cap`, ▲ gelb bei >90 %, ◆ rot bei Überschreitung.
- Kapitalkauf ≥ €100k (oder ≥ eine Gehaltswoche): Runway-Sheet (Kosten, Kasse danach, Gehälter-Wochen, Vorstand-Delta). Warnen, nicht blocken. Straßen und Mini-Kioske bleiben Ein-Klick. Transfers: dieselben Zahlen im Verhandlungsmodal.

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

**Später:** `save_version` 55, Migration `migration_055_infrastructure_ledger` — no-op. Kind `infrastructure` ist additiv; bestehende Ledgers und Kassenstände bleiben.

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
- Belegte Banden addieren auf die F6.2-Sponsoring-Zeile.
- Saisonende: Torschützenkönig-/Meister-Staffel je +€ 1 Mio. als `other`.

### 11.10 Sponsor-Inventar (F6.5)

Slots am Stadion (PRD 14.7): Banden auf den Tribünen-Karten + ein Shirt-Slot.
Modal: Marken-Auswahl (eine Marke nur an einem Slot), Laufzeit 1–4,
Wochenbetrag, zwei Staffeln (Torschützenkönig, Meister) je +€ 1 Mio.
Die Marke kann ablehnen: zu teuer, zu billig, falsche Laufzeit, unpassende
Staffel. Keine Klausel-Enzyklopädie. Basis-Sponsoring F6.2 bleibt;
belegte Slots addieren.

---

## References

- Feature-IDs: F6.1–F6.4 in PRD 10; F6.5 Inventar-Slice (11.10)
- Transfers & Verträge: PRD 05
- Stadion-Tickets (später dynamisch): F7.1, F7.5
- Liga-Tabellenplatz: `src/persistence/league-state.ts`
- Archiv-Ökonomie-Überblick: `docs/prd/PRD.md` §7

## Offene Punkte (nicht M1-blockierend)

- Mehrere Divisionen / TV-Skalierung: PRD 12
- Matchday-Commerce-Preise: F7.3-Sim
