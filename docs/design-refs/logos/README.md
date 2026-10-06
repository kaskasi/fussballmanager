# Club crest assets (P2)

## Decision (2026-10-06)

- **Ship set:** ~90 fictional-style SVG crests in `assets/club_logos/` (Canva export pipeline documented in `assets/ATTRIBUTION.MD` and `docs/ATTRIBUTION.md`).
- **Product stance:** Fictional German regional league — no Premier/La Liga “cosy” real marks; crests are **generic football club logos**, not licensed real teams.
- **Runtime:** Deterministic `clubId → logo index` via `src/ui/assets/club-logo.ts` (no save field). Player club (`cl_fc_nordstern`) maps to catalog index 0 after bake.
- **Bake:** `npm run bake:club-logos` → `public/assets/club-logos/logo-NNN.svg` + generated `club-logo-catalog.ts`.

## Legal notes

- Prefer **CC0 / open** for new art (PRD 01). Canva set is **documented license** for shippable v1 when CC0 stock is insufficient.
- Do not ship unlicensed real club trademarks. Replace or blur if a crest reads as a real mark during QA.

## Jan follow-up (optional)

- Curate 36 “hero” crests matched to generated club names vs pure hash.
- Add 1–2 Nordstern-specific SVG once art direction is locked.
