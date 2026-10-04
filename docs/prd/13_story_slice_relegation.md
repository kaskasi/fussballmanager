# /docs/prd/13_story_slice_relegation.md

**Version:** 1.2  
**Last Updated:** 2026-10-03  
**Status:** Final  
**Parent:** PRD 01 § „Gemeinsam gegen den Abstieg“

---

## Scope

First playable narrative slice for FC Tycoon. Templates only — no Ollama in this milestone.

## Player decisions (binding)

| Topic | Decision |
|---|---|
| Arc timing | Slow-burn from career start; opening origin story is mandatory |
| Name | Player types manager name (2–24 chars). Never prefill a hardcoded “Jan”. |
| Origin | Player picks: raffle win · passionate letter · community takeover |
| Captain | Player picks; UI ranks by `leadership`, shows `teamwork` as hint (no engine wiring yet) |
| Fans | Collective mood + named NPCs (Bratwurst vendor, groundskeeper, fan rep) |
| Press | Hostile default press + one ally journalist with recurring arc |
| Inbox | Unified with youth inbox — shared max 4 open items (PRD 03.4) |
| LLM | Deferred; deterministic German templates with `render.ts` fallback |
| Beats | All optional beats from PRD 01 slice ship when triggers match real state |

## Persisted state (`pipeline.story_state`)

- `active_arc`, `arc_started_week`, `career_origin`, `opening_complete`
- `cast` — assistant, captain, named NPC labels
- `beats_fired` — idempotency
- `media_hype` (0–100)
- `fan_feed` — last beats for header strip
- `chronicle_entries` — synced to `chronicle.json` on save

Migration **039** when schema changes.

## Effects (allowed only)

- `board.pressure`, `stadium.fanbase`, player `state.morale`, `media_hype`
- Hospitality (F7.3): Restaurant-Auslastung 12 Wochen 100% nach Viral-Beat;
  Überstunden-Lohn als Kassen-Abzug. Keine erfundenen Tore oder Transfers.
- No invented scores, transfers, or potentials

## UI surfaces

1. Opening modal — name, then origin + captain (week 1)
2. Fan feed strip on pipeline hub header
3. Story items in unified decision inbox
4. Survival objective highlighted on board panel
5. Chronicle rail on hub (season callbacks)

## References

- PRD 01 vision & tone
- PRD 03.4 inbox cap
- PRD 08 savegame
- PRD 09 icon-first UI
