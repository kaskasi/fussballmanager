# PRD 21 — Scout-Karte: Routen-Minigame

**Status:** M1 shipped on branch — flavor tiles, detail map, soft route speed (option D).

## Navigation

- **2×2 grid (Screen 3a):** **Locked** foreign zones (tier &lt; 3): lore copy, no photo, no detail map. **Unlocked** (tier 3 or **home zone**): flavor photo (`public/assets/scout-maps/flavor/{zoneId}.jpg`); **„Karte öffnen“** → **Screen 3a-detail**.
- **Detail:** Relief or city SVG only (no flavor JPEG); tap nodes to chain edges into a route.

## Route rules (Jan — option D)

- **Club jobs only:** Minigame starts `active_club_scout` (not region). Region tier = passive button on grid card.
- **Detail map:** Wikimedia relief clip (`scout-germany-relief.svg`) or city SVG; club pins on GPS coordinates; crest pins after first visit (PRD 04.5 / map visit).
- **Grid card:** Full-color flavor photo (bottom gradient + white type only); click opens detail. No per-club list buttons on card.
- **No hard fail:** Duplicate roads allowed → lower `progress_multiplier` on **club** scout job.
- **Autopilot** on detail screen.

## Assets

- Flavor + attribution: `pd_images/image_refs.md` → shipped JPEGs under `public/assets/scout-maps/flavor/`.
- **One master relief SVG** (Germany) planned; M1 uses flavor + abstract graph (`src/scouting/scout-map-layout.ts`). Relief clip `reliefViewBox` per zone reserved.

## Sim

- `startRegionScoutJob(board, zoneId)` → `working_days_left` (default 1); tier +1 when job completes on a **Mo–Fr NEXT** tick (`advanceScoutWorkingDay`).
- **Scout trips:** duration in working days; +1 per Mo–Fr NEXT while trip active; week sim dispatches queue only (no +5 lump).
- Club route jobs: `startClubScoutJob` + weekly progress in `advanceDiscoveryWeek` (unchanged v1).

## Future

- Club crest pins on graph nodes tied to `directoryVisible` clubs
- Ship optimized `scout-germany-relief.svg` clip per zone
- Postfach route summary line
