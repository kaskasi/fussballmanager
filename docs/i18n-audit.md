# i18n audit (maintainer)

Last updated: 2026-10-21

## Locale packs

- **Path:** `src/i18n/locales/{de,en,zh-Hans}.json`
- **Parity:** enforced by `src/i18n/index.test.ts` (`keeps de, en, and zh-Hans locale packs in parity`)
- **Runtime:** `t()` / `useT()`; `setLocale` via accessibility prefs (PRD 18)

## Status by area

| Area | Status | Notes |
|------|--------|--------|
| Shell nav / hub (partial) | OK | Key-based titles in App |
| Transfer negotiation modal | OK | `transfer.negotiation.*` |
| Help — chrome + Attribution tab | OK | Fourth tab; CC0 essay + catalog |
| Help — Play tab | OK | Sections + screenshot figures |
| Help — Story tab | OK | Full `help.story.*`; credits moved to Attribution tab |
| Help — Stamps tab (partial) | WIP | Intro + group titles i18n; stamp labels from domain data (DE) |
| CalendarScreen | OK | Months, kicker, aria, transfer labels |
| Calendar milestones (domain) | OK | Labels via `t()` in collector |
| PlayerProfile tabs | OK | Tab labels via `profile.tab.*` |
| CareerMatch nav/errors | OK | `match.career.*` |
| App club events | Partial | Scout/coach/transfer/sale/pre-contract toasts i18n; domain `result.error` still raw |
| Stadium / Leagues | OK | Tab labels + leagues view tabs |
| YouthCampus | WIP | Body copy still DE — migrate when touching screen |
| Domain negotiations messages | OK | `reactionMessage` uses i18n keys |
| Emoji in locale JSON | OK | Scouting/training hints use text labels (design.md §4) |
| Emoji in shipped UI strings (P2) | OK | Spend confirm + assistant events i18n; Lucide in delegation/club profile |

## Agent-Playtest 2026-10-21 — still German with locale **English**

Found while playing a career in EN (`docs/research/playtest-logs/2026-10-21-agent-run-1.md`). P0 in PRD 15 §15.7.1.

| Area | Status | Notes / file pointers |
|------|--------|--------|
| Der Treter (newspaper) | WIP | Body copy, headlines, "Redaktion" — `src/media/treter-copy.ts`, `kicker-digest.ts`, `src/hub/hub-treter-ticker.ts`, `KickerInboxCard.tsx`; visible dev string "TODO: Add more photos for Der Treter." |
| Archive / inbox lines | WIP | Event `message` strings are stored **pre-rendered** in DE ("Satelliten-Camp — Cash-out-Listing", "Verletzt: … Knöchel, 1 Wo.", "Liga: X · A → B", camp opening mails). Needs key + params storage, render at read time. `PostfachArchiveDetail.tsx`, `PostfachScreen.tsx`, `DecisionInboxPanel.tsx` |
| Match report | WIP | SPIELTAG, STATISTIK, TORE, KARTEN, "Torloses Spiel", "Kader anzeigen" — `src/match/MatchReportScreen.tsx` (59, 80–81, 128, 148, 268, 278), `MatchGoalTimeline.tsx:16`, `pre-match-brief.ts:44` |
| Match commentary | WIP | "Große Chance — … schießt vorbei", "Der Schiedsrichter greift zur Karte", "Das war's zur Pause", analyst lines — `server/src/commentary/render.ts`, `moment-copy.ts`, `chain-copy.ts` (fallback DE) |
| Substitution ticker | WIP | Hard-coded "Wechsel" — `src/match/MatchSubstitutionTicker.tsx:38` |
| Finances screen | WIP | Übersicht/Commerce/Eintritt/Saldo/Gehälter/Personal/Unterhalt/KASSE/TRANSFER-TOPF/GEHALTS-CAP + aria-labels — `src/ui/screens/FinancesScreen.tsx` |
| Calendar | Partial | Weekday header MO DI MI…; match chip "Heim vs / Ausw. @" (`src/ui/calendar/month-grid.ts:77`, fixed 2026-10-21) |
| Transfers | Partial | "Fenster geschlossen", "Sommerfenster" |
| Camp buy modal | WIP | KASSE, Kosten, Kasse danach, Gehälter, Vorstand-Kasse, Zahlen, Abbrechen, "Camp Türkei/Polen" |
| Contract modal | WIP | Vertragsgespräch, Gehalt, Laufzeit, Einsatzbonus, Minuten-Garantie, Startplatz, Anbieten, Abbrechen |
| Player profile | WIP | Kernattribute, Stärke als…, Alle Attribute, Aktuelles Ziel, Kein Plan, Einzeltraining, Fähigkeiten/Bonus, Vertrag, Jugendvertrag, Verhandeln, Profikader, Ermutigen, Zurück U17, In U19, Vertrag auflösen, Erfahrung |
| Stadium | WIP | Stehplatz/Sitzplatz, Stufe, Auslastung, Zuschauer, Ausbau, Heimspiel, Nachwuchs/Jugendhaus — `StadiumScreen.tsx` |
| Board card | Partial | "Pressure" OK; cash hint "Floor" OK |
| Hub merch / news ticker | Partial | "Fanshop-Zähler dreht", "Anfrage für …" |

| Merch SKU names | Partial | `MERCH_SKU_LABEL` is DE; new keys `merch.skuName.*` used by merch mails (2026-10-21), merch screens still use the DE labels |
| **zh-Hans pack** | **Missing keys** | 176 keys in `en.json` have no `zh-Hans` entry (e.g. `calendar.fastForward.*`, `construction.*`, `clubEvent.inboundOffer`). The parity test `src/i18n/index.test.ts` catches this but `src/i18n` is **not** in the `test:client` include list, so it never runs |

**Guard idea:** extend `scripts/check-ui-aria-i18n.mjs` with a visible-text check (JSX text nodes with umlauts / common DE words) and run the career playtest (`npm run playtest:career`) in EN to flag DE lines.

## Screens without `useT()` (grep inventory)

See `src/ui/screens/` and `src/ui/components/` — migrate when touching a screen (boy scout rule).

## Player-facing credits

In-app: **Help → Danksagung / Credits**. Maintainer source: `docs/ATTRIBUTION.md`, `assets/ATTRIBUTION.MD`.
