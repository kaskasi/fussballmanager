#!/usr/bin/env python3
"""Compose itch.io cover art from in-repo screenshots (no generative AI)."""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[2]
OUT_DIR = Path(__file__).resolve().parent
FONTS = OUT_DIR / "fonts"
SCREEN_DIR = ROOT / "fmscreens/the club v0.2"

BG = (245, 239, 224)
PANEL = (253, 251, 244)
TINTE = (62, 49, 40)
TINTE_SOFT = (107, 93, 79)
RASEN = (46, 158, 70)
RASEN_DARK = (29, 107, 49)
SONNENGELB = (255, 201, 51)
OUTLINE = (62, 49, 40)

# v0.2 captures — hub, scouting, training, lineup, match, stadium, camps, player
SCREEN_PATHS: tuple[Path, ...] = (
    SCREEN_DIR / "Screenshot 2026-10-12 at 09.58.01.png",
    SCREEN_DIR / "Screenshot 2026-10-12 at 09.51.00.png",
    SCREEN_DIR / "Screenshot 2026-10-12 at 09.51.17.png",
    SCREEN_DIR / "Screenshot 2026-10-12 at 10.04.57.png",
    SCREEN_DIR / "Screenshot 2026-10-12 at 10.05.22.png",
    SCREEN_DIR / "Screenshot 2026-10-12 at 09.59.48.png",
    SCREEN_DIR / "Screenshot 2026-10-12 at 09.59.11.png",
    SCREEN_DIR / "Screenshot 2026-10-12 at 10.06.00.png",
)


def load_font(name: str, size: int) -> ImageFont.FreeTypeFont:
    path = FONTS / name
    return ImageFont.truetype(str(path), size)


def load_screens() -> list[Image.Image]:
    images: list[Image.Image] = []
    for path in SCREEN_PATHS:
        if not path.is_file():
            raise FileNotFoundError(f"Missing screenshot: {path}")
        images.append(Image.open(path).convert("RGB"))
    return images


def rounded_mask(size: tuple[int, int], radius: int) -> Image.Image:
    mask = Image.new("L", size, 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle((0, 0, size[0] - 1, size[1] - 1), radius=radius, fill=255)
    return mask


def fit_cover(img: Image.Image, target_w: int, target_h: int) -> Image.Image:
    sw, sh = img.size
    scale = max(target_w / sw, target_h / sh)
    nw, nh = int(sw * scale), int(sh * scale)
    resized = img.resize((nw, nh), Image.Resampling.LANCZOS)
    left = (nw - target_w) // 2
    top = (nh - target_h) // 2
    return resized.crop((left, top, left + target_w, top + target_h))


def crop_cover(
    source: Image.Image,
    inner_w: int,
    inner_h: int,
    crop_focus: tuple[float, float],
) -> Image.Image:
    sw, sh = source.size
    scale = max(inner_w / sw, inner_h / sh)
    nw, nh = int(sw * scale), int(sh * scale)
    resized = source.resize((nw, nh), Image.Resampling.LANCZOS)
    fx, fy = crop_focus
    left = int((nw - inner_w) * fx)
    top = int((nh - inner_h) * fy)
    left = max(0, min(left, nw - inner_w))
    top = max(0, min(top, nh - inner_h))
    return resized.crop((left, top, left + inner_w, top + inner_h))


def framed_card(
    source: Image.Image,
    box: tuple[int, int, int, int],
    *,
    radius: int = 14,
    border: int = 3,
    shadow_offset: tuple[int, int] = (0, 6),
    shadow_blur: int = 14,
    crop_focus: tuple[float, float] = (0.5, 0.5),
) -> tuple[Image.Image, tuple[int, int]]:
    x0, y0, x1, y1 = box
    w, h = x1 - x0, y1 - y0
    inner_w, inner_h = w - border * 2, h - border * 2

    cropped = (
        crop_cover(source, inner_w, inner_h, crop_focus)
        if crop_focus != (0.5, 0.5)
        else fit_cover(source, inner_w, inner_h)
    )

    pad = 20
    layer = Image.new("RGBA", (w + pad * 2, h + pad * 2), (0, 0, 0, 0))
    shadow = Image.new("RGBA", layer.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    sx, sy = pad + shadow_offset[0], pad + shadow_offset[1]
    sd.rounded_rectangle(
        (sx, sy, sx + w - 1, sy + h - 1),
        radius=radius + 2,
        fill=(62, 49, 40, 50),
    )
    shadow = shadow.filter(ImageFilter.GaussianBlur(shadow_blur))

    panel = Image.new("RGBA", (w, h), PANEL + (255,))
    pdraw = ImageDraw.Draw(panel)
    pdraw.rounded_rectangle(
        (0, 0, w - 1, h - 1),
        radius=radius,
        outline=OUTLINE + (255,),
        width=border,
    )

    shot = Image.new("RGBA", (inner_w, inner_h), (0, 0, 0, 0))
    shot.paste(cropped, (0, 0))
    mask = rounded_mask((inner_w, inner_h), max(4, radius - border))
    shot.putalpha(mask)

    card = Image.new("RGBA", layer.size, (0, 0, 0, 0))
    card.alpha_composite(shadow)
    card.alpha_composite(panel, (pad, pad))
    card.paste(shot, (pad + border, pad + border), shot)
    return card, (x0 - pad, y0 - pad)


def title_panel(
    canvas_size: tuple[int, int],
    box: tuple[int, int, int, int],
    *,
    radius: int = 20,
    border: int = 4,
) -> Image.Image:
    base = Image.new("RGBA", canvas_size, (0, 0, 0, 0))
    x0, y0, x1, y1 = box
    w, h = x1 - x0, y1 - y0
    pad = 20

    layer = Image.new("RGBA", (w + pad * 2, h + pad * 2), (0, 0, 0, 0))
    shadow = Image.new("RGBA", layer.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    sx, sy = pad + 2, pad + 6
    sd.rounded_rectangle(
        (sx, sy, sx + w - 1, sy + h - 1),
        radius=radius + 2,
        fill=(62, 49, 40, 45),
    )
    shadow = shadow.filter(ImageFilter.GaussianBlur(16))

    panel = Image.new("RGBA", (w, h), PANEL + (255,))
    pd = ImageDraw.Draw(panel)
    pd.rounded_rectangle(
        (0, 0, w - 1, h - 1),
        radius=radius,
        outline=OUTLINE + (255,),
        width=border,
    )

    layer.alpha_composite(shadow)
    layer.alpha_composite(panel, (pad, pad))
    base.alpha_composite(layer, (x0 - pad, y0 - pad))
    return base


def draw_title_content(base: Image.Image, box: tuple[int, int, int, int], *, large: bool) -> None:
    x0, y0, x1, y1 = box
    cx = x0 + (x1 - x0) // 2
    layer = Image.new("RGBA", base.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)

    title_font = load_font("Baloo2-Bold.ttf", 64 if large else 40)
    sub_font = load_font("Nunito-SemiBold.ttf", 22 if large else 16)
    tag_font = load_font("Nunito-SemiBold.ttf", 13 if large else 11)

    title = "The Club"
    bbox = d.textbbox((0, 0), title, font=title_font)
    tw = bbox[2] - bbox[0]
    ty = y0 + (20 if large else 14)
    d.text((cx - tw // 2, ty), title, font=title_font, fill=TINTE)

    lines = [
        ("Develop the squad.", TINTE),
        ("Run the club.", TINTE_SOFT),
    ]
    ly = ty + (68 if large else 46)
    for text, color in lines:
        bb = d.textbbox((0, 0), text, font=sub_font)
        lw = bb[2] - bb[0]
        d.text((cx - lw // 2, ly), text, font=sub_font, fill=color)
        ly += 28 if large else 20

    tag = "2D management sim · pre-release build"
    bb = d.textbbox((0, 0), tag, font=tag_font)
    lw = bb[2] - bb[0]
    d.text((cx - lw // 2, ly + (6 if large else 4)), tag, font=tag_font, fill=TINTE_SOFT)

    pill_w = 190 if large else 130
    pill_h = 42 if large else 32
    px0 = cx - pill_w // 2
    py0 = y1 - (52 if large else 40)
    d.rounded_rectangle(
        (px0, py0, px0 + pill_w, py0 + pill_h),
        radius=pill_h // 2,
        fill=SONNENGELB + (255,),
        outline=OUTLINE + (255,),
        width=2,
    )
    pill_font = load_font("Baloo2-Bold.ttf", 18 if large else 14)
    label = "NEXT  ▶"
    bb = d.textbbox((0, 0), label, font=pill_font)
    plw, plh = bb[2] - bb[0], bb[3] - bb[1]
    d.text(
        (px0 + (pill_w - plw) // 2, py0 + (pill_h - plh) // 2 - 2),
        label,
        font=pill_font,
        fill=TINTE,
    )

    base.alpha_composite(layer)


def layout_1280() -> tuple[tuple[int, int, int, int], list[tuple[tuple[int, int, int, int], tuple[float, float]]]]:
    """Title box + eight screenshot frames (no overlap with title)."""
    title_box = (388, 262, 892, 458)
    frames: list[tuple[tuple[int, int, int, int], tuple[float, float]]] = [
        ((18, 18, 288, 168), (0.5, 0.5)),  # top far-left
        ((992, 18, 1262, 168), (0.5, 0.5)),  # top far-right
        ((328, 18, 598, 168), (0.5, 0.5)),  # top inner-left
        ((682, 18, 952, 168), (0.5, 0.5)),  # top inner-right
        ((18, 552, 288, 702), (0.5, 0.5)),  # bottom far-left
        ((992, 552, 1262, 702), (0.5, 0.5)),  # bottom far-right
        ((328, 552, 598, 702), (0.5, 0.5)),  # bottom inner-left
        ((682, 552, 952, 702), (0.5, 0.5)),  # bottom inner-right
    ]
    return title_box, frames


def layout_630() -> tuple[tuple[int, int, int, int], list[tuple[tuple[int, int, int, int], tuple[float, float]]]]:
    title_box = (36, 20, 594, 156)
    frames = [
        ((12, 168, 156, 268), (0.5, 0.45)),
        ((474, 168, 618, 268), (0.5, 0.45)),
        ((12, 276, 156, 376), (0.5, 0.45)),
        ((474, 276, 618, 376), (0.5, 0.45)),
    ]
    return title_box, frames


def compose(width: int, height: int, screens: list[Image.Image]) -> Image.Image:
    canvas = Image.new("RGBA", (width, height), BG + (255,))
    draw = ImageDraw.Draw(canvas)

    band_h = max(8, height // 90)
    draw.rectangle((0, height - band_h, width, height), fill=RASEN)
    draw.rectangle((0, 0, width, 4), fill=RASEN_DARK)

    if width >= 1000:
        title_box, frames = layout_1280()
        if len(screens) < len(frames):
            raise ValueError(f"Need {len(frames)} screenshots, got {len(screens)}")
        for source, (box, focus) in zip(screens[: len(frames)], frames):
            card, at = framed_card(source, box, radius=14, border=3, crop_focus=focus)
            canvas.alpha_composite(card, at)
        canvas.alpha_composite(title_panel(canvas.size, title_box), (0, 0))
        draw_title_content(canvas, title_box, large=True)
    else:
        title_box, frames = layout_630()
        hub = screens[0]
        for box, focus in frames:
            card, at = framed_card(hub, box, radius=10, border=2, crop_focus=focus)
            canvas.alpha_composite(card, at)
        canvas.alpha_composite(title_panel(canvas.size, title_box, radius=14, border=3), (0, 0))
        draw_title_content(canvas, title_box, large=False)

    return canvas.convert("RGB")


def main() -> None:
    screens = load_screens()
    outputs = [
        (1280, 720, OUT_DIR / "itch-cover-1280x720.png"),
        (630, 500, OUT_DIR / "itch-cover-630x500.png"),
    ]
    for w, h, path in outputs:
        img = compose(w, h, screens)
        img.save(path, "PNG", optimize=True)
        print(f"Wrote {path} ({w}×{h})")


if __name__ == "__main__":
    main()
