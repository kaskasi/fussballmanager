# itch.io marketing assets

Cover art is **composited from real in-game screenshots** (see `generate-itch-cover.py`) — not generative AI.

## Files

| File | Use on itch |
|------|-------------|
| `itch-cover-630x500.png` | **Cover image** (minimum size) |
| `itch-cover-1280x720.png` | Capsule / social / page header |

## Regenerate

```bash
python3 docs/marketing/generate-itch-cover.py
```

Requires [Pillow](https://pypi.org/project/pillow/) (`pip install pillow`). Fonts live in `fonts/` (Baloo 2 + Nunito, OFL).

## Customize

Screenshots are read from `fmscreens/the club v0.2/` (see `SCREEN_PATHS` in `generate-itch-cover.py`).

- **1280×720:** eight cards in a ring around the title panel  
- **630×500:** title + four corner crops from the hub shot  

Replace files in that folder or edit `SCREEN_PATHS`, then rerun the script.
