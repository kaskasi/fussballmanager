# /docs/prd/18_localization.md

**Version:** 1.0  
**Last Updated:** 2026-10-04  
**Status:** Final  
**Feature:** F12.8

---

## Purpose

Display language for club chrome and match commentary presentation. Three locale packs (DE default, EN, zh-Hans). In-world procedural names (players, clubs) stay as generated — not translated.

---

## Scope

**In (v1):**

- Opening modal step 1: language pick before manager name (PRD 13).
- In-game change: ⋮ → Anzeige → Sprache (F12.4 submenu).
- JSON packs: `src/i18n/locales/de.json`, `en.json`, `zh-Hans.json`.
- Shell, onboarding steps 2–3 (incl. captain teamwork hints, F12.8b), transfer block copy, negotiation labels, hub nav, help screen chrome.
- **F12.8b:** global calendar chrome; screen titles/empty states (squad, scouting, training tabs); hub static labels (tiles, inbox columns, heatmap, board header).
- **F12.8c:** Post/Inbox copy, story beat templates (display-time `beatId`), fan-feed quotes, board objective labels (from kind/target, not stored `label`), youth departure reasons.
- Match PBP/color lines via `i18nKey` + params on `MatchViewLine`; client `t()` at render time.

**Out (v1):**

- Japanese, Arabic (RTL pass deferred).
- Translating player/club names in saves.
- Cloud LLM press dialogue.
- Full PRD 06 narrative matrix in zh-Hans (extend when templates migrate).

---

## Persistence

- `locale` stored with F12.4 display prefs in `localStorage` (`fc-tycoon-a11y`).
- No `save_version` bump unless locale is mirrored into savegame later.

---

## Commentary

- Engine (`server/src/engine/`) unchanged (Gesetz 4).
- Presentation layer may attach `i18nKey` / `i18nParams` when building `MatchView` (`server/src/api/match-view.ts`).
- Missing key: fallback DE pack, then raw `text` on the line.

---

## References

- F12.8 in PRD 10
- PRD 13 opening UI
- PRD 14.5 display language
- PRD 16 beats (template ids)
