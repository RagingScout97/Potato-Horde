---
name: potato-horde-art-pipeline
description: >-
  Processes Potato Horde UI/BG art: ChatGPT sheets, color-key, slicing,
  Kenney CC0 packs, Phaser wiring. Use when importing art, removing
  backgrounds from UI kits, slicing atlases, or adding menu/hub/HUD images.
---

# Potato Horde — Art pipeline

## Asset roles (do not mix)

| Folder | Role | Processing |
|--------|------|------------|
| `public/art/bg/` | Full-bleed menu/hub scenes | **None** — stretch/cover behind UI |
| `public/art/ground/` | Tileable arena floors | Optional seam check; use `TileSprite` |
| `public/art/vfx/` | Haze / vignette overlays | Split panels; keep alpha; screen-space |
| `public/art/raw/` | Source sheets (UI kits) | Color-key + slice → `ui/` |
| `public/art/ui/` | Individual widgets | Transparent PNG; 9-slice panels/buttons |
| `public/art/vendor/` | Free CC0 packs (Kenney) | Already sliced; recolor if needed |
| `public/art/processed/` | Intermediate (keyed sheets) | Not loaded in game directly |

## Never use rembg on UI kits

Solid black / flat BG sheets → **Pillow color-to-alpha** (`tools/process_art.py`).

`rembg` is for photo subjects / characters later. On UI kits it eats dirt accents and soft edges.

## Commands

```bash
python tools/process_art.py
```

## Phaser wiring (order)

1. BGs first (`menu-bg`, `hub-bg`) as `Image` full cover, depth low.
2. Keep existing `UiChrome` colors for text/contrast.
3. Panels/buttons: prefer **9-slice** (`this.add.nineslice`) from clean vendor frames OR cropped ChatGPT panels.
4. Draft cards: ChatGPT gold/purple frames over `UiChrome` fills.
5. HP/XP: can keep vector bars; overlay ChatGPT bar frames if readable.
6. Ground: `tileSprite` with chapter theme pick.
7. Haze: fullscreen overlay, low alpha, only on themed chapters.

## Free packs (allowed)

- Kenney Fantasy UI Borders — CC0 — `public/art/vendor/kenney-fantasy-ui-borders/`
- Prefer warm brown/amber frames; avoid blue sci-fi packs for menus.

## Characters

Out of scope until user asks. Then: rembg + model sheets in a separate `public/art/chars/` pass.
