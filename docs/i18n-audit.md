# i18n audit (maintainer)

Last updated: 2026-10-06

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

## Screens without `useT()` (grep inventory)

See `src/ui/screens/` and `src/ui/components/` — migrate when touching a screen (boy scout rule).

## Player-facing credits

In-app: **Help → Danksagung / Credits**. Maintainer source: `docs/ATTRIBUTION.md`, `assets/ATTRIBUTION.MD`.
