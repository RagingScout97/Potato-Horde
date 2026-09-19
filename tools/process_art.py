"""
Potato Horde art pipeline — process ChatGPT sheets for Phaser.

- Full-bleed BGs: leave as-is (no rembg).
- UI kit on solid black: color-to-alpha + connected-component crop.
- Haze sheet: split left/right panels.
- Do NOT use rembg on UI kits (eats dirt accents / soft edges).
"""

from __future__ import annotations

import json
from pathlib import Path

from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / "public" / "art"
RAW = ART / "raw"
UI = ART / "ui"
VFX = ART / "vfx"
PROCESSED = ART / "processed"


def color_to_alpha(im: Image.Image, threshold: int = 36) -> Image.Image:
    """Make near-black pixels transparent (UI kits on #000)."""
    rgba = im.convert("RGBA")
    px = rgba.load()
    w, h = rgba.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if r <= threshold and g <= threshold and b <= threshold:
                px[x, y] = (0, 0, 0, 0)
            elif r + g + b < threshold * 3 + 20 and max(r, g, b) < threshold + 18:
                # crush near-black anti-alias fringe
                px[x, y] = (r, g, b, 0)
    return rgba


def bbox_components(mask: Image.Image, min_area: int = 800) -> list[tuple[int, int, int, int]]:
    """Flood-fill connected opaque regions → bounding boxes.

    Uses an eroded alpha mask so soft dirt/glow does not glue separate widgets.
    """
    alpha = mask.split()[3]
    # Break thin bridges between neighboring UI widgets
    eroded = alpha.filter(ImageFilter.MinFilter(7))
    probe = Image.merge("RGBA", (alpha, alpha, alpha, eroded))

    w, h = probe.size
    data = probe.load()
    visited = [[False] * w for _ in range(h)]
    boxes: list[tuple[int, int, int, int]] = []

    def opaque(x: int, y: int) -> bool:
        return data[x, y][3] > 60

    for y0 in range(h):
        for x0 in range(w):
            if visited[y0][x0] or not opaque(x0, y0):
                continue
            stack = [(x0, y0)]
            visited[y0][x0] = True
            minx = maxx = x0
            miny = maxy = y0
            area = 0
            while stack:
                x, y = stack.pop()
                area += 1
                if x < minx:
                    minx = x
                if x > maxx:
                    maxx = x
                if y < miny:
                    miny = y
                if y > maxy:
                    maxy = y
                for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
                    if 0 <= nx < w and 0 <= ny < h and not visited[ny][nx] and opaque(nx, ny):
                        visited[ny][nx] = True
                        stack.append((nx, ny))
            if area >= min_area:
                pad = 8
                boxes.append(
                    (
                        max(0, minx - pad),
                        max(0, miny - pad),
                        min(w, maxx + 1 + pad),
                        min(h, maxy + 1 + pad),
                    )
                )
    boxes.sort(key=lambda b: (b[1] // 80, b[0]))
    return boxes


def process_ui_kit(src: Path) -> dict:
    UI.mkdir(parents=True, exist_ok=True)
    PROCESSED.mkdir(parents=True, exist_ok=True)
    im = Image.open(src)
    keyed = color_to_alpha(im, threshold=26)
    sheet_path = PROCESSED / "ui-chrome-kit-transparent.png"
    keyed.save(sheet_path)

    boxes = bbox_components(keyed, min_area=1200)
    manifest: list[dict] = []
    for i, (l, t, r, b) in enumerate(boxes):
        crop = keyed.crop((l, t, r, b))
        # Drop tiny noise / thin lines
        if crop.width < 40 or crop.height < 40:
            continue
        name = f"piece_{i:02d}.png"
        out = UI / name
        crop.save(out)
        manifest.append(
            {
                "file": f"ui/{name}",
                "x": l,
                "y": t,
                "w": crop.width,
                "h": crop.height,
            }
        )

    meta = {
        "source": str(src.relative_to(ROOT)).replace("\\", "/"),
        "sheet": "processed/ui-chrome-kit-transparent.png",
        "pieces": manifest,
        "note": "Rename pieces by role after visual check (panel, button-amber, hp-bar, draft-card, …).",
    }
    (UI / "manifest.json").write_text(json.dumps(meta, indent=2), encoding="utf-8")
    return meta


def split_haze(src: Path) -> list[str]:
    VFX.mkdir(parents=True, exist_ok=True)
    im = Image.open(src).convert("RGBA")
    w, h = im.size
    mid = w // 2
    left = im.crop((0, 0, mid, h))
    right = im.crop((mid, 0, w, h))
    # Soften hard split seam a tiny bit
    outs = []
    for name, part in (("haze-night-market.png", left), ("haze-ash-basin.png", right)):
        path = VFX / name
        part.save(path)
        outs.append(str(path.relative_to(ART)).replace("\\", "/"))
    return outs


def main() -> None:
    kit = RAW / "ui-chrome-kit.png"
    if not kit.exists():
        raise SystemExit(f"Missing {kit}")
    meta = process_ui_kit(kit)
    print(f"UI pieces: {len(meta['pieces'])} -> public/art/ui/")
    haze = VFX / "haze-overlays.png"
    if haze.exists():
        outs = split_haze(haze)
        print(f"Haze split: {outs}")
    print("Done. BGs/grounds left untouched (use full-bleed / tile).")


if __name__ == "__main__":
    main()
