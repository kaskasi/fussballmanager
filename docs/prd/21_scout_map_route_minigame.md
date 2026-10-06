# PRD 21 — Scout-Karte: Routen-Minigame (Brainstorm)

**Status:** Ausbaustufe — **nicht** F4.4 v1. Near-term v1 bleibt Tier-Fortschritt + Pool-% (Save ≥ 62, PRD 04.5).

## Vision

Statt nur passivem Regions-Job-Fortschritt optional ein **Routen-Rätsel** auf einer **echten Karte** (Geo/SVG-Städte), nicht das 2×2-Zonen-Grid. Spieler plant eine Route für den Scout durch Städte/Clubs (Kanten zeichnen; Euler-/Hamilton-Varianten mit klaren Regeln). Jedes Mal ein neues Rätsel (procedural aus Zonen-Graph + Wochen-Seed).

**Nicht:** 18 Clubs mit einem Klick; Minigame **ersetzt nicht** die 3×-Region-Pflicht, es **verziert** oder beschleunigt sie.

## Trigger (offen)

- Nur beim **Start** eines Regions-Jobs (Tier 0→1, 1→2, 2→3), **oder**
- Optionaler Bonus (schnellerer Job / +1 Highlight im Postfach), **Skip** mit Autopilot-Fallback (Default-Next-Spieler).

## Produktfragen

| Frage | Optionen |
|---|---|
| Skip vs. Pflicht pro Tier? | Skip + Default-Route vs. einmal pro Save-Tutorial Pflicht |
| Graph pro Zone oder überregional? | Eine Zone pro Rätsel vs. verknüpfte Nachbarzonen |
| Mobile / Steam Deck | Touch-Ziehen vs. Tap-Reihenfolge |
| Belohnung | Nur Flavor vs. −1 Woche Job vs. extra Postfach-Highlight |

## Technik (Richtung)

- Client-only; deterministischer Seed: `hash(master_seed, season, week, zone_id, tier)`.
- Keine Engine-Änderung; Hook in `startRegionScoutJob` / UI-Modal vor Job-Start.
- SVG-First (design.md); keine 3D.

## Abgrenzung

- v1: `region_scout_tier`, sichtbare Clubs, Pool-Coverage — siehe PRD 04.5 / 09 Screen 3a.
- PRD 21: Nachfolger-UX für F4.4, wenn Karten-Geo und Graph-Content existieren.
