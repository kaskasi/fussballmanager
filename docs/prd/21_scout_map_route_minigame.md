# PRD 21 — Scout-Karte: Routen-Minigame

**Status:** M1 shipped on branch — flavor tiles, detail map, soft route speed (option D).

## Navigation

- **2×2 grid (Screen 3a):** After `region_scout_tier >= 1`, zone tile shows **flavor photo** (`public/assets/scout-maps/flavor/{zoneId}.jpg`); click tile or „Region scouten“ → **Screen 3a-detail**.
- **Detail:** Flavor background + SVG road graph; tap nodes to chain edges into a route.

## Route rules (Jan — option D)

- **No hard fail:** Any route is valid; repeating the same road is allowed.
- **Duplicate edges** → lower `progress_multiplier` on `active_region_scout` (slower weekly job bar).
- **All edges unique** (≥2 steps) → `no_duplicate_bonus` flag (future: extra directory outcome; M1: faster progress only).
- **Autopilot** on detail screen; skip does not block NEXT.

## Assets

- Flavor + attribution: `pd_images/image_refs.md` → shipped JPEGs under `public/assets/scout-maps/flavor/`.
- **One master relief SVG** (Germany) planned; M1 uses flavor + abstract graph (`src/scouting/scout-map-layout.ts`). Relief clip `reliefViewBox` per zone reserved.

## Sim

- `startRegionScoutJob(board, zoneId, { progress_multiplier, no_duplicate_bonus })`
- `advanceDiscoveryWeek` applies multiplier to region job weekly step.

## Future

- Club crest pins on graph nodes tied to `directoryVisible` clubs
- Ship optimized `scout-germany-relief.svg` clip per zone
- Postfach route summary line
