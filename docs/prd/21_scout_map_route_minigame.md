# PRD 21 — Scout-Karte: Routen-Minigame

**Status:** M1 shipped on branch — flavor tiles, detail map, soft route speed (option D).

## Navigation

- **2×2 grid (Screen 3a):** After `region_scout_tier >= 1`, zone tile shows **flavor photo** (`public/assets/scout-maps/flavor/{zoneId}.jpg`); click tile or „Region scouten“ → **Screen 3a-detail**.
- **Detail:** Flavor background + SVG road graph; tap nodes to chain edges into a route.

## Route rules (Jan — option D)

- **Club jobs only:** Minigame starts `active_club_scout` (not region). Region tier = passive button on grid card.
- **Detail map:** Wikimedia relief clip (`scout-germany-relief.svg`) + **translucent flavor** overlay; club pins on relief coordinates.
- **Grid card:** Flavor photo on front; click opens detail (“back”). No per-club list buttons on card.
- **No hard fail:** Duplicate roads allowed → lower `progress_multiplier` on **club** scout job.
- **Autopilot** on detail screen.

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
