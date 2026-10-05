# Kenney.nl source packs (CC0)

Downloaded from [kenney.nl](https://www.kenney.nl). **Do not use raw colors in the game** — remap to tokens in [docs/prd/design.md](../../docs/prd/design.md) §2 before baking to `public/assets/kenney/`.

## Committed zips (~14 MB)

| Zip | design.md | Intended use |
| --- | --- | --- |
| `kenney_sports-pack.zip` | §9.3 Gelände, §12.1 | Pitch/grass tiles, field markings |
| `kenney_pattern-pack.zip` | §8, §12.1 | Background overlays (optional vs ambientCG Paper) |
| `kenney_pattern-pack-extra.zip` | §8 | Extra patterns |
| `kenney_game-icons.zip` | §12.1 | UI gaps where Lucide is weak |
| `kenney_city-kit-roads.zip` | §9.3 Gelände | Road grid tiles |
| `kenney_city-kit-commercial_2.1.zip` | §9.3 Gelände | Commercial footprint props |
| `kenney_modular-buildings.zip` | Reserve | Stadium/commercial silhouettes |
| `kenney_road-textures.zip` | Reserve | Road surfaces |
| `kenney_roguelike-modern-city.zip` | Reserve | Extra tiles — scope only with PRD update |

## Pipeline (future)

1. Extract subset needed for Gelände/Stadion.
2. Apply [kenney-color-map.json](../kenney-color-map.json) or bake remapped SVGs.
3. Ship only under `public/assets/kenney/**`.

Optional credit: *Kenney.nl* (CC0, not required).
